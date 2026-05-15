package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/KKittyCatik/2GameFriends/backend/api"
	"github.com/KKittyCatik/2GameFriends/backend/bot"
	"github.com/KKittyCatik/2GameFriends/backend/config"
	"github.com/KKittyCatik/2GameFriends/backend/sheets"
	"github.com/KKittyCatik/2GameFriends/backend/storage"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	cfg := config.Load()
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	store, err := storage.New(cfg.DatabasePath)
	if err != nil {
		logger.Fatal("failed to initialize storage", zap.Error(err))
	}
	defer store.Close()

	exporter, err := sheets.NewExporter(cfg.GoogleServiceAccountJSON, cfg.GoogleSheetsFolderID)
	if err != nil {
		logger.Fatal("failed to initialize sheets exporter", zap.Error(err))
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"https://web.telegram.org", "https://t.me", "*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "X-Telegram-Init-Data"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	h := api.NewHandler(store, exporter)
	h.RegisterRoutes(router, cfg.BotToken)

	router.NoRoute(func(c *gin.Context) {
		frontendPath := cfg.FrontendDistPath
		requestedPath := filepath.Join(frontendPath, c.Request.URL.Path)
		if _, err := os.Stat(requestedPath); err == nil {
			c.File(requestedPath)
			return
		}
		indexPath := filepath.Join(frontendPath, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			c.File(indexPath)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})
	if _, err := os.Stat(cfg.FrontendDistPath); err == nil {
		router.Static("/", cfg.FrontendDistPath)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	go func() {
		if err := bot.New(cfg.BotToken, cfg.WebAppURL, logger).Run(ctx); err != nil {
			logger.Error("bot failed", zap.Error(err))
		}
	}()

	srv := &http.Server{Addr: ":" + cfg.Port, Handler: router}
	go func() {
		logger.Info("backend started", zap.String("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("http server failed", zap.Error(err))
		}
	}()

	<-ctx.Done()
	shutdownCtx, stop := context.WithTimeout(context.Background(), 10*time.Second)
	defer stop()
	_ = srv.Shutdown(shutdownCtx)
	logger.Info("backend shutdown complete")
}

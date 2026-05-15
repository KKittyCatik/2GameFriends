package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
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
	"golang.org/x/net/proxy"
)

func checkSocksProxy(addr string) error {
	if addr == "" {
		return nil
	}
	dialer, err := proxy.SOCKS5("tcp", addr, nil, proxy.Direct)
	if err != nil {
		return fmt.Errorf("cannot create SOCKS5 dialer: %w", err)
	}
	conn, err := dialer.Dial("tcp", "api.telegram.org:443")
	if err != nil {
		return fmt.Errorf("SOCKS5 proxy at %s is not reachable: %w", addr, err)
	}
	_ = conn.Close()
	return nil
}

func main() {
	cfg := config.Load()
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	if err := checkSocksProxy(cfg.Socks5Proxy); err != nil {
		logger.Fatal("proxy check failed", zap.Error(err))
	}
	if cfg.Socks5Proxy != "" {
		logger.Info("SOCKS5 proxy OK", zap.String("addr", cfg.Socks5Proxy))
	}

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
		AllowOrigins:     []string{"https://web.telegram.org", "https://t.me"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "X-Telegram-Init-Data"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	h := api.NewHandler(store, exporter)
	h.RegisterRoutes(router, cfg.BotToken)

	router.NoRoute(func(c *gin.Context) {
		frontendPath := cfg.FrontendDistPath
		cleanPath := filepath.Clean("/" + c.Request.URL.Path)
		requestedPath := filepath.Join(frontendPath, cleanPath)
		baseAbs, baseErr := filepath.Abs(frontendPath)
		reqAbs, reqErr := filepath.Abs(requestedPath)
		if baseErr == nil && reqErr == nil {
			if strings.HasPrefix(reqAbs, baseAbs+string(os.PathSeparator)) || reqAbs == baseAbs {
				if _, err := os.Stat(reqAbs); err == nil {
					c.File(reqAbs)
					return
				}
			}
		}
		indexPath := filepath.Join(frontendPath, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			c.File(indexPath)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	go func() {
		if err := bot.New(cfg.BotToken, cfg.WebAppURL, cfg.Socks5Proxy, logger).Run(ctx); err != nil {
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

package api

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/KKittyCatik/2GameFriends/backend/models"
	"github.com/KKittyCatik/2GameFriends/backend/sheets"
	"github.com/KKittyCatik/2GameFriends/backend/storage"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	store    *storage.Store
	exporter *sheets.Exporter
}

func NewHandler(store *storage.Store, exporter *sheets.Exporter) *Handler {
	return &Handler{store: store, exporter: exporter}
}

func (h *Handler) RegisterRoutes(router *gin.Engine, botToken string, disableTelegramAuth bool) {
	api := router.Group("/api")
	api.Use(RateLimitMiddleware())

	if !disableTelegramAuth {
		api.Use(RequireTelegramInitData(botToken))
	}

	api.POST("/sessions", h.createSession)
	api.GET("/sessions", h.listSessions)
	api.GET("/sessions/:id", h.getSession)
	api.POST("/sessions/:id/finish", h.finishSession)
	api.POST("/sessions/:id/players", h.addPlayer)
	api.GET("/sessions/:id/players", h.listPlayers)
	api.POST("/sessions/:id/buyins", h.addBuyin)
	api.GET("/sessions/:id/buyins", h.listBuyins)
	api.DELETE("/sessions/:id/buyins/:bid", h.deleteBuyin)
	api.PUT("/sessions/:id/buyins/:bid", h.updateBuyin)
	api.POST("/sessions/:id/players/:pid/finish", h.finishPlayer)
	api.PUT("/sessions/:id/players/:pid/finish", h.finishPlayer)
	api.GET("/sessions/:id/summary", h.summary)
	api.POST("/sessions/:id/export/sheets", h.exportSheets)
}

func currentUser(c *gin.Context) TelegramUser {
	v, _ := c.Get("telegram_user")
	u, _ := v.(TelegramUser)
	return u
}

func parseID(c *gin.Context, key string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(key), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return 0, false
	}
	return id, true
}

func (h *Handler) createSession(c *gin.Context) {
	var req struct {
		Title string `json:"title" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	session, err := h.store.CreateSession(c.Request.Context(), req.Title, currentUser(c).ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, session)
}

func (h *Handler) listSessions(c *gin.Context) {
	sessions, err := h.store.ListSessionsForUser(c.Request.Context(), currentUser(c).ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sessions)
}

func (h *Handler) getSession(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	session, err := h.store.GetSessionForUser(c.Request.Context(), sessionID, currentUser(c).ID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func (h *Handler) finishSession(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	if err := h.store.FinishSession(c.Request.Context(), sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "finished"})
}

func (h *Handler) addPlayer(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req struct {
		TelegramID int64  `json:"telegram_id"`
		Username   string `json:"username"`
		Name       string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	player, err := h.store.AddPlayer(c.Request.Context(), models.Player{SessionID: sessionID, TelegramID: req.TelegramID, Username: req.Username, Name: req.Name})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, player)
}

func (h *Handler) listPlayers(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	players, err := h.store.ListPlayers(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, players)
}

func (h *Handler) addBuyin(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req struct {
		PlayerID int64  `json:"player_id" binding:"required"`
		Amount   int64  `json:"amount" binding:"required"`
		Note     string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be a positive number"})
		return
	}
	buyin, err := h.store.AddBuyin(c.Request.Context(), models.Buyin{SessionID: sessionID, PlayerID: req.PlayerID, Amount: req.Amount, Note: req.Note})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, buyin)
}

func (h *Handler) listBuyins(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	buyins, err := h.store.ListBuyins(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, buyins)
}

func (h *Handler) deleteBuyin(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	buyinID, ok := parseID(c, "bid")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	if err := h.store.DeleteBuyin(c.Request.Context(), buyinID, sessionID); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "buyin not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) updateBuyin(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	buyinID, ok := parseID(c, "bid")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req struct {
		PlayerID int64  `json:"player_id" binding:"required"`
		Amount   int64  `json:"amount" binding:"required"`
		Note     string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be positive"})
		return
	}
	buyin, err := h.store.UpdateBuyin(c.Request.Context(), buyinID, sessionID, req.PlayerID, req.Amount, req.Note)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "buyin not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, buyin)
}

func (h *Handler) finishPlayer(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	pid, ok := parseID(c, "pid")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	var req struct {
		ChipsRemaining int64  `json:"chips_remaining"`
		ApprovedBy     string `json:"approved_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ChipsRemaining < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chips_remaining must be non-negative"})
		return
	}
	res, err := h.store.FinishPlayer(c.Request.Context(), models.PlayerResult{SessionID: sessionID, PlayerID: pid, ChipsRemaining: req.ChipsRemaining, ApprovedBy: req.ApprovedBy})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) summary(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, currentUser(c).ID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	summary, err := h.store.GetSummary(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *Handler) exportSheets(c *gin.Context) {
	sessionID, ok := parseID(c, "id")
	if !ok {
		return
	}
	userID := currentUser(c).ID
	if err := h.store.CheckSessionAccess(c.Request.Context(), sessionID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	session, err := h.store.GetSessionForUser(c.Request.Context(), sessionID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	summary, err := h.store.GetSummary(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	buyins, err := h.store.ListBuyins(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	players, err := h.store.ListPlayers(c.Request.Context(), sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	playersByID := map[int64]models.Player{}
	for _, p := range players {
		playersByID[p.ID] = p
	}

	url, err := h.exporter.ExportSession(c.Request.Context(), session, summary, buyins, playersByID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": url})
}

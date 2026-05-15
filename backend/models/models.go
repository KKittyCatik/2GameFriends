package models

import "time"

type Session struct {
	ID         int64      `json:"id"`
	Title      string     `json:"title"`
	CreatedBy  int64      `json:"created_by"`
	Status     string     `json:"status"`
	StartedAt  time.Time  `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}

type Player struct {
	ID         int64  `json:"id"`
	SessionID  int64  `json:"session_id"`
	TelegramID int64  `json:"telegram_id"`
	Username   string `json:"username"`
	Name       string `json:"name"`
}

type Buyin struct {
	ID        int64     `json:"id"`
	SessionID int64     `json:"session_id"`
	PlayerID  int64     `json:"player_id"`
	Amount    int64     `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

type PlayerResult struct {
	ID             int64     `json:"id"`
	SessionID      int64     `json:"session_id"`
	PlayerID       int64     `json:"player_id"`
	ChipsRemaining int64     `json:"chips_remaining"`
	FinishedAt     time.Time `json:"finished_at"`
}

type SessionSummaryRow struct {
	PlayerID        int64   `json:"player_id"`
	PlayerName      string  `json:"player_name"`
	Username        string  `json:"username"`
	BuyinsCount     int64   `json:"buyins_count"`
	TotalBuyinChips int64   `json:"total_buyin_chips"`
	ChipsRemaining  int64   `json:"chips_remaining"`
	ProfitChips     int64   `json:"profit_chips"`
	ProfitFantics   float64 `json:"profit_fantics"`
}

type SessionSummary struct {
	SessionID   int64               `json:"session_id"`
	SessionName string              `json:"session_name"`
	Rows        []SessionSummaryRow `json:"rows"`
}

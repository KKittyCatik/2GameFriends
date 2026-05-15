package storage

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/KKittyCatik/2GameFriends/backend/models"
)

func TestGetSummaryCalculatesFantics(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, err := New(dbPath)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	defer store.Close()

	ctx := context.Background()
	session, err := store.CreateSession(ctx, "Friday", 100)
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	player, err := store.AddPlayer(ctx, models.Player{SessionID: session.ID, Name: "Alice"})
	if err != nil {
		t.Fatalf("add player: %v", err)
	}

	if _, err := store.AddBuyin(ctx, models.Buyin{SessionID: session.ID, PlayerID: player.ID, Amount: 2000}); err != nil {
		t.Fatalf("add buyin: %v", err)
	}
	if _, err := store.FinishPlayer(ctx, models.PlayerResult{SessionID: session.ID, PlayerID: player.ID, ChipsRemaining: 3000}); err != nil {
		t.Fatalf("finish player: %v", err)
	}

	summary, err := store.GetSummary(ctx, session.ID)
	if err != nil {
		t.Fatalf("get summary: %v", err)
	}
	if len(summary.Rows) != 1 {
		t.Fatalf("expected 1 row, got %d", len(summary.Rows))
	}
	row := summary.Rows[0]
	if row.ProfitChips != 1000 {
		t.Fatalf("expected profit chips 1000, got %d", row.ProfitChips)
	}
	if row.ProfitFantics != 500 {
		t.Fatalf("expected profit fantics 500, got %v", row.ProfitFantics)
	}
}

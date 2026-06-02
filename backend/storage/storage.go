package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/KKittyCatik/2GameFriends/backend/models"
	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

func New(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, err
	}

	s := &Store{db: db}
	if err := s.RunMigrations(resolveMigrationsPath()); err != nil {
		return nil, err
	}
	return s, nil
}

func resolveMigrationsPath() string {
	candidates := []string{
		filepath.Join("storage", "migrations"),
		filepath.Join(".", "migrations"),
		filepath.Join("..", "storage", "migrations"),
	}
	for _, candidate := range candidates {
		if st, err := os.Stat(candidate); err == nil && st.IsDir() {
			return candidate
		}
	}
	return filepath.Join("storage", "migrations")
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) RunMigrations(dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	files := make([]string, 0)
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		files = append(files, filepath.Join(dir, e.Name()))
	}
	sort.Strings(files)

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			return err
		}
		if _, err := s.db.Exec(string(content)); err != nil {
			return fmt.Errorf("migration %s failed: %w", file, err)
		}
	}
	return nil
}

func (s *Store) CreateSession(ctx context.Context, title string, createdBy int64) (models.Session, error) {
	res, err := s.db.ExecContext(ctx, `INSERT INTO sessions(title, created_by, status) VALUES(?, ?, 'active')`, title, createdBy)
	if err != nil {
		return models.Session{}, err
	}
	id, _ := res.LastInsertId()
	return s.GetSessionForUser(ctx, id, createdBy)
}

func (s *Store) ListSessionsForUser(ctx context.Context, userID int64) ([]models.Session, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT DISTINCT s.id, s.title, s.created_by, s.status, s.started_at, s.finished_at
FROM sessions s
LEFT JOIN players p ON p.session_id = s.id
WHERE s.created_by = ? OR p.telegram_id = ?
ORDER BY s.started_at DESC`, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Session{}
	for rows.Next() {
		var sRow models.Session
		var finished sql.NullTime
		if err := rows.Scan(&sRow.ID, &sRow.Title, &sRow.CreatedBy, &sRow.Status, &sRow.StartedAt, &finished); err != nil {
			return nil, err
		}
		if finished.Valid {
			t := finished.Time
			sRow.FinishedAt = &t
		}
		out = append(out, sRow)
	}
	return out, rows.Err()
}

func (s *Store) GetSessionForUser(ctx context.Context, sessionID, userID int64) (models.Session, error) {
	row := s.db.QueryRowContext(ctx, `
SELECT s.id, s.title, s.created_by, s.status, s.started_at, s.finished_at
FROM sessions s
WHERE s.id = ?
AND (
s.created_by = ? OR EXISTS(
SELECT 1 FROM players p WHERE p.session_id = s.id AND p.telegram_id = ?
)
)
`, sessionID, userID, userID)

	var sRow models.Session
	var finished sql.NullTime
	if err := row.Scan(&sRow.ID, &sRow.Title, &sRow.CreatedBy, &sRow.Status, &sRow.StartedAt, &finished); err != nil {
		return models.Session{}, err
	}
	if finished.Valid {
		t := finished.Time
		sRow.FinishedAt = &t
	}
	return sRow, nil
}

func (s *Store) FinishSession(ctx context.Context, sessionID int64) error {
	res, err := s.db.ExecContext(ctx, `UPDATE sessions SET status='finished', finished_at=CURRENT_TIMESTAMP WHERE id=?`, sessionID)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) AddPlayer(ctx context.Context, player models.Player) (models.Player, error) {
	res, err := s.db.ExecContext(ctx, `
INSERT INTO players(session_id, telegram_id, username, name) VALUES(?, ?, ?, ?)`,
		player.SessionID, player.TelegramID, player.Username, player.Name)
	if err != nil {
		return models.Player{}, err
	}
	id, _ := res.LastInsertId()
	player.ID = id
	return player, nil
}

func (s *Store) ListPlayers(ctx context.Context, sessionID int64) ([]models.Player, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, session_id, telegram_id, username, name FROM players WHERE session_id=? ORDER BY id`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Player{}
	for rows.Next() {
		var p models.Player
		if err := rows.Scan(&p.ID, &p.SessionID, &p.TelegramID, &p.Username, &p.Name); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) AddBuyin(ctx context.Context, b models.Buyin) (models.Buyin, error) {
	res, err := s.db.ExecContext(ctx, `INSERT INTO buyins(session_id, player_id, amount, note) VALUES(?, ?, ?, ?)`, b.SessionID, b.PlayerID, b.Amount, b.Note)
	if err != nil {
		return models.Buyin{}, err
	}
	id, _ := res.LastInsertId()
	b.ID = id
	b.CreatedAt = time.Now().UTC()
	return b, nil
}

func (s *Store) ListBuyins(ctx context.Context, sessionID int64) ([]models.Buyin, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, session_id, player_id, amount, note, created_at FROM buyins WHERE session_id=? ORDER BY created_at`, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Buyin{}
	for rows.Next() {
		var b models.Buyin
		if err := rows.Scan(&b.ID, &b.SessionID, &b.PlayerID, &b.Amount, &b.Note, &b.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *Store) DeleteBuyin(ctx context.Context, buyinID, sessionID int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM buyins WHERE id=? AND session_id=?`, buyinID, sessionID)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (s *Store) UpdateBuyin(ctx context.Context, buyinID, sessionID, playerID, amount int64, note string) (models.Buyin, error) {
	res, err := s.db.ExecContext(ctx,
		`UPDATE buyins SET player_id=?, amount=?, note=? WHERE id=? AND session_id=?`,
		playerID, amount, note, buyinID, sessionID)
	if err != nil {
		return models.Buyin{}, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return models.Buyin{}, sql.ErrNoRows
	}
	var b models.Buyin
	row := s.db.QueryRowContext(ctx, `SELECT id, session_id, player_id, amount, note, created_at FROM buyins WHERE id=?`, buyinID)
	if err := row.Scan(&b.ID, &b.SessionID, &b.PlayerID, &b.Amount, &b.Note, &b.CreatedAt); err != nil {
		return models.Buyin{}, err
	}
	return b, nil
}

func (s *Store) FinishPlayer(ctx context.Context, result models.PlayerResult) (models.PlayerResult, error) {
	_, err := s.db.ExecContext(ctx, `
INSERT INTO player_results(session_id, player_id, chips_remaining, approved_by)
VALUES (?, ?, ?, ?)
ON CONFLICT(session_id, player_id)
DO UPDATE SET chips_remaining=excluded.chips_remaining, approved_by=excluded.approved_by, finished_at=CURRENT_TIMESTAMP`,
		result.SessionID, result.PlayerID, result.ChipsRemaining, result.ApprovedBy)
	if err != nil {
		return models.PlayerResult{}, err
	}
	result.FinishedAt = time.Now().UTC()
	return result, nil
}

func (s *Store) GetSummary(ctx context.Context, sessionID int64) (models.SessionSummary, error) {
	var summary models.SessionSummary
	summary.Rows = []models.SessionSummaryRow{}

	row := s.db.QueryRowContext(ctx, `SELECT id, title FROM sessions WHERE id=?`, sessionID)
	if err := row.Scan(&summary.SessionID, &summary.SessionName); err != nil {
		return summary, err
	}

	rows, err := s.db.QueryContext(ctx, `
SELECT p.id, p.name, p.username,
COALESCE((SELECT COUNT(*) FROM buyins b WHERE b.player_id=p.id), 0) AS buyins_count,
COALESCE((SELECT SUM(b.amount) FROM buyins b WHERE b.player_id=p.id), 0) AS total_buyin,
COALESCE((SELECT pr.chips_remaining FROM player_results pr WHERE pr.player_id=p.id AND pr.session_id=p.session_id), 0) AS chips_remaining,
COALESCE((SELECT pr.approved_by FROM player_results pr WHERE pr.player_id=p.id AND pr.session_id=p.session_id), '') AS approved_by
FROM players p
WHERE p.session_id=?
ORDER BY p.id`, sessionID)
	if err != nil {
		return summary, err
	}
	defer rows.Close()

	for rows.Next() {
		var r models.SessionSummaryRow
		if err := rows.Scan(&r.PlayerID, &r.PlayerName, &r.Username, &r.BuyinsCount, &r.TotalBuyinChips, &r.ChipsRemaining, &r.ApprovedBy); err != nil {
			return summary, err
		}
		r.ProfitChips = r.ChipsRemaining - r.TotalBuyinChips
		r.ProfitFantics = float64(r.ProfitChips) * 0.5
		summary.Rows = append(summary.Rows, r)
	}
	return summary, rows.Err()
}

func (s *Store) CheckSessionAccess(ctx context.Context, sessionID, userID int64) error {
	_, err := s.GetSessionForUser(ctx, sessionID, userID)
	if err == nil {
		return nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("access denied")
	}
	return err
}
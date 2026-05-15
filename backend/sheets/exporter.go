package sheets

import (
	"context"
	"fmt"
	"time"

	"github.com/KKittyCatik/2GameFriends/backend/models"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

type Exporter struct {
	enabled  bool
	svc      *sheets.Service
	driveSvc *drive.Service
	folderID string
}

func NewExporter(serviceAccountPath, folderID string) (*Exporter, error) {
	if serviceAccountPath == "" {
		return &Exporter{enabled: false}, nil
	}
	ctx := context.Background()
	svc, err := sheets.NewService(ctx, option.WithCredentialsFile(serviceAccountPath), option.WithScopes(sheets.SpreadsheetsScope, drive.DriveScope))
	if err != nil {
		return nil, err
	}
	driveSvc, err := drive.NewService(ctx, option.WithCredentialsFile(serviceAccountPath), option.WithScopes(drive.DriveScope))
	if err != nil {
		return nil, err
	}
	return &Exporter{enabled: true, svc: svc, driveSvc: driveSvc, folderID: folderID}, nil
}

func (e *Exporter) ExportSession(ctx context.Context, session models.Session, summary models.SessionSummary, buyins []models.Buyin, players map[int64]models.Player) (string, error) {
	if !e.enabled {
		return "", fmt.Errorf("google sheets exporter is not configured")
	}

	title := fmt.Sprintf("%s — %s", session.Title, time.Now().Format("2006-01-02"))
	spreadsheet := &sheets.Spreadsheet{Properties: &sheets.SpreadsheetProperties{Title: title}}
	created, err := e.svc.Spreadsheets.Create(spreadsheet).Context(ctx).Do()
	if err != nil {
		return "", err
	}

	if e.folderID != "" {
		_, _ = e.driveSvc.Files.Update(created.SpreadsheetId, &drive.File{Parents: []string{e.folderID}}).AddParents(e.folderID).Context(ctx).Do()
	}

	summaryValues := [][]interface{}{{"Игрок", "Закупов (шт)", "Итого фишек закуплено", "Осталось фишек", "Прибыль/Убыток (фишки)", "Прибыль/Убыток (фантики)"}}
	for _, row := range summary.Rows {
		name := row.PlayerName
		if row.Username != "" {
			name = fmt.Sprintf("%s (@%s)", row.PlayerName, row.Username)
		}
		summaryValues = append(summaryValues, []interface{}{name, row.BuyinsCount, row.TotalBuyinChips, row.ChipsRemaining, row.ProfitChips, row.ProfitFantics})
	}

	_, err = e.svc.Spreadsheets.Values.Update(created.SpreadsheetId, "Sheet1!A1", &sheets.ValueRange{Values: summaryValues}).ValueInputOption("USER_ENTERED").Context(ctx).Do()
	if err != nil {
		return "", err
	}

	_, err = e.svc.Spreadsheets.BatchUpdate(created.SpreadsheetId, &sheets.BatchUpdateSpreadsheetRequest{Requests: []*sheets.Request{{AddSheet: &sheets.AddSheetRequest{Properties: &sheets.SheetProperties{Title: "История закупов"}}}}}).Context(ctx).Do()
	if err != nil {
		return "", err
	}

	history := [][]interface{}{{"#", "Игрок", "Сумма закупа (фишки)", "Время"}}
	for i, b := range buyins {
		p := players[b.PlayerID]
		name := p.Name
		if p.Username != "" {
			name = fmt.Sprintf("%s (@%s)", p.Name, p.Username)
		}
		history = append(history, []interface{}{i + 1, name, b.Amount, b.CreatedAt.Format(time.RFC3339)})
	}

	_, err = e.svc.Spreadsheets.Values.Update(created.SpreadsheetId, "История закупов!A1", &sheets.ValueRange{Values: history}).ValueInputOption("USER_ENTERED").Context(ctx).Do()
	if err != nil {
		return "", err
	}

	return created.SpreadsheetUrl, nil
}

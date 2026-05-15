package bot

import (
	"context"
	"fmt"
	"strings"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"go.uber.org/zap"
)

type Bot struct {
	token  string
	webApp string
	logger *zap.Logger
}

func New(token, webApp string, logger *zap.Logger) *Bot {
	return &Bot{token: token, webApp: webApp, logger: logger}
}

func (b *Bot) Run(ctx context.Context) error {
	if b.token == "" {
		b.logger.Info("bot token is empty, bot disabled")
		return nil
	}

	api, err := tgbotapi.NewBotAPI(b.token)
	if err != nil {
		return err
	}

	u := tgbotapi.NewUpdate(0)
	u.Timeout = 30
	updates := api.GetUpdatesChan(u)

	for {
		select {
		case <-ctx.Done():
			return nil
		case update := <-updates:
			if update.Message == nil || !update.Message.IsCommand() {
				continue
			}
			msg := b.commandMessage(update.Message.Chat.ID, update.Message.Command())
			if _, err := api.Send(msg); err != nil {
				b.logger.Warn("failed to send bot message", zap.Error(err))
			}
		}
	}
}

func (b *Bot) commandMessage(chatID int64, command string) tgbotapi.MessageConfig {
	text := "Используй кнопку ниже, чтобы открыть мини‑приложение и вести покерные сессии."
	if command == "help" {
		text = "/start — открыть Mini App\n/newgame — создать новую игру\n/sessions — активные сессии\n/help — помощь"
	}
	if command == "newgame" {
		text = "Создай новую сессию в Mini App по кнопке ниже."
	}
	if command == "sessions" {
		text = "Открой Mini App, чтобы увидеть список активных сессий."
	}

	msg := tgbotapi.NewMessage(chatID, text)
	msg.ReplyMarkup = tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonURL("Открыть покер 🃏", b.webApp),
		),
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("Помощь", "help"),
			tgbotapi.NewInlineKeyboardButtonData("Сессии", "sessions"),
		),
	)
	if strings.EqualFold(command, "start") {
		msg.Text = fmt.Sprintf("Добро пожаловать в Poker Friends!\nНажми «Открыть покер 🃏»")
	}
	return msg
}

package config

import (
	"os"
)

type Config struct {
	BotToken                 string
	Socks5Proxy              string
	WebAppURL                string
	DatabasePath             string
	GoogleServiceAccountJSON string
	GoogleSheetsFolderID     string
	JWTSecret                string
	Port                     string
	FrontendDistPath         string
}

func Load() Config {
	cfg := Config{
		BotToken:                 getEnv("BOT_TOKEN", ""),
		Socks5Proxy:              getEnv("SOCKS5_PROXY", ""),
		WebAppURL:                getEnv("WEBAPP_URL", "http://localhost:5173"),
		DatabasePath:             getEnv("DATABASE_PATH", "./data/poker.db"),
		GoogleServiceAccountJSON: getEnv("GOOGLE_SERVICE_ACCOUNT_JSON", ""),
		GoogleSheetsFolderID:     getEnv("GOOGLE_SHEETS_FOLDER_ID", ""),
		JWTSecret:                getEnv("JWT_SECRET", "dev-secret"),
		Port:                     getEnv("PORT", "8080"),
		FrontendDistPath:         getEnv("FRONTEND_DIST_PATH", "../frontend/dist"),
	}
	return cfg
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

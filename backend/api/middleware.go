package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type TelegramUser struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Name     string `json:"first_name"`
}

func RequireTelegramInitData(botToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		initData := c.GetHeader("X-Telegram-Init-Data")
		if initData == "" {
			initData = c.Query("initData")
		}
		if initData == "" || !validateInitData(initData, botToken) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid initData"})
			return
		}

		user := parseTelegramUser(initData)
		if user.ID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found in initData"})
			return
		}
		c.Set("telegram_user", user)
		c.Next()
	}
}

func parseTelegramUser(initData string) TelegramUser {
	values, err := url.ParseQuery(initData)
	if err != nil {
		return TelegramUser{}
	}
	rawUser := values.Get("user")
	if rawUser == "" {
		return TelegramUser{}
	}
	var user TelegramUser
	if err := json.Unmarshal([]byte(rawUser), &user); err != nil {
		return TelegramUser{}
	}
	if user.Name == "" {
		user.Name = user.Username
	}
	return user
}

func validateInitData(initData, botToken string) bool {
	values, err := url.ParseQuery(initData)
	if err != nil {
		return false
	}
	receivedHash := values.Get("hash")
	if receivedHash == "" {
		return false
	}
	values.Del("hash")

	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	pairs := make([]string, 0, len(keys))
	for _, k := range keys {
		pairs = append(pairs, k+"="+values.Get(k))
	}
	dataCheckString := strings.Join(pairs, "\n")

	secretMac := hmac.New(sha256.New, []byte("WebAppData"))
	secretMac.Write([]byte(botToken))
	secret := secretMac.Sum(nil)

	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(dataCheckString))
	calculated := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(calculated), []byte(receivedHash))
}

type limiter struct {
	mu      sync.Mutex
	clients map[string]*rate.Limiter
}

func newLimiter() *limiter {
	return &limiter{clients: map[string]*rate.Limiter{}}
}

func (l *limiter) get(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	if lim, ok := l.clients[ip]; ok {
		return lim
	}
	lim := rate.NewLimiter(rate.Every(time.Second), 8)
	l.clients[ip] = lim
	return lim
}

func RateLimitMiddleware() gin.HandlerFunc {
	limiterStore := newLimiter()
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !limiterStore.get(ip).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
			return
		}
		c.Next()
	}
}

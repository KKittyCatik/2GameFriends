# 2GameFriends — Poker Telegram Mini App

Telegram Mini App для учёта покерных сессий между друзьями.

## Технологии
- Backend: Go 1.22 + Gin + SQLite (`modernc.org/sqlite`, без CGO)
- Frontend: React + TypeScript + Vite + `@twa-dev/sdk`
- Bot: `go-telegram-bot-api`
- Экспорт: Google Sheets API v4 (service account)
- Deploy: Docker + docker-compose

## Запуск локально
1. Скопируйте env:
   ```bash
   cp .env.example .env
   ```
2. Backend:
   ```bash
   cd backend
   go mod tidy
   go run ./main.go
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Команды бота
- `/start` — приветствие + кнопка `Открыть покер 🃏`
- `/newgame` — быстрый старт новой игры
- `/sessions` — список активных сессий
- `/help` — подсказка по командам

### Настройка в BotFather
1. Создайте бота через `/newbot`
2. Установите меню команд (`/setcommands`):
   ```
   start - Открыть приложение
   newgame - Создать игру
   sessions - Показать сессии
   help - Помощь
   ```
3. Установите Web App URL через `/setmenubutton` и укажите `WEBAPP_URL`.

## Docker
```bash
docker compose up --build
```

## Деплой на VPS (Россия / с блокировками)

Если Telegram API заблокирован на VPS, используем Cloudflare WARP.

### Установка WARP
```bash
chmod +x scripts/setup-warp.sh
sudo ./scripts/setup-warp.sh
```

### Автозапуск через systemd
```bash
sudo cp scripts/warp.service /etc/systemd/system/
sudo systemctl enable --now warp
```

### Проверка
```bash
warp-cli status        # должно быть: Status update: Connected
curl --proxy socks5://127.0.0.1:40000 https://api.telegram.org  # должен ответить 404 (это норма)
```

### Настройка бота
В `.env` установить:
```
SOCKS5_PROXY=127.0.0.1:40000
```

При запуске через Docker:
```
SOCKS5_PROXY=host-gateway:40000
```

## API
Реализованы эндпоинты:
- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/finish`
- `POST /api/sessions/:id/players`
- `GET /api/sessions/:id/players`
- `POST /api/sessions/:id/buyins`
- `GET /api/sessions/:id/buyins`
- `POST /api/sessions/:id/players/:pid/finish`
- `GET /api/sessions/:id/summary`
- `POST /api/sessions/:id/export/sheets`

Все `/api/*` запросы требуют валидный Telegram `initData` в заголовке `X-Telegram-Init-Data`.

# Football Datacenter API

## Налаштування

### Змінні оточення

| Змінна               | Опис                                                       | Обов'язкова | Приклад                             |
| -------------------- | ---------------------------------------------------------- | ----------- | ----------------------------------- |
| `PORT`               | Порт сервера                                               | Так         | `3000`                              |
| `CORS_ORIGIN`        | Дозволені origins для CORS                                 | Ні          | `http://localhost:5173`             |
| `LOG_LEVEL`          | Рівень логування                                           | Ні          | `info`, `debug`, `warn`, `error`    |
| `DB_HOST`            | Хост PostgreSQL                                            | Так\*       | `localhost`                         |
| `DB_PORT`            | Порт PostgreSQL                                            | Так\*       | `5432`                              |
| `DB_NAME`            | Назва бази даних                                           | Так\*       | `football-datacenter`               |
| `DB_USER`            | Користувач PostgreSQL                                      | Так\*       | `postgres`                          |
| `DB_PASSWORD`        | Пароль PostgreSQL                                          | Так\*       | `password`                          |
| `DATABASE_URL`       | Connection string PostgreSQL, альтернатива окремим змінним | Так\*       | `postgres://user:pass@host:port/db` |
| `REDIS_HOST`         | Хост Redis                                                 | Так\*       | `localhost`                         |
| `REDIS_PORT`         | Порт Redis                                                 | Так\*       | `6379`                              |
| `REDIS_URL`          | Connection string Redis, альтернатива окремим змінним      | Так\*       | `redis://localhost:6379`            |
| `JWT_SECRET`         | Секретний ключ для JWT                                     | Так         | `your-secret-key`                   |
| `FOOTBALL_API_TOKEN` | API ключ football-data.org                                 | Так         | `your-api-token`                    |

### Запуск

```bash
# Встановлення залежностей
npm install

# Запуск БД (PostgreSQL + Redis) та app
docker-compose up -d

```

---

## Lab 0: Production-Ready Requirements

### 1. Health Check

**Endpoint:** `GET /health`

**Відповідь 200 (все працює):**

```bash
curl -i localhost:3000/health
```

![Health 200](docs/images/health-200.png)

**Відповідь 503 (БД недоступна):**

![Health 503](docs/images/health-503.png)

---

### 2. JSON Logging

Приклад логів при запуску та поновлення з'єднання з Redis:

```json
{"level":"INFO","timestamp":"2026-02-17T15:13:47.171Z","pid":1320,"hostname":"PKWIN11","context":"NestApplication","msg":"Nest application successfully started"}
{"level":"INFO","timestamp":"2026-02-17T15:13:47.171Z","pid":1320,"hostname":"PKWIN11","context":"Bootstrap","msg":"Application is running on port 3000"}
{"level":"INFO","timestamp":"2026-02-17T15:15:00.012Z","pid":1320,"hostname":"PKWIN11","context":"SyncService","msg":"Sync: today matches"}
{"timestamp":"2026-02-17T15:16:35.920Z","level":"ERROR","context":"Redis","message":"Connection lost: Socket closed unexpectedly"}
{"timestamp":"2026-02-17T15:20:08.855Z","level":"INFO","context":"Redis","message":"Connection restored"}
```

---

### 3. Graceful Shutdown

```json
{"level":"INFO","timestamp":"2026-02-17T15:23:12.427Z","context":"Shutdown","msg":"SIGINT received. Starting graceful shutdown..."}
{"level":"INFO","timestamp":"2026-02-17T15:23:26.980Z","pid":1320,"hostname":"PKWIN11","req":{"id":4,"method":"GET","url":"/fdc-api/matches","query":{},"params":{"0":"matches"}},"res":{"statusCode":200},"responseTime":14831,"msg":"request completed"}
```

![Graceful Shutdown](docs/images/graceful-shutdown.png)

---

## API Endpoints

| Method | Endpoint                            | Опис                   |
| ------ | ----------------------------------- | ---------------------- |
| GET    | `/health`                           | Health check           |
| GET    | `/fdc-api/matches`                  | Список матчів          |
| GET    | `/fdc-api/matches/:id`              | Деталі матчу           |
| GET    | `/fdc-api/competitions`             | Список змагань         |
| GET    | `/fdc-api/competitions/:id`         | Деталі змагання        |
| GET    | `/fdc-api/standings/:competitionId` | Турнірна таблиця       |
| GET    | `/fdc-api/teams/:id`                | Інформація про команду |
| POST   | `/fdc-api/user/auth/signup`         | Реєстрація             |
| POST   | `/fdc-api/user/auth/signin`         | Вхід                   |

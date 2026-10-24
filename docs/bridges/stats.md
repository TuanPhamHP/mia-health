# Bridge — Stats (streak, tuần, heatmap, hôm nay)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-23). Không có bảng riêng — aggregate từ `workout_sessions` / `session_entries`.

⚠️ **Tham số ngày là BẮT BUỘC và do client gửi** (`localDateIso()` ở `shared/utils/date.ts`). Server chạy UTC, không biết "hôm nay" của người tập.

## `GET /api/stats/overview?today=YYYY-MM-DD` → `StatsOverviewDTO`

| Field | Kiểu JSON | Công thức |
|-------|-----------|-----------|
| `today` | string | echo tham số |
| `currentStreak` | number | Số ngày liên tiếp có ≥ 1 buổi, tính lùi từ hôm nay — **hoặc từ hôm qua nếu hôm nay chưa tập** (chuỗi chưa đứt tới hết ngày). Ngày tương lai bị bỏ |
| `longestStreak` | number | Chuỗi dài nhất từ trước tới nay |
| `totalSessions` / `totalDurationSec` | number | Toàn bộ lịch sử |
| `thisWeek` | `WeeklyStat` | = phần tử cuối của `weekly` |
| `weekly` | `WeeklyStat[]` (8) | Tuần ISO Thứ 2 → CN, cũ → mới, tuần trống ra 0 |
| `heatmap` | `DailyStat[]` | Từ Thứ 2 của 12 tuần trước tới hôm nay, đủ mọi ngày (77–84 phần tử), cũ → mới |
| `byCategory` | `{ category, entries, setsDone }[]` | 30 ngày gần nhất (tính cả hôm nay), nhiều set nhất trước |

`WeeklyStat = { weekStart, sessions, durationSec, activeDays }` · `DailyStat = { date, sessions, durationSec }`

```json
{
  "today": "2026-10-23", "currentStreak": 13, "longestStreak": 13,
  "totalSessions": 51, "totalDurationSec": 38584,
  "thisWeek": { "weekStart": "2026-10-19", "sessions": 8, "durationSec": 4807, "activeDays": 5 },
  "weekly": [ { "weekStart": "2026-10-12", "sessions": 9, "durationSec": 6801, "activeDays": 7 }, "… 8 phần tử" ],
  "heatmap": [ { "date": "2026-10-22", "sessions": 1, "durationSec": 540 }, "…" ],
  "byCategory": [ { "category": "kegel", "entries": 48, "setsDone": 144 }, { "category": "gymnastics", "entries": 18, "setsDone": 54 } ]
}
```

> Lịch hôm nay (trước đây `GET /api/stats/today`) đã chuyển sang `GET /api/plan/today?date=` — lấy buổi từ các chương trình đang theo, xem `programs.md`.

## Lỗi

| Status | Khi nào |
|--------|---------|
| 400 | Thiếu / sai định dạng `today` (JSON array issue của zod) |
| 401 | Chưa login |

## Endpoint reference nhanh (toàn app)

```
POST   /api/auth/login | /api/auth/logout        GET /api/health (public)
GET    /api/exercises            POST /api/exercises        GET|PATCH|DELETE /api/exercises/:id
POST   /api/presets/seed { today }
GET    /api/routines             POST /api/routines         GET|PATCH|DELETE /api/routines/:id
POST   /api/routines/:id/items   PATCH|DELETE /api/routines/:id/items/:itemId
POST   /api/routines/:id/items/reorder
GET    /api/sessions             POST /api/sessions         GET|PATCH|DELETE /api/sessions/:id
GET    /api/programs             POST /api/programs         GET|PATCH|DELETE /api/programs/:id
POST   /api/programs/:id/phases  PATCH|DELETE /api/programs/:id/phases/:phaseId
POST   /api/programs/:id/phases/reorder
POST   /api/programs/:id/phases/:phaseId/slots   DELETE /api/programs/:id/phases/:phaseId/slots/:slotId
GET    /api/plan/today?date=     POST /api/plan/changes     DELETE /api/plan/changes/:id
GET    /api/stats/overview?today=
GET    /api/food-categories      POST /api/food-categories  PATCH|DELETE /api/food-categories/:id
GET    /api/foods?categoryId=&q= POST /api/foods            GET|PATCH|DELETE /api/foods/:id
POST   /api/foods/:id/portions   PATCH|DELETE /api/foods/:id/portions/:portionId
GET    /api/dishes?category=&q=  POST /api/dishes           GET|PATCH|DELETE /api/dishes/:id
GET    /api/meal-log?date=       POST /api/meal-log/entries PATCH|DELETE /api/meal-log/entries/:id
POST   /api/meal-log/apply-menu  GET|PUT /api/nutrition-targets
GET    /api/menus                POST /api/menus            POST /api/menus/from-day   GET|PATCH|DELETE /api/menus/:id
GET    /api/meal-log/suggestions?date=
GET    /api/body?today=          PUT /api/body/profile      POST /api/body/weights     DELETE /api/body/weights/:id?today=
POST   /api/body/apply-targets
```

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

## `GET /api/stats/today?date=YYYY-MM-DD` → `TodayDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `date` | string | |
| `weekday` | 1–7 | ISO, 1 = Thứ 2 |
| `routines` | `TodayRoutineDTO[]` | Giáo án **chưa lưu trữ**: có lịch hôm nay trước, giữ `sortOrder` trong từng nhóm |
| `sessions` | `SessionDTO[]` | Buổi đã ghi trong ngày (xem `sessions.md`) |

`TodayRoutineDTO = { id, name, itemCount, estimatedSec, scheduleMask, scheduled: boolean, doneCount: number, previews: ExercisePreviewDTO[] }` — `doneCount` = số buổi của giáo án này trong ngày; `previews` giống `RoutineSummaryDTO.previews` (xem bridge routines).

```json
{ "date": "2026-10-23", "weekday": 5,
  "routines": [ { "id": 1, "name": "Kegel hằng ngày", "itemCount": 3, "estimatedSec": 571, "scheduleMask": 127, "scheduled": true, "doneCount": 1,
    "previews": [{ "name": "Thở bụng thả lỏng sàn chậu", "category": "breathing", "isCombo": false, "cover": null }] } ],
  "sessions": [ "…SessionDTO" ] }
```

## Lỗi

| Status | Khi nào |
|--------|---------|
| 400 | Thiếu / sai định dạng `today` hoặc `date` (JSON array issue của zod) |
| 401 | Chưa login |

## Endpoint reference nhanh (toàn app)

```
POST   /api/auth/login | /api/auth/logout        GET /api/health (public)
GET    /api/exercises            POST /api/exercises        GET|PATCH|DELETE /api/exercises/:id
POST   /api/presets/seed
GET    /api/routines             POST /api/routines         GET|PATCH|DELETE /api/routines/:id
POST   /api/routines/:id/items   PATCH|DELETE /api/routines/:id/items/:itemId
POST   /api/routines/:id/items/reorder
GET    /api/sessions             POST /api/sessions         GET|PATCH|DELETE /api/sessions/:id
GET    /api/stats/overview?today=    GET /api/stats/today?date=
```

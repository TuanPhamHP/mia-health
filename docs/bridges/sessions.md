# Bridge — Sessions (buổi tập)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-23).

## Data model

### `SessionDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id` | number | |
| `date` | `'YYYY-MM-DD'` | Ngày theo giờ **địa phương** của người tập — client gửi (`localDateIso(startedAt)`) |
| `routineId` | number \| null | null = buổi tự do hoặc giáo án đã bị xoá |
| `title` | string | Snapshot tên giáo án / nhãn tự do |
| `startedAt` | ISO string \| null | null với buổi ghi thủ công |
| `durationSec` | number | Thời gian tập thật (không tính lúc tạm dừng) |
| `completed` | boolean | false = dừng sớm |
| `feeling` | 1–5 \| null | 😫 😕 🙂 😊 🤩 |
| `note` | string \| null | |
| `createdAt` / `updatedAt` | ISO / ISO \| null | |
| `entries` | `SessionEntryDTO[]` | theo `position` |

### `SessionEntryDTO` — snapshot, đọc được kể cả khi bài đã bị xoá

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id`, `sessionId`, `position` | number | |
| `exerciseId` | number \| null | null nếu bài đã bị xoá khỏi thư viện |
| `exerciseName`, `category`, `mode` | string / enum | snapshot. `mode` luôn là bài đơn (`reps` \| `hold` \| `duration`) — bài kết hợp được ghi thành **từng bài con** (luân phiên: `setsPlanned`/`setsDone` đếm theo vòng) |
| `setsPlanned`, `setsDone` | number | |
| `reps`, `holdSec`, `durationSec` | number | 0 khi không áp dụng cho mode |

```json
{
  "id": 1, "date": "2026-10-22", "routineId": 1, "title": "Kegel hằng ngày",
  "startedAt": null, "durationSec": 540, "completed": true, "feeling": 3, "note": null,
  "createdAt": "2026-10-23T06:02:47.000Z", "updatedAt": null,
  "entries": [{ "id": 1, "sessionId": 1, "exerciseId": 1, "exerciseName": "Kegel giữ lâu", "category": "kegel",
    "mode": "hold", "position": 0, "setsPlanned": 3, "setsDone": 3, "reps": 10, "holdSec": 5, "durationSec": 0 }]
}
```

## Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/sessions` | query `from?`, `to?` (`YYYY-MM-DD`), `routineId?`, `limit?` (1–500, mặc định 200) | `SessionDTO[]` — mới nhất trước |
| POST | `/api/sessions` | `{ date, title, durationSec, routineId?, startedAt? (ISO có offset), completed? (mặc định true), feeling?, note?, entries?: [{ exerciseId?, exerciseName, category, mode, setsPlanned, setsDone, reps, holdSec, durationSec }] }` (tối đa 200 entry — bài kết hợp trải thành nhiều entry) | `SessionDTO` |
| GET | `/api/sessions/:id` | | `SessionDTO` |
| PATCH | `/api/sessions/:id` | `{ date?, title?, durationSec?, completed?, feeling?, note? }` — entries không sửa được | `SessionDTO` |
| DELETE | `/api/sessions/:id` | | `SessionDTO` (trước khi xoá; entries xoá theo) |

## Lỗi

| Status | Khi nào | message mẫu |
|--------|---------|-------------|
| 400 | zod sai | JSON array issue |
| 400 | `from > to` | `` `from` phải trước hoặc bằng `to` `` |
| 400 | `routineId` không tồn tại | `Giáo án không tồn tại` |
| 400 | `exerciseId` trong entries không tồn tại | `Bài tập không tồn tại: 999` |
| 404 | id không tồn tại | `Buổi tập không tồn tại` |

## Callout FE

- Player tự POST khi hết giáo án, rồi PATCH `feeling`/`note` ở màn hình kết thúc. Dừng sớm: chỉ gửi entry có `setsDone > 0`, `completed: false`.
- Buổi không có entry vẫn hợp lệ (ghi thủ công "Gym 1 tiếng") và vẫn tính streak.
- Server ghi entries bằng batch (D1 tối đa 100 tham số/câu ⇒ cắt 9 entry/câu); batch lỗi thì buổi tập bị xoá lại — không bao giờ có buổi "rỗng" do lỗi giữa chừng.

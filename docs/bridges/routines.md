# Bridge — Routines (giáo án)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-23).

## Data model

### `RoutineDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id` | number | |
| `name` | string | Duy nhất, không phân biệt hoa thường |
| `description` | string \| null | |
| `scheduleMask` | number (0–127) | Bit (isoDay − 1): bit 0 = Thứ 2 … bit 6 = CN. 127 = mỗi ngày, 0 = không lịch. Helper: `shared/utils/weekday.ts` |
| `prepSec` | number (0–60) | Đếm ngược chuẩn bị trước mỗi bài |
| `sortOrder` | number | Tạo mới = max + 1 |
| `isArchived` | boolean | |
| `createdAt` / `updatedAt` | ISO string / ISO string \| null | |

### `ExercisePreviewDTO`

`{ name, category, isCombo: boolean, cover: { url, video: boolean } | null }` — ảnh bìa (`coverOf()`: media đầu tiên, YouTube → thumbnail `i.ytimg.com`; bài kết hợp chưa có media mượn bài con). `cover = null` ⇒ FE vẽ ô màu theo nhóm.

### `RoutineSummaryDTO` = `RoutineDTO` + trường tính

| Field | Công thức |
|-------|-----------|
| `itemCount` | số item |
| `previews` | `ExercisePreviewDTO[]` — tối đa 4 item đầu, để vẽ ô ảnh ghép |
| `estimatedSec` | `estimateTimelineSec(buildTimeline(items.flatMap(toPlanItems), prepSec))` — cùng hàm player dùng; mode `reps` ước 3 giây/lần; bài kết hợp tính theo bài con |

### `RoutineDetailDTO` = `RoutineSummaryDTO` + `items: RoutineItemDTO[]` (theo `position`)

### `RoutineItemDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id`, `routineId`, `exerciseId`, `position` | number | |
| `sets`, `reps`, `holdSec`, `relaxSec`, `durationSec`, `restSec` | number | Thông số **riêng của item**, copy từ bài lúc thêm. Item là bài kết hợp: chỉ `sets` (số vòng) + `restSec` (nghỉ giữa vòng) có nghĩa, và chỉ khi luân phiên |
| `createdAt` / `updatedAt` | ISO / ISO \| null | |
| `exercise` | `{ name, category, mode, comboStyle, instructions, isArchived, components, media }` | Join live từ thư viện. `media: ExerciseMediaDTO[]` (xem bridge exercises); bài con trong `components[].exercise.media` cũng có. `components: ExerciseComponentDTO[]` (xem bridge exercises) — rỗng nếu bài đơn; bài kết hợp thì là danh sách bài con **live** (sửa bài kết hợp ⇒ mọi giáo án dùng nó đổi theo) |

```json
{
  "id": 1, "name": "Kegel hằng ngày", "description": "Thở bụng khởi động, rồi Kegel chậm và Kegel nhanh.",
  "scheduleMask": 127, "prepSec": 5, "sortOrder": 0, "isArchived": false,
  "createdAt": "2026-10-23T06:02:46.000Z", "updatedAt": null, "itemCount": 3, "estimatedSec": 571,
  "items": [{
    "id": 1, "routineId": 1, "exerciseId": 3, "position": 0,
    "sets": 1, "reps": 10, "holdSec": 4, "relaxSec": 6, "durationSec": 30, "restSec": 0,
    "createdAt": "2026-10-23T06:02:46.000Z", "updatedAt": null,
    "exercise": { "name": "Thở bụng thả lỏng sàn chậu", "category": "breathing", "mode": "hold", "comboStyle": "circuit", "instructions": "…", "isArchived": false, "components": [] }
  }]
}
```

## Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/routines` | query `includeArchived?` | `RoutineSummaryDTO[]` (theo sortOrder, id) |
| POST | `/api/routines` | `{ name, description?, scheduleMask?, prepSec? }` | `RoutineDetailDTO` |
| GET | `/api/routines/:id` | | `RoutineDetailDTO` |
| PATCH | `/api/routines/:id` | `{ name?, description?, scheduleMask?, prepSec?, sortOrder?, isArchived? }` | `RoutineDetailDTO` |
| DELETE | `/api/routines/:id` | | `RoutineDetailDTO` (trước khi xoá) |
| POST | `/api/routines/:id/items` | `{ exerciseId, sets?, reps?, holdSec?, relaxSec?, durationSec?, restSec? }` — bỏ trống ⇒ copy từ bài | `RoutineDetailDTO` |
| PATCH | `/api/routines/:id/items/:itemId` | thông số, ít nhất 1 field | `RoutineDetailDTO` |
| DELETE | `/api/routines/:id/items/:itemId` | | `RoutineDetailDTO` |
| POST | `/api/routines/:id/items/reorder` | `{ itemIds: number[] }` — hoán vị ĐỦ các item hiện có | `RoutineDetailDTO` |

Mọi thao tác trên item trả **bản chi tiết mới nhất** của giáo án — FE gán thẳng, không cần GET lại.

Item là bài kết hợp (luân phiên 2 vòng, nghỉ giữa vòng 30s — `components` cắt bớt):

```json
{
  "id": 12, "routineId": 4, "exerciseId": 16, "position": 0,
  "sets": 2, "reps": 10, "holdSec": 5, "relaxSec": 5, "durationSec": 30, "restSec": 30,
  "createdAt": "2026-10-23T07:30:48.000Z", "updatedAt": null,
  "exercise": {
    "name": "Core circuit", "category": "strength", "mode": "combo", "comboStyle": "circuit",
    "instructions": "Làm liên tục", "isArchived": false,
    "components": [{ "id": 9, "comboId": 16, "exerciseId": 7, "position": 0,
      "sets": 3, "reps": 15, "holdSec": 5, "relaxSec": 5, "durationSec": 30, "restSec": 45,
      "exercise": { "name": "Gập bụng (Crunch)", "category": "strength", "mode": "reps", "instructions": "…", "isArchived": false } }]
  }
}
```

FE/player trải item thành bài con bằng `toPlanItems(item, index)` (`shared/utils/timeline.ts`) — đừng tự viết lại.

## Lỗi

| Status | Khi nào | message mẫu |
|--------|---------|-------------|
| 400 | zod sai | JSON array issue |
| 400 | Thêm bài không tồn tại | `Bài tập không tồn tại` |
| 400 | Thêm bài đã lưu trữ | `Bài tập "…" đã lưu trữ — khôi phục trước khi thêm` |
| 400 | reorder thiếu/thừa/trùng id | `itemIds phải chứa đúng và đủ các bài hiện có của giáo án` |
| 404 | Giáo án không tồn tại | `Giáo án không tồn tại` |
| 404 | Item không thuộc giáo án | `Bài trong giáo án không tồn tại` |
| 409 | Trùng tên | `Đã có giáo án tên "…"` |

## Callout FE

- Xoá giáo án: item xoá theo (CASCADE); buổi tập đã ghi **giữ nguyên**, `routineId` về `null`, `title` còn tên.
- Muốn biết giáo án có lịch hôm nay: `isScheduledOn(scheduleMask, localDateIso())` — hoặc dùng `GET /api/stats/today`.

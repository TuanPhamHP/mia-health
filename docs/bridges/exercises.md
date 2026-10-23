# Bridge — Exercises (thư viện bài tập, gồm bài kết hợp + ảnh/video) + Presets (bộ mẫu)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-23). Mọi request cần cookie session (xem CLAUDE.md §9).

## Data model — `ExerciseDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id` | number | |
| `name` | string | Duy nhất, so **không phân biệt hoa thường kể cả chữ có dấu** ("ĐỨNG" ≡ "đứng") |
| `category` | `'kegel' \| 'strength' \| 'gymnastics' \| 'stretching' \| 'cardio' \| 'breathing' \| 'other'` | |
| `mode` | `'reps' \| 'hold' \| 'duration' \| 'combo'` | Cách thực hiện — quyết định trường thông số nào có nghĩa. `combo` = **bài kết hợp** (xem mục riêng) |
| `comboStyle` | `'circuit' \| 'sequence'` | Chỉ có nghĩa khi `mode = 'combo'` (bài đơn luôn là `'circuit'`, bỏ qua) |
| `sets` | number (1–20) | mọi mode; `combo` luân phiên = **số vòng** |
| `reps` | number (1–200) | `reps`, `hold` |
| `holdSec` | number (1–600) | `hold` — thời gian siết / hít vào |
| `relaxSec` | number (0–600) | `hold` — thời gian thả / thở ra |
| `durationSec` | number (1–3600) | `duration` — mỗi set |
| `restSec` | number (0–600) | nghỉ giữa các set; `combo` luân phiên = **nghỉ giữa vòng** |
| `instructions` | string \| null | |
| `isArchived` | boolean | Ẩn khỏi danh sách mặc định, không thêm được vào giáo án |
| `createdAt` | ISO string | |
| `updatedAt` | ISO string \| null | |
| `routineCount` | number | **Tính toán** — số giáo án (khác nhau) đang dùng bài. `> 0` ⇒ DELETE trả 409 |
| `comboCount` | number | **Tính toán** — số bài kết hợp (khác nhau) dùng bài này làm bài con. `> 0` ⇒ DELETE trả 409 |
| `components` | `ExerciseComponentDTO[]` | Bài con theo `position` — `[]` nếu không phải bài kết hợp |
| `media` | `ExerciseMediaDTO[]` | Ảnh / video hướng dẫn theo `position`; phần tử đầu = ảnh bìa |

Cả 6 trường thông số **luôn có giá trị** dù mode không dùng tới (DB NOT NULL) — FE chỉ hiển thị trường đúng mode.

```json
{
  "id": 1, "name": "Kegel giữ lâu", "category": "kegel", "mode": "hold",
  "sets": 3, "reps": 10, "holdSec": 5, "relaxSec": 5, "durationSec": 30, "restSec": 30,
  "instructions": "Siết cơ sàn chậu như đang nhịn tiểu…", "isArchived": false,
  "createdAt": "2026-10-23T06:02:46.000Z", "updatedAt": null, "routineCount": 1,
  "comboStyle": "circuit", "comboCount": 0, "components": [], "media": []
}
```

## Ảnh / video hướng dẫn — `ExerciseMediaDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id`, `exerciseId`, `position` | number | |
| `kind` | `'image' \| 'youtube'` | Server tự nhận loại khi thêm qua link |
| `url` | string | Ảnh tải lên: `/media/exercises/<id>/<uuid>.<ext>` (route của app, cần cookie). Ảnh link: https ngoài. YouTube: dạng chuẩn `https://www.youtube.com/watch?v=<id>[&t=<n>s]` |
| `storageKey` | string \| null | Có ⇒ ảnh tải lên R2 (xoá media là xoá luôn file) |
| `caption` | string \| null | ≤ 200 ký tự |

```json
[
  { "id": 3, "exerciseId": 20, "position": 0, "kind": "image",
    "url": "/media/exercises/20/4cf19294-f3da-471f-873a-1ab3c49c391d.png",
    "storageKey": "exercises/20/4cf19294-f3da-471f-873a-1ab3c49c391d.png", "caption": "Tư thế bắt đầu" },
  { "id": 4, "exerciseId": 20, "position": 1, "kind": "youtube",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s", "storageKey": null, "caption": "Video mẫu" }
]
```

FE: link nhúng / thumbnail / ảnh bìa dùng `parseYouTube`, `youtubeEmbedUrl`, `coverOf` ở `shared/utils/media.ts` — đừng tự parse link.

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/exercises/:id/media/upload` | `multipart/form-data`: `file` (JPEG/PNG/WebP/GIF, ≤ 5 MB — nhận theo magic bytes), `caption?` | `ExerciseDTO` |
| POST | `/api/exercises/:id/media` | `{ url: "https://…", caption? }` — YouTube (watch / youtu.be / shorts / embed / live, giữ `t=`) hoặc link ảnh | `ExerciseDTO` |
| PATCH | `/api/exercises/:id/media/:mediaId` | `{ caption: string \| null }` | `ExerciseDTO` |
| DELETE | `/api/exercises/:id/media/:mediaId` | | `ExerciseDTO` (ảnh tải lên: file R2 bị xoá) |
| POST | `/api/exercises/:id/media/reorder` | `{ mediaIds: number[] }` — hoán vị ĐỦ media hiện có | `ExerciseDTO` |
| GET | `/media/<key>` | cookie session | file ảnh, `Cache-Control: private, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`, `ETag` |

Ảnh tải lên **phải** đi qua `uploadMedia()` của `useExercises` với blob từ `prepareImage()` (`app/utils/image.ts` — thu nhỏ + xoá EXIF/GPS).

## Bài kết hợp (`mode = 'combo'`)

Bài tập ghép từ ≥ 2 bài đơn trong thư viện, có thứ tự, trùng bài được. Chỉ **một tầng**: bài con luôn là bài đơn.

| `comboStyle` | Chạy thế nào | Trường có nghĩa |
|--------------|--------------|-----------------|
| `circuit` (luân phiên) | Mỗi vòng 1 set của từng bài con, nghỉ giữa vòng, lặp `sets` vòng | Bài kết hợp: `sets` = số vòng, `restSec` = nghỉ giữa vòng. Bài con: `reps`/`holdSec`/`relaxSec`/`durationSec` của **một lượt**, `restSec` = nghỉ trước bài kế (bài con cuối: bỏ qua — sau nó là nghỉ giữa vòng), `sets` bỏ qua |
| `sequence` (lần lượt) | Hết các set của bài con này mới sang bài kế — y như các bài liền nhau trong giáo án (có chuẩn bị trước mỗi bài) | Bài kết hợp: không trường nào. Bài con: nghĩa y như bài rời |

### `ExerciseComponentDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id`, `comboId`, `exerciseId`, `position` | number | `id` đổi mỗi lần PATCH `components` (ghi đè cả cụm) — đừng lưu |
| `sets`, `reps`, `holdSec`, `relaxSec`, `durationSec`, `restSec` | number | Thông số **riêng của bài con**, copy từ thư viện lúc thêm |
| `exercise` | `{ name, category, mode, instructions, isArchived }` | Join live; `mode` luôn là bài đơn |

```json
{
  "id": 16, "name": "Core circuit", "category": "strength", "mode": "combo", "comboStyle": "circuit",
  "sets": 3, "reps": 10, "holdSec": 5, "relaxSec": 5, "durationSec": 30, "restSec": 60,
  "instructions": "Làm liên tục", "isArchived": false,
  "createdAt": "2026-10-23T07:30:47.000Z", "updatedAt": "2026-10-23T07:30:48.000Z",
  "routineCount": 1, "comboCount": 0,
  "components": [{
    "id": 9, "comboId": 16, "exerciseId": 7, "position": 0,
    "sets": 3, "reps": 15, "holdSec": 5, "relaxSec": 5, "durationSec": 30, "restSec": 45,
    "exercise": { "name": "Gập bụng (Crunch)", "category": "strength", "mode": "reps", "instructions": "…", "isArchived": false }
  }]
}
```

## Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/exercises` | query `category?`, `includeArchived?` (`'true'\|'false'`) | `ExerciseDTO[]` — sắp theo category, name |
| POST | `/api/exercises` | `{ name, category, mode, sets?, reps?, holdSec?, relaxSec?, durationSec?, restSec?, instructions?, comboStyle?, components? }` — thông số bỏ trống lấy default (3 set, 10 lần, giữ 5s, thả 5s, 30s, nghỉ 30s). `mode = 'combo'` ⇒ **bắt buộc** `components: [{ exerciseId, sets?, reps?, holdSec?, relaxSec?, durationSec?, restSec? }]` (2–20 bài, thông số bỏ trống copy từ thư viện); bài đơn thì không được gửi `components` | `ExerciseDTO` |
| GET | `/api/exercises/:id` | | `ExerciseDTO` |
| PATCH | `/api/exercises/:id` | mọi field của POST + `isArchived`, ít nhất 1 field. `components` có mặt ⇒ **thay toàn bộ** danh sách bài con (thứ tự = thứ tự mảng); không gửi ⇒ giữ nguyên. Không đổi được `mode` giữa bài đơn ↔ `combo` | `ExerciseDTO` |
| DELETE | `/api/exercises/:id` | | `ExerciseDTO` (bản trước khi xoá). Bài kết hợp: bài con xoá theo |
| POST | `/api/presets/seed` | `{ today: 'YYYY-MM-DD' }` (bắt buộc, `localDateIso()`) — ngày bắt đầu của chương trình mẫu "đang theo" | `{ exercisesCreated: number, routinesCreated: number, programsCreated: number }` |

## Lỗi

| Status | Khi nào | message mẫu |
|--------|---------|-------------|
| 400 | Body/query sai zod | JSON array các issue của zod |
| 401 | Chưa login | `Chưa đăng nhập` |
| 404 | id không tồn tại | `Bài tập không tồn tại` |
| 409 | Trùng tên | `Đã có bài tập tên "Kegel nhanh"` |
| 409 | Xoá bài đang trong giáo án | `Bài tập đang nằm trong 1 giáo án — gỡ khỏi giáo án hoặc lưu trữ thay vì xoá` |
| 409 | Xoá bài đang là bài con | `Bài tập đang nằm trong 1 bài kết hợp — gỡ khỏi bài kết hợp hoặc lưu trữ thay vì xoá` |
| 400 | `combo` thiếu `components` / bài đơn có `components` / < 2 hoặc > 20 bài | JSON array issue zod (`Bài kết hợp cần danh sách bài con`, `Chỉ bài kết hợp mới có bài con`, `Bài kết hợp cần ít nhất 2 bài`) |
| 400 | Bài con là bài kết hợp | `"Core circuit" là bài kết hợp — không lồng được vào bài kết hợp khác` |
| 400 | Bài con không tồn tại | `Bài tập không tồn tại: 99999` |
| 400 | Thêm **mới** bài đã lưu trữ làm bài con (bài con sẵn có rồi mới lưu trữ thì vẫn giữ được khi PATCH) | `Bài tập "…" đã lưu trữ — khôi phục trước khi thêm` |
| 400 | PATCH đổi `mode` bài đơn ↔ `combo` | `Không đổi được giữa bài đơn và bài kết hợp — hãy tạo bài mới` |
| 400 | PATCH `components` cho bài đơn | `Chỉ bài kết hợp mới có bài con` |
| 400 | Upload không phải ảnh (dù khai `image/*`) | `Chỉ nhận ảnh JPEG, PNG, WebP hoặc GIF` |
| 400 | Upload thiếu `file` | `Thiếu file ảnh` |
| 400 | Link không phải https / không phải URL | JSON array issue zod (`Link phải bắt đầu bằng https://`) |
| 400 | Quá 10 media | `Mỗi bài tối đa 10 ảnh / video` |
| 400 | reorder thiếu/thừa id | `mediaIds phải chứa đúng và đủ ảnh / video hiện có của bài` |
| 404 | media không thuộc bài | `Ảnh / video không tồn tại` |
| 413 | Ảnh > 5 MB | `Ảnh quá lớn (tối đa 5 MB)` |
| 401 / 404 | `GET /media/…` chưa đăng nhập / key sai dạng hoặc không có | (trang lỗi HTML) |

## Callout FE

- Xoá bài đã có trong **lịch sử** (không trong giáo án) là hợp lệ — entry giữ `exerciseName` snapshot, `exerciseId` về `null`. Xoá bài cũng xoá mọi ảnh tải lên của nó trên R2.
- Sửa thông số bài ở thư viện **không** đổi các giáo án đã có (item copy thông số lúc thêm), cũng **không** đổi bài con của các bài kết hợp (bài con cũng copy).
- Ngược lại, sửa **danh sách bài con** của bài kết hợp thì mọi giáo án dùng nó đổi theo — item giáo án chỉ copy số vòng / nghỉ giữa vòng.
- Chạy bài kết hợp: `toPlanItems({ ...e, exerciseId: e.id, exercise: e }, 0)` rồi `buildTimeline` như bài thường. Lịch sử ghi từng bài con.
- `POST /api/presets/seed` idempotent theo tên: gọi lại chỉ thêm phần còn thiếu, không ghi đè thông số đã chỉnh. DB trống ⇒ `{ "exercisesCreated": 62, "routinesCreated": 11, "programsCreated": 4 }`; DB đã có bộ mẫu cũ (trước khi có chương trình) ⇒ `{ "exercisesCreated": 0, "routinesCreated": 1, "programsCreated": 4 }`; gọi lại ⇒ toàn 0. Chương trình mẫu: "Giảm mỡ tại nhà" (2 giai đoạn × 4 tuần) và "Sàn chậu & sinh lý nam" (26 tuần, lặp) **đang theo** từ `today`; "Core cơ bản không dụng cụ", "Thư giãn buổi tối" chưa theo. Ghi theo 4 batch (bài đơn → bài kết hợp → giáo án → chương trình), dưới trần 50 query/request của gói Workers Free. Bài / giáo án mẫu đang bị lưu trữ mà bộ mẫu cần dùng ⇒ 400 `… đã lưu trữ — khôi phục trước khi thêm`, lô đó không ghi gì.

# Bridge — Programs (chương trình) + Plan (lịch ngày)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-23).

**Chương trình** = mục tiêu + các **giai đoạn** nối tiếp, mỗi giai đoạn một **lịch tuần** (thứ → giáo án). Lịch tập CHỈ nằm ở đây — giáo án không còn `scheduleMask`. Nhiều chương trình được theo cùng lúc; màn Hôm nay gộp buổi của mọi chương trình đang theo. **Plan** = lịch của một ngày cụ thể + thay đổi chỉ cho ngày đó (bỏ qua / đổi buổi / thêm buổi).

## Data model

### `ProgramDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id` | number | |
| `name` | string | Duy nhất, không phân biệt hoa thường |
| `goal` | `'fat_loss' \| 'muscle' \| 'health' \| 'rehab' \| 'pelvic' \| 'mobility' \| 'other'` | Nhãn / icon / màu: `GOAL_*` ở `app/utils/labels.ts` |
| `description` | string \| null | "Vì sao" — hiện ở màn Hôm nay |
| `startDate` | `'YYYY-MM-DD'` \| null | Giờ địa phương do client gửi; `null` = không theo |
| `repeat` | boolean | Hết giai đoạn cuối: `true` quay lại giai đoạn 1, `false` hoàn thành |
| `sortOrder` | number | Tạo mới = max + 1 |
| `createdAt` / `updatedAt` | ISO / ISO \| null | |

### `ProgramDetailDTO` = `ProgramDTO` + `phases: ProgramPhaseDetailDTO[]` (theo `position`, luôn ≥ 1)

`ProgramPhaseDetailDTO` = `{ id, programId, position, name, weeks, note: string | null, createdAt, updatedAt, slots: ProgramSlotDTO[] }` — `slots` theo `weekday` rồi `position`.

`ProgramSlotDTO` = `{ id, phaseId, weekday (ISO 1 = T2 … 7 = CN), routineId, position, routine: { name, description, itemCount, estimatedSec, isArchived, previews } }`. `routine` join **live** — ô lịch tham chiếu giáo án (không copy), sửa giáo án là lịch đổi theo.

**Trạng thái không trả từ server** (phụ thuộc "hôm nay" của client): `programStatus(program, localDateIso())` ở `shared/utils/program.ts` → `{ kind: 'idle' } | { kind: 'upcoming', startDate } | { kind: 'active', week, totalWeeks, cycle, phaseIndex, weekInPhase } | { kind: 'finished', endDate }`. Tuần 1 = tuần ISO (T2 → CN) chứa `startDate`.

```json
{
  "id": 2, "name": "Sàn chậu & sinh lý nam", "goal": "pelvic", "description": "Buổi Kegel thứ hai trong ngày (buổi tối,…",
  "startDate": "2026-10-23", "repeat": true, "sortOrder": 1, "createdAt": "2026-10-23T10:59:44.000Z", "updatedAt": null,
  "phases": [{
    "id": 3, "programId": 2, "position": 0, "name": "6 tháng đầu", "weeks": 26,
    "note": "Đều đặn quan trọng hơn cố sức: siết đúng cơ, thả lỏng hoàn toàn giữa các lần.",
    "createdAt": "2026-10-23T10:59:44.000Z", "updatedAt": null,
    "slots": [{
      "id": 15, "phaseId": 3, "weekday": 1, "routineId": 1, "position": 0,
      "routine": { "name": "Kegel hằng ngày", "description": "Thở bụng khởi động, rồi Kegel chậm và Kegel nhanh.", "itemCount": 3, "estimatedSec": 571, "isArchived": false,
        "previews": [{ "name": "Thở bụng thả lỏng sàn chậu", "category": "breathing", "isCombo": false, "cover": null }] }
    }]
  }]
}
```

### `TodayPlanDTO`

| Field | Ghi chú |
|-------|---------|
| `date`, `weekday` | Ngày client gửi + ISO weekday |
| `programs: PlanProgramDTO[]` | Chương trình có `startDate` (kể cả `upcoming` / `finished`), theo `sortOrder` |
| `idlePrograms: { id, name, goal }[]` | Chương trình không theo — để gợi ý |
| `extras: PlanEntryDTO[]` | Buổi thêm riêng hôm đó, ngoài mọi chương trình |
| `sessions: SessionDTO[]` | Buổi đã ghi trong ngày (xem bridge sessions) |

`PlanProgramDTO` = `{ id, name, goal, description, startDate, repeat, status (như programStatus), phase: { name, note, weeks } | null (chỉ khi active), entries: PlanEntryDTO[] }`. `entries` rỗng ⇒ hôm nay nghỉ theo lịch.

`PlanEntryDTO` = `{ routine: { id, name, description, itemCount, estimatedSec, previews }, skipped, replaces: { id, name } | null, changeId: number | null, doneCount }`:
- Đúng lịch: `changeId = null`.
- Bỏ qua: `skipped = true`, `routine` = buổi gốc.
- Đổi buổi: `routine` = buổi thay vào, `replaces` = buổi gốc.
- `doneCount` = số buổi đã ghi hôm đó của `routine`.

```json
{
  "date": "2026-10-23", "weekday": 5,
  "programs": [{
    "id": 1, "name": "Giảm mỡ tại nhà", "goal": "fat_loss", "description": "Giảm mỡ, giữ cơ, khoẻ tim mạch…",
    "startDate": "2026-10-23", "repeat": false,
    "status": { "kind": "active", "week": 1, "totalWeeks": 8, "cycle": 1, "phaseIndex": 0, "weekInPhase": 1 },
    "phase": { "name": "Nền tảng", "note": "Học kỹ thuật, chọn mức tạ…", "weeks": 4 },
    "entries": [{
      "routine": { "id": 8, "name": "T6 · Toàn thân sức mạnh", "description": "Deadlift sumo + hít đất, lunge…", "itemCount": 7, "estimatedSec": 2044,
        "previews": [{ "name": "Khởi động toàn thân", "category": "stretching", "isCombo": true, "cover": null }] },
      "skipped": false, "replaces": null, "changeId": null, "doneCount": 0
    }]
  }],
  "idlePrograms": [{ "id": 3, "name": "Core cơ bản không dụng cụ", "goal": "health" }, { "id": 4, "name": "Thư giãn buổi tối", "goal": "mobility" }],
  "extras": [], "sessions": []
}
```

## Endpoints

Mọi thao tác ghi trên một chương trình trả `ProgramDetailDTO` mới nhất; thao tác plan trả `TodayPlanDTO` của ngày đó — FE gán thẳng.

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/programs` | | `ProgramDetailDTO[]` |
| POST | `/api/programs` | `{ name, goal, description?, repeat? }` — tạo kèm sẵn "Giai đoạn 1" (4 tuần, lịch trống) | `ProgramDetailDTO` |
| GET | `/api/programs/:id` | | `ProgramDetailDTO` |
| PATCH | `/api/programs/:id` | mọi field của POST + `startDate` (`'YYYY-MM-DD'` = bắt đầu theo, `null` = dừng), `sortOrder`; ít nhất 1 field | `ProgramDetailDTO` |
| DELETE | `/api/programs/:id` | | `ProgramDetailDTO` (bản trước khi xoá). Giai đoạn, lịch, thay đổi trong ngày đi theo; giáo án + lịch sử giữ nguyên |
| POST | `/api/programs/:id/phases` | `{ name, weeks (1–52), note?, copyFromPhaseId? }` — `copyFromPhaseId` chép lịch tuần của giai đoạn đó | `ProgramDetailDTO` |
| PATCH | `/api/programs/:id/phases/:phaseId` | `{ name?, weeks?, note? }` | `ProgramDetailDTO` |
| DELETE | `/api/programs/:id/phases/:phaseId` | | `ProgramDetailDTO` |
| POST | `/api/programs/:id/phases/reorder` | `{ phaseIds }` — hoán vị đúng của các giai đoạn hiện có | `ProgramDetailDTO` |
| POST | `/api/programs/:id/phases/:phaseId/slots` | `{ weekday (1–7), routineId }` — thêm vào cuối ngày | `ProgramDetailDTO` |
| DELETE | `/api/programs/:id/phases/:phaseId/slots/:slotId` | | `ProgramDetailDTO` |
| GET | `/api/plan/today` | query `date` **bắt buộc** (`localDateIso()`) | `TodayPlanDTO` |
| POST | `/api/plan/changes` | `{ kind: 'skip', date, programId, routineId }` \| `{ kind: 'swap', date, programId, routineId, replacementId }` \| `{ kind: 'add', date, routineId }` | `TodayPlanDTO` của `date` |
| DELETE | `/api/plan/changes/:id` | | `TodayPlanDTO` của ngày chứa thay đổi (hoàn tác) |

## Lỗi

| Status | Khi nào | message mẫu |
|--------|---------|-------------|
| 400 | Body/query sai zod (thiếu `date`, `weeks` ngoài 1–52, `kind` lạ…) | JSON array các issue của zod |
| 404 | id không tồn tại / không thuộc chương trình | `Chương trình không tồn tại`, `Giai đoạn không tồn tại`, `Buổi trong lịch không tồn tại`, `Thay đổi không tồn tại` |
| 409 | Trùng tên | `Đã có chương trình tên "Phục hồi đau lưng"` |
| 400 | Xoá giai đoạn cuối cùng | `Chương trình cần ít nhất một giai đoạn` |
| 400 | reorder thiếu/thừa id | `phaseIds phải chứa đúng và đủ các giai đoạn hiện có` |
| 400 | Thêm giáo án đã lưu trữ vào lịch | `Giáo án "…" đã lưu trữ — khôi phục trước khi thêm` |
| 400 | skip / swap buổi không có trong lịch của chương trình ngày đó | `"T7 · Chạy 4×4" không có trong lịch của "Giảm mỡ tại nhà" ngày này` |
| 400 | swap sang chính nó | `Chọn một giáo án khác để đổi` |
| 400 | swap / add giáo án đã lưu trữ | `Giáo án "…" đã lưu trữ — khôi phục trước khi chọn` |

## Callout FE

- Bỏ qua / đổi buổi: mỗi buổi theo lịch giữ **một** thay đổi mỗi ngày — gửi cái mới thì cái cũ bị thay (đổi rồi bấm bỏ qua ⇒ chỉ còn bỏ qua; hoàn tác ⇒ về đúng lịch). `add` trùng giáo án trong cùng ngày bị bỏ qua (không tạo 2 lần).
- Đổi buổi lần nữa: gửi `routineId` = buổi **gốc** (`replaces.id`), không phải buổi đang thay.
- Thay đổi trỏ tới buổi không còn trong lịch (chương trình sửa sau đó) tự bị bỏ qua, không lỗi.
- "Xong x/y" = số entry (không bỏ qua, gồm `extras`) có `doneCount > 0`.
- Giáo án đang có trong lịch không xoá được (409, xem bridge routines) — gỡ khỏi lịch hoặc lưu trữ.

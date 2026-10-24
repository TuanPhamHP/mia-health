# Bridge — Meals (nhật ký ăn, thực đơn, mục tiêu dinh dưỡng)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-24). Phần 3 của module dinh dưỡng.

- **Nhật ký ăn** (`meal_entries`): mỗi dòng = một món (theo **phần**, hoặc theo **gam món chín** nếu món đã cân cả nồi) hoặc một thực phẩm (theo **gam phần ăn được**), ghi vào một bữa của một ngày. Dinh dưỡng là **SNAPSHOT lúc ghi** cho đúng lượng đã ăn (như lịch sử buổi tập): sửa công thức / thực phẩm về sau KHÔNG viết lại ngày cũ; xoá món / thực phẩm ⇒ `dishId` / `foodId` về null, tên + dinh dưỡng giữ nguyên. Đổi lượng ⇒ snapshot nhân theo tỉ lệ (không lấy lại từ thư viện).
- **Thực đơn** (`menus` + `menu_items`): bộ món cho một ngày, chia theo bữa, **tham chiếu live** (dinh dưỡng tính theo công thức hiện tại). Áp vào một ngày = chép các dòng sang nhật ký (nối sau những gì đã ghi), lúc đó mới chụp snapshot.
- **Mục tiêu** (`nutrition_targets`, một dòng `id = 1`): kcal + đạm / béo / glucid / xơ, natri là mức **tối đa**. Chưa đặt ⇒ mặc định 2.000 kcal, xơ 28 g (FDA), natri ≤ 2.000 mg (WHO, < 5 g muối); đạm / béo / glucid để trống. Mục tiêu tính từ cân nặng / TDEE: `POST /api/body/apply-targets` (bridge [body](body.md)).

`date` luôn là `'YYYY-MM-DD'` giờ địa phương do **client** gửi (`localDateIso()`), như mọi chỗ khác của app.

## Data model

### Dòng (dùng chung cho nhật ký và thực đơn)

| Field | Ghi chú |
|-------|---------|
| `meal` | `'breakfast' \| 'lunch' \| 'dinner' \| 'snack'` — nhãn `MEAL_LABELS` (`app/utils/meals.ts`) |
| `dishId` / `foodId` | Đúng MỘT trong hai (CHECK ở `menu_items`); nhật ký có thể cả hai null sau khi gốc bị xoá |
| `amount` + `unit` | `unit = 'serving'`: số phần món; `unit = 'g'`: gam (thực phẩm, hoặc món chín — món phải có `cookedWeightG`). Thực phẩm luôn `'g'` |
| `portionLabel` | "1 bát con", "2 quả" — chỉ để hiển thị; `amount` đã quy ra gam / phần |

### `MealEntryDTO` = dòng + `{ id, date, position, name, …29 chất (NutrientValues), missing: NutrientKey[], createdAt, updatedAt }`

29 chất cho **đúng lượng đã ăn**; `missing` như bridge dishes (có nguyên liệu thiếu số liệu ⇒ mức tối thiểu, FE hiện "≥").

### `DayLogDTO`

```json
{
  "date": "2026-10-24",
  "entries": [
    { "id": 577, "date": "2026-10-24", "meal": "lunch", "position": 2, "dishId": 40, "foodId": null, "name": "Bún chả",
      "amount": 1, "unit": "serving", "portionLabel": null, "energyKcal": 549.5, "proteinG": 21.9, "…": "29 chất",
      "missing": ["fatG", "satFatG", "monoFatG", "…"], "createdAt": "2026-10-24T02:56:48.000Z", "updatedAt": null },
    { "id": 568, "date": "2026-10-24", "meal": "snack", "position": 0, "dishId": null, "foodId": 556, "name": "Trứng gà luộc",
      "amount": 100, "unit": "g", "portionLabel": "2 quả", "energyKcal": 155, "proteinG": 12.6, "…": "29 chất",
      "missing": [], "createdAt": "2026-10-24T02:51:35.000Z", "updatedAt": null }
  ],
  "totals": { "values": { "energyKcal": 1365.6, "proteinG": 76.9, "…": "29 chất" }, "missing": ["fatG", "satFatG", "monoFatG", "…"] },
  "byMeal": { "breakfast": { "energyKcal": 336.3, "count": 1 }, "lunch": { "energyKcal": 874.305, "count": 2 },
              "dinner": { "energyKcal": 0, "count": 0 }, "snack": { "energyKcal": 155, "count": 1 } },
  "targets": { "energyKcal": 2000, "proteinG": null, "fatG": null, "carbG": null, "fiberG": 28, "sodiumMg": 2000, "updatedAt": null }
}
```

`entries` theo bữa (sáng → trưa → tối → phụ) rồi `position`. `targets.updatedAt = null` ⇒ đang dùng mặc định.

### `MenuSummaryDTO` / `MenuDetailDTO`

- Summary: `{ id, name, description, isArchived, createdAt, updatedAt, itemCount, totals: { energyKcal, proteinG, fatG, carbG } }`.
- Detail: `MenuDTO` + `items: MenuItemDTO[]` (dòng + `{ id, menuId, position, createdAt, name, isArchived, energyKcal, proteinG, fatG, carbG }` — dinh dưỡng cho đúng lượng của dòng, tính live) + `totals: { values, missing }`.

```json
{ "id": 2, "name": "Ngày ăn mẫu", "description": null, "isArchived": false, "createdAt": "2026-10-24T02:51:35.000Z", "updatedAt": null,
  "itemCount": 4, "totals": { "energyKcal": 1108.625, "proteinG": 61.03, "fatG": 41.038, "carbG": 117.115 } }
```

## Endpoints

Thao tác nhật ký trả `DayLogDTO` của ngày bị ảnh hưởng; thao tác thực đơn trả `MenuDetailDTO` — FE gán thẳng.

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/meal-log` | query `date` **bắt buộc** | `DayLogDTO` |
| POST | `/api/meal-log/entries` | `{ date, meal, dishId? \| foodId?, amount, unit, portionLabel? }` | `DayLogDTO` |
| PATCH | `/api/meal-log/entries/:id` | `{ meal?, amount?, portionLabel? }` — đổi `amount` ⇒ snapshot nhân theo tỉ lệ; đổi `meal` ⇒ xuống cuối bữa mới | `DayLogDTO` |
| DELETE | `/api/meal-log/entries/:id` | | `DayLogDTO` |
| POST | `/api/meal-log/apply-menu` | `{ date, menuId }` — chép mọi dòng, nối sau những gì đã ghi (áp 2 lần = 2 bản) | `DayLogDTO` |
| GET | `/api/nutrition-targets` | | `NutritionTargetsDTO` |
| PUT | `/api/nutrition-targets` | `{ energyKcal (800–8000), proteinG?, fatG?, carbG?, fiberG?, sodiumMg? }` — thiếu / null = không đặt | `NutritionTargetsDTO` |
| GET | `/api/menus` | query `includeArchived?` | `MenuSummaryDTO[]` (theo tên) |
| POST | `/api/menus` | `{ name, description?, items?: dòng[] (0–60) }` | `MenuDetailDTO` |
| POST | `/api/menus/from-day` | `{ date, name }` — lưu những gì đã ăn trong ngày thành thực đơn (bỏ dòng mà gốc đã bị xoá) | `MenuDetailDTO` |
| GET | `/api/menus/:id` | | `MenuDetailDTO` |
| PATCH | `/api/menus/:id` | `{ name?, description?, items?, isArchived? }` — `items` có mặt ⇒ **thay toàn bộ** (thứ tự = thứ tự mảng) | `MenuDetailDTO` |
| DELETE | `/api/menus/:id` | | `MenuDetailDTO` (trước khi xoá) — nhật ký đã áp vẫn giữ |

## Lỗi

| Status | Khi nào | message mẫu |
|--------|---------|-------------|
| 400 | zod sai / thiếu `date` / có cả `dishId` và `foodId` / thực phẩm theo phần | JSON array issue của zod (`Chọn đúng một món hoặc một thực phẩm`, `Thực phẩm ghi theo gam`) |
| 400 | Món theo gam khi chưa cân khối lượng chín | `Món "Gà rang gừng" chưa cân khối lượng chín — ghi theo phần` |
| 400 | Món / thực phẩm không tồn tại | `Món ăn không tồn tại` · `Thực phẩm không tồn tại` |
| 400 | Thêm **mới** món / thực phẩm đã lưu trữ (dòng có sẵn trong thực đơn thì giữ được) | `Món "…" đã lưu trữ — khôi phục trước khi thêm` |
| 400 | Lưu ngày trống thành thực đơn | `Ngày này chưa có món nào để lưu` |
| 404 | id không tồn tại | `Dòng nhật ký không tồn tại` · `Thực đơn không tồn tại` |
| 409 | Trùng tên thực đơn | `Đã có thực đơn tên "…"` |

Phía thư viện: xoá món / thực phẩm đang nằm trong thực đơn ⇒ **409** (`Món đang nằm trong 1 thực đơn — gỡ khỏi thực đơn hoặc lưu trữ thay vì xoá`); nằm trong nhật ký thì KHÔNG chặn (snapshot).

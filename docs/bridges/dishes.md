# Bridge — Dishes (món ăn = công thức từ thực phẩm)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-24). Phần 2 của module dinh dưỡng.

Món = danh sách thực phẩm trong kho + khối lượng **phần ăn được** cho **cả công thức**, nấu cho `servings` phần. **Dinh dưỡng không lưu** — server luôn tính từ thực phẩm hiện tại (sửa thực phẩm ⇒ mọi món dùng nó đổi theo). Nấu làm hao nước nhưng chất gần như giữ nguyên ⇒ tổng = cộng nguyên liệu; hao hụt vitamin khi nấu bỏ qua. Dầu rán / xào = lượng ngấm vào món.

**56 món mẫu** (`source = 'preset'`) nạp bằng migration `0007_seed_dishes.sql`, sinh bởi `scripts/foods/build-dishes.mjs` từ `scripts/foods/dishes.mjs`: định lượng phổ biến của bữa cơm Việt (ƯỚC LƯỢNG — không có nguồn công bố công thức chuẩn). kcal một phần đã đối chiếu với số liệu Viện Dinh dưỡng được báo chí trích dẫn (phở bò tái 314, phở chín 291, phở gà 356, bún chả 518 kcal — lệch +5–7%) và bảng tổng hợp Nutrihome (đa số lệch ≤ 10%). Nguyên liệu trỏ thực phẩm qua `(source, source_code)` nên migration bền với việc đổi tên thực phẩm.

## Data model

### `DishDTO`

| Field | Kiểu JSON | Ghi chú |
|-------|-----------|---------|
| `id`, `name` | number, string | Tên duy nhất, không phân biệt hoa thường |
| `category` | `'main' \| 'veg' \| 'soup' \| 'noodle' \| 'rice' \| 'snack' \| 'drink' \| 'other'` | Nhãn: `DISH_CATEGORY_LABELS` (`app/utils/dishes.ts`) |
| `description` | string \| null | Cách nấu / ghi chú |
| `servings` | number (1–50) | Công thức nấu cho bao nhiêu phần |
| `cookedWeightG` | number \| null | Cân cả nồi sau khi nấu — có thì có `per100gCooked` |
| `source` | `'preset' \| 'user'` | |
| `isArchived`, `createdAt`, `updatedAt` | | |

### `DishSummaryDTO` = `DishDTO` + `{ ingredientCount, perServing: { energyKcal, proteinG, fatG, carbG } }`

```json
{ "id": 37, "name": "Phở bò tái", "category": "noodle", "description": "Bánh phở, thịt bò thăn tái, hành tây, hành lá, rau mùi; nước dùng xương (không tính).",
  "servings": 1, "cookedWeightG": null, "source": "preset", "isArchived": false, "createdAt": "2026-10-24T02:05:06.000Z", "updatedAt": null,
  "ingredientCount": 6, "perServing": { "energyKcal": 336.3, "proteinG": 21.414, "fatG": 5.21, "carbG": 49.99 } }
```

### `DishDetailDTO` = `DishDTO` + `ingredients` + `nutrition`

- `ingredients: DishIngredientDTO[]` theo `position`: `{ id, dishId, foodId, grams, position, createdAt, food: { name, isArchived, energyKcal, proteinG, fatG, carbG } }` — `grams` cho cả công thức, `food.*` trên 100 g (join live).
- `nutrition: DishNutritionDTO`:

| Field | Ghi chú |
|-------|---------|
| `totalGrams` | Tổng khối lượng nguyên liệu (phần ăn được, trước khi nấu) |
| `total` | 29 chất cho cả công thức (`NutrientValues`, xem bridge foods) |
| `perServing` | `total / servings` |
| `per100gCooked` | `total × 100 / cookedWeightG`, null nếu chưa cân |
| `missing` | `NutrientKey[]` — chất có nguyên liệu thiếu số liệu (nguyên liệu khác có) ⇒ giá trị là **mức tối thiểu**, FE hiện "≥". Mọi nguyên liệu đều thiếu ⇒ giá trị null ("—"), không nằm trong `missing` |

```json
{
  "id": 37, "name": "Phở bò tái", "category": "noodle", "servings": 1, "cookedWeightG": null, "source": "preset", "…": "…",
  "ingredients": [
    { "id": 160, "dishId": 37, "foodId": 13, "grams": 150, "position": 0, "createdAt": "2026-10-24T02:05:06.000Z",
      "food": { "name": "Bánh phở", "isArchived": false, "energyKcal": 143, "proteinG": 3.2, "fatG": 0.4, "carbG": 31.7 } },
    { "id": 161, "dishId": 37, "foodId": 548, "grams": 70, "position": 1, "createdAt": "2026-10-24T02:05:06.000Z",
      "food": { "name": "Thăn bò nạc (sống)", "isArchived": false, "energyKcal": 153, "proteinG": 22.12, "fatG": 6.52, "carbG": 0 } }
  ],
  "nutrition": {
    "totalGrams": 265,
    "total": { "energyKcal": 336.3, "proteinG": 21.414, "fatG": 5.21, "carbG": 49.99, "sodiumMg": 821.2, "…": "29 chất" },
    "perServing": { "energyKcal": 336.3, "…": "29 chất" },
    "per100gCooked": null,
    "missing": ["fatG", "satFatG", "monoFatG", "polyFatG", "sugarG", "magnesiumMg", "zincMg", "vitaminB6Mg", "folateUg", "vitaminB12Ug", "vitaminDUg", "vitaminEMg"]
  }
}
```

Số thực không làm tròn ở API (VD `21.413999999999998`) — FE định dạng bằng `formatAmount()`.

## Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/dishes` | query `category?`, `q?` (tìm tên bỏ dấu), `includeArchived?` | `DishSummaryDTO[]` (theo tên, collation vi) |
| POST | `/api/dishes` | `{ name, category, servings, description?, cookedWeightG?, ingredients: [{ foodId, grams }] (1–40) }` — `source` luôn `'user'` | `DishDetailDTO` |
| GET | `/api/dishes/:id` | | `DishDetailDTO` |
| PATCH | `/api/dishes/:id` | mọi field của POST + `isArchived`, ít nhất 1 field. `ingredients` có mặt ⇒ **thay toàn bộ** (thứ tự = thứ tự mảng, cùng batch với UPDATE) | `DishDetailDTO` |
| DELETE | `/api/dishes/:id` | | `DishDetailDTO` (trước khi xoá) — nguyên liệu đi theo. Đang nằm trong thực đơn ⇒ 409; nằm trong nhật ký thì không chặn (snapshot, `dishId` về null) |

## Lỗi

| Status | Khi nào | message mẫu |
|--------|---------|-------------|
| 400 | zod sai (không nguyên liệu, `grams` ≤ 0, `servings` < 1…) | JSON array issue của zod |
| 400 | Thực phẩm không tồn tại | `Thực phẩm không tồn tại: 99999` |
| 400 | Thêm **mới** thực phẩm đã lưu trữ (thực phẩm có sẵn trong món rồi mới lưu trữ thì vẫn giữ được khi sửa) | `Thực phẩm "…" đã lưu trữ — khôi phục trước khi thêm` |
| 404 | id không tồn tại | `Món ăn không tồn tại` |
| 409 | Trùng tên (không phân biệt hoa thường) | `Đã có món tên "Cơm ức gà"` |
| 409 | Xoá món đang nằm trong thực đơn | `Món đang nằm trong 1 thực đơn — gỡ khỏi thực đơn hoặc lưu trữ thay vì xoá` |

Phía thực phẩm: `DELETE /api/foods/:id` đang là nguyên liệu ⇒ **409** `Thực phẩm đang là nguyên liệu của 2 món — gỡ khỏi món hoặc lưu trữ thay vì xoá`; `FoodDetailDTO.dishes` liệt kê các món đó.

## Callout FE

- 1 phần × n: `multiplyNutrients(nutrition.perServing, n)`; theo gam món chín: `multiplyNutrients(per100gCooked, g / 100)`.
- Truyền `nutrition.missing` vào `NutritionLabel` để hiện "≥".

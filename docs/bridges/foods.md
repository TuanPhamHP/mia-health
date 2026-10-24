# Bridge — Foods (kho thực phẩm, nhóm, khẩu phần)

> Shape lấy từ response thật (`yarn dev` + curl, 2026-10-24). Phần 1 của module dinh dưỡng — món ăn, nhật ký, chỉ số cơ thể làm sau.

Kho ban đầu **573 thực phẩm**, nạp bằng migration dữ liệu `0005_seed_foods.sql` (sinh bởi `scripts/foods/build-foods.mjs`, không qua API seed — vượt trần 50 query/request):

- **526** từ *Bảng thành phần thực phẩm Việt Nam 2007* (Viện Dinh dưỡng, NXB Y học — bản PDF FAO lưu trữ), `source = 'vn_fct_2007'`, `sourceCode` = mã số trong bảng.
- **47** từ *USDA FoodData Central SR Legacy 2018-04*, `source = 'usda_sr_legacy'`, `sourceCode` = FDC ID — các phần thịt bảng VN không tách (ức / má đùi / đùi tỏi / cánh, có / không da) và vài món chín thông dụng (cơm, ức gà luộc / nướng, trứng luộc…).

## Quy ước số liệu

- Mọi chất tính trên **100 g phần ăn được**. `refusePct` = % thải bỏ khi mua (xương, vỏ…).
- `null` = bảng nguồn **không có số liệu** — KHÁC 0. FE hiện "—", không cộng thành 0.
- `carbG` = glucid **không gồm xơ** (chuẩn Codex, như bảng VN). Số USDA "by difference" đã trừ `fiberG` khi nhập.
- `vitaminAUg` = RAE. Bảng VN quy đổi: retinol + β-caroten / 12.
- Danh mục chất, đơn vị, giá trị %DV: `NUTRIENTS` ở `shared/utils/nutrients.ts`; quy theo số gam: `scaleNutrients()`.

## Data model

### `FoodCategoryNodeDTO` (cây 2 cấp: nhóm → loại)

`{ id, parentId: null, name, position, createdAt, updatedAt, foodCount, children: [{ id, parentId, name, position, createdAt, updatedAt, foodCount }] }` — `foodCount` = thực phẩm chưa lưu trữ gắn **trực tiếp** vào nút (cả nhánh = cộng thêm các con, `branchCount()` ở `app/utils/foods.ts`).

```json
{ "id": 1, "parentId": null, "name": "Thịt", "position": 0, "createdAt": "2026-10-24T01:38:52.000Z", "updatedAt": null, "foodCount": 0,
  "children": [{ "id": 2, "parentId": 1, "name": "Gà", "position": 0, "createdAt": "2026-10-24T01:38:52.000Z", "updatedAt": null, "foodCount": 21 }] }
```

### `FoodSummaryDTO` (danh sách)

```json
{ "id": 527, "categoryId": 2, "name": "Ức gà không da (sống)", "source": "usda_sr_legacy", "energyKcal": 120, "proteinG": 22.5, "fatG": 2.62, "carbG": 0, "isArchived": false }
```

### `FoodDetailDTO` = `FoodDTO` (mọi cột) + `portions` + `category`

| Field | Ghi chú |
|-------|---------|
| `source` / `sourceCode` / `sourceName` | Nguồn + mã gốc + tên gốc (tiếng Anh) để tra lại |
| `refusePct`, `note` | number \| null, string \| null |
| 29 chất: `energyKcal` (luôn có) + `waterG`, `proteinG`, `fatG`, `satFatG`, `monoFatG`, `polyFatG`, `transFatG`, `cholesterolMg`, `carbG`, `fiberG`, `sugarG`, `sodiumMg`, `potassiumMg`, `calciumMg`, `phosphorusMg`, `magnesiumMg`, `ironMg`, `zincMg`, `vitaminAUg`, `vitaminB1Mg`, `vitaminB2Mg`, `niacinMg`, `vitaminB6Mg`, `folateUg`, `vitaminB12Ug`, `vitaminCMg`, `vitaminDUg`, `vitaminEMg` | number \| null |
| `portions` | `{ id, foodId, name, grams, position, createdAt }[]` — gram phần ăn được |
| `category` | `{ id, name, parent: { id, name } \| null }` |
| `updatedAt` | Khác null ở thực phẩm từ bảng nguồn ⇒ đã sửa, số liệu có thể khác bảng gốc |

```json
{
  "id": 563, "categoryId": 16, "name": "Cơm trắng", "source": "usda_sr_legacy", "sourceCode": "169757",
  "sourceName": "Rice, white, long-grain, regular, unenriched, cooked without salt", "refusePct": null, "note": null,
  "energyKcal": 130, "waterG": 68.44, "proteinG": 2.69, "fatG": 0.28, "satFatG": 0.077, "monoFatG": 0.088, "polyFatG": 0.076,
  "transFatG": null, "cholesterolMg": 0, "carbG": 27.77, "fiberG": 0.4, "sugarG": 0.05, "sodiumMg": 1, "potassiumMg": 35,
  "calciumMg": 10, "phosphorusMg": 43, "magnesiumMg": 12, "ironMg": 0.2, "zincMg": 0.49, "vitaminAUg": 0, "vitaminB1Mg": 0.02,
  "vitaminB2Mg": 0.013, "niacinMg": 0.4, "vitaminB6Mg": 0.093, "folateUg": 3, "vitaminB12Ug": 0, "vitaminCMg": 0,
  "vitaminDUg": 0, "vitaminEMg": 0.04, "isArchived": false, "createdAt": "2026-10-24T01:38:53.000Z", "updatedAt": null,
  "portions": [
    { "id": 1, "foodId": 563, "name": "1 bát con", "grams": 150, "position": 0, "createdAt": "2026-10-24T01:38:53.000Z" },
    { "id": 2, "foodId": 563, "name": "1 lưng bát", "grams": 100, "position": 1, "createdAt": "2026-10-24T01:38:53.000Z" }
  ],
  "category": { "id": 16, "name": "Gạo & cơm", "parent": { "id": 15, "name": "Ngũ cốc & tinh bột" } }
}
```

## Endpoints

Thao tác trên một thực phẩm / khẩu phần trả `FoodDetailDTO` mới nhất; thao tác trên nhóm trả **cả cây** mới nhất — FE gán thẳng.

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/api/food-categories` | | `FoodCategoryNodeDTO[]` (theo `position`) |
| POST | `/api/food-categories` | `{ name, parentId? }` — `parentId` null / bỏ trống = nhóm gốc | `FoodCategoryNodeDTO[]` |
| PATCH | `/api/food-categories/:id` | `{ name?, parentId?, position? }` | `FoodCategoryNodeDTO[]` |
| DELETE | `/api/food-categories/:id` | | `FoodCategoryNodeDTO[]` |
| GET | `/api/foods` | query `categoryId?` (nhóm gốc ⇒ gồm các loại con), `q?` (tìm bỏ dấu; ≥ 4 ký tự khớp cả đầu từ của tên gốc tiếng Anh), `includeArchived?` | `FoodSummaryDTO[]` — có `q`: khớp đầu tên → giữa tên → tên gốc; không `q`: theo tên (collation vi) |
| POST | `/api/foods` | `{ name, categoryId, energyKcal, note?, refusePct?, …28 chất khác? }` — chất bỏ trống / null = không có số liệu; `source` luôn `'user'` | `FoodDetailDTO` |
| GET | `/api/foods/:id` | | `FoodDetailDTO` |
| PATCH | `/api/foods/:id` | mọi field của POST + `isArchived`, ít nhất 1 field. Sửa được cả thực phẩm từ bảng nguồn (`source` giữ nguyên) | `FoodDetailDTO` |
| DELETE | `/api/foods/:id` | | `FoodDetailDTO` (trước khi xoá) — khẩu phần đi theo |
| POST | `/api/foods/:id/portions` | `{ name, grams (0 < g ≤ 5000) }` | `FoodDetailDTO` |
| PATCH | `/api/foods/:id/portions/:portionId` | `{ name?, grams? }` | `FoodDetailDTO` |
| DELETE | `/api/foods/:id/portions/:portionId` | | `FoodDetailDTO` |

## Lỗi

| Status | Khi nào | message mẫu |
|--------|---------|-------------|
| 400 | zod sai (thiếu `energyKcal`, số âm, g > 100 / 100 g…) | JSON array issue của zod |
| 400 | Nhóm thực phẩm không tồn tại khi tạo / sửa | `Nhóm thực phẩm không tồn tại` |
| 400 | Tạo / chuyển nhóm thành cấp 3 | `Chỉ chia 2 cấp: nhóm cha phải là nhóm gốc` · `Nhóm đang có loại con — không chuyển vào nhóm khác được` |
| 404 | id không tồn tại / không thuộc thực phẩm | `Thực phẩm không tồn tại` · `Nhóm thực phẩm không tồn tại` · `Khẩu phần không tồn tại` |
| 409 | Trùng tên thực phẩm (không phân biệt hoa thường) | `Đã có thực phẩm tên "Gà rán KFC (miếng đùi)"` |
| 409 | Trùng tên nhóm trong cùng nhóm cha | `Đã có nhóm tên "Gà"` |
| 409 | Xoá nhóm còn loại con / còn thực phẩm (kể cả đã lưu trữ) | `Nhóm còn loại con — xoá hoặc chuyển các loại con trước` · `Nhóm còn 1 thực phẩm — chuyển sang nhóm khác trước khi xoá` |

## Callout FE

- Dinh dưỡng cho X gam: `scaleNutrients(food, grams)` — null giữ null.
- Glucid đã **không gồm xơ**: đừng trừ xơ lần nữa khi tính "net carb".
- Danh sách không lọc trả hơn 500 dòng — trang Thực phẩm chỉ gọi khi đã chọn nhóm hoặc gõ tìm.

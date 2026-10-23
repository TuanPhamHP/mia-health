# Backend — API Conventions

> **Kế thừa từ mia-finance.** Quy tắc trong doc này áp dụng NGUYÊN VĂN cho mia-health; các ví dụ (`categories`, `transactions`, `savings`…) là module của app tài chính — module thật của app này: `exercises`, `routines`, `sessions`, `stats`, `presets` (xem `docs/bridges/`). Riêng status code: mọi request thành công trả `200`, kể cả POST.

## Base URL

```
Development:  http://localhost:3000
Production:   https://<project>.pages.dev  (Cloudflare Pages)
```

Không có prefix `/v1` — single-user app, không cần versioning.

---

## Authentication

Giai đoạn đầu: **chưa có auth**. Bảo vệ bằng env var secret khi cần. Không dựng OAuth.

---

## HTTP Methods

| Method | Dùng cho |
|--------|---------|
| `GET` | Lấy dữ liệu |
| `POST` | Tạo mới |
| `PATCH` | Cập nhật một phần |
| `DELETE` | Xoá |

Không dùng `PUT`.

---

## Naming — URL & File

Nitro dùng file-based routing: tên file = path + method.

| File | Route |
|------|-------|
| `server/api/categories.get.ts` | `GET /api/categories` |
| `server/api/categories.post.ts` | `POST /api/categories` |
| `server/api/categories/[id].patch.ts` | `PATCH /api/categories/:id` |
| `server/api/categories/[id].delete.ts` | `DELETE /api/categories/:id` |
| `server/api/summary/monthly.get.ts` | `GET /api/summary/monthly` |

Quy tắc đặt tên URL: `kebab-case`, noun số nhiều cho collection.

---

## Response Format

**Không có wrapper.** Nitro trả thẳng data:

```json
// GET /api/categories
[{ "id": 1, "name": "Ăn uống", "type": "expense", "createdAt": "2026-06-18T08:00:00.000Z" }]

// POST /api/transactions → single object
{ "id": 5, "type": "expense", "amount": 50000, "categoryId": 1, "date": "2026-06-18", ... }

// GET /api/summary/monthly
{ "income": 20000000, "expense": 8500000, "surplus": 11500000 }
```

Không bọc `{ success, data, meta }`. Frontend nhận trực tiếp.

---

## HTTP Status Codes

| Code | Khi nào |
|------|---------|
| `200` | Mọi request thành công (GET, POST, PATCH, DELETE) |
| `400` | Validation lỗi, input không hợp lệ, FK không tồn tại |
| `404` | Resource không tìm thấy |
| `409` | Conflict — ví dụ: trùng `snapshotDate` trong Net Worth |
| `500` | Server / D1 binding error |

---

## Error Format

Nitro/H3 trả error theo cấu trúc cố định:

```json
{
  "statusCode": 400,
  "statusMessage": "Server Error",
  "message": "Số tiền phải > 0",
  "stack": [...]
}
```

Frontend chỉ cần đọc `statusCode` và `message`. `stack` chỉ xuất hiện ở dev.

Tạo lỗi trong code:

```ts
throw createError({ statusCode: 404, message: 'Transaction không tồn tại' })
throw createError({ statusCode: 409, message: 'Đã có snapshot cho ngày này' })
```

---

## Pagination

**Không có.** Dataset nhỏ (vài nghìn giao dịch), filter bằng query params là đủ.

```
GET /api/transactions?from=2026-06-01&to=2026-06-30&type=expense
GET /api/networth?from=2026-01-01&to=2026-12-31
```

---

## Date & Time Conventions

| Loại | Format | Ví dụ |
|------|--------|-------|
| Ngày giao dịch / business date | `YYYY-MM-DD` (text) | `"2026-06-18"` |
| Timestamp hệ thống (`createdAt`, `updatedAt`) | ISO 8601 datetime | `"2026-06-18T08:00:00.000Z"` |

- DB lưu business date là `TEXT 'YYYY-MM-DD'`.
- DB lưu timestamp là `INTEGER` unix seconds — Drizzle mode `'timestamp'` tự serialize thành ISO khi trả JSON.
- Validate ngày dùng `z.iso.date()` (từ chối ngày không tồn tại như `2026-13-40`).

---

## Tiền (Amount)

Lưu là `INTEGER` đơn vị đồng (VND). Không dùng `REAL` hay `FLOAT`.

```ts
amount: 50000   // 50.000 đồng ✅
amount: 50.5    // ❌ — zod reject (phải là integer)
amount: 0       // ❌ — zod reject (phải > 0)
```

---

## Query Params Parsing

Mọi query param nhận từ `getQuery(event)` đều là `string`. Cần transform về đúng type qua zod:

```ts
// ✅ Đúng — transform string → number trong zod schema
categoryId: z.string().transform(v => parseInt(v, 10)).pipe(z.number().int().positive()).optional()

// ✅ Đúng — enum filter
type: z.enum(['income', 'expense']).optional()
```

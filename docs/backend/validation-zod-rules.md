# Backend — Validation & Zod Rules

> **Kế thừa từ mia-finance.** Quy tắc trong doc này áp dụng NGUYÊN VĂN cho mia-health; các ví dụ (`categories`, `transactions`, `savings`…) là module của app tài chính — module thật của app này: `exercises`, `routines`, `sessions`, `stats`, `presets` (xem `docs/bridges/`). Riêng status code: mọi request thành công trả `200`, kể cả POST.

## Nguyên tắc

- Validate **trong route handler**, trước khi gọi service
- Dùng `zod` — không validate thủ công bằng `if/typeof`
- Tất cả zod schemas đặt trong `server/utils/schemas.ts` → auto-imported vào mọi route

---

## Pattern Chuẩn

```ts
// Route handler — validate body
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createTransactionSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })
  return service.addTransaction(parsed.data)
})

// Route handler — validate query params
export default defineEventHandler(async (event) => {
  const parsed = transactionQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })
  return service.getTransactions(parsed.data)
})
```

---

## Date Validation

Dùng `z.iso.date()` (Zod v4), **không** dùng `z.string().date()` (deprecated):

```ts
// ✅ Đúng — validate cả format lẫn tính hợp lệ của ngày
const dateStr = z.iso.date()
// '2026-06-18'  → pass
// '2026-13-40'  → fail (tháng 13 không tồn tại)
// '26-06-18'    → fail (sai format)

// ❌ Deprecated
const dateStr = z.string().date()
```

---

## Query Params — Transform String → Number

Mọi query param đều là `string` khi nhận từ `getQuery()`. Cần transform trong schema:

```ts
export const transactionQuerySchema = z.object({
  from: z.iso.date().optional(),
  to:   z.iso.date().optional(),
  type: z.enum(['income', 'expense']).optional(),
  categoryId: z.string()
    .transform(v => parseInt(v, 10))
    .pipe(z.number().int().positive())
    .optional(),
})

export const summaryMonthlyQuerySchema = z.object({
  year:  z.string().transform(v => parseInt(v, 10)).pipe(z.number().int().min(2000).max(2100)),
  month: z.string().transform(v => parseInt(v, 10)).pipe(z.number().int().min(1).max(12)),
})
```

---

## Schemas Hiện Có (`server/utils/schemas.ts`)

| Schema | Dùng ở |
|--------|--------|
| `createCategorySchema` | `POST /api/categories` |
| `updateCategorySchema` | `PATCH /api/categories/:id` |
| `categoryQuerySchema` | `GET /api/categories` |
| `createTransactionSchema` | `POST /api/transactions` |
| `updateTransactionSchema` | `PATCH /api/transactions/:id` |
| `transactionQuerySchema` | `GET /api/transactions` |
| `summaryMonthlyQuerySchema` | `GET /api/summary/monthly` |
| `summaryWeeklyQuerySchema` | `GET /api/summary/weekly` |
| `createSnapshotSchema` | `POST /api/networth` |
| `updateSnapshotSchema` | `PATCH /api/networth/:id` (chưa có route) |
| `networthQuerySchema` | `GET /api/networth` |

---

## Validate Tiền (Amount)

```ts
amount: z.number().int().positive('Số tiền phải > 0')
// int() → reject 50.5
// positive() → reject 0 và số âm
```

---

## Validate Enum

```ts
const transactionType = z.enum(['income', 'expense'])
const assetClassEnum  = z.enum(['funds', 'equities', 'gold', 'savings', 'real_estate', 'cash'])
```

---

## Validate Array Không Trùng (refine)

```ts
z.array(entryInput)
  .min(1, 'Cần ít nhất một entry')
  // dùng .refine() để enforce unique constraint ở application layer
  // (trước khi hit DB)

// Trong createSnapshotSchema:
.refine(d => {
  const classes = d.entries.map(e => e.assetClass)
  return new Set(classes).size === classes.length
}, { message: 'Entries không được trùng assetClass' })
```

---

## Update Schema — Refine "ít nhất một trường"

```ts
export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['income', 'expense']).optional(),
}).refine(
  d => d.name !== undefined || d.type !== undefined,
  { message: 'Cần ít nhất một trường để cập nhật' },
)
```

---

## Response Shape

Không có Transformer layer. Route handler return thẳng Drizzle type:

```ts
// ✅ Đúng — trả Drizzle $inferSelect
return service.addCategory(parsed.data)
// → { id: 1, name: 'Ăn uống', type: 'expense', createdAt: '2026-06-18T...' }

// Không wrap { success, data }, không strip field
// Drizzle mode: 'timestamp' tự serialize Date → ISO string khi JSON.stringify
```

Frontend type tương ứng: xem `docs/backend/api.md`.

# Backend — Coding Rules

> **Kế thừa từ mia-finance.** Quy tắc trong doc này áp dụng NGUYÊN VĂN cho mia-health; các ví dụ (`categories`, `transactions`, `savings`…) là module của app tài chính — module thật của app này: `exercises`, `routines`, `sessions`, `stats`, `presets` (xem `docs/bridges/`). Riêng status code: mọi request thành công trả `200`, kể cả POST.

---

## 1. Đặt tên

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| File | `kebab-case` | `categories.get.ts`, `networth.ts` |
| Function | `camelCase` | `addTransaction()`, `listCategories()` |
| Variable | `camelCase` | `yearMonth`, `totalDays` |
| Type / Interface | `PascalCase` | `Category`, `TransactionType`, `ListFilter` |
| Constant | `UPPER_SNAKE_CASE` | `ASSET_CLASSES` |
| DB table | snake_case plural | `transactions`, `net_worth_snapshots` |
| DB column | snake_case | `category_id`, `created_at` |
| TS field (Drizzle) | camelCase | `categoryId`, `createdAt` |

---

## 2. File placement

```
Câu hỏi khi viết code mới:
  ├─ Gọi DB (useDB / Drizzle)?
  │    └─ Đặt trong server/repositories/
  │
  ├─ Business logic (tính toán, kiểm tra nghiệp vụ, orchestration)?
  │    └─ Đặt trong server/services/
  │
  ├─ Validate input + gọi service + return?
  │    └─ Đặt trong server/api/ (route handler)
  │
  └─ Pure util / zod schema?
       └─ Đặt trong server/utils/ (sẽ được auto-import)
```

---

## 3. Error handling

Dùng `createError()` từ H3 (auto-imported), **không throw `Error` thuần**:

```ts
// ✅ Đúng
if (!rows.length) throw createError({ statusCode: 404, message: 'Category không tồn tại' })
if (msg.includes('UNIQUE constraint failed')) throw createError({ statusCode: 409, message: 'Đã có snapshot cho ngày này' })

// ❌ Sai
throw new Error('not found')
if (!rows.length) return null  // im lặng khi không tìm thấy → caller sẽ crash
```

---

## 4. Async/Await

Luôn dùng `async/await`, không dùng `.then()`:

```ts
// ✅
const rows = await repo.updateCategory(id, data)

// ❌
repo.updateCategory(id, data).then(rows => { ... })
```

---

## 5. TypeScript

- `strict: true` — không dùng `any` trừ khi bất khả kháng (kèm comment lý do)
- Dùng `$inferSelect` / `$inferInsert` của Drizzle thay vì tự viết type trùng lặp:

```ts
// ✅ — lấy type từ schema, single source of truth
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
```

---

## 6. Validation

Validate bằng zod **trong route handler**, trước khi gọi service:

```ts
// ✅ Pattern chuẩn
const parsed = createTransactionSchema.safeParse(body)
if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })
return service.addTransaction(parsed.data)

// ❌ Sai — validate trong service hay repository
// ❌ Sai — dùng if/typeof để check thủ công
```

---

## 7. Không comment thừa

```ts
// ❌ Comment giải thích điều hiển nhiên
// Lấy category theo id
const rows = await repo.findCategoryById(id)

// ✅ Comment khi WHY không rõ
// SET NULL thay vì cascade vì transaction lịch sử phải giữ lại khi xóa category
categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' })
```

---

## 8. Import order

```ts
// 1. Drizzle / ORM
import { eq, and, gte } from 'drizzle-orm'
import { categories } from '../database/schema'

// 2. Internal — repositories (trong service)
import * as repo from '../repositories/categories'

// 3. Internal — services (trong route handler)
import * as service from '../services/categories'
```

H3 globals (`createError`, `defineEventHandler`, v.v.) và `useDB()`, zod schemas **không cần import** — auto-injected bởi Nitro.

---

## 9. Không hardcode secret hay config

```ts
// ✅ Đọc từ env (Cloudflare Pages Settings → Environment Variables)
const secret = useRuntimeConfig().mySecret

// ❌
const secret = 'abc123'
```

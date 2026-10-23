# Backend — Architecture

> **Kế thừa từ mia-finance.** Quy tắc trong doc này áp dụng NGUYÊN VĂN cho mia-health; các ví dụ (`categories`, `transactions`, `savings`…) là module của app tài chính — module thật của app này: `exercises`, `routines`, `sessions`, `stats`, `presets` (xem `docs/bridges/`). Riêng status code: mọi request thành công trả `200`, kể cả POST.

## Layer Architecture

Mọi request đi qua đúng 3 tầng, không được bỏ qua hay đảo thứ tự:

```
HTTP Request
  └─► Route Handler (server/api/)
        └─► Service (server/services/)
              └─► Repository (server/repositories/)
                    └─► useDB() → Drizzle → Cloudflare D1
```

**Quy tắc cứng:**
- Route handler: KHÔNG gọi `useDB()`, KHÔNG chứa business logic
- Service: KHÔNG gọi `useDB()`, được phép gọi nhiều repositories và throw `createError`
- Repository: nơi DUY NHẤT gọi `useDB()` / Drizzle — không có logic nghiệp vụ

---

## Directory Structure (thực tế)

```
server/
├── api/                              ← Nitro file-based routing → /api/*
│   ├── health.get.ts                 → GET  /api/health
│   ├── categories.get.ts             → GET  /api/categories
│   ├── categories.post.ts            → POST /api/categories
│   ├── categories/
│   │   ├── [id].patch.ts             → PATCH  /api/categories/:id
│   │   └── [id].delete.ts            → DELETE /api/categories/:id
│   ├── transactions.get.ts           → GET  /api/transactions
│   ├── transactions.post.ts          → POST /api/transactions
│   ├── transactions/
│   │   ├── [id].patch.ts             → PATCH  /api/transactions/:id
│   │   └── [id].delete.ts            → DELETE /api/transactions/:id
│   ├── summary/
│   │   ├── monthly.get.ts            → GET /api/summary/monthly
│   │   └── weekly.get.ts             → GET /api/summary/weekly
│   ├── networth.get.ts               → GET  /api/networth
│   └── networth.post.ts              → POST /api/networth
│
├── services/
│   ├── categories.ts
│   ├── transactions.ts
│   ├── summary.ts
│   └── networth.ts
│
├── repositories/
│   ├── categories.ts
│   ├── transactions.ts
│   ├── aggregate.ts                  ← SQL aggregates (SUM, strftime group by)
│   └── networth.ts
│
├── database/
│   ├── schema.ts                     ← single source of truth: Drizzle schema
│   └── migrations/                   ← SQL files do `drizzle-kit generate` sinh ra
│
└── utils/                            ← AUTO-IMPORTED vào toàn server
    ├── db.ts                         ← export useDB()
    └── schemas.ts                    ← export tất cả zod schemas
```

---

## Auto-imports

`server/utils/` được Nuxt/Nitro auto-import vào mọi server-side file — không cần `import` thủ công:

| Symbol | Nguồn |
|--------|-------|
| `useDB()` | `server/utils/db.ts` |
| `createCategorySchema`, `createTransactionSchema`, ... | `server/utils/schemas.ts` |
| `createError`, `defineEventHandler`, `getQuery`, `readBody`, `getRouterParam` | H3 (Nitro global) |

`server/repositories/` và `server/services/` **không** auto-import — cần explicit `import * as repo from '../repositories/...'`.

---

## Route Handler Pattern

```ts
// server/api/categories.post.ts
import * as service from '../services/categories';

export default defineEventHandler(async (event) => {
  // 1. Đọc input
  const body = await readBody(event);
  // 2. Validate zod (schema auto-imported từ server/utils/schemas.ts)
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });
  // 3. Gọi service — return thẳng kết quả
  return service.addCategory(parsed.data);
});
```

---

## Service Pattern

```ts
// server/services/categories.ts
import * as repo from '../repositories/categories';

export async function addCategory(data: { name: string; type: 'income' | 'expense' }) {
  const rows = await repo.createCategory(data);
  return rows[0]!;
}

export async function editCategory(id: number, data: { name?: string }) {
  const rows = await repo.updateCategory(id, data);
  if (!rows.length) throw createError({ statusCode: 404, message: 'Category không tồn tại' });
  return rows[0]!;
}
```

---

## Repository Pattern

```ts
// server/repositories/categories.ts
import { eq } from 'drizzle-orm';
import { categories } from '../database/schema';

export function listCategories(type?: 'income' | 'expense') {
  const db = useDB(); // CHỈ repository được gọi đây
  if (type) return db.select().from(categories).where(eq(categories.type, type));
  return db.select().from(categories);
}

export function createCategory(data: { name: string; type: 'income' | 'expense' }) {
  return useDB().insert(categories).values(data).returning();
}
```

---

## Thêm Module Mới

1. Thêm table vào `server/database/schema.ts`
2. Chạy `yarn db:generate` → `yarn db:migrate:local`
3. Tạo `server/repositories/<module>.ts`
4. Tạo `server/services/<module>.ts`
5. Tạo route files trong `server/api/<module>/`
6. Thêm zod schemas vào `server/utils/schemas.ts`

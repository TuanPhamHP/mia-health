# Backend — Drizzle & Repository Rules

> **Kế thừa từ mia-finance.** Quy tắc trong doc này áp dụng NGUYÊN VĂN cho mia-health; các ví dụ (`categories`, `transactions`, `savings`…) là module của app tài chính — module thật của app này: `exercises`, `routines`, `sessions`, `stats`, `presets` (xem `docs/bridges/`). Riêng status code: mọi request thành công trả `200`, kể cả POST.

## useDB()

```ts
// server/utils/db.ts — auto-imported vào mọi server file
export function useDB() {
  const d1 = useEvent().context.cloudflare?.env?.DB
  if (!d1) throw new Error('D1 binding "DB" not found — chạy qua `yarn dev`')
  return drizzle(d1, { schema })
}
```

- Chỉ gọi trong `server/repositories/`
- `useEvent()` dùng Nitro async context (`experimental.asyncContext: true`) — hoạt động xuyên async boundary

---

## Query Builder — Patterns thường dùng

### SELECT với filter động

```ts
import { and, eq, gte, lte } from 'drizzle-orm'
import { transactions } from '../database/schema'

export function listTransactions(filter: { from?: string; to?: string; type?: string }) {
  const conditions = []
  if (filter.from) conditions.push(gte(transactions.date, filter.from))
  if (filter.to)   conditions.push(lte(transactions.date, filter.to))
  if (filter.type) conditions.push(eq(transactions.type, filter.type))

  return useDB()
    .select()
    .from(transactions)
    .where(conditions.length ? and(...conditions) : undefined)  // and() rỗng = undefined = no WHERE
    .orderBy(transactions.date)
}
```

### INSERT với RETURNING

```ts
export function createCategory(data: { name: string; type: 'income' | 'expense' }) {
  return useDB().insert(categories).values(data).returning()
  // returning() trả về array — caller lấy rows[0]!
}
```

### UPDATE với RETURNING (detect not found)

```ts
export function updateTransaction(id: number, data: Partial<...>) {
  return useDB()
    .update(transactions)
    .set({ ...data, updatedAt: new Date() })  // updatedAt: Date — Drizzle tự convert sang unix int
    .where(eq(transactions.id, id))
    .returning()
  // rows.length === 0 → không tìm thấy → service throw 404
}
```

### DELETE với RETURNING

```ts
export function removeCategory(id: number) {
  return useDB().delete(categories).where(eq(categories.id, id)).returning()
}
```

### Aggregate — SUM theo tháng

D1/SQLite dùng `strftime` để group by date text:

```ts
import { sql } from 'drizzle-orm'

export async function monthlySummary(year: number, month: number) {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`
  const result = await useDB()
    .select({
      income:  sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income'  THEN ${transactions.amount} ELSE 0 END), 0)`,
      expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(sql`strftime('%Y-%m', ${transactions.date}) = ${yearMonth}`)
  return result[0] ?? { income: 0, expense: 0 }
}
```

### Aggregate — Group by tuần

```ts
const weekExpr = sql<string>`strftime('%Y-%W', ${transactions.date})`

return useDB()
  .select({ week: weekExpr, income: incomeExprSql, expense: expenseExprSql })
  .from(transactions)
  .where(and(gte(transactions.date, from), lte(transactions.date, to)))
  .groupBy(weekExpr)
  .orderBy(weekExpr)
```

### JOIN

```ts
return useDB()
  .select({ categoryId: transactions.categoryId, categoryName: categories.name, total: sql<number>`...` })
  .from(transactions)
  .leftJoin(categories, eq(transactions.categoryId, categories.id))
  .groupBy(transactions.categoryId)
```

---

## Multi-table Write (manual sequence)

D1 không hỗ trợ Drizzle interactive transactions đầy đủ. Dùng cách lấy `db` một lần và gọi tuần tự:

```ts
// server/repositories/networth.ts
export async function createSnapshot(header: SnapshotHeader, entries: EntryInput[]) {
  const db = useDB()
  const [snapshot] = await db.insert(netWorthSnapshots).values(header).returning()
  if (!snapshot) throw new Error('Snapshot insert failed')

  await db.insert(netWorthEntries).values(
    entries.map(e => ({ snapshotId: snapshot.id, assetClass: e.assetClass, value: e.value })),
  )
  return snapshot
}
```

---

## Schema Conventions

```ts
// Timestamp hệ thống: integer unix seconds
createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
updatedAt: integer('updated_at', { mode: 'timestamp' })  // null khi chưa update

// Tiền: integer đồng — KHÔNG dùng real/float
amount: integer('amount').notNull()

// Ngày giao dịch: text YYYY-MM-DD
date: text('date').notNull()

// FK nullable với ON DELETE SET NULL
categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' })

// FK NOT NULL với ON DELETE CASCADE
snapshotId: integer('snapshot_id').notNull().references(() => netWorthSnapshots.id, { onDelete: 'cascade' })

// Enum: dùng text với enum option
type: text('type', { enum: ['income', 'expense'] }).notNull()
```

---

## D1 / SQLite Giới Hạn

- Không dùng `JSONB`, `ARRAY`, `UUID` type, window functions nâng cao
- FK constraints cần `PRAGMA foreign_keys = ON` — D1 có thể không tự bật
- `ON DELETE SET NULL` / `CASCADE` hoạt động khi FK được enforce
- `RETURNING` clause: D1 hỗ trợ (SQLite ≥ 3.35)
- `strftime('%Y-%m', date)` để group theo tháng, `strftime('%Y-%W', date)` theo tuần ISO

---

## Migration Workflow

```bash
# 1. Sửa server/database/schema.ts
# 2. Sinh SQL migration
yarn db:generate

# 3. Verify file SQL vừa sinh (không sửa tay)
cat server/database/migrations/<file>.sql

# 4. Apply local
yarn db:migrate:local

# 5. Sau khi test xong: apply production
yarn db:migrate:remote
```

**Reset D1 local** (chỉ khi còn dev, chưa có data thật):

```bash
# Drop tất cả tables + migration tracking
yarn wrangler d1 execute mia-finance-db --local \
  --command "DROP TABLE IF EXISTS <tables>; DROP TABLE IF EXISTS d1_migrations;"

# Xóa migration cũ, generate lại baseline sạch
rm -rf server/database/migrations
yarn db:generate && yarn db:migrate:local
```

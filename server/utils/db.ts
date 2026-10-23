import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../database/schema';

export function useDB() {
	const d1 = useEvent().context.cloudflare?.env?.DB;
	if (!d1) throw new Error('D1 binding "DB" not found — chạy qua `yarn dev` hoặc `wrangler pages dev`');
	return drizzle(d1, { schema });
}

// Runtime D1 trả D1Response { meta: { last_row_id } } dù Drizzle type là RunResult
export function getLastRowId(runResult: unknown): number {
	return (runResult as { meta: { last_row_id: number } }).meta.last_row_id;
}

// D1 giới hạn 100 bound parameter mỗi câu lệnh. Multi-row INSERT và `IN (...)` dài
// phải cắt nhỏ, nếu không sẽ lỗi "too many SQL variables" khi dữ liệu lớn dần.
export const D1_MAX_PARAMS = 100;

export function chunk<T>(rows: readonly T[], size: number): T[][] {
	const out: T[][] = [];
	const step = Math.max(1, size);
	for (let i = 0; i < rows.length; i += step) out.push(rows.slice(i, i + step));
	return out;
}

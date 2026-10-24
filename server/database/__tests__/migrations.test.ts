import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NUTRIENT_KEYS } from '../../../shared/utils/nutrients';

// Chạy TOÀN BỘ migration vào SQLite thật (node:sqlite) — bắt được migration dữ liệu sinh lệch
// cột schema, và soát chất lượng kho thực phẩm (scripts/foods/build-foods.mjs) mỗi lần test.
const dir = fileURLToPath(new URL('../migrations', import.meta.url));
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
	db.exec(readFileSync(join(dir, file), 'utf8'));
}

type Row = Record<string, number | string | null>;
const all = (q: string) => db.prepare(q).all() as Row[];
const snake = (key: string) => key.replace(/([A-Z])/g, '_$1').toLowerCase();

describe('kho thực phẩm ban đầu', () => {
	const foods = all('SELECT * FROM foods');

	it('đủ dữ liệu: > 500 thực phẩm, 14 nhóm gốc theo bảng VN', () => {
		expect(foods.length).toBeGreaterThan(500);
		expect(all('SELECT id FROM food_categories WHERE parent_id IS NULL')).toHaveLength(14);
	});

	it('bảng foods có đủ cột cho mọi chất trong NUTRIENTS', () => {
		const columns = new Set(all('PRAGMA table_info(foods)').map((c) => c.name));
		for (const key of NUTRIENT_KEYS) expect(columns.has(snake(key)), key).toBe(true);
	});

	it('tên không trùng (không phân biệt hoa thường, có dấu)', () => {
		const keys = foods.map((f) => String(f.name).toLocaleLowerCase('vi'));
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('không có số liệu âm; thải bỏ trong 0–99%', () => {
		for (const f of foods) {
			for (const key of NUTRIENT_KEYS) {
				const v = f[snake(key)];
				if (v !== null) expect(Number(v), `${f.name} · ${key}`).toBeGreaterThanOrEqual(0);
			}
			if (f.refuse_pct !== null) expect(Number(f.refuse_pct), String(f.name)).toBeLessThan(100);
		}
	});

	// Bảng VN tính năng lượng bằng hệ số 4 / 9 / 4 trên glucid không gồm xơ ⇒ lệch nhiều là đọc
	// nhầm cột khi trích PDF. USDA dùng hệ số riêng từng thực phẩm và tính cả năng lượng của xơ
	// (đã tách khỏi glucid khi nhập) ⇒ cho phép 2–4 kcal mỗi gam xơ, nới rộng hơn.
	it('năng lượng khớp đạm / béo / glucid (Atwater)', () => {
		const KNOWN_SOURCE_QUIRKS = new Set(['13009']); // Riềng: bảng gốc ghi 26 kcal cho 0,3 g đạm + 2,5 g glucid
		const off = foods.filter((f) => {
			if (f.protein_g === null || KNOWN_SOURCE_QUIRKS.has(String(f.source_code))) return false;
			const calc = 4 * Number(f.protein_g) + 9 * Number(f.fat_g ?? 0) + 4 * Number(f.carb_g ?? 0);
			const kcal = Number(f.energy_kcal);
			if (f.source === 'vn_fct_2007') return Math.abs(calc - kcal) > Math.max(8, 0.08 * kcal);
			const fiber = Number(f.fiber_g ?? 0);
			const tolerance = Math.max(10, 0.12 * kcal);
			return kcal < calc + 2 * fiber - tolerance || kcal > calc + 4 * fiber + tolerance;
		});
		expect(off.map((f) => `${f.name}: ${f.energy_kcal} kcal`)).toEqual([]);
	});

	it('khẩu phần dương, trỏ tới thực phẩm có thật', () => {
		const ids = new Set(foods.map((f) => f.id));
		for (const p of all('SELECT * FROM food_portions')) {
			expect(ids.has(p.food_id), String(p.name)).toBe(true);
			expect(Number(p.grams)).toBeGreaterThan(0);
		}
	});

	it('thực phẩm ghi nguồn + mã gốc để tra lại', () => {
		for (const f of foods) {
			expect(['vn_fct_2007', 'usda_sr_legacy']).toContain(f.source);
			expect(f.source_code, String(f.name)).not.toBeNull();
		}
	});
});

describe('món ăn mẫu', () => {
	const dishes = all('SELECT * FROM dishes');

	it('đủ món, tên không trùng', () => {
		expect(dishes.length).toBeGreaterThan(40);
		const keys = dishes.map((d) => String(d.name).toLocaleLowerCase('vi'));
		expect(new Set(keys).size).toBe(keys.length);
	});

	// Nguyên liệu nối với thực phẩm qua (source, source_code) — trỏ sai mã thì JOIN rơi mất dòng
	// trong im lặng; đối chiếu với công thức gốc để bắt.
	it('mọi nguyên liệu trong công thức đều nối được với thực phẩm', async () => {
		const { DISHES } = await import('../../../scripts/foods/dishes.mjs');
		const counts = new Map(all('SELECT dish_id, COUNT(*) AS n FROM dish_ingredients GROUP BY dish_id').map((r) => [r.dish_id, r.n]));
		for (const d of dishes) {
			const recipe = (DISHES as { name: string; ingredients: unknown[] }[]).find((r) => r.name === d.name);
			expect(recipe, String(d.name)).toBeDefined();
			expect(counts.get(d.id), String(d.name)).toBe(recipe!.ingredients.length);
		}
	});

	it('một phần có năng lượng hợp lý (10–1.200 kcal)', () => {
		const perServing = all(
			`SELECT d.name, SUM(f.energy_kcal * i.grams / 100.0) / d.servings AS kcal
			 FROM dishes d JOIN dish_ingredients i ON i.dish_id = d.id JOIN foods f ON f.id = i.food_id GROUP BY d.id`,
		);
		for (const d of perServing) {
			expect(Number(d.kcal), String(d.name)).toBeGreaterThan(10);
			expect(Number(d.kcal), String(d.name)).toBeLessThan(1200);
		}
	});
});

import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { mealEntries, menuItems, menus, nutritionTargets } from '../database/schema';
import type { Meal, NewMealEntry, NewMenu, NewMenuItem, NutritionTarget } from '../database/schema';

type EntryRow = Omit<NewMealEntry, 'id' | 'createdAt' | 'updatedAt'>;
type MenuItemData = Omit<NewMenuItem, 'id' | 'menuId' | 'position' | 'createdAt'>;

// --- Nhật ký ăn ---

export function listEntries(date: string) {
	return useDB()
		.select()
		.from(mealEntries)
		.where(eq(mealEntries.date, date))
		.orderBy(asc(mealEntries.position), asc(mealEntries.id));
}

export async function getEntryById(id: number) {
	const rows = await useDB().select().from(mealEntries).where(eq(mealEntries.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function maxEntryPosition(date: string, meal: Meal): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${mealEntries.position})` })
		.from(mealEntries)
		.where(and(eq(mealEntries.date, date), eq(mealEntries.meal, meal)));
	return rows[0]?.max ?? -1;
}

// 39 cột bind / dòng (29 chất + 10 cột) ⇒ tối đa 2 dòng mỗi câu INSERT. Áp cả thực đơn = một batch.
export async function createEntries(rows: EntryRow[]) {
	const db = useDB();
	const [first, ...rest] = chunk(rows, Math.floor(D1_MAX_PARAMS / 39)).map((part) => db.insert(mealEntries).values(part));
	if (first) await db.batch([first, ...rest]);
}

export async function updateEntry(id: number, data: Partial<EntryRow>) {
	await useDB()
		.update(mealEntries)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(mealEntries.id, id));
}

export async function removeEntry(id: number) {
	await useDB().delete(mealEntries).where(eq(mealEntries.id, id));
}

// --- Thực đơn ---

export function listMenus(filter: { includeArchived?: boolean }) {
	return useDB()
		.select()
		.from(menus)
		.where(filter.includeArchived ? undefined : eq(menus.isArchived, false))
		.orderBy(asc(menus.name));
}

export async function getMenuById(id: number) {
	const rows = await useDB().select().from(menus).where(eq(menus.id, id)).limit(1);
	return rows[0] ?? null;
}

// Trả cả id để service so tên không phân biệt hoa thường bằng JS.
export function listAllMenuNames() {
	return useDB().select({ id: menus.id, name: menus.name }).from(menus);
}

export async function listMenuItems(menuIds: number[]) {
	if (menuIds.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(menuIds, D1_MAX_PARAMS - 10).map((ids) =>
			db
				.select()
				.from(menuItems)
				.where(inArray(menuItems.menuId, ids))
				.orderBy(asc(menuItems.menuId), asc(menuItems.position), asc(menuItems.id)),
		),
	);
	return parts.flat();
}

// 8 cột bind / dòng ⇒ tối đa 12 dòng mỗi câu INSERT.
function insertMenuItems(menuId: number, items: MenuItemData[]) {
	const rows = items.map((it, position) => ({ ...it, menuId, position }));
	return chunk(rows, Math.floor(D1_MAX_PARAMS / 8)).map((part) => useDB().insert(menuItems).values(part));
}

/** Như createDish: cần id thực đơn trước, các dòng ghi MỘT batch; batch lỗi ⇒ xoá thực đơn vừa tạo. */
export async function createMenu(data: Omit<NewMenu, 'id' | 'createdAt' | 'updatedAt'>, items: MenuItemData[]): Promise<number> {
	const db = useDB();
	const id = getLastRowId(await db.insert(menus).values(data).run());
	const [first, ...rest] = insertMenuItems(id, items);
	if (first) {
		try {
			await db.batch([first, ...rest]);
		} catch (err) {
			await db.delete(menus).where(eq(menus.id, id));
			throw err;
		}
	}
	return id;
}

/** `items` có mặt ⇒ thay toàn bộ, cùng batch với UPDATE (nguyên tử). */
export async function updateMenu(id: number, data: Partial<Omit<NewMenu, 'id' | 'createdAt'>>, items?: MenuItemData[]) {
	const db = useDB();
	const update = db
		.update(menus)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(menus.id, id));
	if (items === undefined) {
		await update;
		return;
	}
	await db.batch([update, db.delete(menuItems).where(eq(menuItems.menuId, id)), ...insertMenuItems(id, items)]);
}

export async function removeMenu(id: number) {
	// Các dòng đi theo nhờ ON DELETE CASCADE; nhật ký đã áp dụng là snapshot, không dính.
	await useDB().delete(menus).where(eq(menus.id, id));
}

// --- Mục tiêu dinh dưỡng (một dòng, id = 1) ---

export async function getTargets(): Promise<NutritionTarget | null> {
	const rows = await useDB().select().from(nutritionTargets).where(eq(nutritionTargets.id, 1)).limit(1);
	return rows[0] ?? null;
}

export async function upsertTargets(data: Omit<NutritionTarget, 'id' | 'updatedAt'>) {
	const row = { ...data, updatedAt: new Date() };
	await useDB()
		.insert(nutritionTargets)
		.values({ id: 1, ...row })
		.onConflictDoUpdate({ target: nutritionTargets.id, set: row });
}

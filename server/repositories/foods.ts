import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { dishes, dishIngredients, foodCategories, foodPortions, foods, menuItems } from '../database/schema';
import type { NewFood, NewFoodCategory, NewFoodPortion } from '../database/schema';

// --- Nhóm / loại ---

export function listCategories() {
	return useDB().select().from(foodCategories).orderBy(asc(foodCategories.position), asc(foodCategories.id));
}

export async function getCategoryById(id: number) {
	const rows = await useDB().select().from(foodCategories).where(eq(foodCategories.id, id)).limit(1);
	return rows[0] ?? null;
}

/** categoryId → số thực phẩm gắn trực tiếp; `includeArchived` để chặn xoá nhóm còn thực phẩm đã lưu trữ. */
export async function countFoodsByCategory(includeArchived: boolean): Promise<Map<number, number>> {
	const rows = await useDB()
		.select({ categoryId: foods.categoryId, count: sql<number>`COUNT(*)` })
		.from(foods)
		.where(includeArchived ? undefined : eq(foods.isArchived, false))
		.groupBy(foods.categoryId);
	return new Map(rows.map((r) => [r.categoryId, r.count]));
}

export async function maxCategoryPosition(parentId: number | null): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${foodCategories.position})` })
		.from(foodCategories)
		.where(parentId === null ? isNull(foodCategories.parentId) : eq(foodCategories.parentId, parentId));
	return rows[0]?.max ?? -1;
}

export async function createCategory(data: Omit<NewFoodCategory, 'id' | 'createdAt' | 'updatedAt'>) {
	await useDB().insert(foodCategories).values(data);
}

export async function updateCategory(id: number, data: Partial<Omit<NewFoodCategory, 'id' | 'createdAt'>>) {
	await useDB()
		.update(foodCategories)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(foodCategories.id, id));
}

export async function removeCategory(id: number) {
	await useDB().delete(foodCategories).where(eq(foodCategories.id, id));
}

// --- Thực phẩm ---

const summaryColumns = {
	id: foods.id,
	categoryId: foods.categoryId,
	name: foods.name,
	sourceName: foods.sourceName, // chỉ để tìm theo tên gốc (tiếng Anh), service bỏ trước khi trả
	source: foods.source,
	energyKcal: foods.energyKcal,
	proteinG: foods.proteinG,
	fatG: foods.fatG,
	carbG: foods.carbG,
	isArchived: foods.isArchived,
};

export function listFoodSummaries(filter: { categoryIds?: number[]; includeArchived?: boolean }) {
	const conditions = [];
	// Số nhóm của một nhánh cây luôn nhỏ (≤ vài chục) — không chạm trần 100 tham số.
	if (filter.categoryIds) conditions.push(inArray(foods.categoryId, filter.categoryIds));
	if (!filter.includeArchived) conditions.push(eq(foods.isArchived, false));
	return useDB()
		.select(summaryColumns)
		.from(foods)
		.where(conditions.length ? and(...conditions) : undefined);
}

export async function getFoodById(id: number) {
	const rows = await useDB().select().from(foods).where(eq(foods.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function listFoodsByIds(ids: number[]) {
	if (ids.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(ids, D1_MAX_PARAMS - 10).map((part) => db.select().from(foods).where(inArray(foods.id, part))),
	);
	return parts.flat();
}

/** Món (khác nhau) đang dùng thực phẩm làm nguyên liệu. */
export function listDishUsage(foodId: number) {
	return useDB()
		.selectDistinct({ id: dishes.id, name: dishes.name })
		.from(dishIngredients)
		.innerJoin(dishes, eq(dishes.id, dishIngredients.dishId))
		.where(eq(dishIngredients.foodId, foodId))
		.orderBy(asc(dishes.name));
}

/** Số thực đơn (khác nhau) dùng thẳng thực phẩm (không qua món). */
export async function countMenuUsage(foodId: number): Promise<number> {
	const rows = await useDB()
		.selectDistinct({ menuId: menuItems.menuId })
		.from(menuItems)
		.where(eq(menuItems.foodId, foodId));
	return rows.length;
}

// Trả cả id để service so tên không phân biệt hoa thường bằng JS (lower() của SQLite chỉ hạ ASCII).
export function listAllFoodNames() {
	return useDB().select({ id: foods.id, name: foods.name }).from(foods);
}

export async function createFood(data: Omit<NewFood, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
	return getLastRowId(await useDB().insert(foods).values(data).run());
}

export async function updateFood(id: number, data: Partial<Omit<NewFood, 'id' | 'createdAt'>>) {
	await useDB()
		.update(foods)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(foods.id, id));
}

export async function removeFood(id: number) {
	// Khẩu phần đi theo nhờ ON DELETE CASCADE.
	await useDB().delete(foods).where(eq(foods.id, id));
}

// --- Khẩu phần ---

export function listPortions(foodId: number) {
	return useDB()
		.select()
		.from(foodPortions)
		.where(eq(foodPortions.foodId, foodId))
		.orderBy(asc(foodPortions.position), asc(foodPortions.id));
}

export async function getPortionById(id: number) {
	const rows = await useDB().select().from(foodPortions).where(eq(foodPortions.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function maxPortionPosition(foodId: number): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${foodPortions.position})` })
		.from(foodPortions)
		.where(eq(foodPortions.foodId, foodId));
	return rows[0]?.max ?? -1;
}

export async function createPortion(data: Omit<NewFoodPortion, 'id' | 'createdAt'>) {
	await useDB().insert(foodPortions).values(data);
}

export async function updatePortion(id: number, data: Partial<Pick<NewFoodPortion, 'name' | 'grams'>>) {
	await useDB().update(foodPortions).set(data).where(eq(foodPortions.id, id));
}

export async function removePortion(id: number) {
	await useDB().delete(foodPortions).where(eq(foodPortions.id, id));
}

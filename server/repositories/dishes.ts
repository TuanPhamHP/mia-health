import { and, asc, eq, inArray } from 'drizzle-orm';
import { dishes, dishIngredients, foods, menuItems } from '../database/schema';
import type { DishCategory, NewDish } from '../database/schema';
import { NUTRIENT_KEYS } from '../../shared/utils/nutrients';
import type { NutrientKey } from '../../shared/utils/nutrients';

type DishRow = Omit<NewDish, 'id' | 'createdAt' | 'updatedAt'>;
type IngredientData = { foodId: number; grams: number };

export function listDishes(filter: { category?: DishCategory; includeArchived?: boolean }) {
	const conditions = [];
	if (filter.category) conditions.push(eq(dishes.category, filter.category));
	if (!filter.includeArchived) conditions.push(eq(dishes.isArchived, false));
	return useDB()
		.select()
		.from(dishes)
		.where(conditions.length ? and(...conditions) : undefined);
}

export async function getDishById(id: number) {
	const rows = await useDB().select().from(dishes).where(eq(dishes.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function listDishesByIds(ids: number[]) {
	if (ids.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(ids, D1_MAX_PARAMS - 10).map((part) => db.select().from(dishes).where(inArray(dishes.id, part))),
	);
	return parts.flat();
}

/** Số thực đơn (khác nhau) đang dùng món. */
export async function countMenuUsage(dishId: number): Promise<number> {
	const rows = await useDB()
		.selectDistinct({ menuId: menuItems.menuId })
		.from(menuItems)
		.where(eq(menuItems.dishId, dishId));
	return rows.length;
}

// Trả cả id để service so tên không phân biệt hoa thường bằng JS.
export function listAllDishNames() {
	return useDB().select({ id: dishes.id, name: dishes.name }).from(dishes);
}

// Mọi chất dinh dưỡng của thực phẩm đi kèm nguyên liệu — service tính dinh dưỡng món từ đây.
const foodNutrients = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, foods[k]])) as {
	[K in NutrientKey]: (typeof foods)[K];
};

const ingredientWithFood = {
	id: dishIngredients.id,
	dishId: dishIngredients.dishId,
	foodId: dishIngredients.foodId,
	grams: dishIngredients.grams,
	position: dishIngredients.position,
	createdAt: dishIngredients.createdAt,
	foodName: foods.name,
	foodIsArchived: foods.isArchived,
	...foodNutrients,
};

export type IngredientRow = Awaited<ReturnType<typeof listIngredients>>[number];

export async function listIngredients(dishIds: number[]) {
	if (dishIds.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(dishIds, D1_MAX_PARAMS - 10).map((ids) =>
			db
				.select(ingredientWithFood)
				.from(dishIngredients)
				.innerJoin(foods, eq(foods.id, dishIngredients.foodId))
				.where(inArray(dishIngredients.dishId, ids))
				.orderBy(asc(dishIngredients.dishId), asc(dishIngredients.position), asc(dishIngredients.id)),
		),
	);
	return parts.flat();
}

// 4 cột bind / nguyên liệu (created_at để default) ⇒ tối đa 25 nguyên liệu mỗi câu INSERT.
function insertIngredients(dishId: number, items: IngredientData[]) {
	const rows = items.map((it, position) => ({ ...it, dishId, position }));
	return chunk(rows, Math.floor(D1_MAX_PARAMS / 4)).map((part) => useDB().insert(dishIngredients).values(part));
}

/** Như createExercise: cần id món trước, nguyên liệu ghi MỘT batch; batch lỗi ⇒ xoá món vừa tạo. */
export async function createDish(data: DishRow, ingredients: IngredientData[]): Promise<number> {
	const db = useDB();
	const id = getLastRowId(await db.insert(dishes).values(data).run());
	const [first, ...rest] = insertIngredients(id, ingredients);
	if (first) {
		try {
			await db.batch([first, ...rest]);
		} catch (err) {
			await db.delete(dishes).where(eq(dishes.id, id));
			throw err;
		}
	}
	return id;
}

/** `ingredients` có mặt ⇒ thay toàn bộ danh sách, cùng batch với UPDATE (nguyên tử). */
export async function updateDish(id: number, data: Partial<DishRow>, ingredients?: IngredientData[]) {
	const db = useDB();
	const update = db
		.update(dishes)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(dishes.id, id));
	if (ingredients === undefined) {
		await update;
		return;
	}
	await db.batch([update, db.delete(dishIngredients).where(eq(dishIngredients.dishId, id)), ...insertIngredients(id, ingredients)]);
}

export async function removeDish(id: number) {
	// Nguyên liệu đi theo nhờ ON DELETE CASCADE.
	await useDB().delete(dishes).where(eq(dishes.id, id));
}

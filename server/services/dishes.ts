import * as repo from '../repositories/dishes';
import * as foodsSvc from './foods';
import { nameKey } from './exercises';
import { foldText } from '../../shared/utils/text';
import { multiplyNutrients, NUTRIENT_KEYS, scaleNutrients, sumNutrients } from '../../shared/utils/nutrients';
import type { Dish, DishCategory } from '../database/schema';
import type { IngredientRow } from '../repositories/dishes';
import type { CreateDishInput, DishNutritionDTO, UpdateDishInput } from '../../shared/types/dishes';
import type { NutrientValues } from '../../shared/utils/nutrients';
import type { DishDetailComputed, DishIngredientComputed, DishSummaryComputed } from '../types/dishes';

function per100g(row: IngredientRow): NutrientValues {
	return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, row[k]])) as NutrientValues;
}

// Dinh dưỡng KHÔNG lưu: luôn tính từ thực phẩm hiện tại — sửa thực phẩm là món đổi theo.
// Nấu làm hao nước nhưng chất gần như giữ nguyên ⇒ tổng = cộng nguyên liệu (bỏ qua hao hụt vitamin).
function nutritionOf(dish: Dish, rows: IngredientRow[]): DishNutritionDTO {
	const total = sumNutrients(rows.map((r) => scaleNutrients(per100g(r), r.grams)));
	return {
		totalGrams: rows.reduce((sum, r) => sum + r.grams, 0),
		total: total.values,
		perServing: multiplyNutrients(total.values, 1 / dish.servings),
		per100gCooked: dish.cookedWeightG ? multiplyNutrients(total.values, 100 / dish.cookedWeightG) : null,
		missing: total.missing,
	};
}

function toIngredient(row: IngredientRow): DishIngredientComputed {
	return {
		id: row.id,
		dishId: row.dishId,
		foodId: row.foodId,
		grams: row.grams,
		position: row.position,
		createdAt: row.createdAt,
		food: {
			name: row.foodName,
			isArchived: row.foodIsArchived,
			energyKcal: row.energyKcal,
			proteinG: row.proteinG,
			fatG: row.fatG,
			carbG: row.carbG,
		},
	};
}

function groupByDish(rows: IngredientRow[]): Map<number, IngredientRow[]> {
	const byDish = new Map<number, IngredientRow[]>();
	for (const r of rows) byDish.set(r.dishId, [...(byDish.get(r.dishId) ?? []), r]);
	return byDish;
}

export async function listDishes(filter: {
	category?: DishCategory;
	q?: string;
	includeArchived?: boolean;
}): Promise<DishSummaryComputed[]> {
	const q = filter.q ? foldText(filter.q) : '';
	const rows = (await repo.listDishes(filter))
		.filter((d) => !q || foldText(d.name).includes(q))
		.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
	const byDish = groupByDish(await repo.listIngredients(rows.map((d) => d.id)));
	return rows.map((d) => {
		const ingredients = byDish.get(d.id) ?? [];
		const { perServing } = nutritionOf(d, ingredients);
		return {
			...d,
			ingredientCount: ingredients.length,
			perServing: {
				energyKcal: perServing.energyKcal,
				proteinG: perServing.proteinG,
				fatG: perServing.fatG,
				carbG: perServing.carbG,
			},
		};
	});
}

async function requireDish(id: number): Promise<Dish> {
	const row = await repo.getDishById(id);
	if (!row) throw createError({ statusCode: 404, message: 'Món ăn không tồn tại' });
	return row;
}

export async function getDish(id: number): Promise<DishDetailComputed> {
	const dish = await requireDish(id);
	const rows = await repo.listIngredients([id]);
	return { ...dish, ingredients: rows.map(toIngredient), nutrition: nutritionOf(dish, rows) };
}

async function assertNameFree(name: string, exceptId?: number) {
	const key = nameKey(name);
	const clash = (await repo.listAllDishNames()).find((r) => r.id !== exceptId && nameKey(r.name) === key);
	if (clash) throw createError({ statusCode: 409, message: `Đã có món tên "${clash.name}"` });
}

// Nguyên liệu phải là thực phẩm còn trong kho, chưa lưu trữ — trừ thực phẩm đã có sẵn trong món
// (`keepFoodIds`): lưu trữ một thực phẩm không được làm hỏng lần sửa món đang dùng nó.
async function resolveIngredients(inputs: { foodId: number; grams: number }[], keepFoodIds: ReadonlySet<number>) {
	const found = new Map((await foodsSvc.findFoods(inputs.map((i) => i.foodId))).map((f) => [f.id, f]));
	const missing = [...new Set(inputs.map((i) => i.foodId).filter((id) => !found.has(id)))];
	if (missing.length > 0) throw createError({ statusCode: 400, message: `Thực phẩm không tồn tại: ${missing.join(', ')}` });
	for (const i of inputs) {
		const food = found.get(i.foodId)!;
		if (food.isArchived && !keepFoodIds.has(food.id)) {
			throw createError({ statusCode: 400, message: `Thực phẩm "${food.name}" đã lưu trữ — khôi phục trước khi thêm` });
		}
	}
	return inputs.map(({ foodId, grams }) => ({ foodId, grams }));
}

export async function addDish(data: CreateDishInput): Promise<DishDetailComputed> {
	await assertNameFree(data.name);
	const { ingredients, ...fields } = data;
	const resolved = await resolveIngredients(ingredients, new Set());
	const id = await repo.createDish(
		{ ...fields, name: fields.name.trim(), description: fields.description ?? null, cookedWeightG: fields.cookedWeightG ?? null, source: 'user' },
		resolved,
	);
	return getDish(id);
}

export async function editDish(id: number, data: UpdateDishInput): Promise<DishDetailComputed> {
	await requireDish(id);
	if (data.name !== undefined) await assertNameFree(data.name, id);
	const { ingredients, ...fields } = data;
	let resolved: { foodId: number; grams: number }[] | undefined;
	if (ingredients !== undefined) {
		const current = await repo.listIngredients([id]);
		resolved = await resolveIngredients(ingredients, new Set(current.map((r) => r.foodId)));
	}
	await repo.updateDish(id, fields.name !== undefined ? { ...fields, name: fields.name.trim() } : fields, resolved);
	return getDish(id);
}

/** Dinh dưỡng (tính live) của nhiều món — cho thực đơn / nhật ký ăn. */
export async function nutritionByIds(ids: number[]): Promise<Map<number, { dish: Dish; nutrition: DishNutritionDTO }>> {
	const rows = await repo.listDishesByIds([...new Set(ids)]);
	const byDish = groupByDish(await repo.listIngredients(rows.map((d) => d.id)));
	return new Map(rows.map((d) => [d.id, { dish: d, nutrition: nutritionOf(d, byDish.get(d.id) ?? []) }]));
}

// Đang nằm trong thực đơn ⇒ 409 (thực đơn tham chiếu live, xoá là làm hụt thực đơn). Nhật ký
// đã ăn là snapshot nên không chặn — FK về NULL, tên + dinh dưỡng vẫn giữ.
export async function deleteDish(id: number): Promise<DishDetailComputed> {
	const dto = await getDish(id);
	const menuCount = await repo.countMenuUsage(id);
	if (menuCount > 0) {
		throw createError({
			statusCode: 409,
			message: `Món đang nằm trong ${menuCount} thực đơn — gỡ khỏi thực đơn hoặc lưu trữ thay vì xoá`,
		});
	}
	await repo.removeDish(id);
	return dto;
}

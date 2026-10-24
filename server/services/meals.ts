import * as repo from '../repositories/meals';
import * as dishesSvc from './dishes';
import * as foodsSvc from './foods';
import { nameKey } from './exercises';
import { multiplyNutrients, NUTRIENT_KEYS, scaleNutrients, sumNutrients } from '../../shared/utils/nutrients';
import { suggestDishes } from '../../shared/utils/suggest';
import type { SuggestionsDTO } from '../../shared/types/body';
import type { EntryUnit, Meal, MealEntry, Menu } from '../database/schema';
import type { NutrientKey, NutrientTotal, NutrientValues } from '../../shared/utils/nutrients';
import type { MenuItemInput, UpdateNutritionTargetsInput } from '../../shared/types/meals';
import type { DayLogComputed, MealEntryComputed, MenuDetailComputed, MenuSummaryComputed, NutritionTargetsComputed } from '../types/meals';

// Module sở hữu menus / menu_items / meal_entries / nutrition_targets; đọc món / thực phẩm qua
// service của module sở hữu.

export const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Chưa đặt mục tiêu ⇒ khẩu phần tham chiếu 2.000 kcal; xơ 28 g (FDA); natri tối đa 2.000 mg
// (WHO, < 5 g muối / ngày). Đạm / béo / glucid tính theo cân nặng ở phần chỉ số cơ thể.
const DEFAULT_TARGETS: NutritionTargetsComputed = {
	energyKcal: 2000,
	proteinG: null,
	fatG: null,
	carbG: null,
	fiberG: 28,
	sodiumMg: 2000,
	updatedAt: null,
};

interface TargetInput {
	dishId?: number | null;
	foodId?: number | null;
	amount: number;
	unit: EntryUnit;
}

interface ResolvedTarget {
	name: string;
	isArchived: boolean;
	nutrition: NutrientTotal;
}

const targetKey = (i: TargetInput) => (i.dishId ? `d${i.dishId}` : `f${i.foodId}`);

/**
 * Dinh dưỡng của từng dòng (món theo phần / gam món chín, hoặc thực phẩm theo gam) — tính live
 * từ thư viện. `isNew(item)`: dòng thêm MỚI thì chặn món / thực phẩm đã lưu trữ; dòng có sẵn
 * (lưu trữ sau khi đã vào thực đơn) thì giữ được.
 */
async function resolveTargets(items: TargetInput[], isNew: (item: TargetInput) => boolean): Promise<ResolvedTarget[]> {
	const [dishes, foods] = await Promise.all([
		dishesSvc.nutritionByIds(items.flatMap((i) => (i.dishId ? [i.dishId] : []))),
		foodsSvc.findFoods(items.flatMap((i) => (i.foodId ? [i.foodId] : []))).then((rows) => new Map(rows.map((f) => [f.id, f]))),
	]);
	return items.map((item) => {
		if (item.dishId) {
			const found = dishes.get(item.dishId);
			if (!found) throw createError({ statusCode: 400, message: 'Món ăn không tồn tại' });
			const { dish, nutrition } = found;
			if (isNew(item) && dish.isArchived) {
				throw createError({ statusCode: 400, message: `Món "${dish.name}" đã lưu trữ — khôi phục trước khi thêm` });
			}
			if (item.unit === 'g' && !nutrition.per100gCooked) {
				throw createError({ statusCode: 400, message: `Món "${dish.name}" chưa cân khối lượng chín — ghi theo phần` });
			}
			const values =
				item.unit === 'g' ? multiplyNutrients(nutrition.per100gCooked!, item.amount / 100) : multiplyNutrients(nutrition.perServing, item.amount);
			return { name: dish.name, isArchived: dish.isArchived, nutrition: { values, missing: nutrition.missing } };
		}
		const food = foods.get(item.foodId!);
		if (!food) throw createError({ statusCode: 400, message: 'Thực phẩm không tồn tại' });
		if (isNew(item) && food.isArchived) {
			throw createError({ statusCode: 400, message: `Thực phẩm "${food.name}" đã lưu trữ — khôi phục trước khi thêm` });
		}
		// Một thực phẩm: chất nào null thì vẫn null — không có "thiếu một phần".
		return { name: food.name, isArchived: food.isArchived, nutrition: { values: scaleNutrients(food, item.amount), missing: [] } };
	});
}

function valuesOf(row: NutrientValues): NutrientValues {
	return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, row[k]])) as NutrientValues;
}

function parseMissing(text: string | null): NutrientKey[] {
	return text ? (text.split(',') as NutrientKey[]) : [];
}

function toEntry(row: MealEntry): MealEntryComputed {
	return { ...row, missing: parseMissing(row.missing) };
}

/** Cộng nhiều phần đã có `missing` riêng (dòng nhật ký, món trong thực đơn). */
function totalOf(parts: NutrientTotal[]): NutrientTotal {
	const sum = sumNutrients(parts.map((p) => p.values));
	const missing = new Set([...sum.missing, ...parts.flatMap((p) => p.missing)]);
	return { values: sum.values, missing: NUTRIENT_KEYS.filter((k) => missing.has(k) && sum.values[k] !== null) };
}

// --- Mục tiêu ---

export async function getTargets(): Promise<NutritionTargetsComputed> {
	const row = await repo.getTargets();
	if (!row) return DEFAULT_TARGETS;
	const { id: _, ...targets } = row;
	return targets;
}

export async function setTargets(data: UpdateNutritionTargetsInput): Promise<NutritionTargetsComputed> {
	await repo.upsertTargets({
		energyKcal: data.energyKcal,
		proteinG: data.proteinG ?? null,
		fatG: data.fatG ?? null,
		carbG: data.carbG ?? null,
		fiberG: data.fiberG ?? null,
		sodiumMg: data.sodiumMg ?? null,
	});
	return getTargets();
}

// --- Nhật ký ăn (ngày do client gửi, giờ địa phương) ---

export async function getDayLog(date: string): Promise<DayLogComputed> {
	const [rows, targets] = await Promise.all([repo.listEntries(date), getTargets()]);
	const entries = rows
		.map(toEntry)
		.sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal) || a.position - b.position || a.id - b.id);
	const byMeal = Object.fromEntries(MEAL_ORDER.map((m) => [m, { energyKcal: 0, count: 0 }])) as DayLogComputed['byMeal'];
	for (const e of entries) {
		byMeal[e.meal].energyKcal += e.energyKcal;
		byMeal[e.meal].count += 1;
	}
	return {
		date,
		entries,
		totals: totalOf(entries.map((e) => ({ values: valuesOf(e), missing: e.missing }))),
		byMeal,
		targets,
	};
}

function snapshot(resolved: ResolvedTarget) {
	return { ...resolved.nutrition.values, name: resolved.name, missing: resolved.nutrition.missing.join(',') || null };
}

export async function addEntry(input: { date: string; meal: Meal; portionLabel?: string | null } & TargetInput): Promise<DayLogComputed> {
	const [resolved] = await resolveTargets([input], () => true);
	await repo.createEntries([
		{
			...snapshot(resolved!),
			date: input.date,
			meal: input.meal,
			position: (await repo.maxEntryPosition(input.date, input.meal)) + 1,
			dishId: input.dishId ?? null,
			foodId: input.foodId ?? null,
			amount: input.amount,
			unit: input.unit,
			portionLabel: input.portionLabel ?? null,
		},
	]);
	return getDayLog(input.date);
}

async function requireEntry(id: number): Promise<MealEntry> {
	const row = await repo.getEntryById(id);
	if (!row) throw createError({ statusCode: 404, message: 'Dòng nhật ký không tồn tại' });
	return row;
}

// Đổi lượng ⇒ nhân snapshot theo tỉ lệ, KHÔNG lấy lại từ thư viện: món đã sửa công thức sau khi
// ghi thì dòng cũ vẫn theo công thức lúc ăn.
export async function editEntry(
	id: number,
	data: { meal?: Meal; amount?: number; portionLabel?: string | null },
): Promise<DayLogComputed> {
	const entry = await requireEntry(id);
	const patch: Parameters<typeof repo.updateEntry>[1] = {};
	if (data.amount !== undefined && data.amount !== entry.amount) {
		Object.assign(patch, multiplyNutrients(valuesOf(entry), data.amount / entry.amount), { amount: data.amount });
	}
	if (data.portionLabel !== undefined) patch.portionLabel = data.portionLabel;
	if (data.meal !== undefined && data.meal !== entry.meal) {
		patch.meal = data.meal;
		patch.position = (await repo.maxEntryPosition(entry.date, data.meal)) + 1;
	}
	await repo.updateEntry(id, patch);
	return getDayLog(entry.date);
}

export async function removeEntry(id: number): Promise<DayLogComputed> {
	const entry = await requireEntry(id);
	await repo.removeEntry(id);
	return getDayLog(entry.date);
}

/** Chép mọi món của thực đơn vào ngày `date` (nối sau những gì đã ghi), dinh dưỡng chụp lúc áp. */
export async function applyMenu(date: string, menuId: number): Promise<DayLogComputed> {
	const menu = await requireMenu(menuId);
	const items = await repo.listMenuItems([menu.id]);
	const resolved = await resolveTargets(items, () => false);
	const next = new Map<Meal, number>();
	for (const meal of MEAL_ORDER) next.set(meal, (await repo.maxEntryPosition(date, meal)) + 1);
	await repo.createEntries(
		items.map((item, i) => {
			const position = next.get(item.meal)!;
			next.set(item.meal, position + 1);
			return {
				...snapshot(resolved[i]!),
				date,
				meal: item.meal,
				position,
				dishId: item.dishId,
				foodId: item.foodId,
				amount: item.amount,
				unit: item.unit,
				portionLabel: item.portionLabel,
			};
		}),
	);
	return getDayLog(date);
}

// --- Thực đơn (tham chiếu live) ---

async function requireMenu(id: number): Promise<Menu> {
	const row = await repo.getMenuById(id);
	if (!row) throw createError({ statusCode: 404, message: 'Thực đơn không tồn tại' });
	return row;
}

async function assertMenuNameFree(name: string, exceptId?: number) {
	const key = nameKey(name);
	const clash = (await repo.listAllMenuNames()).find((r) => r.id !== exceptId && nameKey(r.name) === key);
	if (clash) throw createError({ statusCode: 409, message: `Đã có thực đơn tên "${clash.name}"` });
}

async function detailsOf(menus: Menu[]): Promise<MenuDetailComputed[]> {
	const items = await repo.listMenuItems(menus.map((m) => m.id));
	const resolved = await resolveTargets(items, () => false);
	return menus.map((menu) => {
		const own = items.map((item, i) => ({ item, r: resolved[i]! })).filter(({ item }) => item.menuId === menu.id);
		return {
			...menu,
			items: own
				.map(({ item, r }) => ({
					...item,
					name: r.name,
					isArchived: r.isArchived,
					energyKcal: r.nutrition.values.energyKcal,
					proteinG: r.nutrition.values.proteinG,
					fatG: r.nutrition.values.fatG,
					carbG: r.nutrition.values.carbG,
				}))
				.sort((a, b) => MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal) || a.position - b.position),
			totals: totalOf(own.map(({ r }) => r.nutrition)),
		};
	});
}

export async function listMenus(filter: { includeArchived?: boolean }): Promise<MenuSummaryComputed[]> {
	const details = await detailsOf(await repo.listMenus(filter));
	return details.map(({ items, totals, ...menu }) => ({
		...menu,
		itemCount: items.length,
		totals: {
			energyKcal: totals.values.energyKcal,
			proteinG: totals.values.proteinG,
			fatG: totals.values.fatG,
			carbG: totals.values.carbG,
		},
	}));
}

export async function getMenu(id: number): Promise<MenuDetailComputed> {
	const [detail] = await detailsOf([await requireMenu(id)]);
	return detail!;
}

function itemRows(items: MenuItemInput[]) {
	return items.map((i) => ({
		meal: i.meal,
		dishId: i.dishId ?? null,
		foodId: i.foodId ?? null,
		amount: i.amount,
		unit: i.unit,
		portionLabel: i.portionLabel ?? null,
	}));
}

export async function addMenu(data: { name: string; description?: string | null; items: MenuItemInput[] }): Promise<MenuDetailComputed> {
	await assertMenuNameFree(data.name);
	await resolveTargets(data.items, () => true);
	const id = await repo.createMenu({ name: data.name.trim(), description: data.description ?? null }, itemRows(data.items));
	return getMenu(id);
}

export async function editMenu(
	id: number,
	data: { name?: string; description?: string | null; items?: MenuItemInput[]; isArchived?: boolean },
): Promise<MenuDetailComputed> {
	await requireMenu(id);
	if (data.name !== undefined) await assertMenuNameFree(data.name, id);
	const { items, ...fields } = data;
	if (items !== undefined) {
		const kept = new Set((await repo.listMenuItems([id])).map(targetKey));
		await resolveTargets(items, (i) => !kept.has(targetKey(i)));
	}
	await repo.updateMenu(id, fields.name !== undefined ? { ...fields, name: fields.name.trim() } : fields, items && itemRows(items));
	return getMenu(id);
}

export async function deleteMenu(id: number): Promise<MenuDetailComputed> {
	const dto = await getMenu(id);
	await repo.removeMenu(id);
	return dto;
}

/** Lưu những gì đã ăn trong ngày thành thực đơn. Dòng mà món / thực phẩm đã bị xoá thì bỏ qua. */
export async function menuFromDay(date: string, name: string): Promise<MenuDetailComputed> {
	const entries = (await getDayLog(date)).entries.filter((e) => e.dishId !== null || e.foodId !== null);
	if (entries.length === 0) throw createError({ statusCode: 400, message: 'Ngày này chưa có món nào để lưu' });
	return addMenu({
		name,
		items: entries.map((e) => ({
			meal: e.meal,
			dishId: e.dishId ?? undefined,
			foodId: e.foodId ?? undefined,
			amount: e.amount,
			unit: e.unit,
			portionLabel: e.portionLabel,
		})),
	});
}

// --- Gợi ý món cho phần còn lại của ngày ---

export async function getSuggestions(date: string): Promise<SuggestionsDTO> {
	const [day, dishes] = await Promise.all([getDayLog(date), dishesSvc.listDishes({})]);
	const { values } = day.totals;
	const remainingKcal = day.targets.energyKcal - values.energyKcal;
	const remainingProteinG = day.targets.proteinG === null ? null : day.targets.proteinG - (values.proteinG ?? 0);
	const byId = new Map(dishes.map((d) => [d.id, d]));
	const picks = suggestDishes(
		dishes.map((d) => ({ id: d.id, name: d.name, energyKcal: d.perServing.energyKcal, proteinG: d.perServing.proteinG })),
		{ kcal: Math.max(0, remainingKcal), proteinG: remainingProteinG },
		8,
		new Set(day.entries.flatMap((e) => (e.dishId === null ? [] : [e.dishId]))),
	);
	return {
		date,
		remainingKcal,
		remainingProteinG,
		items: picks.map((p) => {
			const d = byId.get(p.id)!;
			return { dishId: d.id, name: d.name, category: d.category, energyKcal: d.perServing.energyKcal, proteinG: d.perServing.proteinG, reasons: p.reasons };
		}),
	};
}

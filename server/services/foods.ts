import * as repo from '../repositories/foods';
import { nameKey } from './exercises';
import { foldText } from '../../shared/utils/text';
import type { Food, FoodCategory } from '../database/schema';
import type { CreateFoodInput, FoodSummaryDTO, UpdateFoodInput } from '../../shared/types/foods';
import type { FoodCategoryNodeComputed, FoodDetailComputed } from '../types/foods';

// --- Nhóm / loại (cây 2 cấp) ---

/** Cây danh mục; `foodCount` đếm thực phẩm chưa lưu trữ gắn trực tiếp vào từng nút. */
export async function categoryTree(): Promise<FoodCategoryNodeComputed[]> {
	const [rows, counts] = await Promise.all([repo.listCategories(), repo.countFoodsByCategory(false)]);
	return rows
		.filter((c) => c.parentId === null)
		.map((top) => ({
			...top,
			foodCount: counts.get(top.id) ?? 0,
			children: rows.filter((c) => c.parentId === top.id).map((c) => ({ ...c, foodCount: counts.get(c.id) ?? 0 })),
		}));
}

async function requireCategory(id: number): Promise<FoodCategory> {
	const row = await repo.getCategoryById(id);
	if (!row) throw createError({ statusCode: 404, message: 'Nhóm thực phẩm không tồn tại' });
	return row;
}

// Chỉ 2 cấp (nhóm → loại): cha phải là nhóm gốc. Tên không trùng trong cùng một cha.
async function assertCategoryPlacement(name: string, parentId: number | null, exceptId?: number) {
	const rows = await repo.listCategories();
	if (parentId !== null) {
		const parent = rows.find((c) => c.id === parentId);
		if (!parent) throw createError({ statusCode: 400, message: 'Nhóm cha không tồn tại' });
		if (parent.parentId !== null) {
			throw createError({ statusCode: 400, message: 'Chỉ chia 2 cấp: nhóm cha phải là nhóm gốc' });
		}
		if (exceptId !== undefined && rows.some((c) => c.parentId === exceptId)) {
			throw createError({ statusCode: 400, message: 'Nhóm đang có loại con — không chuyển vào nhóm khác được' });
		}
	}
	const clash = rows.find((c) => c.id !== exceptId && c.parentId === parentId && nameKey(c.name) === nameKey(name));
	if (clash) throw createError({ statusCode: 409, message: `Đã có nhóm tên "${clash.name}"` });
}

export async function addCategory(data: { name: string; parentId?: number | null }) {
	const parentId = data.parentId ?? null;
	await assertCategoryPlacement(data.name, parentId);
	await repo.createCategory({
		name: data.name.trim(),
		parentId,
		position: (await repo.maxCategoryPosition(parentId)) + 1,
	});
	return categoryTree();
}

export async function editCategory(id: number, data: { name?: string; parentId?: number | null; position?: number }) {
	const current = await requireCategory(id);
	if (data.parentId === id) throw createError({ statusCode: 400, message: 'Nhóm không thể là cha của chính nó' });
	const name = data.name ?? current.name;
	const parentId = data.parentId === undefined ? current.parentId : data.parentId;
	if (data.name !== undefined || data.parentId !== undefined) await assertCategoryPlacement(name, parentId, id);
	await repo.updateCategory(id, data.name !== undefined ? { ...data, name: data.name.trim() } : data);
	return categoryTree();
}

// Còn loại con / thực phẩm (kể cả đã lưu trữ) ⇒ 409, không tự dời: dời âm thầm là phá cách
// người dùng đã sắp xếp. FK RESTRICT là lưới cuối.
export async function deleteCategory(id: number) {
	await requireCategory(id);
	const [rows, counts] = await Promise.all([repo.listCategories(), repo.countFoodsByCategory(true)]);
	if (rows.some((c) => c.parentId === id)) {
		throw createError({ statusCode: 409, message: 'Nhóm còn loại con — xoá hoặc chuyển các loại con trước' });
	}
	const count = counts.get(id) ?? 0;
	if (count > 0) {
		throw createError({ statusCode: 409, message: `Nhóm còn ${count} thực phẩm — chuyển sang nhóm khác trước khi xoá` });
	}
	await repo.removeCategory(id);
	return categoryTree();
}

// --- Thực phẩm ---

/**
 * Lọc theo nhóm (nhóm gốc ⇒ gồm các loại con) và tìm theo tên bỏ dấu (khớp cả tên gốc tiếng
 * Anh: "chicken" ra các món gà USDA). Tìm làm ở JS — so chữ có dấu không tin được SQLite.
 */
export async function listFoods(filter: { categoryId?: number; q?: string; includeArchived?: boolean }): Promise<FoodSummaryDTO[]> {
	let categoryIds: number[] | undefined;
	if (filter.categoryId !== undefined) {
		const rows = await repo.listCategories();
		if (!rows.some((c) => c.id === filter.categoryId)) return [];
		categoryIds = [filter.categoryId, ...rows.filter((c) => c.parentId === filter.categoryId).map((c) => c.id)];
	}
	const rows = await repo.listFoodSummaries({ categoryIds, includeArchived: filter.includeArchived });
	const q = filter.q ? foldText(filter.q) : '';
	// Tên gốc tiếng Anh: chỉ khớp đầu từ và từ 4 ký tự — "com" không được kéo theo "commercially".
	const englishWord = q.length >= 4 ? new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) : null;
	const matched = q
		? rows
				.map((r) => {
					const name = foldText(r.name);
					const english = englishWord !== null && r.sourceName !== null && englishWord.test(foldText(r.sourceName));
					const rank = name.startsWith(q) ? 0 : name.includes(q) ? 1 : english ? 2 : -1;
					return { r, rank };
				})
				.filter((x) => x.rank >= 0)
				.sort((a, b) => a.rank - b.rank || a.r.name.localeCompare(b.r.name, 'vi'))
				.map((x) => x.r)
		: rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
	return matched.map(({ sourceName: _, ...summary }) => summary);
}

async function requireFood(id: number): Promise<Food> {
	const row = await repo.getFoodById(id);
	if (!row) throw createError({ statusCode: 404, message: 'Thực phẩm không tồn tại' });
	return row;
}

async function assertFoodNameFree(name: string, exceptId?: number) {
	const key = nameKey(name);
	const clash = (await repo.listAllFoodNames()).find((r) => r.id !== exceptId && nameKey(r.name) === key);
	if (clash) throw createError({ statusCode: 409, message: `Đã có thực phẩm tên "${clash.name}"` });
}

export function findFoods(ids: number[]): Promise<Food[]> {
	return repo.listFoodsByIds([...new Set(ids)]);
}

export async function getFood(id: number): Promise<FoodDetailComputed> {
	const food = await requireFood(id);
	const [portions, categories, dishes] = await Promise.all([repo.listPortions(id), repo.listCategories(), repo.listDishUsage(id)]);
	const category = categories.find((c) => c.id === food.categoryId)!; // FK RESTRICT
	const parent = category.parentId === null ? null : categories.find((c) => c.id === category.parentId) ?? null;
	return {
		...food,
		portions,
		category: { id: category.id, name: category.name, parent: parent ? { id: parent.id, name: parent.name } : null },
		dishes,
	};
}

export async function addFood(data: CreateFoodInput): Promise<FoodDetailComputed> {
	await assertFoodNameFree(data.name);
	await requireCategory(data.categoryId).catch(() => {
		throw createError({ statusCode: 400, message: 'Nhóm thực phẩm không tồn tại' });
	});
	const id = await repo.createFood({ ...data, name: data.name.trim(), source: 'user' });
	return getFood(id);
}

// Sửa được cả thực phẩm từ bảng nguồn: `source` giữ nguyên để còn tra lại, `updatedAt` cho FE
// biết số liệu đã khác bản gốc.
export async function editFood(id: number, data: UpdateFoodInput): Promise<FoodDetailComputed> {
	await requireFood(id);
	if (data.name !== undefined) await assertFoodNameFree(data.name, id);
	if (data.categoryId !== undefined) {
		await requireCategory(data.categoryId).catch(() => {
			throw createError({ statusCode: 400, message: 'Nhóm thực phẩm không tồn tại' });
		});
	}
	await repo.updateFood(id, data.name !== undefined ? { ...data, name: data.name.trim() } : data);
	return getFood(id);
}

// Đang là nguyên liệu của món / nằm trong thực đơn ⇒ 409, KHÔNG tự gỡ: âm thầm làm hụt là sai
// dinh dưỡng thứ người dùng đã soạn (cùng lý do với bài tập trong giáo án). FK RESTRICT là lưới
// cuối. Nhật ký ăn là snapshot nên không chặn.
export async function deleteFood(id: number): Promise<FoodDetailComputed> {
	const dto = await getFood(id);
	if (dto.dishes.length > 0) {
		throw createError({
			statusCode: 409,
			message: `Thực phẩm đang là nguyên liệu của ${dto.dishes.length} món — gỡ khỏi món hoặc lưu trữ thay vì xoá`,
		});
	}
	const menuCount = await repo.countMenuUsage(id);
	if (menuCount > 0) {
		throw createError({
			statusCode: 409,
			message: `Thực phẩm đang nằm trong ${menuCount} thực đơn — gỡ khỏi thực đơn hoặc lưu trữ thay vì xoá`,
		});
	}
	await repo.removeFood(id);
	return dto;
}

// --- Khẩu phần: mọi thao tác trả thực phẩm mới nhất, FE gán thẳng ---

async function requirePortionOf(foodId: number, portionId: number) {
	const portion = await repo.getPortionById(portionId);
	if (!portion || portion.foodId !== foodId) throw createError({ statusCode: 404, message: 'Khẩu phần không tồn tại' });
	return portion;
}

export async function addPortion(foodId: number, data: { name: string; grams: number }): Promise<FoodDetailComputed> {
	await requireFood(foodId);
	await repo.createPortion({ ...data, name: data.name.trim(), foodId, position: (await repo.maxPortionPosition(foodId)) + 1 });
	return getFood(foodId);
}

export async function editPortion(
	foodId: number,
	portionId: number,
	data: { name?: string; grams?: number },
): Promise<FoodDetailComputed> {
	await requirePortionOf(foodId, portionId);
	await repo.updatePortion(portionId, data.name !== undefined ? { ...data, name: data.name.trim() } : data);
	return getFood(foodId);
}

export async function removePortion(foodId: number, portionId: number): Promise<FoodDetailComputed> {
	await requirePortionOf(foodId, portionId);
	await repo.removePortion(portionId);
	return getFood(foodId);
}

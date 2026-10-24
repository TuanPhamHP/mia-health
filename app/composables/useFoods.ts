import { ref } from 'vue';
import type {
	AddFoodPortionInput,
	CreateFoodCategoryInput,
	CreateFoodInput,
	FoodCategoryNodeDTO,
	FoodDetailDTO,
	FoodSummaryDTO,
	UpdateFoodCategoryInput,
	UpdateFoodInput,
	UpdateFoodPortionInput,
} from '#shared/types/foods';
import { createRunner } from '~/utils/api';

export function useFoods() {
	const foods = ref<FoodSummaryDTO[]>([]);
	const current = ref<FoodDetailDTO | null>(null);
	const categories = ref<FoodCategoryNodeDTO[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	/** Nhóm gốc ⇒ gồm cả các loại con; `q` tìm theo tên bỏ dấu (server). */
	async function list(filter: { categoryId?: number; q?: string; includeArchived?: boolean }): Promise<void> {
		const params: Record<string, string> = {};
		if (filter.categoryId !== undefined) params['categoryId'] = String(filter.categoryId);
		if (filter.q) params['q'] = filter.q;
		if (filter.includeArchived) params['includeArchived'] = 'true';
		const rows = await run(() => $fetch<FoodSummaryDTO[]>('/api/foods', { params }));
		if (rows) foods.value = rows;
	}

	// Mọi thao tác trên một thực phẩm trả bản chi tiết mới nhất → gán thẳng vào `current`.
	async function setCurrent(p: Promise<FoodDetailDTO>): Promise<FoodDetailDTO | null> {
		const detail = await run(() => p);
		if (detail) current.value = detail;
		return detail;
	}

	const get = (id: number) => setCurrent($fetch<FoodDetailDTO>(`/api/foods/${id}`));

	const create = (input: CreateFoodInput) => setCurrent($fetch<FoodDetailDTO>('/api/foods', { method: 'POST', body: input }));

	const update = (id: number, input: UpdateFoodInput) =>
		setCurrent($fetch<FoodDetailDTO>(`/api/foods/${id}`, { method: 'PATCH', body: input }));

	async function remove(id: number): Promise<boolean> {
		const ok = await run(() => $fetch(`/api/foods/${id}`, { method: 'DELETE' }));
		if (ok === null) return false;
		foods.value = foods.value.filter((f) => f.id !== id);
		if (current.value?.id === id) current.value = null;
		return true;
	}

	const addPortion = (foodId: number, input: AddFoodPortionInput) =>
		setCurrent($fetch<FoodDetailDTO>(`/api/foods/${foodId}/portions`, { method: 'POST', body: input }));

	const updatePortion = (foodId: number, portionId: number, input: UpdateFoodPortionInput) =>
		setCurrent($fetch<FoodDetailDTO>(`/api/foods/${foodId}/portions/${portionId}`, { method: 'PATCH', body: input }));

	const removePortion = (foodId: number, portionId: number) =>
		setCurrent($fetch<FoodDetailDTO>(`/api/foods/${foodId}/portions/${portionId}`, { method: 'DELETE' }));

	// --- Cây danh mục: mọi thao tác trả cả cây mới nhất ---

	async function setTree(p: Promise<FoodCategoryNodeDTO[]>): Promise<FoodCategoryNodeDTO[] | null> {
		const tree = await run(() => p);
		if (tree) categories.value = tree;
		return tree;
	}

	const loadCategories = () => setTree($fetch<FoodCategoryNodeDTO[]>('/api/food-categories'));

	const createCategory = (input: CreateFoodCategoryInput) =>
		setTree($fetch<FoodCategoryNodeDTO[]>('/api/food-categories', { method: 'POST', body: input }));

	const updateCategory = (id: number, input: UpdateFoodCategoryInput) =>
		setTree($fetch<FoodCategoryNodeDTO[]>(`/api/food-categories/${id}`, { method: 'PATCH', body: input }));

	const removeCategory = (id: number) =>
		setTree($fetch<FoodCategoryNodeDTO[]>(`/api/food-categories/${id}`, { method: 'DELETE' }));

	return {
		foods,
		current,
		categories,
		loading,
		error,
		list,
		get,
		create,
		update,
		remove,
		addPortion,
		updatePortion,
		removePortion,
		loadCategories,
		createCategory,
		updateCategory,
		removeCategory,
	};
}

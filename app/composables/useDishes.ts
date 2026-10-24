import { ref } from 'vue';
import type { CreateDishInput, DishCategory, DishDetailDTO, DishSummaryDTO, UpdateDishInput } from '#shared/types/dishes';
import { createRunner } from '~/utils/api';

export function useDishes() {
	const dishes = ref<DishSummaryDTO[]>([]);
	const current = ref<DishDetailDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function list(filter: { category?: DishCategory; q?: string; includeArchived?: boolean }): Promise<void> {
		const params: Record<string, string> = {};
		if (filter.category) params['category'] = filter.category;
		if (filter.q) params['q'] = filter.q;
		if (filter.includeArchived) params['includeArchived'] = 'true';
		const rows = await run(() => $fetch<DishSummaryDTO[]>('/api/dishes', { params }));
		if (rows) dishes.value = rows;
	}

	// Mọi thao tác trên một món trả bản chi tiết mới nhất (kèm dinh dưỡng tính lại) → gán thẳng.
	async function setCurrent(p: Promise<DishDetailDTO>): Promise<DishDetailDTO | null> {
		const detail = await run(() => p);
		if (detail) current.value = detail;
		return detail;
	}

	const get = (id: number) => setCurrent($fetch<DishDetailDTO>(`/api/dishes/${id}`));

	const create = (input: CreateDishInput) => setCurrent($fetch<DishDetailDTO>('/api/dishes', { method: 'POST', body: input }));

	const update = (id: number, input: UpdateDishInput) =>
		setCurrent($fetch<DishDetailDTO>(`/api/dishes/${id}`, { method: 'PATCH', body: input }));

	async function remove(id: number): Promise<boolean> {
		const ok = await run(() => $fetch(`/api/dishes/${id}`, { method: 'DELETE' }));
		if (ok === null) return false;
		dishes.value = dishes.value.filter((d) => d.id !== id);
		if (current.value?.id === id) current.value = null;
		return true;
	}

	return { dishes, current, loading, error, list, get, create, update, remove };
}

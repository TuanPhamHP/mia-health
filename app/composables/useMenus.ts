import { ref } from 'vue';
import type { CreateMenuInput, MenuDetailDTO, MenuSummaryDTO, UpdateMenuInput } from '#shared/types/meals';
import { createRunner } from '~/utils/api';

export function useMenus() {
	const menus = ref<MenuSummaryDTO[]>([]);
	const current = ref<MenuDetailDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function list(filter?: { includeArchived?: boolean }): Promise<void> {
		const params: Record<string, string> = {};
		if (filter?.includeArchived) params['includeArchived'] = 'true';
		const rows = await run(() => $fetch<MenuSummaryDTO[]>('/api/menus', { params }));
		if (rows) menus.value = rows;
	}

	// Mọi thao tác trên một thực đơn trả bản chi tiết mới nhất (dinh dưỡng tính live) → gán thẳng.
	async function setCurrent(p: Promise<MenuDetailDTO>): Promise<MenuDetailDTO | null> {
		const detail = await run(() => p);
		if (detail) current.value = detail;
		return detail;
	}

	const get = (id: number) => setCurrent($fetch<MenuDetailDTO>(`/api/menus/${id}`));

	const create = (input: CreateMenuInput) => setCurrent($fetch<MenuDetailDTO>('/api/menus', { method: 'POST', body: input }));

	const update = (id: number, input: UpdateMenuInput) =>
		setCurrent($fetch<MenuDetailDTO>(`/api/menus/${id}`, { method: 'PATCH', body: input }));

	/** Lưu những gì đã ăn trong ngày `date` thành thực đơn. */
	const fromDay = (date: string, name: string) =>
		setCurrent($fetch<MenuDetailDTO>('/api/menus/from-day', { method: 'POST', body: { date, name } }));

	async function remove(id: number): Promise<boolean> {
		const ok = await run(() => $fetch(`/api/menus/${id}`, { method: 'DELETE' }));
		if (ok === null) return false;
		menus.value = menus.value.filter((m) => m.id !== id);
		if (current.value?.id === id) current.value = null;
		return true;
	}

	return { menus, current, loading, error, list, get, create, update, fromDay, remove };
}

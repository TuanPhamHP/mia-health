import { ref } from 'vue';
import type {
	AddRoutineItemInput,
	CreateRoutineInput,
	RoutineDetailDTO,
	RoutineSummaryDTO,
	UpdateRoutineInput,
	UpdateRoutineItemInput,
} from '#shared/types/routines';
import { createRunner } from '~/utils/api';

export function useRoutines() {
	const routines = ref<RoutineSummaryDTO[]>([]);
	const current = ref<RoutineDetailDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function list(filter?: { includeArchived?: boolean }): Promise<void> {
		const params: Record<string, string> = {};
		if (filter?.includeArchived) params['includeArchived'] = 'true';
		const rows = await run(() => $fetch<RoutineSummaryDTO[]>('/api/routines', { params }));
		if (rows) routines.value = rows;
	}

	// Mọi thao tác trên một giáo án trả về bản chi tiết mới nhất → gán thẳng vào `current`.
	async function setCurrent(p: Promise<RoutineDetailDTO>): Promise<RoutineDetailDTO | null> {
		const detail = await run(() => p);
		if (detail) current.value = detail;
		return detail;
	}

	const get = (id: number) => setCurrent($fetch<RoutineDetailDTO>(`/api/routines/${id}`));

	const create = (input: CreateRoutineInput) =>
		setCurrent($fetch<RoutineDetailDTO>('/api/routines', { method: 'POST', body: input }));

	const update = (id: number, input: UpdateRoutineInput) =>
		setCurrent($fetch<RoutineDetailDTO>(`/api/routines/${id}`, { method: 'PATCH', body: input }));

	async function remove(id: number): Promise<boolean> {
		const ok = await run(() => $fetch(`/api/routines/${id}`, { method: 'DELETE' }));
		if (ok === null) return false;
		routines.value = routines.value.filter((r) => r.id !== id);
		if (current.value?.id === id) current.value = null;
		return true;
	}

	const addItem = (routineId: number, input: AddRoutineItemInput) =>
		setCurrent($fetch<RoutineDetailDTO>(`/api/routines/${routineId}/items`, { method: 'POST', body: input }));

	const updateItem = (routineId: number, itemId: number, input: UpdateRoutineItemInput) =>
		setCurrent(
			$fetch<RoutineDetailDTO>(`/api/routines/${routineId}/items/${itemId}`, { method: 'PATCH', body: input }),
		);

	const removeItem = (routineId: number, itemId: number) =>
		setCurrent($fetch<RoutineDetailDTO>(`/api/routines/${routineId}/items/${itemId}`, { method: 'DELETE' }));

	const reorder = (routineId: number, itemIds: number[]) =>
		setCurrent(
			$fetch<RoutineDetailDTO>(`/api/routines/${routineId}/items/reorder`, { method: 'POST', body: { itemIds } }),
		);

	return { routines, current, loading, error, list, get, create, update, remove, addItem, updateItem, removeItem, reorder };
}

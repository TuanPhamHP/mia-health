import { ref } from 'vue';
import type {
	AddSlotInput,
	CreatePhaseInput,
	CreateProgramInput,
	ProgramDetailDTO,
	UpdatePhaseInput,
	UpdateProgramInput,
} from '#shared/types/programs';
import { createRunner } from '~/utils/api';

export function usePrograms() {
	const programs = ref<ProgramDetailDTO[]>([]);
	const current = ref<ProgramDetailDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function list(): Promise<void> {
		const rows = await run(() => $fetch<ProgramDetailDTO[]>('/api/programs'));
		if (rows) programs.value = rows;
	}

	// Mọi thao tác trên một chương trình trả về bản chi tiết mới nhất → gán thẳng vào `current`.
	async function setCurrent(p: Promise<ProgramDetailDTO>): Promise<ProgramDetailDTO | null> {
		const detail = await run(() => p);
		if (detail) current.value = detail;
		return detail;
	}

	const base = (id: number) => `/api/programs/${id}`;

	const get = (id: number) => setCurrent($fetch<ProgramDetailDTO>(base(id)));

	const create = (input: CreateProgramInput) =>
		setCurrent($fetch<ProgramDetailDTO>('/api/programs', { method: 'POST', body: input }));

	/** `startDate` (bắt đầu / dừng theo) lấy từ localDateIso() ở client. */
	const update = (id: number, input: UpdateProgramInput) =>
		setCurrent($fetch<ProgramDetailDTO>(base(id), { method: 'PATCH', body: input }));

	async function remove(id: number): Promise<boolean> {
		const ok = await run(() => $fetch(base(id), { method: 'DELETE' }));
		if (ok === null) return false;
		programs.value = programs.value.filter((p) => p.id !== id);
		if (current.value?.id === id) current.value = null;
		return true;
	}

	const addPhase = (id: number, input: CreatePhaseInput) =>
		setCurrent($fetch<ProgramDetailDTO>(`${base(id)}/phases`, { method: 'POST', body: input }));

	const updatePhase = (id: number, phaseId: number, input: UpdatePhaseInput) =>
		setCurrent($fetch<ProgramDetailDTO>(`${base(id)}/phases/${phaseId}`, { method: 'PATCH', body: input }));

	const removePhase = (id: number, phaseId: number) =>
		setCurrent($fetch<ProgramDetailDTO>(`${base(id)}/phases/${phaseId}`, { method: 'DELETE' }));

	const reorderPhases = (id: number, phaseIds: number[]) =>
		setCurrent($fetch<ProgramDetailDTO>(`${base(id)}/phases/reorder`, { method: 'POST', body: { phaseIds } }));

	const addSlot = (id: number, phaseId: number, input: AddSlotInput) =>
		setCurrent($fetch<ProgramDetailDTO>(`${base(id)}/phases/${phaseId}/slots`, { method: 'POST', body: input }));

	const removeSlot = (id: number, phaseId: number, slotId: number) =>
		setCurrent($fetch<ProgramDetailDTO>(`${base(id)}/phases/${phaseId}/slots/${slotId}`, { method: 'DELETE' }));

	return {
		programs,
		current,
		loading,
		error,
		list,
		get,
		create,
		update,
		remove,
		addPhase,
		updatePhase,
		removePhase,
		reorderPhases,
		addSlot,
		removeSlot,
	};
}

import { ref } from 'vue';
import type { CreateSessionInput, SessionDTO, UpdateSessionInput } from '#shared/types/sessions';
import { createRunner } from '~/utils/api';

export function useSessions() {
	const sessions = ref<SessionDTO[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function list(filter?: { from?: string; to?: string; routineId?: number; limit?: number }): Promise<void> {
		const params: Record<string, string> = {};
		if (filter?.from) params['from'] = filter.from;
		if (filter?.to) params['to'] = filter.to;
		if (filter?.routineId) params['routineId'] = String(filter.routineId);
		if (filter?.limit) params['limit'] = String(filter.limit);
		const rows = await run(() => $fetch<SessionDTO[]>('/api/sessions', { params }));
		if (rows) sessions.value = rows;
	}

	async function create(input: CreateSessionInput): Promise<SessionDTO | null> {
		const saved = await run(() => $fetch<SessionDTO>('/api/sessions', { method: 'POST', body: input }));
		if (saved) sessions.value = [saved, ...sessions.value];
		return saved;
	}

	async function update(id: number, input: UpdateSessionInput): Promise<SessionDTO | null> {
		const saved = await run(() => $fetch<SessionDTO>(`/api/sessions/${id}`, { method: 'PATCH', body: input }));
		if (saved) {
			const idx = sessions.value.findIndex((s) => s.id === id);
			if (idx !== -1) sessions.value[idx] = saved;
		}
		return saved;
	}

	async function remove(id: number): Promise<boolean> {
		const ok = await run(() => $fetch(`/api/sessions/${id}`, { method: 'DELETE' }));
		if (ok === null) return false;
		sessions.value = sessions.value.filter((s) => s.id !== id);
		return true;
	}

	return { sessions, loading, error, list, create, update, remove };
}

import { ref } from 'vue';
import type { CreateExerciseInput, ExerciseCategory, ExerciseDTO, UpdateExerciseInput } from '#shared/types/exercises';
import type { SeedResultDTO } from '#shared/types/presets';
import { localDateIso } from '#shared/utils/date';
import { createRunner } from '~/utils/api';

export function useExercises() {
	const exercises = ref<ExerciseDTO[]>([]);
	const current = ref<ExerciseDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function list(filter?: { category?: ExerciseCategory; includeArchived?: boolean }): Promise<void> {
		const params: Record<string, string> = {};
		if (filter?.category) params['category'] = filter.category;
		if (filter?.includeArchived) params['includeArchived'] = 'true';
		const rows = await run(() => $fetch<ExerciseDTO[]>('/api/exercises', { params }));
		if (rows) exercises.value = rows;
	}

	// Bản mới nhất của một bài → cập nhật cả `current` lẫn dòng tương ứng trong danh sách.
	function apply(saved: ExerciseDTO | null): ExerciseDTO | null {
		if (!saved) return null;
		if (current.value?.id === saved.id) current.value = saved;
		const idx = exercises.value.findIndex((e) => e.id === saved.id);
		if (idx !== -1) exercises.value[idx] = saved;
		return saved;
	}

	async function get(id: number): Promise<ExerciseDTO | null> {
		const dto = await run(() => $fetch<ExerciseDTO>(`/api/exercises/${id}`));
		if (dto) current.value = dto;
		return dto;
	}

	async function create(input: CreateExerciseInput): Promise<ExerciseDTO | null> {
		const saved = await run(() => $fetch<ExerciseDTO>('/api/exercises', { method: 'POST', body: input }));
		if (saved) exercises.value.push(saved);
		return saved;
	}

	async function update(id: number, input: UpdateExerciseInput): Promise<ExerciseDTO | null> {
		return apply(await run(() => $fetch<ExerciseDTO>(`/api/exercises/${id}`, { method: 'PATCH', body: input })));
	}

	async function remove(id: number): Promise<boolean> {
		const ok = await run(() => $fetch(`/api/exercises/${id}`, { method: 'DELETE' }));
		if (ok === null) return false;
		exercises.value = exercises.value.filter((e) => e.id !== id);
		if (current.value?.id === id) current.value = null;
		return true;
	}

	// Ảnh / video hướng dẫn: useMediaApi('exercises') trong MediaManagerSheet (dùng chung với món ăn, thực phẩm).

	/**
	 * Thêm bộ bài tập + giáo án + chương trình mẫu (idempotent theo tên). Chương trình mẫu
	 * "đang theo" bắt đầu từ hôm nay — ngày lấy ở client, server không biết múi giờ.
	 */
	function seedPresets(): Promise<SeedResultDTO | null> {
		return run(() => $fetch<SeedResultDTO>('/api/presets/seed', { method: 'POST', body: { today: localDateIso() } }));
	}

	return {
		exercises,
		current,
		loading,
		error,
		list,
		get,
		create,
		update,
		remove,
		seedPresets,
	};
}

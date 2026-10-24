import { ref } from 'vue';
import type { BodyDTO, UpdateBodyProfileInput } from '#shared/types/body';
import type { NutritionTargetsDTO } from '#shared/types/meals';
import { createRunner } from '~/utils/api';

// Chỉ số cơ thể. `today` luôn lấy từ localDateIso() ở client — tuổi + chỉ số theo ngày của người dùng.
export function useBody() {
	const body = ref<BodyDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function apply(p: Promise<BodyDTO>): Promise<BodyDTO | null> {
		const dto = await run(() => p);
		if (dto) body.value = dto;
		return dto;
	}

	const load = (today: string) => apply($fetch<BodyDTO>('/api/body', { params: { today } }));

	const saveProfile = (input: UpdateBodyProfileInput) => apply($fetch<BodyDTO>('/api/body/profile', { method: 'PUT', body: input }));

	/** Cân lại trong cùng ngày ⇒ ghi đè. */
	const addWeight = (today: string, date: string, weightKg: number) =>
		apply($fetch<BodyDTO>('/api/body/weights', { method: 'POST', body: { today, date, weightKg } }));

	const removeWeight = (today: string, id: number) =>
		apply($fetch<BodyDTO>(`/api/body/weights/${id}`, { method: 'DELETE', params: { today } }));

	/** Ghi mục tiêu tính được thành mục tiêu dinh dưỡng của nhật ký ăn. */
	const applyTargets = (today: string) =>
		run(() => $fetch<NutritionTargetsDTO>('/api/body/apply-targets', { method: 'POST', body: { today } }));

	return { body, loading, error, load, saveProfile, addWeight, removeWeight, applyTargets };
}

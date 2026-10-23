import { ref } from 'vue';
import type { PlanChangeInput, TodayPlanDTO } from '#shared/types/plan';
import { createRunner } from '~/utils/api';

// Lịch một ngày từ các chương trình đang theo. `date` luôn lấy từ localDateIso() ở client —
// server không biết múi giờ người tập. Thay đổi (bỏ qua / đổi / thêm buổi) chỉ áp cho ngày đó.
export function usePlan() {
	const plan = ref<TodayPlanDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function apply(p: Promise<TodayPlanDTO>): Promise<TodayPlanDTO | null> {
		const dto = await run(() => p);
		if (dto) plan.value = dto;
		return dto;
	}

	const load = (date: string) => apply($fetch<TodayPlanDTO>('/api/plan/today', { params: { date } }));

	const change = (input: PlanChangeInput) =>
		apply($fetch<TodayPlanDTO>('/api/plan/changes', { method: 'POST', body: input }));

	/** Hoàn tác một thay đổi trong ngày. */
	const undo = (changeId: number) => apply($fetch<TodayPlanDTO>(`/api/plan/changes/${changeId}`, { method: 'DELETE' }));

	return { plan, loading, error, load, change, undo };
}

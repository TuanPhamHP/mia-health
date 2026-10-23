import { ref } from 'vue';
import type { StatsOverviewDTO, TodayDTO } from '#shared/types/stats';
import { createRunner } from '~/utils/api';

// `today`/`date` luôn lấy từ localDateIso() ở client — server không biết múi giờ người tập.
export function useStats() {
	const overview = ref<StatsOverviewDTO | null>(null);
	const today = ref<TodayDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function loadOverview(todayIso: string): Promise<void> {
		const dto = await run(() => $fetch<StatsOverviewDTO>('/api/stats/overview', { params: { today: todayIso } }));
		if (dto) overview.value = dto;
	}

	async function loadToday(dateIso: string): Promise<void> {
		const dto = await run(() => $fetch<TodayDTO>('/api/stats/today', { params: { date: dateIso } }));
		if (dto) today.value = dto;
	}

	return { overview, today, loading, error, loadOverview, loadToday };
}

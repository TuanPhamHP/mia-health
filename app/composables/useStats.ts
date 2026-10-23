import { ref } from 'vue';
import type { StatsOverviewDTO } from '#shared/types/stats';
import { createRunner } from '~/utils/api';

// `today` luôn lấy từ localDateIso() ở client — server không biết múi giờ người tập.
export function useStats() {
	const overview = ref<StatsOverviewDTO | null>(null);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);

	async function loadOverview(todayIso: string): Promise<void> {
		const dto = await run(() => $fetch<StatsOverviewDTO>('/api/stats/overview', { params: { today: todayIso } }));
		if (dto) overview.value = dto;
	}

	return { overview, loading, error, loadOverview };
}

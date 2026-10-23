<script setup lang="ts">
	/**
	 * Lưới hoạt động 12 tuần kiểu GitHub: cột = tuần (Thứ 2 → CN), ô = ngày.
	 * Thang TUẦN TỰ một màu (sky), mức 0 là nền trung tính. Dark mode có bậc riêng
	 * (đậm → sáng) chứ không lật tự động. Mỗi ô có title để tra cứu số chính xác.
	 */
	import type { DailyStat } from '#shared/utils/streak';
	import { formatDate, formatDuration } from '~/utils/format';

	const props = defineProps<{ days: DailyStat[]; today: string }>();

	const LEVEL_CLASSES = [
		'bg-(--ui-bg-elevated)',
		'bg-sky-300 dark:bg-sky-900',
		'bg-sky-400 dark:bg-sky-700',
		'bg-sky-600 dark:bg-sky-500',
		'bg-sky-800 dark:bg-sky-300',
	] as const;

	// Mức theo phút tập trong ngày — đếm số buổi thì 1 buổi kegel 5 phút và 1 buổi gym
	// 60 phút trông như nhau.
	function level(d: DailyStat): number {
		if (d.sessions <= 0) return 0;
		const min = d.durationSec / 60;
		if (min < 10) return 1;
		if (min < 25) return 2;
		if (min < 45) return 3;
		return 4;
	}

	const weeks = computed(() => {
		const out: DailyStat[][] = [];
		for (let i = 0; i < props.days.length; i += 7) out.push(props.days.slice(i, i + 7));
		return out;
	});

	function cellTitle(d: DailyStat): string {
		if (d.sessions <= 0) return `${formatDate(d.date)}: nghỉ`;
		return `${formatDate(d.date)}: ${d.sessions} buổi · ${formatDuration(d.durationSec)}`;
	}

	const ROW_LABELS = ['T2', '', 'T4', '', 'T6', '', 'CN'];
</script>

<template>
	<div>
		<div class="flex gap-1.5">
			<div class="grid grid-rows-7 gap-[3px] pr-0.5 text-[9px] leading-none text-(--ui-text-dimmed)">
				<span v-for="(l, i) in ROW_LABELS" :key="i" class="flex h-full items-center">{{ l }}</span>
			</div>
			<div class="grid flex-1 grid-flow-col auto-cols-fr gap-[3px]">
				<div v-for="(week, wi) in weeks" :key="wi" class="grid grid-rows-7 gap-[3px]">
					<div
						v-for="d in week"
						:key="d.date"
						class="aspect-square rounded-[3px]"
						:class="[LEVEL_CLASSES[level(d)], d.date === today ? 'ring-1 ring-(--ui-text-highlighted)' : '']"
						:title="cellTitle(d)"
						:aria-label="cellTitle(d)"
						role="img"
					/>
				</div>
			</div>
		</div>
		<div class="mt-2 flex items-center justify-end gap-1 text-[10px] text-(--ui-text-muted)">
			<span>Ít</span>
			<span v-for="(c, i) in LEVEL_CLASSES" :key="i" class="size-2.5 rounded-[2px]" :class="c" />
			<span>Nhiều</span>
		</div>
	</div>
</template>

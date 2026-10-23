<script setup lang="ts">
	/**
	 * Số phút tập theo tuần — một series nên không có legend (tiêu đề card đã gọi tên).
	 * Cột mảnh, bo 4px đầu cột, khe 2px; chỉ gắn nhãn số cho tuần hiện tại (nhãn chọn lọc),
	 * các tuần khác tra bằng title khi chạm/hover.
	 */
	import type { WeeklyStat } from '#shared/utils/streak';
	import { formatDuration } from '~/utils/format';

	const props = defineProps<{ weeks: WeeklyStat[] }>();

	const maxSec = computed(() => Math.max(60, ...props.weeks.map((w) => w.durationSec)));

	function label(weekStart: string): string {
		const [, m, d] = weekStart.split('-');
		return `${d}/${m}`;
	}

	function title(w: WeeklyStat): string {
		return `Tuần ${label(w.weekStart)}: ${w.sessions} buổi · ${formatDuration(w.durationSec)} · ${w.activeDays}/7 ngày`;
	}
</script>

<template>
	<div>
		<div class="flex h-24 items-end gap-[2px] border-b border-(--ui-border)">
			<div
				v-for="(w, i) in weeks"
				:key="w.weekStart"
				class="relative flex h-full flex-1 flex-col items-center justify-end"
				:title="title(w)"
				:aria-label="title(w)"
				role="img"
			>
				<span
					v-if="i === weeks.length - 1 && w.durationSec > 0"
					class="mb-0.5 text-[10px] font-medium tabular-nums text-(--ui-text-highlighted)"
				>
					{{ Math.round(w.durationSec / 60) }}′
				</span>
				<div
					class="w-full max-w-5 rounded-t-[4px] transition-[height] duration-500"
					:class="i === weeks.length - 1 ? 'bg-(--ui-primary)' : 'bg-(--ui-primary)/45'"
					:style="{ height: w.durationSec > 0 ? `${Math.max(4, (w.durationSec / maxSec) * 100)}%` : '0' }"
				/>
			</div>
		</div>
		<div class="mt-1 flex gap-[2px]">
			<span
				v-for="w in weeks"
				:key="w.weekStart"
				class="flex-1 text-center text-[9px] tabular-nums text-(--ui-text-dimmed)"
			>
				{{ label(w.weekStart) }}
			</span>
		</div>
	</div>
</template>

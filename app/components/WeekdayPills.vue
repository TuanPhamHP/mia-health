<script setup lang="ts">
	/** 7 chip T2…CN: ngày có lịch tô đậm, hôm nay có vòng — đọc lịch nhanh hơn chữ "T2, T4, T6". */
	import { WEEKDAY_SHORT_LABELS } from '#shared/utils/weekday';

	defineProps<{ mask: number; today?: number }>(); // today: ISO weekday 1–7
</script>

<template>
	<div class="flex gap-1" role="list" aria-label="Lịch tập trong tuần">
		<span
			v-for="(label, i) in WEEKDAY_SHORT_LABELS"
			:key="label"
			role="listitem"
			class="flex h-6 flex-1 items-center justify-center rounded-md text-[11px] font-medium"
			:class="[
				mask & (1 << i) ? 'bg-(--ui-primary)/20 text-(--ui-primary)' : 'bg-(--ui-bg-elevated) text-(--ui-text-dimmed)',
				today === i + 1 ? 'ring-1 ring-(--ui-text-highlighted)' : '',
			]"
			:aria-label="`${label}${mask & (1 << i) ? ': có lịch' : ''}${today === i + 1 ? ' (hôm nay)' : ''}`"
		>
			{{ label }}
		</span>
	</div>
</template>

<script setup lang="ts">
	/** Tóm tắt cơ thể trên trang chủ: lần cân mới nhất, chênh so với lần trước, BMI (ngưỡng châu Á). */
	import type { BodyDTO } from '#shared/types/body';
	import { BMI_CLASS_LABELS } from '~/utils/body';
	import { formatAmount } from '~/utils/foods';
	import { formatDate } from '~/utils/format';

	const props = defineProps<{ body: BodyDTO; today: string }>();

	const metrics = computed(() => props.body.metrics);
	const delta = computed(() => {
		const [last, prev] = props.body.weights;
		return last && prev ? last.weightKg - prev.weightKg : null;
	});

	function signed(v: number): string {
		if (Math.abs(v) < 0.05) return '±0 kg';
		return `${v > 0 ? '+' : '−'}${formatAmount(Math.abs(v))} kg`;
	}
</script>

<template>
	<UCard>
		<NuxtLink to="/body" class="flex items-center gap-3">
			<span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--ui-primary)/15">
				<UIcon name="i-heroicons-scale" class="size-5 text-(--ui-primary)" />
			</span>
			<span v-if="!metrics" class="min-w-0 flex-1 text-sm text-(--ui-text-muted)">
				{{ body.profile ? 'Ghi một lần cân' : 'Nhập hồ sơ + cân nặng' }} để tính BMI, TDEE và mục tiêu ăn
			</span>
			<span v-else class="min-w-0 flex-1">
				<span class="block text-sm tabular-nums">
					<span class="font-semibold text-(--ui-text-highlighted)">{{ formatAmount(metrics.weightKg) }} kg</span>
					<span v-if="delta !== null" class="text-xs text-(--ui-text-muted)"> · {{ signed(delta) }}</span>
				</span>
				<span class="block text-xs text-(--ui-text-muted)">
					BMI {{ formatAmount(metrics.bmi) }} · {{ BMI_CLASS_LABELS[metrics.bmiClass] }}
					<template v-if="metrics.weightDate !== today"> · cân {{ formatDate(metrics.weightDate) }}</template>
				</span>
			</span>
			<UIcon name="i-heroicons-chevron-right" class="size-4 shrink-0 text-(--ui-text-dimmed)" />
		</NuxtLink>
	</UCard>
</template>

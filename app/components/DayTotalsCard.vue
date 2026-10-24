<script setup lang="ts">
	/**
	 * Tổng một ngày so với mục tiêu: năng lượng (con số chính) + đạm / béo / glucid / xơ, natri là
	 * mức TỐI ĐA. Thanh tiến độ luôn kèm số — màu không đứng một mình; vượt mục tiêu ghi chữ "vượt".
	 */
	import type { DayLogDTO } from '#shared/types/meals';
	import type { NutrientKey } from '#shared/utils/nutrients';
	import { formatAmount } from '~/utils/foods';

	const props = defineProps<{ day: DayLogDTO }>();
	const emit = defineEmits<{ editTargets: [] }>();

	const showAll = ref(false);
	const total = computed(() => props.day.totals.values);
	const missing = computed(() => new Set(props.day.totals.missing));

	const energyPct = computed(() => Math.min(100, (total.value.energyKcal / props.day.targets.energyKcal) * 100));
	const energyLeft = computed(() => props.day.targets.energyKcal - total.value.energyKcal);

	const ROWS: { key: NutrientKey; label: string; unit: string; target: keyof DayLogDTO['targets']; isMax?: boolean }[] = [
		{ key: 'proteinG', label: 'Đạm', unit: 'g', target: 'proteinG' },
		{ key: 'fatG', label: 'Béo', unit: 'g', target: 'fatG' },
		{ key: 'carbG', label: 'Glucid', unit: 'g', target: 'carbG' },
		{ key: 'fiberG', label: 'Chất xơ', unit: 'g', target: 'fiberG' },
		{ key: 'sodiumMg', label: 'Natri (tối đa)', unit: 'mg', target: 'sodiumMg', isMax: true },
	];

	const rows = computed(() =>
		ROWS.map((r) => {
			const value = total.value[r.key];
			const target = props.day.targets[r.target] as number | null;
			const pct = value !== null && target ? (value / target) * 100 : null;
			return { ...r, value, target, pct, over: r.isMax && pct !== null && pct > 100, atLeast: missing.value.has(r.key) };
		}),
	);
</script>

<template>
	<UCard>
		<div class="flex items-start justify-between gap-2">
			<div>
				<p class="text-xs text-(--ui-text-muted)">Đã ăn</p>
				<p class="tabular-nums">
					<span class="text-4xl font-bold leading-none text-(--ui-text-highlighted)">{{ formatAmount(total.energyKcal) }}</span>
					<span class="ml-1 text-sm text-(--ui-text-muted)">/ {{ formatAmount(day.targets.energyKcal) }} kcal</span>
				</p>
			</div>
			<UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-adjustments-horizontal" @click="emit('editTargets')">Mục tiêu</UButton>
		</div>
		<div
			class="mt-3 h-2 rounded-full bg-(--ui-bg-elevated)"
			role="progressbar"
			:aria-valuenow="Math.round(total.energyKcal)"
			aria-valuemin="0"
			:aria-valuemax="day.targets.energyKcal"
			aria-label="Năng lượng đã ăn so với mục tiêu"
		>
			<div class="h-full rounded-full" :class="energyLeft < 0 ? 'bg-amber-500' : 'bg-(--ui-primary)'" :style="{ width: `${energyPct}%` }" />
		</div>
		<p class="mt-1.5 text-sm" :class="energyLeft < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-(--ui-text-muted)'">
			{{ energyLeft >= 0 ? `Còn ${formatAmount(energyLeft)} kcal` : `Vượt ${formatAmount(-energyLeft)} kcal` }}
			<span v-if="day.targets.updatedAt === null" class="text-(--ui-text-dimmed)"> · mục tiêu mặc định 2.000 kcal</span>
		</p>

		<div class="mt-3 space-y-2">
			<div v-for="r in rows" :key="r.key" class="text-sm">
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-(--ui-text-highlighted)">{{ r.label }}</span>
					<span class="tabular-nums" :class="r.over ? 'text-amber-600 dark:text-amber-400' : 'text-(--ui-text-muted)'">
						<template v-if="r.value === null">—</template>
						<template v-else>{{ r.atLeast ? '≥ ' : '' }}{{ formatAmount(r.value) }}</template>
						<template v-if="r.target"> / {{ formatAmount(r.target) }}</template> {{ r.unit }}
						<template v-if="r.over"> · vượt</template>
					</span>
				</div>
				<div v-if="r.pct !== null" class="mt-1 h-1.5 rounded-full bg-(--ui-bg-elevated)">
					<div class="h-full rounded-full" :class="r.over ? 'bg-amber-500' : 'bg-(--ui-primary)'" :style="{ width: `${Math.min(100, r.pct)}%` }" />
				</div>
			</div>
		</div>

		<UButton
			class="mt-3"
			size="xs"
			color="neutral"
			variant="ghost"
			:icon="showAll ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
			@click="() => { showAll = !showAll }"
		>
			{{ showAll ? 'Ẩn bớt' : 'Xem đủ 29 chất trong ngày' }}
		</UButton>
		<NutritionLabel v-if="showAll" class="mt-2" :values="total" :missing="day.totals.missing" />
	</UCard>
</template>

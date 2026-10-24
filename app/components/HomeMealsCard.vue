<script setup lang="ts">
	/**
	 * Tóm tắt ăn uống trên trang chủ: kcal đã ăn so với mục tiêu + đạm / béo / glucid (số nguyên —
	 * nhìn lướt; số lẻ ở nhật ký). Nút ghi nhanh mở thẳng bảng chọn món của bữa theo giờ ở nhật ký
	 * (?add=<bữa>).
	 */
	import type { DayLogDTO } from '#shared/types/meals';
	import { formatAmount } from '~/utils/foods';
	import { MEAL_LABELS, mealForNow } from '~/utils/meals';

	const props = defineProps<{ day: DayLogDTO }>();

	const meal = mealForNow();
	const eaten = computed(() => props.day.totals.values.energyKcal);
	const left = computed(() => props.day.targets.energyKcal - eaten.value);
	const pct = computed(() => Math.min(100, (eaten.value / props.day.targets.energyKcal) * 100));

	const macros = computed(() =>
		(
			[
				{ key: 'proteinG', label: 'Đạm' },
				{ key: 'fatG', label: 'Béo' },
				{ key: 'carbG', label: 'Glucid' },
			] as const
		).map((m) => {
			const value = props.day.totals.values[m.key] ?? 0;
			const target = props.day.targets[m.key];
			return { ...m, value, target, pct: target ? Math.min(100, (value / target) * 100) : null };
		}),
	);
</script>

<template>
	<UCard>
		<div class="flex items-center gap-2">
			<UIcon name="i-heroicons-cake" class="size-4 shrink-0 text-(--ui-primary)" />
			<h2 class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">Ăn uống</h2>
			<UButton size="xs" variant="soft" icon="i-heroicons-plus" :to="`/diary?add=${meal}`">Ghi {{ MEAL_LABELS[meal].toLowerCase() }}</UButton>
		</div>

		<NuxtLink to="/diary" class="mt-3 block">
			<div class="flex items-baseline justify-between gap-2">
				<p class="tabular-nums">
					<span class="text-2xl font-bold text-(--ui-text-highlighted)">{{ formatAmount(eaten) }}</span>
					<span class="ml-1 text-sm text-(--ui-text-muted)">/ {{ formatAmount(day.targets.energyKcal) }} kcal</span>
				</p>
				<span class="text-xs" :class="left < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-(--ui-text-muted)'">
					{{ left >= 0 ? `Còn ${formatAmount(left)} kcal` : `Vượt ${formatAmount(-left)} kcal` }}
				</span>
			</div>
			<div
				class="mt-2 h-2 rounded-full bg-(--ui-bg-elevated)"
				role="progressbar"
				:aria-valuenow="Math.round(eaten)"
				aria-valuemin="0"
				:aria-valuemax="day.targets.energyKcal"
				aria-label="Năng lượng đã ăn so với mục tiêu"
			>
				<div class="h-full rounded-full" :class="left < 0 ? 'bg-amber-500' : 'bg-(--ui-primary)'" :style="{ width: `${pct}%` }" />
			</div>

			<div class="mt-3 grid grid-cols-3 gap-3">
				<div v-for="m in macros" :key="m.key">
					<p class="text-[11px] text-(--ui-text-muted)">{{ m.label }}</p>
					<p class="text-sm tabular-nums text-(--ui-text-highlighted)">
						{{ Math.round(m.value) }}<span class="text-(--ui-text-muted)">{{ m.target ? ` / ${Math.round(m.target)}` : '' }} g</span>
					</p>
					<div v-if="m.pct !== null" class="mt-1 h-1 rounded-full bg-(--ui-bg-elevated)">
						<div class="h-full rounded-full bg-(--ui-primary)" :style="{ width: `${m.pct}%` }" />
					</div>
				</div>
			</div>

			<p v-if="day.entries.length === 0" class="mt-3 text-xs text-(--ui-text-dimmed)">Chưa ghi bữa nào hôm nay.</p>
		</NuxtLink>
	</UCard>
</template>

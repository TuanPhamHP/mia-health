<script setup lang="ts">
	/**
	 * Gợi ý món cho phần còn lại trong ngày (shared/utils/suggest.ts): còn thiếu đạm thì ưu tiên
	 * món giàu đạm, rồi tới món vừa một bữa. Nút "+" thêm 1 phần vào bữa hiện tại.
	 */
	import type { SuggestionsDTO } from '#shared/types/body';
	import { formatAmount } from '~/utils/foods';
	import { MEAL_LABELS } from '~/utils/meals';
	import type { Meal } from '#shared/types/meals';

	defineProps<{ suggestions: SuggestionsDTO; meal: Meal; busy: boolean }>();
	const emit = defineEmits<{ add: [dishId: number] }>();
</script>

<template>
	<UCard>
		<div class="mb-1 flex items-center gap-2">
			<UIcon name="i-heroicons-light-bulb" class="size-4 shrink-0 text-amber-500" />
			<p class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">Gợi ý cho phần còn lại</p>
		</div>
		<p class="mb-2 text-xs text-(--ui-text-muted)">
			<template v-if="suggestions.remainingKcal > 0">Còn {{ formatAmount(suggestions.remainingKcal) }} kcal</template>
			<template v-else>Đã đủ kcal hôm nay — chỉ gợi ý món nhẹ</template>
			<template v-if="suggestions.remainingProteinG !== null && suggestions.remainingProteinG > 0"> · thiếu {{ formatAmount(suggestions.remainingProteinG) }} g đạm</template>
			· nút + thêm 1 phần vào {{ MEAL_LABELS[meal].toLowerCase() }}
		</p>
		<p v-if="suggestions.items.length === 0" class="text-sm text-(--ui-text-dimmed)">Không có món phù hợp.</p>
		<div v-for="s in suggestions.items" :key="s.dishId" class="flex items-center gap-2 border-t border-(--ui-border) py-2">
			<NuxtLink :to="`/dishes/${s.dishId}`" class="min-w-0 flex-1">
				<span class="block truncate text-sm text-(--ui-text-highlighted)">{{ s.name }}</span>
				<span v-if="s.reasons.length > 0" class="block text-xs text-(--ui-text-muted)">{{ s.reasons.join(' · ') }}</span>
			</NuxtLink>
			<span class="shrink-0 text-xs tabular-nums text-(--ui-text-muted)">{{ formatAmount(s.energyKcal) }} kcal</span>
			<UButton icon="i-heroicons-plus" size="xs" variant="soft" :disabled="busy" :aria-label="`Thêm 1 phần ${s.name}`" @click="emit('add', s.dishId)" />
		</div>
	</UCard>
</template>

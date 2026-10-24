<script setup lang="ts">
	/**
	 * Chọn thực phẩm làm nguyên liệu. Tìm trên server (bỏ dấu, cả tên gốc tiếng Anh). Không tự
	 * đóng sau mỗi lần chọn — soạn món thường nhặt liền 5–8 nguyên liệu; món đã nhặt có dấu ✓.
	 */
	import type { FoodSummaryDTO } from '#shared/types/foods';
	import { FOOD_SOURCE_SHORT, formatAmount } from '~/utils/foods';

	const open = defineModel<boolean>('open', { default: false });
	defineProps<{ pickedIds: readonly number[] }>();
	const emit = defineEmits<{ pick: [food: FoodSummaryDTO] }>();

	const { foods, loading, list } = useFoods();
	const search = ref('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	watch(open, (v) => {
		if (!v) return;
		search.value = '';
		foods.value = [];
	});

	watch(search, (v) => {
		clearTimeout(timer);
		const q = v.trim();
		timer = setTimeout(() => {
			if (q) void list({ q });
			else foods.value = [];
		}, 250);
	});
</script>

<template>
	<AppSheet v-model:open="open" title="Thêm nguyên liệu" subtitle="Chạm để thêm — chọn được nhiều thực phẩm liền">
		<div class="space-y-2">
			<UInput
				v-model="search"
				icon="i-heroicons-magnifying-glass"
				placeholder="Tìm thực phẩm… (VD: uc ga, rau muong)"
				class="w-full"
				autofocus
				:ui="{ base: 'text-base' }"
			/>
			<p v-if="!search.trim()" class="py-4 text-center text-sm text-(--ui-text-muted)">Gõ tên để tìm trong kho thực phẩm.</p>
			<template v-else-if="loading && foods.length === 0">
				<div v-for="i in 4" :key="i" class="h-12 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			</template>
			<p v-else-if="foods.length === 0" class="py-4 text-center text-sm text-(--ui-text-muted)">Không có thực phẩm khớp.</p>
			<button
				v-for="f in foods"
				:key="f.id"
				type="button"
				class="flex w-full items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-2 text-left active:scale-[0.98] transition-transform"
				@click="emit('pick', f)"
			>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium text-(--ui-text-highlighted)">{{ f.name }}</span>
					<span class="block text-xs text-(--ui-text-muted)">{{ formatAmount(f.energyKcal) }} kcal / 100 g · {{ FOOD_SOURCE_SHORT[f.source] }}</span>
				</span>
				<UIcon
					:name="pickedIds.includes(f.id) ? 'i-heroicons-check-circle-solid' : 'i-heroicons-plus-circle'"
					class="size-6 shrink-0 text-(--ui-primary)"
				/>
			</button>
		</div>

		<template #footer>
			<UButton block size="lg" @click="() => { open = false }">Xong</UButton>
		</template>
	</AppSheet>
</template>

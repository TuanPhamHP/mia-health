<script setup lang="ts">
	import type { CreateDishInput } from '#shared/types/dishes';
	import { multiplyNutrients } from '#shared/utils/nutrients';
	import { DISH_CATEGORY_LABELS } from '~/utils/dishes';
	import { formatAmount } from '~/utils/foods';

	const route = useRoute();
	const toast = useToast();
	const pageTitle = usePageTitle();
	pageTitle.value = 'Món ăn';

	const dishId = Number(route.params.id);
	const { current: dish, loading, error, get, update, remove } = useDishes();
	const busy = ref(false);

	onMounted(async () => {
		await get(dishId);
		if (error.value) toast.add({ title: 'Lỗi tải món', description: error.value, color: 'error' });
	});

	useHead({ title: computed(() => `${dish.value?.name ?? 'Món ăn'} — Mia Health`) });

	async function act(fn: () => Promise<unknown>, success?: string): Promise<boolean> {
		busy.value = true;
		const res = await fn();
		busy.value = false;
		if (res === null || res === false) {
			toast.add({ title: 'Có lỗi', description: error.value ?? undefined, color: 'error' });
			return false;
		}
		if (success) toast.add({ title: success, color: 'success' });
		return true;
	}

	// ---- Xem dinh dưỡng theo số phần, hoặc theo gam món chín (nếu đã cân cả nồi) ----
	const mode = ref<'servings' | 'grams'>('servings');
	const portions = ref<number | null>(1);
	const cookedGrams = ref<number | null>(100);

	const shown = computed(() => {
		const n = dish.value?.nutrition;
		if (!n) return null;
		if (mode.value === 'grams' && n.per100gCooked) return multiplyNutrients(n.per100gCooked, (cookedGrams.value ?? 100) / 100);
		return multiplyNutrients(n.perServing, portions.value ?? 1);
	});

	function setPortions(n: number) {
		mode.value = 'servings';
		portions.value = n;
	}

	// ---- Sửa / lưu trữ / xoá ----
	const formOpen = ref(false);
	async function onSave(input: CreateDishInput) {
		if (await act(() => update(dishId, input), 'Đã lưu')) formOpen.value = false;
	}

	async function toggleArchive() {
		if (!dish.value) return;
		const archived = !dish.value.isArchived;
		await act(() => update(dishId, { isArchived: archived }), archived ? 'Đã lưu trữ' : 'Đã khôi phục');
	}

	async function onDelete() {
		if (!dish.value) return;
		if (!confirm(`Xoá món "${dish.value.name}"? Không hoàn tác được.`)) return;
		if (await act(() => remove(dishId), 'Đã xoá món')) await navigateTo('/dishes');
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<template v-if="!dish && loading">
			<div class="h-32 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			<div class="h-96 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="!dish">
			<p class="py-4 text-center text-sm text-(--ui-text-muted)">Không tìm thấy món.</p>
		</UCard>

		<template v-else>
			<UCard>
				<div class="flex items-start gap-2">
					<div class="min-w-0 flex-1">
						<p class="text-xs text-(--ui-text-muted)">
							{{ DISH_CATEGORY_LABELS[dish.category] }} · công thức {{ dish.servings }} phần{{ dish.source === 'preset' ? ' · món mẫu' : '' }}
						</p>
						<h2 class="text-xl font-bold leading-tight text-(--ui-text-highlighted)">{{ dish.name }}</h2>
					</div>
					<UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="sm" aria-label="Sửa món" @click="() => { formOpen = true }" />
				</div>
				<p v-if="dish.description" class="mt-2 whitespace-pre-line text-sm text-(--ui-text-muted)">{{ dish.description }}</p>
				<p v-if="dish.source === 'preset'" class="mt-2 text-[11px] text-(--ui-text-dimmed)">
					Định lượng ước lượng phổ biến; dinh dưỡng tính từ nguyên liệu (Bảng thành phần thực phẩm VN 2007 + USDA). Sửa theo cách nhà bạn nấu cho sát hơn.
				</p>
				<UBadge v-if="dish.isArchived" class="mt-2" color="neutral" variant="soft" size="sm">Đã lưu trữ</UBadge>
			</UCard>

			<UCard v-if="shown">
				<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">Dinh dưỡng cho</p>
				<div class="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
					<UButton
						size="sm"
						class="shrink-0"
						:color="mode === 'servings' && portions === 1 ? 'primary' : 'neutral'"
						:variant="mode === 'servings' && portions === 1 ? 'solid' : 'soft'"
						@click="setPortions(1)"
					>
						1 phần
					</UButton>
					<UButton
						v-if="dish.servings > 1"
						size="sm"
						class="shrink-0"
						:color="mode === 'servings' && portions === dish.servings ? 'primary' : 'neutral'"
						:variant="mode === 'servings' && portions === dish.servings ? 'solid' : 'soft'"
						@click="setPortions(dish.servings)"
					>
						Cả công thức ({{ dish.servings }} phần)
					</UButton>
					<UButton
						v-if="dish.nutrition.per100gCooked"
						size="sm"
						class="shrink-0"
						:color="mode === 'grams' ? 'primary' : 'neutral'"
						:variant="mode === 'grams' ? 'solid' : 'soft'"
						@click="() => { mode = 'grams' }"
					>
						Theo gam món chín
					</UButton>
				</div>
				<UFormField v-if="mode === 'servings'" label="Số phần" class="mb-3">
					<UInputNumber v-model="portions" :min="0.25" :max="50" :step="0.5" class="w-full" />
				</UFormField>
				<UFormField v-else :label="`Gam món chín (cả nồi ${formatAmount(dish.cookedWeightG ?? 0)} g)`" class="mb-3">
					<UInputNumber v-model="cookedGrams" :min="1" :max="50000" :step="10" class="w-full" />
				</UFormField>
				<NutritionLabel :values="shown" :missing="dish.nutrition.missing" />
			</UCard>

			<UCard>
				<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">
					Nguyên liệu cho {{ dish.servings }} phần · {{ formatAmount(dish.nutrition.totalGrams) }} g
				</p>
				<NuxtLink
					v-for="i in dish.ingredients"
					:key="i.id"
					:to="`/foods/${i.foodId}`"
					class="flex items-center gap-2 border-b border-(--ui-border) py-1.5 last:border-b-0"
				>
					<span class="min-w-0 flex-1 truncate text-sm text-(--ui-text-highlighted)">
						{{ i.food.name }}<span v-if="i.food.isArchived" class="text-(--ui-text-dimmed)"> · đã lưu trữ</span>
					</span>
					<span class="shrink-0 text-sm tabular-nums text-(--ui-text-muted)">{{ formatAmount(i.grams) }} g</span>
					<span class="w-16 shrink-0 text-right text-xs tabular-nums text-(--ui-text-dimmed)">
						{{ formatAmount((i.food.energyKcal * i.grams) / 100) }} kcal
					</span>
				</NuxtLink>
			</UCard>

			<div class="grid grid-cols-2 gap-2 pt-1">
				<UButton
					block
					color="neutral"
					variant="soft"
					:icon="dish.isArchived ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-archive-box'"
					:disabled="busy"
					@click="toggleArchive"
				>
					{{ dish.isArchived ? 'Khôi phục' : 'Lưu trữ' }}
				</UButton>
				<UButton block color="error" variant="soft" icon="i-heroicons-trash" :disabled="busy" @click="onDelete">Xoá</UButton>
			</div>

			<DishFormSheet v-model:open="formOpen" :dish="dish" :saving="busy" @save="onSave" />
		</template>
	</div>
</template>

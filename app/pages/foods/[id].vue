<script setup lang="ts">
	import type { AddFoodPortionInput, CreateFoodInput, FoodPortionDTO } from '#shared/types/foods';
	import { scaleNutrients } from '#shared/utils/nutrients';
	import { FOOD_SOURCE_LABELS, formatAmount, sourceCodeLabel } from '~/utils/foods';

	const route = useRoute();
	const toast = useToast();
	const pageTitle = usePageTitle();
	pageTitle.value = 'Thực phẩm';

	const foodId = Number(route.params.id);
	const {
		current: food,
		categories,
		loading,
		error,
		get,
		update,
		remove,
		addPortion,
		updatePortion,
		removePortion,
		loadCategories,
	} = useFoods();

	const busy = ref(false);

	onMounted(async () => {
		await Promise.all([get(foodId), loadCategories()]);
		if (error.value) toast.add({ title: 'Lỗi tải thực phẩm', description: error.value, color: 'error' });
	});

	useHead({ title: computed(() => `${food.value?.name ?? 'Thực phẩm'} — Mia Health`) });

	// Mọi thao tác trả về bản chi tiết mới → `food` tự cập nhật; chỉ cần báo lỗi.
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

	// ---- Khối lượng xem dinh dưỡng: 100 g, một khẩu phần, hoặc tự nhập ----
	const grams = ref<number | null>(100);
	const amountOptions = computed(() => [
		{ key: 'base', label: '100 g', grams: 100 },
		...(food.value?.portions ?? []).map((p) => ({ key: `p${p.id}`, label: `${p.name} · ${formatAmount(p.grams)} g`, grams: p.grams })),
	]);

	const categoryPath = computed(() => {
		const c = food.value?.category;
		return c ? (c.parent ? `${c.parent.name} › ${c.name}` : c.name) : '';
	});
	// Thực phẩm từ bảng nguồn đã bị sửa ⇒ số liệu có thể khác bảng gốc.
	const edited = computed(() => food.value !== null && food.value.source !== 'user' && food.value.updatedAt !== null);

	// ---- Sửa / lưu trữ / xoá ----
	const formOpen = ref(false);
	async function onSave(input: CreateFoodInput) {
		if (await act(() => update(foodId, input), 'Đã lưu')) formOpen.value = false;
	}

	async function toggleArchive() {
		if (!food.value) return;
		const archived = !food.value.isArchived;
		await act(() => update(foodId, { isArchived: archived }), archived ? 'Đã lưu trữ' : 'Đã khôi phục');
	}

	async function onDelete() {
		if (!food.value) return;
		if (!confirm(`Xoá "${food.value.name}"? Không hoàn tác được.`)) return;
		if (await act(() => remove(foodId), 'Đã xoá thực phẩm')) await navigateTo('/foods');
	}

	// ---- Khẩu phần ----
	const portionOpen = ref(false);
	const editingPortion = ref<FoodPortionDTO | null>(null);

	function openPortion(p: FoodPortionDTO | null) {
		editingPortion.value = p;
		portionOpen.value = true;
	}

	async function onSavePortion(input: AddFoodPortionInput) {
		const ok = editingPortion.value
			? await act(() => updatePortion(foodId, editingPortion.value!.id, input), 'Đã lưu')
			: await act(() => addPortion(foodId, input), 'Đã thêm khẩu phần');
		if (ok) portionOpen.value = false;
	}

	async function onRemovePortion(p: FoodPortionDTO) {
		if (!confirm(`Xoá khẩu phần "${p.name}"?`)) return;
		await act(() => removePortion(foodId, p.id));
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<template v-if="!food && loading">
			<div class="h-32 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			<div class="h-96 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="!food">
			<p class="py-4 text-center text-sm text-(--ui-text-muted)">Không tìm thấy thực phẩm.</p>
		</UCard>

		<template v-else>
			<UCard>
				<div class="flex items-start gap-2">
					<div class="min-w-0 flex-1">
						<p class="text-xs text-(--ui-text-muted)">{{ categoryPath }}</p>
						<h2 class="text-xl font-bold leading-tight text-(--ui-text-highlighted)">{{ food.name }}</h2>
					</div>
					<UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="sm" aria-label="Sửa thực phẩm" @click="() => { formOpen = true }" />
				</div>
				<div class="mt-2 space-y-1 text-xs text-(--ui-text-muted)">
					<p class="flex gap-1.5">
						<UIcon name="i-heroicons-document-text" class="mt-0.5 size-3.5 shrink-0" />
						<span>
							{{ FOOD_SOURCE_LABELS[food.source] }}<template v-if="sourceCodeLabel(food.source, food.sourceCode)"> · {{ sourceCodeLabel(food.source, food.sourceCode) }}</template>
							<span v-if="food.sourceName" class="block text-(--ui-text-dimmed)">{{ food.sourceName }}</span>
						</span>
					</p>
					<p v-if="food.refusePct" class="flex gap-1.5">
						<UIcon name="i-heroicons-scale" class="mt-0.5 size-3.5 shrink-0" />
						<span>
							Thải bỏ {{ formatAmount(food.refusePct) }}% khi mua (xương, vỏ…) — 1 kg mua về ≈ {{ formatAmount(1000 * (1 - food.refusePct / 100)) }} g ăn được
						</span>
					</p>
					<p v-if="food.note" class="text-(--ui-text-highlighted)">{{ food.note }}</p>
					<p v-if="food.dishes.length > 0" class="flex gap-1.5">
						<UIcon name="i-heroicons-cake" class="mt-0.5 size-3.5 shrink-0" />
						<span>
							Nguyên liệu của:
							<template v-for="(d, i) in food.dishes" :key="d.id"
								>{{ i > 0 ? ', ' : '' }}<NuxtLink :to="`/dishes/${d.id}`" class="text-(--ui-primary)">{{ d.name }}</NuxtLink></template
							>
						</span>
					</p>
				</div>
				<div v-if="edited || food.isArchived" class="mt-2 flex flex-wrap gap-1.5">
					<UBadge v-if="edited" color="warning" variant="soft" size="sm">Đã sửa so với bảng gốc</UBadge>
					<UBadge v-if="food.isArchived" color="neutral" variant="soft" size="sm">Đã lưu trữ</UBadge>
				</div>
			</UCard>

			<UCard>
				<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">Dinh dưỡng cho</p>
				<div class="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
					<UButton
						v-for="o in amountOptions"
						:key="o.key"
						size="sm"
						class="shrink-0"
						:color="grams === o.grams ? 'primary' : 'neutral'"
						:variant="grams === o.grams ? 'solid' : 'soft'"
						@click="() => { grams = o.grams }"
					>
						{{ o.label }}
					</UButton>
				</div>
				<UFormField label="Hoặc nhập số gam phần ăn được" class="mb-3">
					<UInputNumber v-model="grams" :min="1" :max="5000" :step="10" class="w-full" />
				</UFormField>
				<NutritionLabel :values="scaleNutrients(food, grams ?? 100)" />
			</UCard>

			<UCard>
				<div class="mb-2 flex items-center justify-between">
					<p class="text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">Khẩu phần quen dùng</p>
					<UButton size="xs" variant="soft" icon="i-heroicons-plus" :disabled="busy" @click="openPortion(null)">Thêm</UButton>
				</div>
				<p v-if="food.portions.length === 0" class="text-sm text-(--ui-text-dimmed)">
					Chưa có — thêm "1 bát", "1 quả"… để chọn nhanh khi xem dinh dưỡng.
				</p>
				<div v-for="p in food.portions" :key="p.id" class="flex items-center gap-2 border-b border-(--ui-border) py-1.5 last:border-b-0">
					<button type="button" class="min-w-0 flex-1 text-left text-sm text-(--ui-text-highlighted)" @click="openPortion(p)">
						{{ p.name }} <span class="text-(--ui-text-muted)">· {{ formatAmount(p.grams) }} g</span>
					</button>
					<UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" :disabled="busy" :aria-label="`Xoá ${p.name}`" @click="onRemovePortion(p)" />
				</div>
			</UCard>

			<div class="grid grid-cols-2 gap-2 pt-1">
				<UButton
					block
					color="neutral"
					variant="soft"
					:icon="food.isArchived ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-archive-box'"
					:disabled="busy"
					@click="toggleArchive"
				>
					{{ food.isArchived ? 'Khôi phục' : 'Lưu trữ' }}
				</UButton>
				<UButton block color="error" variant="soft" icon="i-heroicons-trash" :disabled="busy" @click="onDelete">Xoá</UButton>
			</div>

			<FoodFormSheet v-model:open="formOpen" :food="food" :categories="categories" :saving="busy" @save="onSave" />
			<PortionFormSheet v-model:open="portionOpen" :portion="editingPortion" :saving="busy" @save="onSavePortion" />
		</template>
	</div>
</template>

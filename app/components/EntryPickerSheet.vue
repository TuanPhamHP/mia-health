<script setup lang="ts">
	/**
	 * Thêm một dòng vào nhật ký / thực đơn: chọn món hoặc thực phẩm → nhập lượng → thêm. Món theo
	 * phần (hoặc gam món chín nếu đã cân cả nồi); thực phẩm theo gam, chọn nhanh khẩu phần quen
	 * dùng. Thêm xong quay lại bước chọn — một bữa thường có vài món.
	 */
	import type { DishSummaryDTO } from '#shared/types/dishes';
	import type { FoodSummaryDTO } from '#shared/types/foods';
	import type { Meal, MenuItemInput } from '#shared/types/meals';
	import { DISH_CATEGORY_EMOJI } from '~/utils/dishes';
	import { FOOD_SOURCE_SHORT, formatAmount } from '~/utils/foods';
	import { MEAL_LABELS, MEAL_ORDER } from '~/utils/meals';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ title: string; defaultMeal: Meal; saving: boolean }>();
	const emit = defineEmits<{ pick: [input: MenuItemInput] }>();

	const { dishes, list: listDishes, loading: dishLoading } = useDishes();
	const { foods, list: listFoods, current: foodDetail, get: getFood, loading: foodLoading } = useFoods();

	type Chosen = { kind: 'dish'; dish: DishSummaryDTO } | { kind: 'food'; food: FoodSummaryDTO };

	const source = ref<'dish' | 'food'>('dish');
	const search = ref('');
	const chosen = ref<Chosen | null>(null);
	const meal = ref<Meal>('lunch');
	const servings = ref<number | null>(1);
	const grams = ref<number | null>(100);
	const dishUnit = ref<'serving' | 'g'>('serving');
	const portionLabel = ref<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function reload() {
		const q = search.value.trim();
		if (source.value === 'dish') void listDishes({ q: q || undefined });
		else if (q) void listFoods({ q });
		else foods.value = [];
	}

	watch(open, (v) => {
		if (!v) return;
		chosen.value = null;
		search.value = '';
		meal.value = props.defaultMeal;
		reload();
	});
	watch(source, reload);
	watch(search, () => {
		clearTimeout(timer);
		timer = setTimeout(reload, 250);
	});

	function chooseDish(dish: DishSummaryDTO) {
		chosen.value = { kind: 'dish', dish };
		servings.value = 1;
		grams.value = 100;
		dishUnit.value = 'serving';
		portionLabel.value = null;
	}

	function chooseFood(food: FoodSummaryDTO) {
		chosen.value = { kind: 'food', food };
		grams.value = 100;
		portionLabel.value = null;
		void getFood(food.id); // lấy khẩu phần quen dùng
	}

	const portions = computed(() =>
		chosen.value?.kind === 'food' && foodDetail.value?.id === chosen.value.food.id ? foodDetail.value.portions : [],
	);

	function usePortion(name: string, g: number) {
		grams.value = g;
		portionLabel.value = name;
	}

	// Xem trước năng lượng của lượng đang nhập.
	const previewKcal = computed(() => {
		const c = chosen.value;
		if (!c) return 0;
		if (c.kind === 'food') return (c.food.energyKcal * (grams.value ?? 0)) / 100;
		const perServing = c.dish.perServing.energyKcal;
		if (dishUnit.value === 'g' && c.dish.cookedWeightG) {
			return (perServing * c.dish.servings * (grams.value ?? 0)) / c.dish.cookedWeightG;
		}
		return perServing * (servings.value ?? 0);
	});

	function confirm() {
		const c = chosen.value;
		if (!c) return;
		if (c.kind === 'food') {
			if (!grams.value || grams.value <= 0) return;
			emit('pick', { meal: meal.value, foodId: c.food.id, amount: grams.value, unit: 'g', portionLabel: portionLabel.value });
		} else if (dishUnit.value === 'g') {
			if (!grams.value || grams.value <= 0) return;
			emit('pick', { meal: meal.value, dishId: c.dish.id, amount: grams.value, unit: 'g', portionLabel: null });
		} else {
			if (!servings.value || servings.value <= 0) return;
			emit('pick', { meal: meal.value, dishId: c.dish.id, amount: servings.value, unit: 'serving', portionLabel: null });
		}
		chosen.value = null;
	}

	const mealItems = MEAL_ORDER.map((m) => ({ label: MEAL_LABELS[m], value: m }));
	const loading = computed(() => (source.value === 'dish' ? dishLoading.value : foodLoading.value));
</script>

<template>
	<AppSheet v-model:open="open" :title="title" :subtitle="chosen ? undefined : 'Chọn món hoặc thực phẩm — thêm được liền nhiều thứ'">
		<!-- Bước 2: nhập lượng -->
		<div v-if="chosen" class="space-y-4">
			<button type="button" class="flex items-center gap-1 text-sm text-(--ui-primary)" @click="() => { chosen = null }">
				<UIcon name="i-heroicons-chevron-left" class="size-4" /> Chọn món khác
			</button>
			<div>
				<p class="text-lg font-semibold text-(--ui-text-highlighted)">{{ chosen.kind === 'dish' ? chosen.dish.name : chosen.food.name }}</p>
				<p class="text-xs text-(--ui-text-muted)">
					<template v-if="chosen.kind === 'dish'">{{ formatAmount(chosen.dish.perServing.energyKcal) }} kcal / phần</template>
					<template v-else>{{ formatAmount(chosen.food.energyKcal) }} kcal / 100 g</template>
				</p>
			</div>

			<UFormField label="Bữa">
				<USelect v-model="meal" :items="mealItems" value-key="value" class="w-full" />
			</UFormField>

			<template v-if="chosen.kind === 'dish'">
				<div v-if="chosen.dish.cookedWeightG" class="grid grid-cols-2 gap-1 rounded-xl bg-(--ui-bg-elevated) p-1">
					<UButton block size="sm" :color="dishUnit === 'serving' ? 'primary' : 'neutral'" :variant="dishUnit === 'serving' ? 'solid' : 'ghost'" @click="() => { dishUnit = 'serving' }">
						Theo phần
					</UButton>
					<UButton block size="sm" :color="dishUnit === 'g' ? 'primary' : 'neutral'" :variant="dishUnit === 'g' ? 'solid' : 'ghost'" @click="() => { dishUnit = 'g' }">
						Theo gam món chín
					</UButton>
				</div>
				<template v-if="dishUnit === 'serving'">
					<div class="flex flex-wrap gap-1.5">
						<UButton
							v-for="n in [0.5, 1, 1.5, 2]"
							:key="n"
							size="sm"
							:color="servings === n ? 'primary' : 'neutral'"
							:variant="servings === n ? 'solid' : 'soft'"
							@click="() => { servings = n }"
						>
							{{ formatAmount(n) }} phần
						</UButton>
					</div>
					<UFormField label="Số phần">
						<UInputNumber v-model="servings" :min="0.25" :max="20" :step="0.25" class="w-full" />
					</UFormField>
				</template>
				<UFormField v-else label="Gam món chín đã ăn">
					<UInputNumber v-model="grams" :min="1" :max="5000" :step="10" class="w-full" />
				</UFormField>
			</template>

			<template v-else>
				<div class="flex flex-wrap gap-1.5">
					<UButton size="sm" :color="portionLabel === null && grams === 100 ? 'primary' : 'neutral'" :variant="portionLabel === null && grams === 100 ? 'solid' : 'soft'" @click="() => { grams = 100; portionLabel = null }">
						100 g
					</UButton>
					<UButton
						v-for="p in portions"
						:key="p.id"
						size="sm"
						:color="portionLabel === p.name ? 'primary' : 'neutral'"
						:variant="portionLabel === p.name ? 'solid' : 'soft'"
						@click="usePortion(p.name, p.grams)"
					>
						{{ p.name }} · {{ formatAmount(p.grams) }} g
					</UButton>
				</div>
				<UFormField label="Gam phần ăn được">
					<UInputNumber v-model="grams" :min="1" :max="5000" :step="10" class="w-full" @update:model-value="() => { portionLabel = null }" />
				</UFormField>
			</template>

			<p class="rounded-xl bg-(--ui-bg-elevated) px-3 py-2 text-sm font-medium text-(--ui-text-highlighted)">≈ {{ formatAmount(previewKcal) }} kcal</p>
			<UButton block size="lg" icon="i-heroicons-plus" :loading="saving" @click="confirm">Thêm vào {{ MEAL_LABELS[meal].toLowerCase() }}</UButton>
		</div>

		<!-- Bước 1: chọn -->
		<div v-else class="space-y-2">
			<div class="grid grid-cols-2 gap-1 rounded-xl bg-(--ui-bg-elevated) p-1">
				<UButton block size="sm" icon="i-heroicons-cake" :color="source === 'dish' ? 'primary' : 'neutral'" :variant="source === 'dish' ? 'solid' : 'ghost'" @click="() => { source = 'dish' }">
					Món ăn
				</UButton>
				<UButton block size="sm" icon="i-heroicons-shopping-cart" :color="source === 'food' ? 'primary' : 'neutral'" :variant="source === 'food' ? 'solid' : 'ghost'" @click="() => { source = 'food' }">
					Thực phẩm
				</UButton>
			</div>
			<UInput
				v-model="search"
				icon="i-heroicons-magnifying-glass"
				:placeholder="source === 'dish' ? 'Tìm món… (VD: pho, ga rang)' : 'Tìm thực phẩm… (VD: com trang, chuoi)'"
				class="w-full"
				:ui="{ base: 'text-base' }"
			/>

			<template v-if="loading && (source === 'dish' ? dishes.length === 0 : foods.length === 0)">
				<div v-for="i in 4" :key="i" class="h-12 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			</template>

			<template v-if="source === 'dish'">
				<button
					v-for="d in dishes"
					:key="d.id"
					type="button"
					class="flex w-full items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-2 text-left active:scale-[0.98] transition-transform"
					@click="chooseDish(d)"
				>
					<CoverThumb :cover="d.cover" :emoji="DISH_CATEGORY_EMOJI[d.category]" class="size-11" />
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-medium text-(--ui-text-highlighted)">{{ d.name }}</span>
						<span class="block text-xs text-(--ui-text-muted)">{{ formatAmount(d.perServing.energyKcal) }} kcal / phần</span>
					</span>
					<UIcon name="i-heroicons-chevron-right" class="size-4 shrink-0 text-(--ui-text-dimmed)" />
				</button>
				<p v-if="!loading && dishes.length === 0" class="py-4 text-center text-sm text-(--ui-text-muted)">Không có món khớp.</p>
			</template>
			<template v-else>
				<p v-if="!search.trim()" class="py-4 text-center text-sm text-(--ui-text-muted)">Gõ tên để tìm trong kho thực phẩm.</p>
				<button
					v-for="f in foods"
					:key="f.id"
					type="button"
					class="flex w-full items-center gap-3 rounded-xl border border-(--ui-border) px-3 py-2 text-left active:scale-[0.98] transition-transform"
					@click="chooseFood(f)"
				>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-medium text-(--ui-text-highlighted)">{{ f.name }}</span>
						<span class="block text-xs text-(--ui-text-muted)">{{ formatAmount(f.energyKcal) }} kcal / 100 g · {{ FOOD_SOURCE_SHORT[f.source] }}</span>
					</span>
					<UIcon name="i-heroicons-chevron-right" class="size-4 shrink-0 text-(--ui-text-dimmed)" />
				</button>
				<p v-if="search.trim() && !loading && foods.length === 0" class="py-4 text-center text-sm text-(--ui-text-muted)">Không có thực phẩm khớp.</p>
			</template>
		</div>

		<template #footer>
			<UButton block color="neutral" variant="soft" @click="() => { open = false }">Xong</UButton>
		</template>
	</AppSheet>
</template>

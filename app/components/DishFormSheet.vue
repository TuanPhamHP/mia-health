<script setup lang="ts">
	/**
	 * Soạn / sửa món: nguyên liệu = thực phẩm trong kho + khối lượng PHẦN ĂN ĐƯỢC cho cả công thức.
	 * Xem trước năng lượng và đạm / béo / glucid ngay khi nhập (dinh dưỡng đủ chất tính ở server).
	 */
	import type { CreateDishInput, DishCategory, DishDetailDTO } from '#shared/types/dishes';
	import type { FoodSummaryDTO } from '#shared/types/foods';
	import { DISH_CATEGORY_LABELS, DISH_CATEGORY_ORDER } from '~/utils/dishes';
	import { formatAmount } from '~/utils/foods';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ dish: DishDetailDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: [input: CreateDishInput] }>();

	interface Row {
		key: number;
		foodId: number;
		name: string;
		grams: number | null;
		per100: { energyKcal: number; proteinG: number | null; fatG: number | null; carbG: number | null };
	}

	const name = ref('');
	const category = ref<DishCategory>('main');
	const servings = ref<number | null>(1);
	const cookedWeightG = ref<number | null>(null);
	const description = ref('');
	const rows = ref<Row[]>([]);
	const pickerOpen = ref(false);
	const formError = ref<string | null>(null);
	let nextKey = 0;

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		const d = props.dish;
		name.value = d?.name ?? '';
		category.value = d?.category ?? 'main';
		servings.value = d?.servings ?? 1;
		cookedWeightG.value = d?.cookedWeightG ?? null;
		description.value = d?.description ?? '';
		rows.value = (d?.ingredients ?? []).map((i) => ({ key: nextKey++, foodId: i.foodId, name: i.food.name, grams: i.grams, per100: i.food }));
	});

	const categoryItems = DISH_CATEGORY_ORDER.map((c) => ({ label: DISH_CATEGORY_LABELS[c], value: c }));

	function onPick(f: FoodSummaryDTO) {
		rows.value.push({ key: nextKey++, foodId: f.id, name: f.name, grams: 100, per100: f });
	}

	function removeRow(key: number) {
		rows.value = rows.value.filter((r) => r.key !== key);
	}

	const preview = computed(() => {
		const sum = { kcal: 0, protein: 0, fat: 0, carb: 0 };
		for (const r of rows.value) {
			const f = (r.grams ?? 0) / 100;
			sum.kcal += r.per100.energyKcal * f;
			sum.protein += (r.per100.proteinG ?? 0) * f;
			sum.fat += (r.per100.fatG ?? 0) * f;
			sum.carb += (r.per100.carbG ?? 0) * f;
		}
		const n = servings.value && servings.value > 0 ? servings.value : 1;
		return { total: sum.kcal, kcal: sum.kcal / n, protein: sum.protein / n, fat: sum.fat / n, carb: sum.carb / n };
	});

	function submit() {
		formError.value = null;
		if (!name.value.trim()) return void (formError.value = 'Nhập tên món');
		if (!servings.value || servings.value < 1) return void (formError.value = 'Số phần ít nhất là 1');
		if (rows.value.length === 0) return void (formError.value = 'Thêm ít nhất một nguyên liệu');
		const bad = rows.value.find((r) => !r.grams || r.grams <= 0);
		if (bad) return void (formError.value = `Nhập khối lượng cho "${bad.name}"`);
		emit('save', {
			name: name.value.trim(),
			category: category.value,
			servings: Math.round(servings.value),
			cookedWeightG: cookedWeightG.value && cookedWeightG.value > 0 ? cookedWeightG.value : null,
			description: description.value.trim() || null,
			ingredients: rows.value.map((r) => ({ foodId: r.foodId, grams: r.grams! })),
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="dish ? 'Sửa món' : 'Soạn món mới'" subtitle="Khối lượng nguyên liệu = phần ăn được, cho cả công thức">
		<form class="space-y-4" @submit.prevent="submit">
			<p v-if="dish && dish.source === 'preset'" class="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
				Món mẫu: định lượng ước lượng phổ biến — chỉnh theo cách nhà bạn nấu cho sát hơn.
			</p>

			<UFormField label="Tên món" required>
				<UInput v-model="name" placeholder="VD: Gà rang gừng" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>

			<div class="grid grid-cols-2 items-end gap-3">
				<UFormField label="Nhóm">
					<USelect v-model="category" :items="categoryItems" value-key="value" class="w-full" />
				</UFormField>
				<UFormField label="Nấu cho (số phần)" required>
					<UInputNumber v-model="servings" :min="1" :max="50" class="w-full" />
				</UFormField>
			</div>

			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-(--ui-text-highlighted)">Nguyên liệu ({{ rows.length }})</p>
					<UButton size="xs" variant="soft" icon="i-heroicons-plus" @click="() => { pickerOpen = true }">Thêm</UButton>
				</div>
				<p v-if="rows.length === 0" class="rounded-xl border border-dashed border-(--ui-border-accented) py-4 text-center text-sm text-(--ui-text-muted)">
					Chưa có — bấm "Thêm" để chọn từ kho thực phẩm.
				</p>
				<div v-for="r in rows" :key="r.key" class="flex items-center gap-2 rounded-xl border border-(--ui-border) py-1.5 pl-3 pr-1">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm text-(--ui-text-highlighted)">{{ r.name }}</p>
						<p class="text-[11px] text-(--ui-text-muted)">{{ formatAmount((r.per100.energyKcal * (r.grams ?? 0)) / 100) }} kcal</p>
					</div>
					<UInputNumber v-model="r.grams" :min="0.5" :max="5000" :step="10" class="w-28" :ui="{ base: 'text-base' }" />
					<span class="text-xs text-(--ui-text-muted)">g</span>
					<UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" :aria-label="`Bỏ ${r.name}`" @click="removeRow(r.key)" />
				</div>
			</div>

			<div v-if="rows.length > 0" class="rounded-xl bg-(--ui-bg-elevated) px-3 py-2 text-sm">
				<p class="font-medium text-(--ui-text-highlighted)">
					1 phần ≈ {{ formatAmount(preview.kcal) }} kcal
					<span class="font-normal text-(--ui-text-muted)">· cả công thức {{ formatAmount(preview.total) }} kcal</span>
				</p>
				<p class="text-xs text-(--ui-text-muted)">
					Đạm {{ formatAmount(preview.protein) }} g · Béo {{ formatAmount(preview.fat) }} g · Glucid {{ formatAmount(preview.carb) }} g mỗi phần
				</p>
			</div>

			<UFormField label="Cân cả nồi sau khi nấu (g)" description="Không bắt buộc — có thì xem dinh dưỡng theo gam món chín">
				<UInputNumber v-model="cookedWeightG" :min="1" :max="50000" :step="50" placeholder="—" class="w-full" />
			</UFormField>

			<UFormField label="Cách nấu / ghi chú">
				<UTextarea v-model="description" :rows="2" autoresize class="w-full" />
			</UFormField>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">{{ dish ? 'Lưu' : 'Tạo món' }}</UButton>
		</template>

		<FoodPickerSheet v-model:open="pickerOpen" :picked-ids="rows.map((r) => r.foodId)" @pick="onPick" />
	</AppSheet>
</template>

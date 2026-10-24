<script setup lang="ts">
	/**
	 * Thêm / sửa thực phẩm. Số liệu nhập trên 100 g phần ăn được; ô trống = không có số liệu
	 * (khác 0). Năng lượng bắt buộc; đạm / béo / glucid / xơ / natri hiện sẵn, chất khác mở thêm.
	 */
	import type { CreateFoodInput, FoodCategoryNodeDTO, FoodDetailDTO } from '#shared/types/foods';
	import { NUTRIENTS } from '#shared/utils/nutrients';
	import type { NutrientKey } from '#shared/utils/nutrients';
	import { FOOD_SOURCE_LABELS, flattenCategories } from '~/utils/foods';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{
		food: FoodDetailDTO | null; // null = thêm mới
		categories: FoodCategoryNodeDTO[];
		defaultCategoryId?: number;
		saving: boolean;
	}>();
	const emit = defineEmits<{ save: [input: CreateFoodInput] }>();

	const MAIN: NutrientKey[] = ['energyKcal', 'proteinG', 'fatG', 'carbG', 'fiberG', 'sodiumMg'];
	const MAIN_DEFS = NUTRIENTS.filter((n) => MAIN.includes(n.key));
	const MORE_DEFS = NUTRIENTS.filter((n) => !MAIN.includes(n.key));

	const name = ref('');
	const categoryId = ref<number | undefined>(undefined);
	const note = ref('');
	const refusePct = ref('');
	// Ô số giữ chuỗi để phân biệt "để trống" (không có số liệu) với 0; chấp nhận cả dấu phẩy.
	const values = ref<Record<NutrientKey, string>>({} as Record<NutrientKey, string>);
	const showMore = ref(false);
	const formError = ref<string | null>(null);

	const toText = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		const f = props.food;
		name.value = f?.name ?? '';
		categoryId.value = f?.categoryId ?? props.defaultCategoryId;
		note.value = f?.note ?? '';
		refusePct.value = toText(f?.refusePct);
		values.value = Object.fromEntries(NUTRIENTS.map((n) => [n.key, toText(f?.[n.key])])) as Record<NutrientKey, string>;
		showMore.value = false;
	});

	const categoryItems = computed(() => flattenCategories(props.categories));

	function parse(text: string): number | null | 'invalid' {
		const t = text.trim().replace(',', '.');
		if (t === '') return null;
		const n = Number(t);
		return Number.isFinite(n) && n >= 0 ? n : 'invalid';
	}

	function submit() {
		formError.value = null;
		if (!name.value.trim()) return void (formError.value = 'Nhập tên thực phẩm');
		if (categoryId.value === undefined) return void (formError.value = 'Chọn nhóm');
		const nutrients: Partial<Record<NutrientKey, number | null>> = {};
		for (const n of NUTRIENTS) {
			const v = parse(values.value[n.key] ?? '');
			if (v === 'invalid') return void (formError.value = `${n.label}: nhập số không âm`);
			nutrients[n.key] = v;
		}
		if (nutrients.energyKcal === null || nutrients.energyKcal === undefined) {
			return void (formError.value = 'Nhập năng lượng (kcal / 100 g)');
		}
		const refuse = parse(refusePct.value);
		if (refuse === 'invalid' || (refuse !== null && refuse >= 100)) return void (formError.value = 'Thải bỏ: 0–99%');
		emit('save', {
			...nutrients,
			energyKcal: nutrients.energyKcal,
			name: name.value.trim(),
			categoryId: categoryId.value,
			note: note.value.trim() || null,
			refusePct: refuse,
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="food ? 'Sửa thực phẩm' : 'Thêm thực phẩm'" subtitle="Số liệu trên 100 g phần ăn được">
		<form class="space-y-4" @submit.prevent="submit">
			<p v-if="food && food.source !== 'user'" class="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
				Số liệu gốc từ {{ FOOD_SOURCE_LABELS[food.source] }}. Sửa thì thực phẩm này sẽ khác bảng gốc (app vẫn ghi nguồn để tra lại).
			</p>

			<UFormField label="Tên thực phẩm" required>
				<UInput v-model="name" placeholder="VD: Ức gà áp chảo" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>

			<UFormField label="Nhóm" required>
				<USelectMenu
					v-model="categoryId"
					:items="categoryItems"
					value-key="value"
					placeholder="Chọn nhóm…"
					:search-input="{ placeholder: 'Tìm nhóm…' }"
					class="w-full"
				/>
			</UFormField>

			<div class="grid grid-cols-2 items-end gap-3">
				<UFormField v-for="n in MAIN_DEFS" :key="n.key" :label="`${n.label} (${n.unit})`" :required="n.key === 'energyKcal'">
					<UInput v-model="values[n.key]" inputmode="decimal" placeholder="—" class="w-full" :ui="{ base: 'text-base' }" />
				</UFormField>
			</div>

			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				:icon="showMore ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
				@click="() => { showMore = !showMore }"
			>
				{{ showMore ? 'Ẩn bớt chất' : `Thêm ${MORE_DEFS.length} chất khác (béo bão hoà, vitamin, khoáng…)` }}
			</UButton>
			<div v-if="showMore" class="grid grid-cols-2 items-end gap-3">
				<UFormField v-for="n in MORE_DEFS" :key="n.key" :label="`${n.label} (${n.unit})`">
					<UInput v-model="values[n.key]" inputmode="decimal" placeholder="—" class="w-full" :ui="{ base: 'text-base' }" />
				</UFormField>
			</div>

			<div class="grid grid-cols-3 items-end gap-3">
				<UFormField label="Thải bỏ %">
					<UInput v-model="refusePct" inputmode="decimal" placeholder="xương, vỏ" class="w-full" :ui="{ base: 'text-base' }" />
				</UFormField>
				<UFormField label="Ghi chú" class="col-span-2">
					<UInput v-model="note" class="w-full" :ui="{ base: 'text-base' }" />
				</UFormField>
			</div>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">{{ food ? 'Lưu' : 'Thêm' }}</UButton>
		</template>
	</AppSheet>
</template>

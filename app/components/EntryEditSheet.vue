<script setup lang="ts">
	/** Sửa lượng / bữa của một dòng nhật ký. Dinh dưỡng là snapshot — đổi lượng thì nhân theo tỉ lệ. */
	import type { Meal, MealEntryDTO, UpdateMealEntryInput } from '#shared/types/meals';
	import { formatAmount } from '~/utils/foods';
	import { MEAL_LABELS, MEAL_ORDER } from '~/utils/meals';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ entry: MealEntryDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: [input: UpdateMealEntryInput]; remove: [] }>();

	const meal = ref<Meal>('lunch');
	const amount = ref<number | null>(1);
	const portionLabel = ref('');

	watch(open, (v) => {
		if (!v || !props.entry) return;
		meal.value = props.entry.meal;
		amount.value = props.entry.amount;
		portionLabel.value = props.entry.portionLabel ?? '';
	});

	const previewKcal = computed(() =>
		props.entry && amount.value ? (props.entry.energyKcal * amount.value) / props.entry.amount : 0,
	);

	const mealItems = MEAL_ORDER.map((m) => ({ label: MEAL_LABELS[m], value: m }));

	function submit() {
		if (!amount.value || amount.value <= 0) return;
		emit('save', { meal: meal.value, amount: amount.value, portionLabel: portionLabel.value.trim() || null });
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="entry?.name ?? 'Sửa'" subtitle="Dinh dưỡng chụp lúc ghi — đổi lượng thì tính lại theo tỉ lệ">
		<form v-if="entry" class="space-y-4" @submit.prevent="submit">
			<UFormField label="Bữa">
				<USelect v-model="meal" :items="mealItems" value-key="value" class="w-full" />
			</UFormField>
			<div class="grid grid-cols-2 items-end gap-3">
				<UFormField :label="entry.unit === 'serving' ? 'Số phần' : 'Gam'">
					<UInputNumber v-model="amount" :min="entry.unit === 'serving' ? 0.25 : 1" :max="5000" :step="entry.unit === 'serving' ? 0.25 : 10" class="w-full" />
				</UFormField>
				<UFormField label="Ghi chú lượng">
					<UInput v-model="portionLabel" placeholder="VD: 1 bát con" class="w-full" :ui="{ base: 'text-base' }" />
				</UFormField>
			</div>
			<p class="rounded-xl bg-(--ui-bg-elevated) px-3 py-2 text-sm font-medium text-(--ui-text-highlighted)">≈ {{ formatAmount(previewKcal) }} kcal</p>
			<p v-if="entry.dishId === null && entry.foodId === null" class="text-xs text-(--ui-text-dimmed)">
				Món / thực phẩm gốc đã bị xoá — dòng này vẫn giữ tên và dinh dưỡng lúc ghi.
			</p>
		</form>

		<template #footer>
			<div class="grid grid-cols-3 gap-2">
				<UButton block color="error" variant="soft" icon="i-heroicons-trash" :disabled="saving" @click="emit('remove')">Xoá</UButton>
				<UButton block class="col-span-2" size="lg" :loading="saving" @click="submit">Lưu</UButton>
			</div>
		</template>
	</AppSheet>
</template>

<script setup lang="ts">
	/** Khẩu phần quen dùng: "1 bát con" = 150 g — gram PHẦN ĂN ĐƯỢC. */
	import type { AddFoodPortionInput, FoodPortionDTO } from '#shared/types/foods';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ portion: FoodPortionDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: [input: AddFoodPortionInput] }>();

	const name = ref('');
	const grams = ref<number | null>(100);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		name.value = props.portion?.name ?? '';
		grams.value = props.portion?.grams ?? 100;
	});

	function submit() {
		if (!name.value.trim()) return void (formError.value = 'Nhập tên khẩu phần');
		if (!grams.value || grams.value <= 0) return void (formError.value = 'Khối lượng phải lớn hơn 0');
		emit('save', { name: name.value.trim(), grams: grams.value });
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="portion ? 'Sửa khẩu phần' : 'Thêm khẩu phần'" subtitle="Khối lượng phần ăn được (đã bỏ xương, vỏ)">
		<form class="grid grid-cols-3 gap-3" @submit.prevent="submit">
			<UFormField label="Tên" required class="col-span-2">
				<UInput v-model="name" placeholder="VD: 1 bát con" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>
			<UFormField label="Gram" required>
				<UInputNumber v-model="grams" :min="0.1" :max="5000" :step="5" class="w-full" />
			</UFormField>
			<p v-if="formError" class="col-span-3 text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">{{ portion ? 'Lưu' : 'Thêm' }}</UButton>
		</template>
	</AppSheet>
</template>

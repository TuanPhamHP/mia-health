<script setup lang="ts">
	/** Tên + mô tả thực đơn. Món thêm ở trang chi tiết. */
	import type { MenuDTO } from '#shared/types/meals';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ menu: MenuDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: [input: { name: string; description: string | null }] }>();

	const name = ref('');
	const description = ref('');
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		name.value = props.menu?.name ?? '';
		description.value = props.menu?.description ?? '';
	});

	function submit() {
		if (!name.value.trim()) return void (formError.value = 'Nhập tên thực đơn');
		emit('save', { name: name.value.trim(), description: description.value.trim() || null });
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="menu ? 'Sửa thực đơn' : 'Tạo thực đơn'">
		<form class="space-y-4" @submit.prevent="submit">
			<UFormField label="Tên thực đơn" required>
				<UInput v-model="name" placeholder="VD: Ngày tập — 1.900 kcal" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>
			<UFormField label="Ghi chú">
				<UTextarea v-model="description" :rows="2" autoresize class="w-full" />
			</UFormField>
			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>
		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">{{ menu ? 'Lưu' : 'Tạo' }}</UButton>
		</template>
	</AppSheet>
</template>

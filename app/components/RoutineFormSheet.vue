<script setup lang="ts">
	import type { CreateRoutineInput, RoutineDTO } from '#shared/types/routines';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ routine: RoutineDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: [input: CreateRoutineInput] }>();

	const name = ref('');
	const description = ref('');
	const prepSec = ref<number | null>(5);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		name.value = props.routine?.name ?? '';
		description.value = props.routine?.description ?? '';
		prepSec.value = props.routine?.prepSec ?? 5;
	});

	function submit() {
		if (!name.value.trim()) {
			formError.value = 'Nhập tên giáo án';
			return;
		}
		emit('save', {
			name: name.value.trim(),
			description: description.value.trim() || null,
			prepSec: prepSec.value ?? 5,
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="routine ? 'Sửa giáo án' : 'Tạo giáo án'">
		<form class="space-y-4" @submit.prevent="submit">
			<UFormField label="Tên giáo án" required>
				<UInput v-model="name" placeholder="VD: Kegel buổi sáng" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>

			<UFormField label="Mô tả" hint="Vì sao có buổi này — hiện ở màn Hôm nay">
				<UTextarea v-model="description" :rows="2" autoresize class="w-full" />
			</UFormField>

			<UFormField label="Đếm ngược chuẩn bị trước mỗi bài (giây)">
				<UInputNumber v-model="prepSec" :min="0" :max="60" class="w-full" />
			</UFormField>

			<p class="text-xs text-(--ui-text-dimmed)">
				Lịch tập theo thứ đặt ở <strong>Kế hoạch → Chương trình</strong>: nhặt giáo án này vào ngày của một chương trình.
			</p>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">Lưu</UButton>
		</template>
	</AppSheet>
</template>

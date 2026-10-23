<script setup lang="ts">
	/** Hàng nút đáy của form bài tập / bài kết hợp: Lưu + (khi sửa) Lưu trữ / Khôi phục, Xoá. */
	import type { ExerciseDTO } from '#shared/types/exercises';

	const props = defineProps<{ exercise: ExerciseDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: []; archive: [archived: boolean]; delete: [] }>();

	// Đang nằm trong giáo án / bài kết hợp ⇒ server trả 409 khi xoá — tắt nút và nói lý do.
	const usage = computed(() => {
		const e = props.exercise;
		if (!e) return null;
		const parts: string[] = [];
		if (e.routineCount > 0) parts.push(`${e.routineCount} giáo án`);
		if (e.comboCount > 0) parts.push(`${e.comboCount} bài kết hợp`);
		return parts.length ? parts.join(', ') : null;
	});
</script>

<template>
	<div class="space-y-2">
		<UButton block size="lg" :loading="saving" @click="emit('save')">Lưu</UButton>
		<div v-if="exercise" class="grid grid-cols-2 gap-2">
			<UButton
				block
				color="neutral"
				variant="soft"
				:icon="exercise.isArchived ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-archive-box'"
				:disabled="saving"
				@click="emit('archive', !exercise.isArchived)"
			>
				{{ exercise.isArchived ? 'Khôi phục' : 'Lưu trữ' }}
			</UButton>
			<UButton
				block
				color="error"
				variant="soft"
				icon="i-heroicons-trash"
				:disabled="saving || usage !== null"
				@click="emit('delete')"
			>
				Xoá
			</UButton>
		</div>
		<p v-if="usage" class="text-center text-xs text-(--ui-text-muted)">
			Đang dùng trong {{ usage }} — chỉ lưu trữ được.
		</p>
	</div>
</template>

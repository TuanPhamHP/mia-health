<script setup lang="ts">
	/**
	 * Form tạo / sửa bài tập. Sheet chỉ thu dữ liệu và phát sự kiện — trang cha giữ
	 * instance useExercises() nên danh sách cập nhật ngay sau khi lưu.
	 */
	import type { CreateExerciseInput, ExerciseCategory, ExerciseDTO, ExerciseParams, SingleMode } from '#shared/types/exercises';
	import { CATEGORY_LABELS, CATEGORY_ORDER, MODE_HINTS, MODE_LABELS } from '~/utils/labels';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ exercise: ExerciseDTO | null; saving: boolean }>();
	const emit = defineEmits<{
		save: [input: CreateExerciseInput];
		archive: [archived: boolean];
		delete: [];
	}>();

	const DEFAULT_PARAMS: ExerciseParams = { sets: 3, reps: 10, holdSec: 5, relaxSec: 5, durationSec: 30, restSec: 30 };
	const MODES: SingleMode[] = ['hold', 'reps', 'duration'];

	const name = ref('');
	const category = ref<ExerciseCategory>('kegel');
	const mode = ref<SingleMode>('hold');
	const params = ref<ExerciseParams>({ ...DEFAULT_PARAMS });
	const instructions = ref('');
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		const e = props.exercise;
		formError.value = null;
		name.value = e?.name ?? '';
		category.value = e?.category ?? 'kegel';
		// Bài kết hợp mở ComboFormSheet, không vào đây — nhánh 'combo' chỉ để TS thu hẹp kiểu.
		mode.value = e && e.mode !== 'combo' ? e.mode : 'hold';
		params.value = e
			? { sets: e.sets, reps: e.reps, holdSec: e.holdSec, relaxSec: e.relaxSec, durationSec: e.durationSec, restSec: e.restSec }
			: { ...DEFAULT_PARAMS };
		instructions.value = e?.instructions ?? '';
	});

	const categoryItems = CATEGORY_ORDER.map((c) => ({ label: CATEGORY_LABELS[c], value: c }));

	function submit() {
		if (!name.value.trim()) {
			formError.value = 'Nhập tên bài tập';
			return;
		}
		const p = params.value;
		// UInputNumber trả null khi ô bị xoá trắng — rơi về mặc định thay vì gửi null lên server.
		emit('save', {
			name: name.value.trim(),
			category: category.value,
			mode: mode.value,
			sets: p.sets || DEFAULT_PARAMS.sets,
			reps: p.reps || DEFAULT_PARAMS.reps,
			holdSec: p.holdSec || DEFAULT_PARAMS.holdSec,
			relaxSec: p.relaxSec ?? DEFAULT_PARAMS.relaxSec,
			durationSec: p.durationSec || DEFAULT_PARAMS.durationSec,
			restSec: p.restSec ?? DEFAULT_PARAMS.restSec,
			instructions: instructions.value.trim() || null,
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="exercise ? 'Sửa bài tập' : 'Thêm bài tập'">
		<form class="space-y-4" @submit.prevent="submit">
			<UFormField label="Tên bài tập" required>
				<UInput v-model="name" placeholder="VD: Kegel giữ lâu" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>

			<UFormField label="Nhóm">
				<USelect v-model="category" :items="categoryItems" class="w-full" />
			</UFormField>

			<UFormField label="Cách tập">
				<div class="space-y-2">
					<button
						v-for="m in MODES"
						:key="m"
						type="button"
						class="flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
						:class="mode === m ? 'border-(--ui-primary) bg-(--ui-primary)/10' : 'border-(--ui-border)'"
						@click="mode = m"
					>
						<UIcon
							:name="mode === m ? 'i-heroicons-check-circle-solid' : 'i-heroicons-stop'"
							class="mt-0.5 size-5 shrink-0"
							:class="mode === m ? 'text-(--ui-primary)' : 'text-(--ui-text-dimmed)'"
						/>
						<span>
							<span class="block text-sm font-medium text-(--ui-text-highlighted)">{{ MODE_LABELS[m] }}</span>
							<span class="block text-xs text-(--ui-text-muted)">{{ MODE_HINTS[m] }}</span>
						</span>
					</button>
				</div>
			</UFormField>

			<ParamsFields v-model="params" :mode="mode" />

			<UFormField label="Hướng dẫn / ghi chú">
				<UTextarea v-model="instructions" :rows="3" autoresize class="w-full" placeholder="Tư thế, nhịp thở, lưu ý…" />
			</UFormField>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<ExerciseSheetFooter
				:exercise="exercise"
				:saving="saving"
				@save="submit"
				@archive="(archived) => emit('archive', archived)"
				@delete="emit('delete')"
			/>
		</template>
	</AppSheet>
</template>

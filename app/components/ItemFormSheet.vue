<script setup lang="ts">
	/**
	 * Thêm bài vào giáo án (chọn từ thư viện, thông số copy sẵn từ bài) hoặc sửa thông
	 * số của một bài đã có. Thông số của item độc lập với thư viện. Bài kết hợp: item chỉ
	 * giữ số vòng / nghỉ giữa vòng (luân phiên); bài con luôn theo định nghĩa trong thư viện.
	 */
	import type { ExerciseDTO, ExerciseParams } from '#shared/types/exercises';
	import type { RoutineItemDTO } from '#shared/types/routines';
	import { CATEGORY_LABELS, COMBO_STYLE_LABELS, describeComponents, describeExercise } from '~/utils/labels';
	import { cleanParams, pickParams } from '~/utils/params';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{
		item: RoutineItemDTO | null; // null = thêm mới
		exercises: ExerciseDTO[];
		saving: boolean;
	}>();
	const emit = defineEmits<{ save: [payload: { exerciseId: number } & ExerciseParams] }>();

	const exerciseId = ref<number | undefined>(undefined);
	const params = ref<ExerciseParams>({ sets: 3, reps: 10, holdSec: 5, relaxSec: 5, durationSec: 30, restSec: 30 });
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		if (props.item) {
			exerciseId.value = props.item.exerciseId;
			params.value = pickParams(props.item);
		} else {
			exerciseId.value = undefined;
		}
	});

	// Chọn bài mới → nạp thông số mặc định của bài đó.
	watch(exerciseId, (id) => {
		if (props.item || id === undefined) return;
		const ex = props.exercises.find((e) => e.id === id);
		if (ex) params.value = pickParams(ex);
	});

	const items = computed(() =>
		props.exercises
			.filter((e) => !e.isArchived)
			.map((e) => ({ label: e.name, value: e.id, description: `${CATEGORY_LABELS[e.category]} · ${describeExercise(e, e)}` })),
	);

	const selected = computed(() => {
		if (props.item) return props.item.exercise;
		return props.exercises.find((e) => e.id === exerciseId.value) ?? null;
	});

	// Bài kết hợp lần lượt không có thông số ở cấp item — mỗi bài con chạy theo thông số riêng.
	const showParams = computed(
		() => selected.value !== null && !(selected.value.mode === 'combo' && selected.value.comboStyle === 'sequence'),
	);

	function submit() {
		if (exerciseId.value === undefined) {
			formError.value = 'Chọn một bài tập';
			return;
		}
		emit('save', { exerciseId: exerciseId.value, ...cleanParams(params.value) });
	}
</script>

<template>
	<AppSheet
		v-model:open="open"
		:title="item ? item.exercise.name : 'Thêm bài vào giáo án'"
		:subtitle="item ? 'Thông số riêng trong giáo án này' : undefined"
	>
		<form class="space-y-4" @submit.prevent="submit">
			<UFormField v-if="!item" label="Bài tập" required>
				<USelectMenu
					v-model="exerciseId"
					:items="items"
					value-key="value"
					placeholder="Chọn bài tập…"
					:search-input="{ placeholder: 'Tìm bài…' }"
					class="w-full"
				/>
			</UFormField>

			<div v-if="selected?.mode === 'combo'" class="rounded-xl bg-(--ui-bg-elevated) px-3 py-2">
				<p class="text-sm font-medium text-(--ui-text-highlighted)">Bài kết hợp · {{ COMBO_STYLE_LABELS[selected.comboStyle] }}</p>
				<p class="text-xs text-(--ui-text-muted)">{{ describeComponents(selected.components) }}</p>
				<p class="mt-1 text-xs text-(--ui-text-dimmed)">
					{{
						selected.comboStyle === 'circuit'
							? 'Số vòng và nghỉ giữa vòng chỉnh riêng cho giáo án này. Bài con sửa trong thư viện bài tập.'
							: 'Mỗi bài con chạy theo thông số riêng — sửa trong thư viện bài tập.'
					}}
				</p>
			</div>

			<ParamsFields v-if="selected && showParams" v-model="params" :mode="selected.mode" />

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">{{ item ? 'Lưu' : 'Thêm' }}</UButton>
		</template>
	</AppSheet>
</template>

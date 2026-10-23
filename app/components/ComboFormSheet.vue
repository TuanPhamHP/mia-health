<script setup lang="ts">
	/**
	 * Form tạo / sửa bài kết hợp: đặt tên, chọn cách chạy (luân phiên / lần lượt) và chọn các
	 * bài con từ thư viện — có thứ tự, trùng bài được. Thông số bài con copy từ thư viện lúc
	 * chọn, chạm vào bài để sửa riêng. Như ExerciseFormSheet: sheet chỉ thu dữ liệu và phát
	 * sự kiện, trang cha giữ instance useExercises().
	 */
	import type {
		ComboStyle,
		CreateExerciseInput,
		ExerciseCategory,
		ExerciseDTO,
		ExerciseParams,
		SingleMode,
	} from '#shared/types/exercises';
	import {
		CATEGORY_ICONS,
		CATEGORY_LABELS,
		CATEGORY_ORDER,
		COMBO_STYLE_HINTS,
		COMBO_STYLE_LABELS,
		describeExercise,
		describeParams,
	} from '~/utils/labels';
	import { cleanParams, pickParams } from '~/utils/params';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{
		combo: ExerciseDTO | null; // null = tạo mới
		exercises: ExerciseDTO[]; // thư viện để chọn bài con
		saving: boolean;
	}>();
	const emit = defineEmits<{
		save: [input: CreateExerciseInput];
		archive: [archived: boolean];
		delete: [];
	}>();

	interface ComponentRow {
		key: number; // khoá v-for — cùng một bài có thể xuất hiện nhiều lần
		exerciseId: number;
		name: string;
		category: ExerciseCategory;
		mode: SingleMode;
		params: ExerciseParams;
	}

	// Chỉ sets (số vòng) và restSec (nghỉ giữa vòng) có nghĩa; còn lại để DB lấy default.
	const DEFAULT_COMBO: ExerciseParams = { sets: 3, reps: 10, holdSec: 5, relaxSec: 5, durationSec: 30, restSec: 60 };
	const STYLES: ComboStyle[] = ['circuit', 'sequence'];
	// Luân phiên: "nghỉ giữa set" của thư viện (thường 30–60s) quá dài để làm nghỉ chuyển bài,
	// còn 0s thì bài kế bắt đầu đếm trước khi kịp vào tư thế.
	const CIRCUIT_TRANSITION_SEC = 10;

	const name = ref('');
	const category = ref<ExerciseCategory>('other');
	const style = ref<ComboStyle>('circuit');
	const comboParams = ref<ExerciseParams>({ ...DEFAULT_COMBO });
	const instructions = ref('');
	const rows = ref<ComponentRow[]>([]);
	const expandedKey = ref<number | null>(null);
	const pickerKey = ref(0);
	const formError = ref<string | null>(null);
	let nextKey = 0;

	watch(open, (v) => {
		if (!v) return;
		const c = props.combo;
		formError.value = null;
		name.value = c?.name ?? '';
		category.value = c?.category ?? 'other';
		style.value = c?.comboStyle ?? 'circuit';
		comboParams.value = c ? pickParams(c) : { ...DEFAULT_COMBO };
		instructions.value = c?.instructions ?? '';
		rows.value = (c?.components ?? []).map((comp) => ({
			key: nextKey++,
			exerciseId: comp.exerciseId,
			name: comp.exercise.name,
			category: comp.exercise.category,
			mode: comp.exercise.mode,
			params: pickParams(comp),
		}));
		expandedKey.value = null;
	});

	const categoryItems = CATEGORY_ORDER.map((c) => ({ label: CATEGORY_LABELS[c], value: c }));

	// Không lồng bài kết hợp; bài đã lưu trữ không thêm mới được (server cũng chặn).
	const pickItems = computed(() =>
		props.exercises
			.filter((e) => !e.isArchived && e.mode !== 'combo')
			.map((e) => ({ label: e.name, value: e.id, description: `${CATEGORY_LABELS[e.category]} · ${describeExercise(e, e)}` })),
	);

	// Chọn bài ⇒ thêm vào cuối. Ô chọn luôn trống để chọn tiếp: remount qua `pickerKey` —
	// USelectMenu giữ nhãn đã chọn trong state nội bộ dù model được gán lại undefined.
	function onPick(id: number) {
		pickerKey.value++;
		const ex = props.exercises.find((e) => e.id === id);
		if (!ex || ex.mode === 'combo') return;
		// Bài đầu tiên gợi ý nhóm cho bài kết hợp mới (nếu chưa tự chọn nhóm khác).
		if (!props.combo && rows.value.length === 0 && category.value === 'other') category.value = ex.category;
		const params = pickParams(ex);
		if (style.value === 'circuit') params.restSec = CIRCUIT_TRANSITION_SEC;
		rows.value.push({ key: nextKey++, exerciseId: ex.id, name: ex.name, category: ex.category, mode: ex.mode, params });
	}

	function toggle(key: number) {
		expandedKey.value = expandedKey.value === key ? null : key;
	}

	function move(index: number, dir: -1 | 1) {
		const target = index + dir;
		if (target < 0 || target >= rows.value.length) return;
		const list = [...rows.value];
		[list[index], list[target]] = [list[target]!, list[index]!];
		rows.value = list;
	}

	function removeRow(index: number) {
		rows.value = rows.value.filter((_, i) => i !== index);
	}

	// Luân phiên: nghỉ sau bài cuối của vòng là nghỉ giữa vòng — restSec của bài đó không dùng.
	const isLastInCircuit = (index: number) => style.value === 'circuit' && index === rows.value.length - 1;

	function rowSummary(row: ComponentRow, index: number): string {
		if (style.value === 'sequence') return describeParams(row.mode, row.params);
		const p = isLastInCircuit(index) ? { ...row.params, restSec: 0 } : row.params;
		return describeParams(row.mode, p, true);
	}

	function submit() {
		if (!name.value.trim()) {
			formError.value = 'Nhập tên bài kết hợp';
			return;
		}
		if (rows.value.length < 2) {
			formError.value = 'Chọn ít nhất 2 bài để kết hợp';
			return;
		}
		const c = cleanParams(comboParams.value);
		emit('save', {
			name: name.value.trim(),
			category: category.value,
			mode: 'combo',
			comboStyle: style.value,
			sets: c.sets,
			restSec: c.restSec,
			instructions: instructions.value.trim() || null,
			components: rows.value.map((r) => ({ exerciseId: r.exerciseId, ...cleanParams(r.params) })),
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="combo ? 'Sửa bài kết hợp' : 'Tạo bài kết hợp'">
		<form class="space-y-4" @submit.prevent="submit">
			<UFormField label="Tên bài kết hợp" required>
				<UInput v-model="name" placeholder="VD: Core circuit" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>

			<UFormField label="Nhóm">
				<USelect v-model="category" :items="categoryItems" class="w-full" />
			</UFormField>

			<UFormField label="Cách chạy">
				<div class="space-y-2">
					<button
						v-for="s in STYLES"
						:key="s"
						type="button"
						class="flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
						:class="style === s ? 'border-(--ui-primary) bg-(--ui-primary)/10' : 'border-(--ui-border)'"
						@click="style = s"
					>
						<UIcon
							:name="style === s ? 'i-heroicons-check-circle-solid' : 'i-heroicons-stop'"
							class="mt-0.5 size-5 shrink-0"
							:class="style === s ? 'text-(--ui-primary)' : 'text-(--ui-text-dimmed)'"
						/>
						<span>
							<span class="block text-sm font-medium text-(--ui-text-highlighted)">{{ COMBO_STYLE_LABELS[s] }}</span>
							<span class="block text-xs text-(--ui-text-muted)">{{ COMBO_STYLE_HINTS[s] }}</span>
						</span>
					</button>
				</div>
			</UFormField>

			<ParamsFields v-if="style === 'circuit'" v-model="comboParams" mode="combo" />

			<UFormField :label="`Các bài (${rows.length})`" required>
				<div class="space-y-2">
					<div v-for="(r, idx) in rows" :key="r.key" class="rounded-xl border border-(--ui-border)">
						<div class="flex items-center gap-2 py-2 pl-2 pr-1">
							<span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--ui-primary)/10 text-(--ui-primary)">
								<UIcon :name="CATEGORY_ICONS[r.category]" class="size-4" />
							</span>
							<button type="button" class="min-w-0 flex-1 text-left" :aria-expanded="expandedKey === r.key" @click="toggle(r.key)">
								<span class="flex items-center gap-1.5">
									<span class="text-xs tabular-nums text-(--ui-text-dimmed)">{{ idx + 1 }}.</span>
									<span class="truncate text-sm font-medium text-(--ui-text-highlighted)">{{ r.name }}</span>
								</span>
								<span class="block text-xs text-(--ui-text-muted)">{{ rowSummary(r, idx) }}</span>
							</button>
							<div class="flex shrink-0 items-center">
								<UButton icon="i-heroicons-chevron-up" color="neutral" variant="ghost" size="xs" :disabled="idx === 0" aria-label="Lên" @click="move(idx, -1)" />
								<UButton icon="i-heroicons-chevron-down" color="neutral" variant="ghost" size="xs" :disabled="idx === rows.length - 1" aria-label="Xuống" @click="move(idx, 1)" />
								<UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" aria-label="Bỏ khỏi bài kết hợp" @click="removeRow(idx)" />
							</div>
						</div>
						<div v-if="expandedKey === r.key" class="border-t border-(--ui-border) p-3">
							<ParamsFields
								v-model="r.params"
								:mode="r.mode"
								:in-circuit="style === 'circuit'"
								:hide-rest="isLastInCircuit(idx)"
							/>
						</div>
					</div>

					<USelectMenu
						:key="pickerKey"
						:items="pickItems"
						value-key="value"
						icon="i-heroicons-plus"
						placeholder="Thêm bài…"
						:search-input="{ placeholder: 'Tìm bài…' }"
						class="w-full"
						@update:model-value="onPick"
					/>
					<p v-if="rows.length > 0" class="text-xs text-(--ui-text-muted)">
						Chạm vào một bài để chỉnh thông số riêng trong bài kết hợp này.
					</p>
				</div>
			</UFormField>

			<UFormField label="Hướng dẫn / ghi chú">
				<UTextarea v-model="instructions" :rows="2" autoresize class="w-full" placeholder="Nhịp độ, lưu ý khi chuyển bài…" />
			</UFormField>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<ExerciseSheetFooter
				:exercise="combo"
				:saving="saving"
				@save="submit"
				@archive="(archived) => emit('archive', archived)"
				@delete="emit('delete')"
			/>
		</template>
	</AppSheet>
</template>

<script setup lang="ts">
	/**
	 * Ghi buổi tập thủ công (tập ngoài app: phòng gym, lớp yoga…) hoặc sửa buổi đã ghi.
	 * Khi tạo: chọn giáo án ⇒ mọi bài trong giáo án được ghi là đã xong đủ set; hoặc
	 * chọn bài lẻ từ thư viện. Cả hai đều tuỳ chọn — buổi không có bài vẫn tính streak.
	 * Bài kết hợp được ghi thành từng bài con, giống như khi tập trong app.
	 */
	import type { CreateSessionInput, SessionDTO, SessionEntryInput, UpdateSessionInput } from '#shared/types/sessions';
	import type { ExerciseDTO } from '#shared/types/exercises';
	import type { RoutineSummaryDTO } from '#shared/types/routines';
	import { localDateIso } from '#shared/utils/date';
	import { toPlanItems } from '#shared/utils/timeline';
	import type { PlanItem } from '#shared/utils/timeline';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{
		session: SessionDTO | null; // null = tạo mới
		routines: RoutineSummaryDTO[];
		exercises: ExerciseDTO[];
		saving: boolean;
	}>();
	const emit = defineEmits<{ create: [input: CreateSessionInput]; update: [input: UpdateSessionInput] }>();

	const { get: getRoutine } = useRoutines();

	const title = ref('');
	const date = ref(localDateIso());
	const durationMin = ref<number | null>(30);
	const feeling = ref<number | null>(null);
	const note = ref('');
	const routineId = ref<number | undefined>(undefined);
	const exerciseIds = ref<number[]>([]);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		const s = props.session;
		formError.value = null;
		title.value = s?.title ?? '';
		date.value = s?.date ?? localDateIso();
		durationMin.value = s ? Math.round(s.durationSec / 60) : 30;
		feeling.value = s?.feeling ?? null;
		note.value = s?.note ?? '';
		routineId.value = undefined;
		exerciseIds.value = [];
	});

	watch(routineId, (id) => {
		const r = props.routines.find((x) => x.id === id);
		if (r && !title.value.trim()) title.value = r.name;
	});

	const routineItems = computed(() => props.routines.map((r) => ({ label: r.name, value: r.id })));
	const exerciseItems = computed(() =>
		props.exercises.filter((e) => !e.isArchived).map((e) => ({ label: e.name, value: e.id })),
	);

	function entryOf(e: PlanItem): SessionEntryInput {
		return {
			exerciseId: e.exerciseId,
			exerciseName: e.name,
			category: e.category,
			mode: e.mode,
			setsPlanned: e.sets,
			setsDone: e.sets,
			reps: e.mode === 'duration' ? 0 : e.reps,
			holdSec: e.mode === 'hold' ? e.holdSec : 0,
			durationSec: e.mode === 'duration' ? e.durationSec : 0,
		};
	}

	async function submit() {
		if (!title.value.trim()) {
			formError.value = 'Nhập tên buổi tập';
			return;
		}
		const durationSec = Math.max(0, Math.round((durationMin.value ?? 0) * 60));

		if (props.session) {
			emit('update', {
				title: title.value.trim(),
				date: date.value,
				durationSec,
				feeling: feeling.value,
				note: note.value.trim() || null,
			});
			return;
		}

		const plan: PlanItem[] = [];
		if (routineId.value !== undefined) {
			const detail = await getRoutine(routineId.value);
			plan.push(...(detail?.items ?? []).flatMap((it, i) => toPlanItems(it, i)));
		}
		for (const id of exerciseIds.value) {
			const ex = props.exercises.find((e) => e.id === id);
			if (ex) plan.push(...toPlanItems({ ...ex, exerciseId: ex.id, exercise: ex }, plan.length));
		}
		const entries = plan.map(entryOf);

		emit('create', {
			date: date.value,
			routineId: routineId.value ?? null,
			title: title.value.trim(),
			durationSec,
			completed: true,
			feeling: feeling.value,
			note: note.value.trim() || null,
			entries,
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="session ? 'Sửa buổi tập' : 'Ghi buổi tập thủ công'">
		<form class="space-y-4" @submit.prevent="submit">
			<template v-if="!session">
				<UFormField label="Theo giáo án" hint="Tuỳ chọn">
					<USelectMenu v-model="routineId" :items="routineItems" value-key="value" placeholder="Không theo giáo án" class="w-full" />
				</UFormField>
				<UFormField label="Bài tập đã tập" hint="Tuỳ chọn">
					<USelectMenu
						v-model="exerciseIds"
						:items="exerciseItems"
						value-key="value"
						multiple
						placeholder="Chọn bài…"
						:search-input="{ placeholder: 'Tìm bài…' }"
						class="w-full"
					/>
				</UFormField>
			</template>

			<UFormField label="Tên buổi tập" required>
				<UInput v-model="title" placeholder="VD: Gym chân" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>

			<div class="grid grid-cols-2 gap-3">
				<UFormField label="Ngày">
					<UInput v-model="date" type="date" class="w-full" :max="localDateIso()" />
				</UFormField>
				<UFormField label="Thời lượng (phút)">
					<UInputNumber v-model="durationMin" :min="0" :max="1440" :step="5" class="w-full" />
				</UFormField>
			</div>

			<UFormField label="Cảm giác">
				<FeelingPicker v-model="feeling" />
			</UFormField>

			<UFormField label="Ghi chú">
				<UTextarea v-model="note" :rows="2" autoresize class="w-full" />
			</UFormField>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">Lưu</UButton>
		</template>
	</AppSheet>
</template>

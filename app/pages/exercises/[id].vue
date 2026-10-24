<script setup lang="ts">
	/**
	 * Chi tiết một bài: ảnh / video hướng dẫn, thông số, bài con (bài kết hợp), hướng dẫn chữ.
	 * Nơi duy nhất sửa / lưu trữ / xoá bài và quản lý media — thư viện chỉ còn tạo mới.
	 */
	import type { CreateExerciseInput } from '#shared/types/exercises';
	import { coverOf } from '#shared/utils/media';
	import { buildTimeline, estimateTimelineSec, toPlanItems } from '#shared/utils/timeline';
	import { formatDuration } from '~/utils/format';
	import {
		CATEGORY_ICONS,
		CATEGORY_LABELS,
		CATEGORY_TONES,
		COMBO_ICON,
		COMBO_STYLE_LABELS,
		MODE_LABELS,
		describeParams,
	} from '~/utils/labels';

	const route = useRoute();
	const toast = useToast();
	const pageTitle = usePageTitle();
	pageTitle.value = 'Bài tập';

	const exerciseId = Number(route.params.id);
	const { current: exercise, exercises, loading, error, get, list, update, remove } = useExercises();
	const loaded = ref(false);

	onMounted(async () => {
		await get(exerciseId);
		if (error.value) toast.add({ title: 'Lỗi tải bài tập', description: error.value, color: 'error' });
		loaded.value = true;
	});

	useHead({ title: computed(() => `${exercise.value?.name ?? 'Bài tập'} — Mia Health`) });

	const isCombo = computed(() => exercise.value?.mode === 'combo');

	// Bài kết hợp chưa có media riêng ⇒ mượn ảnh đầu tiên của từng bài con (chú thích = tên bài
	// con), cùng cách ảnh bìa ở thư viện mượn — thay vì một ô trống to giữa trang.
	const heroMedia = computed(() => {
		const e = exercise.value;
		if (!e) return [];
		if (e.media.length > 0 || e.mode !== 'combo') return e.media;
		return e.components.flatMap((c) => c.exercise.media.slice(0, 1).map((m) => ({ ...m, caption: c.exercise.name })));
	});

	// Cùng cách màn hình tập trải bài (chuẩn bị 5s như khi tập thử bài lẻ).
	const estimatedSec = computed(() => {
		const e = exercise.value;
		if (!e) return 0;
		const plan = toPlanItems({ ...e, exerciseId: e.id, exercise: e }, 0);
		return estimateTimelineSec(buildTimeline(plan, 5), plan);
	});

	const tiles = computed(() => {
		const e = exercise.value;
		if (!e) return [];
		const out: { label: string; value: string }[] = [];
		if (e.mode === 'combo') {
			if (e.comboStyle === 'circuit') {
				out.push({ label: 'Số vòng', value: String(e.sets) });
				if (e.sets > 1) out.push({ label: 'Nghỉ giữa vòng', value: `${e.restSec}s` });
			}
			out.push({ label: 'Số bài', value: String(e.components.length) });
		} else {
			out.push({ label: 'Số set', value: String(e.sets) });
			if (e.mode === 'duration') out.push({ label: 'Mỗi set', value: `${e.durationSec}s` });
			else out.push({ label: 'Mỗi set', value: `${e.reps} lần` });
			if (e.mode === 'hold') out.push({ label: 'Giữ / thả', value: `${e.holdSec}s / ${e.relaxSec}s` });
			if (e.sets > 1) out.push({ label: 'Nghỉ giữa set', value: `${e.restSec}s` });
		}
		out.push({ label: 'Thời lượng', value: `~${formatDuration(estimatedSec.value)}` });
		return out;
	});

	const usage = computed(() => {
		const e = exercise.value;
		if (!e) return null;
		const parts: string[] = [];
		if (e.routineCount > 0) parts.push(`${e.routineCount} giáo án`);
		if (e.comboCount > 0) parts.push(`${e.comboCount} bài kết hợp`);
		return parts.length ? `Đang dùng trong ${parts.join(' và ')}` : null;
	});

	// ---- Sửa / lưu trữ / xoá ----
	const editOpen = ref(false);
	const comboOpen = ref(false);
	const mediaOpen = ref(false);
	const saving = ref(false);

	async function openEdit() {
		if (!isCombo.value) {
			editOpen.value = true;
			return;
		}
		// Form bài kết hợp cần thư viện để chọn bài con.
		if (exercises.value.length === 0) await list();
		comboOpen.value = true;
	}

	async function act(fn: () => Promise<unknown>, success: string): Promise<boolean> {
		saving.value = true;
		const res = await fn();
		saving.value = false;
		if (res === null || res === false) {
			toast.add({ title: 'Có lỗi', description: error.value ?? undefined, color: 'error' });
			return false;
		}
		toast.add({ title: success, color: 'success' });
		editOpen.value = false;
		comboOpen.value = false;
		return true;
	}

	const onSave = (input: CreateExerciseInput) => act(() => update(exerciseId, input), 'Đã lưu');
	const onArchive = (archived: boolean) =>
		act(() => update(exerciseId, { isArchived: archived }), archived ? 'Đã lưu trữ' : 'Đã khôi phục');

	async function onDelete() {
		if (!exercise.value) return;
		if (!confirm(`Xoá bài "${exercise.value.name}"? Lịch sử buổi tập vẫn giữ tên bài.`)) return;
		if (await act(() => remove(exerciseId), 'Đã xoá bài tập')) await navigateTo('/exercises');
	}
</script>

<template>
	<div class="py-4 space-y-4">
		<template v-if="!loaded && loading">
			<div class="aspect-video rounded-2xl bg-(--ui-bg-elevated) animate-pulse" />
			<div class="h-8 w-2/3 rounded bg-(--ui-bg-elevated) animate-pulse" />
			<div class="h-20 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="!exercise">
			<p class="py-4 text-center text-sm text-(--ui-text-muted)">Không tìm thấy bài tập.</p>
			<UButton block class="mt-2" color="neutral" variant="soft" to="/exercises">Về thư viện</UButton>
		</UCard>

		<template v-else>
			<!-- Ảnh / video -->
			<MediaGallery v-if="heroMedia.length" :media="heroMedia" />
			<button
				v-else
				type="button"
				class="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-(--ui-border-accented) bg-(--tone)/10 text-(--tone) transition-colors active:bg-(--tone)/20"
				:class="CATEGORY_TONES[exercise.category]"
				@click="() => { mediaOpen = true }"
			>
				<UIcon :name="isCombo ? COMBO_ICON : CATEGORY_ICONS[exercise.category]" class="size-12" />
				<span class="flex items-center gap-1.5 text-sm font-medium text-(--ui-text-highlighted)">
					<UIcon name="i-heroicons-plus-circle" class="size-5" />
					Thêm ảnh hoặc video hướng dẫn
				</span>
			</button>

			<!-- Tiêu đề -->
			<div>
				<div class="flex flex-wrap items-center gap-1.5">
					<span
						class="inline-flex items-center gap-1 rounded-full bg-(--tone)/15 px-2 py-0.5 text-xs font-medium text-(--ui-text-highlighted)"
						:class="CATEGORY_TONES[exercise.category]"
					>
						<UIcon :name="CATEGORY_ICONS[exercise.category]" class="size-3.5 text-(--tone)" />
						{{ CATEGORY_LABELS[exercise.category] }}
					</span>
					<UBadge v-if="exercise.mode === 'combo'" :icon="COMBO_ICON" color="primary" variant="soft" size="sm">
						Kết hợp · {{ COMBO_STYLE_LABELS[exercise.comboStyle] }}
					</UBadge>
					<UBadge v-else color="neutral" variant="soft" size="sm">{{ MODE_LABELS[exercise.mode] }}</UBadge>
					<UBadge v-if="exercise.isArchived" color="neutral" variant="outline" size="sm">Đã lưu trữ</UBadge>
				</div>
				<h2 class="mt-2 text-2xl font-bold leading-tight text-(--ui-text-highlighted)">{{ exercise.name }}</h2>
				<p v-if="usage" class="mt-1 text-xs text-(--ui-text-muted)">{{ usage }}</p>
			</div>

			<!-- Thông số -->
			<div class="grid gap-2" :class="tiles.length % 2 === 0 && tiles.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'">
				<div v-for="t in tiles" :key="t.label" class="rounded-xl border border-(--ui-border) px-3 py-2.5">
					<p class="text-[11px] text-(--ui-text-muted)">{{ t.label }}</p>
					<p class="mt-0.5 text-lg font-semibold leading-tight text-(--ui-text-highlighted)">{{ t.value }}</p>
				</div>
			</div>

			<!-- Hành động -->
			<div class="flex gap-2">
				<UButton
					class="flex-1 justify-center"
					size="lg"
					icon="i-heroicons-play"
					:disabled="exercise.isArchived"
					:to="`/play?exercise=${exercise.id}`"
				>
					Tập thử
				</UButton>
				<UButton size="lg" color="neutral" variant="soft" icon="i-heroicons-photo" aria-label="Ảnh và video" @click="() => { mediaOpen = true }" />
				<UButton size="lg" color="neutral" variant="soft" icon="i-heroicons-pencil-square" aria-label="Sửa bài tập" @click="openEdit" />
			</div>

			<!-- Bài con -->
			<UCard v-if="isCombo">
				<div class="mb-3 flex items-center gap-2 border-b border-(--ui-border) pb-3">
					<UIcon :name="COMBO_ICON" class="size-4 shrink-0 text-(--ui-primary)" />
					<h3 class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">
						{{ exercise.comboStyle === 'circuit' ? 'Mỗi vòng gồm' : 'Lần lượt các bài' }}
					</h3>
				</div>
				<div class="space-y-1">
					<NuxtLink
						v-for="(c, idx) in exercise.components"
						:key="c.id"
						:to="`/exercises/${c.exerciseId}`"
						class="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 active:bg-(--ui-bg-elevated)"
					>
						<ExerciseThumb :cover="coverOf(c.exercise)" :category="c.exercise.category" class="size-11" />
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium text-(--ui-text-highlighted)">{{ idx + 1 }}. {{ c.exercise.name }}</span>
							<span class="block text-xs text-(--ui-text-muted)">
								{{
									exercise.comboStyle === 'circuit'
										? describeParams(c.exercise.mode, idx === exercise.components.length - 1 ? { ...c, restSec: 0 } : c, true)
										: describeParams(c.exercise.mode, c)
								}}
							</span>
						</span>
						<UIcon name="i-heroicons-chevron-right" class="size-4 shrink-0 text-(--ui-text-dimmed)" />
					</NuxtLink>
				</div>
			</UCard>

			<!-- Hướng dẫn -->
			<UCard v-if="exercise.instructions">
				<div class="mb-3 flex items-center gap-2 border-b border-(--ui-border) pb-3">
					<UIcon name="i-heroicons-light-bulb" class="size-4 shrink-0 text-(--ui-primary)" />
					<h3 class="text-sm font-semibold text-(--ui-text-highlighted)">Hướng dẫn</h3>
				</div>
				<p class="whitespace-pre-line text-sm leading-relaxed text-(--ui-text)">{{ exercise.instructions }}</p>
			</UCard>

			<ExerciseFormSheet
				v-model:open="editOpen"
				:exercise="exercise"
				:saving="saving"
				@save="onSave"
				@archive="onArchive"
				@delete="onDelete"
			/>
			<ComboFormSheet
				v-model:open="comboOpen"
				:combo="exercise"
				:exercises="exercises"
				:saving="saving"
				@save="onSave"
				@archive="onArchive"
				@delete="onDelete"
			/>
			<MediaManagerSheet
				v-model:open="mediaOpen"
				owner="exercises"
				:value="exercise"
				title="Ảnh & video hướng dẫn"
				:subtitle="exercise.name"
				@update="(e) => { exercise = e }"
			/>
		</template>
	</div>
</template>

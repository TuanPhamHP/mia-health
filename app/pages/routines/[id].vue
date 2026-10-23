<script setup lang="ts">
	import type { ExerciseParams } from '#shared/types/exercises';
	import type { CreateRoutineInput, RoutineItemDTO } from '#shared/types/routines';
	import { coverOf } from '#shared/utils/media';
	import { describeComponents, describeExercise } from '~/utils/labels';
	import { formatDuration } from '~/utils/format';

	const route = useRoute();
	const toast = useToast();
	const pageTitle = usePageTitle();
	pageTitle.value = 'Giáo án';

	const routineId = Number(route.params.id);
	const { current: routine, loading, error, get, update, remove, addItem, updateItem, removeItem, reorder } = useRoutines();
	const { exercises, list: listExercises } = useExercises();

	const busy = ref(false);

	onMounted(async () => {
		await Promise.all([get(routineId), listExercises()]);
		if (error.value) toast.add({ title: 'Lỗi tải giáo án', description: error.value, color: 'error' });
	});

	useHead({ title: computed(() => `${routine.value?.name ?? 'Giáo án'} — Mia Health`) });

	// Mọi thao tác trả về bản chi tiết mới → `routine` tự cập nhật; chỉ cần báo lỗi.
	async function act(fn: () => Promise<unknown>, success?: string): Promise<boolean> {
		busy.value = true;
		const res = await fn();
		busy.value = false;
		if (res === null || res === false) {
			toast.add({ title: 'Có lỗi', description: error.value ?? undefined, color: 'error' });
			return false;
		}
		if (success) toast.add({ title: success, color: 'success' });
		return true;
	}

	// ---- Thông tin giáo án ----
	const infoOpen = ref(false);
	async function onSaveInfo(input: CreateRoutineInput) {
		if (await act(() => update(routineId, input), 'Đã lưu')) infoOpen.value = false;
	}

	async function toggleArchive() {
		if (!routine.value) return;
		const archived = !routine.value.isArchived;
		await act(() => update(routineId, { isArchived: archived }), archived ? 'Đã lưu trữ' : 'Đã khôi phục');
	}

	async function onDelete() {
		if (!routine.value) return;
		if (!confirm(`Xoá giáo án "${routine.value.name}"? Lịch sử các buổi đã tập vẫn được giữ.`)) return;
		if (await act(() => remove(routineId), 'Đã xoá giáo án')) await navigateTo('/routines');
	}

	// ---- Bài trong giáo án ----
	const itemOpen = ref(false);
	const editingItem = ref<RoutineItemDTO | null>(null);

	function openAdd() {
		editingItem.value = null;
		itemOpen.value = true;
	}
	function openEditItem(it: RoutineItemDTO) {
		editingItem.value = it;
		itemOpen.value = true;
	}

	async function onSaveItem(payload: { exerciseId: number } & ExerciseParams) {
		const { exerciseId, ...params } = payload;
		const ok = editingItem.value
			? await act(() => updateItem(routineId, editingItem.value!.id, params), 'Đã lưu')
			: await act(() => addItem(routineId, { exerciseId, ...params }), 'Đã thêm bài');
		if (ok) itemOpen.value = false;
	}

	async function onRemoveItem(it: RoutineItemDTO) {
		if (!confirm(`Bỏ "${it.exercise.name}" khỏi giáo án?`)) return;
		await act(() => removeItem(routineId, it.id));
	}

	async function move(index: number, dir: -1 | 1) {
		const items = routine.value?.items ?? [];
		const target = index + dir;
		if (target < 0 || target >= items.length) return;
		const ids = items.map((i) => i.id);
		[ids[index], ids[target]] = [ids[target]!, ids[index]!];
		await act(() => reorder(routineId, ids));
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<template v-if="!routine && loading">
			<div class="h-32 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			<div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="!routine">
			<p class="py-4 text-center text-sm text-(--ui-text-muted)">Không tìm thấy giáo án.</p>
		</UCard>

		<template v-else>
			<UCard>
				<div class="flex items-start gap-3">
					<PreviewMosaic :previews="routine.previews" class="size-16" />
					<div class="min-w-0 flex-1">
						<h2 class="text-xl font-bold leading-tight text-(--ui-text-highlighted)">{{ routine.name }}</h2>
						<p v-if="routine.description" class="mt-1 text-sm text-(--ui-text-muted)">{{ routine.description }}</p>
					</div>
					<UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="sm" aria-label="Sửa giáo án" @click="() => { infoOpen = true }" />
				</div>
				<div class="mt-3 grid grid-cols-3 gap-2">
					<div class="rounded-xl border border-(--ui-border) px-3 py-2">
						<p class="text-[11px] text-(--ui-text-muted)">Số bài</p>
						<p class="text-lg font-semibold leading-tight text-(--ui-text-highlighted)">{{ routine.itemCount }}</p>
					</div>
					<div class="rounded-xl border border-(--ui-border) px-3 py-2">
						<p class="text-[11px] text-(--ui-text-muted)">Thời lượng</p>
						<p class="text-lg font-semibold leading-tight text-(--ui-text-highlighted)">~{{ formatDuration(routine.estimatedSec) }}</p>
					</div>
					<div class="rounded-xl border border-(--ui-border) px-3 py-2">
						<p class="text-[11px] text-(--ui-text-muted)">Chuẩn bị</p>
						<p class="text-lg font-semibold leading-tight text-(--ui-text-highlighted)">{{ routine.prepSec }}s</p>
					</div>
				</div>
				<div class="mt-3">
					<p class="mb-1.5 text-[11px] text-(--ui-text-muted)">Trong lịch chương trình</p>
					<div v-if="routine.programs.length > 0" class="flex flex-wrap gap-1.5">
						<UButton
							v-for="p in routine.programs"
							:key="p.id"
							size="xs"
							color="neutral"
							variant="soft"
							icon="i-heroicons-flag"
							:to="`/programs/${p.id}`"
						>
							{{ p.name }}
						</UButton>
					</div>
					<p v-else class="text-xs text-(--ui-text-dimmed)">
						Chưa có — mở <NuxtLink to="/programs" class="text-(--ui-primary)">Chương trình</NuxtLink> để nhặt giáo án này vào một ngày.
					</p>
				</div>
				<UBadge v-if="routine.isArchived" class="mt-3" color="neutral" variant="soft">Đã lưu trữ</UBadge>
				<UButton
					v-if="routine.items.length > 0 && !routine.isArchived"
					block
					size="lg"
					class="mt-3"
					icon="i-heroicons-play"
					:to="`/play?routine=${routine.id}`"
				>
					Bắt đầu tập
				</UButton>
			</UCard>

			<div class="flex items-center justify-between pt-1">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">
					{{ routine.items.length }} bài tập
				</h2>
				<UButton size="sm" variant="soft" icon="i-heroicons-plus" @click="openAdd">Thêm bài</UButton>
			</div>

			<p v-if="routine.items.length === 0" class="rounded-xl border border-dashed border-(--ui-border-accented) py-6 text-center text-sm text-(--ui-text-muted)">
				Chưa có bài nào — bấm "Thêm bài" để chọn từ thư viện.
			</p>

			<div
				v-for="(it, idx) in routine.items"
				:key="it.id"
				class="flex items-center gap-3 rounded-2xl border border-(--ui-border) py-2 pl-2 pr-1"
			>
				<ExerciseThumb
					:cover="coverOf(it.exercise)"
					:category="it.exercise.category"
					:combo="it.exercise.mode === 'combo'"
					class="size-12"
				/>
				<button type="button" class="min-w-0 flex-1 text-left" @click="openEditItem(it)">
					<span class="flex items-center gap-1.5">
						<span class="text-xs tabular-nums text-(--ui-text-dimmed)">{{ idx + 1 }}.</span>
						<span class="truncate text-sm font-medium text-(--ui-text-highlighted)">{{ it.exercise.name }}</span>
					</span>
					<span class="block text-xs text-(--ui-text-muted)">{{ describeExercise(it.exercise, it) }}</span>
					<span v-if="it.exercise.mode === 'combo'" class="block truncate text-xs text-(--ui-text-dimmed)">
						{{ describeComponents(it.exercise.components) }}
					</span>
				</button>
				<div class="flex shrink-0 items-center">
					<UButton icon="i-heroicons-chevron-up" color="neutral" variant="ghost" size="xs" :disabled="busy || idx === 0" aria-label="Lên" @click="move(idx, -1)" />
					<UButton icon="i-heroicons-chevron-down" color="neutral" variant="ghost" size="xs" :disabled="busy || idx === routine.items.length - 1" aria-label="Xuống" @click="move(idx, 1)" />
					<UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" :disabled="busy" aria-label="Bỏ khỏi giáo án" @click="onRemoveItem(it)" />
				</div>
			</div>

			<div class="grid grid-cols-2 gap-2 pt-3">
				<UButton
					block
					color="neutral"
					variant="soft"
					:icon="routine.isArchived ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-archive-box'"
					:disabled="busy"
					@click="toggleArchive"
				>
					{{ routine.isArchived ? 'Khôi phục' : 'Lưu trữ' }}
				</UButton>
				<UButton block color="error" variant="soft" icon="i-heroicons-trash" :disabled="busy" @click="onDelete">Xoá</UButton>
			</div>

			<RoutineFormSheet v-model:open="infoOpen" :routine="routine" :saving="busy" @save="onSaveInfo" />
			<ItemFormSheet v-model:open="itemOpen" :item="editingItem" :exercises="exercises" :saving="busy" @save="onSaveItem" />
		</template>
	</div>
</template>

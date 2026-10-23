<script setup lang="ts">
	import type { DropdownMenuItem } from '@nuxt/ui';
	import type {
		CreatePhaseInput,
		CreateProgramInput,
		ProgramPhaseDetailDTO,
		ProgramPhaseDTO,
		ProgramSlotDTO,
	} from '#shared/types/programs';
	import { isoWeekday, localDateIso } from '#shared/utils/date';
	import { programStatus, totalWeeks } from '#shared/utils/program';
	import { WEEKDAY_SHORT_LABELS } from '#shared/utils/weekday';
	import { GOAL_LABELS, describeProgramStatus } from '~/utils/labels';
	import { weekLoad } from '~/utils/program';
	import { formatDate, formatDuration, weekdayLabel } from '~/utils/format';

	const route = useRoute();
	const toast = useToast();
	const pageTitle = usePageTitle();
	pageTitle.value = 'Chương trình';

	const programId = Number(route.params.id);
	const today = localDateIso();
	const todayWeekday = isoWeekday(today);
	const {
		current: program,
		loading,
		error,
		get,
		update,
		remove,
		addPhase,
		updatePhase,
		removePhase,
		reorderPhases,
		addSlot,
		removeSlot,
	} = usePrograms();

	const busy = ref(false);

	onMounted(async () => {
		await get(programId);
		if (error.value) toast.add({ title: 'Lỗi tải chương trình', description: error.value, color: 'error' });
	});

	useHead({ title: computed(() => `${program.value?.name ?? 'Chương trình'} — Mia Health`) });

	// Mọi thao tác trả về bản chi tiết mới → `program` tự cập nhật; chỉ cần báo lỗi.
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

	const status = computed(() => (program.value ? programStatus(program.value, today) : null));
	const weeks = computed(() => totalWeeks(program.value?.phases ?? []));
	const activePhaseIndex = computed(() => (status.value?.kind === 'active' ? status.value.phaseIndex : -1));
	const following = computed(() => status.value?.kind === 'active' || status.value?.kind === 'upcoming');

	// ---- Thông tin + theo / dừng ----
	const infoOpen = ref(false);
	async function onSaveInfo(input: CreateProgramInput) {
		if (await act(() => update(programId, input), 'Đã lưu')) infoOpen.value = false;
	}

	const startOpen = ref(false);
	async function onStart(startDate: string) {
		const msg = startDate <= today ? 'Đã bắt đầu — buổi tập hiện ở màn Hôm nay' : `Sẽ bắt đầu ${formatDate(startDate)}`;
		if (await act(() => update(programId, { startDate }), msg)) startOpen.value = false;
	}

	async function onStop() {
		if (!confirm('Dừng theo chương trình này? Lịch soạn sẵn vẫn giữ, bắt đầu lại lúc nào cũng được.')) return;
		await act(() => update(programId, { startDate: null }), 'Đã dừng theo');
	}

	async function onDelete() {
		if (!program.value) return;
		if (!confirm(`Xoá chương trình "${program.value.name}"? Giáo án và lịch sử buổi tập vẫn giữ nguyên.`)) return;
		if (await act(() => remove(programId), 'Đã xoá chương trình')) await navigateTo('/programs');
	}

	// ---- Giai đoạn ----
	const phaseOpen = ref(false);
	const editingPhase = ref<ProgramPhaseDTO | null>(null);

	function openAddPhase() {
		editingPhase.value = null;
		phaseOpen.value = true;
	}

	async function onSavePhase(input: CreatePhaseInput) {
		const { copyFromPhaseId: _, ...fields } = input;
		const ok = editingPhase.value
			? await act(() => updatePhase(programId, editingPhase.value!.id, fields), 'Đã lưu')
			: await act(() => addPhase(programId, input), 'Đã thêm giai đoạn');
		if (ok) phaseOpen.value = false;
	}

	async function movePhase(index: number, dir: -1 | 1) {
		const ids = program.value?.phases.map((p) => p.id) ?? [];
		const target = index + dir;
		if (target < 0 || target >= ids.length) return;
		[ids[index], ids[target]] = [ids[target]!, ids[index]!];
		await act(() => reorderPhases(programId, ids));
	}

	function phaseMenu(phase: ProgramPhaseDetailDTO, index: number): DropdownMenuItem[][] {
		const count = program.value?.phases.length ?? 0;
		return [
			[
				{
					label: 'Sửa tên, số tuần, lời dặn',
					icon: 'i-heroicons-pencil-square',
					onSelect: () => {
						editingPhase.value = phase;
						phaseOpen.value = true;
					},
				},
				{ label: 'Lên trước', icon: 'i-heroicons-chevron-up', disabled: index === 0, onSelect: () => movePhase(index, -1) },
				{ label: 'Xuống sau', icon: 'i-heroicons-chevron-down', disabled: index === count - 1, onSelect: () => movePhase(index, 1) },
			],
			[
				{
					label: 'Xoá giai đoạn',
					icon: 'i-heroicons-trash',
					color: 'error',
					disabled: count <= 1,
					onSelect: async () => {
						if (!confirm(`Xoá giai đoạn "${phase.name}" cùng lịch tuần của nó?`)) return;
						await act(() => removePhase(programId, phase.id), 'Đã xoá giai đoạn');
					},
				},
			],
		];
	}

	// ---- Ô lịch: nhặt giáo án vào ngày ----
	const pickerOpen = ref(false);
	const pickTarget = ref<{ phase: ProgramPhaseDetailDTO; weekday: number } | null>(null);

	function openPicker(phase: ProgramPhaseDetailDTO, weekday: number) {
		pickTarget.value = { phase, weekday };
		pickerOpen.value = true;
	}

	const pickerTitle = computed(() =>
		pickTarget.value ? `Thêm vào ${weekdayLabel(pickTarget.value.weekday)}` : 'Thêm giáo án',
	);

	async function onPick(routineId: number) {
		const target = pickTarget.value;
		if (!target) return;
		if (await act(() => addSlot(programId, target.phase.id, { weekday: target.weekday, routineId }), 'Đã thêm vào lịch')) {
			pickerOpen.value = false;
		}
	}

	async function onRemoveSlot(phase: ProgramPhaseDetailDTO, slot: ProgramSlotDTO) {
		await act(() => removeSlot(programId, phase.id, slot.id));
	}

	function daySlots(phase: ProgramPhaseDetailDTO, weekday: number) {
		return phase.slots.filter((s) => s.weekday === weekday);
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<template v-if="!program && loading">
			<div class="h-40 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
			<div class="h-80 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="!program">
			<p class="py-4 text-center text-sm text-(--ui-text-muted)">Không tìm thấy chương trình.</p>
		</UCard>

		<template v-else>
			<UCard>
				<div class="flex items-start gap-3">
					<GoalChip :goal="program.goal" large />
					<div class="min-w-0 flex-1">
						<p class="text-xs text-(--ui-text-muted)">{{ GOAL_LABELS[program.goal] }}</p>
						<h2 class="text-xl font-bold leading-tight text-(--ui-text-highlighted)">{{ program.name }}</h2>
					</div>
					<UButton icon="i-heroicons-pencil-square" color="neutral" variant="ghost" size="sm" aria-label="Sửa chương trình" @click="() => { infoOpen = true }" />
				</div>
				<p v-if="program.description" class="mt-2 whitespace-pre-line text-sm text-(--ui-text-muted)">{{ program.description }}</p>

				<!-- Trạng thái theo — chương trình đang theo quyết định buổi tập ở màn Hôm nay -->
				<div v-if="status" class="mt-3 rounded-xl border border-(--ui-border) px-3 py-2.5">
					<template v-if="status.kind === 'active'">
						<p class="text-sm font-medium text-(--ui-text-highlighted)">Đang theo · {{ describeProgramStatus(status) }}</p>
						<p class="text-xs text-(--ui-text-muted)">
							Bắt đầu {{ formatDate(program.startDate!) }}<template v-if="program.phases.length > 1">
								· {{ program.phases[status.phaseIndex]!.name }} (tuần {{ status.weekInPhase }}/{{ program.phases[status.phaseIndex]!.weeks }})</template>
						</p>
						<div
							v-if="status.totalWeeks > 1"
							class="mt-2 h-1.5 rounded-full bg-(--ui-bg-elevated)"
							role="progressbar"
							:aria-valuenow="status.week"
							aria-valuemin="1"
							:aria-valuemax="status.totalWeeks"
							:aria-label="describeProgramStatus(status)"
						>
							<div class="h-full rounded-full bg-(--ui-primary)" :style="{ width: `${(status.week / status.totalWeeks) * 100}%` }" />
						</div>
					</template>
					<template v-else-if="status.kind === 'upcoming'">
						<p class="text-sm font-medium text-(--ui-text-highlighted)">
							Sẽ bắt đầu {{ weekdayLabel(isoWeekday(status.startDate)) }} {{ formatDate(status.startDate) }}
						</p>
					</template>
					<template v-else-if="status.kind === 'finished'">
						<p class="text-sm font-medium text-(--ui-text-highlighted)">Đã hoàn thành ngày {{ formatDate(status.endDate) }}</p>
						<p class="text-xs text-(--ui-text-muted)">Bắt đầu lại, hoặc sửa giai đoạn rồi bắt đầu một vòng mới.</p>
					</template>
					<template v-else>
						<p class="text-sm font-medium text-(--ui-text-highlighted)">Chưa theo</p>
						<p class="text-xs text-(--ui-text-muted)">Bắt đầu theo thì buổi tập trong lịch sẽ hiện ở màn Hôm nay.</p>
					</template>

					<UButton
						v-if="following"
						block
						class="mt-2.5"
						color="neutral"
						variant="soft"
						icon="i-heroicons-pause-circle"
						:disabled="busy"
						@click="onStop"
					>
						Dừng theo
					</UButton>
					<UButton v-else block class="mt-2.5" icon="i-heroicons-play" :disabled="busy" @click="() => { startOpen = true }">
						{{ status.kind === 'finished' ? 'Bắt đầu lại' : 'Bắt đầu theo' }}
					</UButton>
				</div>
				<p class="mt-2 text-xs text-(--ui-text-dimmed)">
					{{ program.phases.length }} giai đoạn · {{ weeks }} tuần{{ program.repeat ? ' · lặp lại khi hết' : ' · kết thúc khi hết' }}
				</p>
			</UCard>

			<UCard v-for="(ph, idx) in program.phases" :key="ph.id">
				<div class="flex items-start gap-2">
					<div class="min-w-0 flex-1">
						<p class="text-[11px] font-semibold uppercase tracking-wide text-(--ui-text-muted)">
							Giai đoạn {{ idx + 1 }} · {{ ph.weeks }} tuần
							<span v-if="idx === activePhaseIndex" class="text-(--ui-primary)"> · đang ở đây</span>
						</p>
						<h3 class="font-semibold text-(--ui-text-highlighted)">{{ ph.name }}</h3>
						<p v-if="ph.note" class="mt-0.5 text-xs text-(--ui-text-muted)">{{ ph.note }}</p>
					</div>
					<UDropdownMenu :items="phaseMenu(ph, idx)">
						<UButton icon="i-heroicons-ellipsis-vertical" color="neutral" variant="ghost" size="sm" :disabled="busy" aria-label="Thao tác giai đoạn" />
					</UDropdownMenu>
				</div>

				<div class="mt-2 divide-y divide-(--ui-border)">
					<div v-for="d in 7" :key="d" class="flex items-start gap-2 py-2">
						<span
							class="w-7 shrink-0 pt-1.5 text-xs font-semibold"
							:class="d === todayWeekday && idx === activePhaseIndex ? 'text-(--ui-primary)' : 'text-(--ui-text-muted)'"
						>
							{{ WEEKDAY_SHORT_LABELS[d - 1] }}
						</span>
						<div class="min-w-0 flex-1 space-y-1">
							<div
								v-for="s in daySlots(ph, d)"
								:key="s.id"
								class="flex items-center gap-1 rounded-lg bg-(--ui-bg-elevated) py-1 pl-2.5 pr-0.5"
							>
								<NuxtLink :to="`/routines/${s.routineId}`" class="min-w-0 flex-1">
									<span class="block truncate text-sm text-(--ui-text-highlighted)">{{ s.routine.name }}</span>
									<span class="block text-[11px] text-(--ui-text-muted)">
										{{ s.routine.itemCount }} bài · ~{{ formatDuration(s.routine.estimatedSec) }}{{ s.routine.isArchived ? ' · đã lưu trữ' : '' }}
									</span>
								</NuxtLink>
								<UButton
									icon="i-heroicons-x-mark"
									color="neutral"
									variant="ghost"
									size="xs"
									:disabled="busy"
									:aria-label="`Gỡ ${s.routine.name} khỏi ${weekdayLabel(d)}`"
									@click="onRemoveSlot(ph, s)"
								/>
							</div>
							<p v-if="daySlots(ph, d).length === 0" class="pt-1.5 text-xs text-(--ui-text-dimmed)">Nghỉ</p>
						</div>
						<UButton
							icon="i-heroicons-plus"
							size="xs"
							variant="soft"
							class="mt-0.5"
							:disabled="busy"
							:aria-label="`Thêm giáo án vào ${weekdayLabel(d)}`"
							@click="openPicker(ph, d)"
						/>
					</div>
				</div>

				<p class="mt-1 text-xs text-(--ui-text-dimmed)">
					{{ weekLoad(ph.slots).sessions }} buổi · ~{{ formatDuration(weekLoad(ph.slots).sec) }} mỗi tuần
				</p>
			</UCard>

			<UButton block variant="soft" icon="i-heroicons-plus" :disabled="busy" @click="openAddPhase">Thêm giai đoạn</UButton>
			<UButton block color="error" variant="soft" icon="i-heroicons-trash" :disabled="busy" @click="onDelete">Xoá chương trình</UButton>

			<ProgramFormSheet v-model:open="infoOpen" :program="program" :saving="busy" @save="onSaveInfo" />
			<ProgramStartSheet v-model:open="startOpen" :saving="busy" @start="onStart" />
			<PhaseFormSheet v-model:open="phaseOpen" :phase="editingPhase" :phases="program.phases" :saving="busy" @save="onSavePhase" />
			<RoutinePickerSheet
				v-model:open="pickerOpen"
				:title="pickerTitle"
				:subtitle="pickTarget ? `${program.name} · ${pickTarget.phase.name}` : undefined"
				:exclude-ids="pickTarget ? daySlots(pickTarget.phase, pickTarget.weekday).map((s) => s.routineId) : []"
				@pick="onPick"
			/>
		</template>
	</div>
</template>

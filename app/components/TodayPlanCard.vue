<script setup lang="ts">
	/**
	 * Lịch hôm nay, nhóm theo chương trình đang theo — mỗi nhóm nói rõ VÌ SAO (mục tiêu, mô tả,
	 * lời dặn của giai đoạn). Bỏ qua / đổi / thêm buổi chỉ áp cho hôm nay; đổi lâu dài thì sửa
	 * chương trình. Component chỉ phát sự kiện — trang cha gọi API và báo lỗi.
	 */
	import type { DropdownMenuItem } from '@nuxt/ui';
	import type { PlanChangeInput, PlanEntryDTO, PlanProgramDTO, TodayPlanDTO } from '#shared/types/plan';
	import { describeProgramStatus } from '~/utils/labels';
	import { formatDate, formatDuration } from '~/utils/format';

	const props = defineProps<{ plan: TodayPlanDTO; busy: boolean }>();
	const emit = defineEmits<{ change: [input: PlanChangeInput]; undo: [changeId: number] }>();

	const active = computed(() => props.plan.programs.filter((p) => p.status.kind === 'active'));
	const finished = computed(() => props.plan.programs.filter((p) => p.status.kind === 'finished'));
	const upcoming = computed(() => props.plan.programs.filter((p) => p.status.kind === 'upcoming'));

	const todo = computed(() => [...active.value.flatMap((g) => g.entries), ...props.plan.extras].filter((e) => !e.skipped));
	const doneCount = computed(() => todo.value.filter((e) => e.doneCount > 0).length);
	const totalSec = computed(() => todo.value.reduce((sum, e) => sum + e.routine.estimatedSec, 0));
	const allDone = computed(() => todo.value.length > 0 && doneCount.value === todo.value.length);

	const expanded = ref(new Set<number>());
	function toggle(id: number) {
		const next = new Set(expanded.value);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded.value = next;
	}

	// ---- Chọn giáo án: đổi buổi / thêm buổi ----
	type PickMode = { kind: 'swap'; programId: number; routineId: number; name: string } | { kind: 'add' };
	const pickerOpen = ref(false);
	const pickMode = ref<PickMode>({ kind: 'add' });

	function openSwap(group: PlanProgramDTO, entry: PlanEntryDTO) {
		const original = entry.replaces ?? entry.routine;
		pickMode.value = { kind: 'swap', programId: group.id, routineId: original.id, name: original.name };
		pickerOpen.value = true;
	}

	function openAdd() {
		pickMode.value = { kind: 'add' };
		pickerOpen.value = true;
	}

	function onPick(routineId: number) {
		const mode = pickMode.value;
		pickerOpen.value = false;
		if (mode.kind === 'add') emit('change', { kind: 'add', date: props.plan.date, routineId });
		else emit('change', { kind: 'swap', date: props.plan.date, programId: mode.programId, routineId: mode.routineId, replacementId: routineId });
	}

	const excludeIds = computed(() =>
		pickMode.value.kind === 'swap' ? [pickMode.value.routineId] : props.plan.extras.map((e) => e.routine.id),
	);

	function entryMenu(group: PlanProgramDTO | null, entry: PlanEntryDTO): DropdownMenuItem[][] {
		const view = { label: 'Xem giáo án', icon: 'i-heroicons-clipboard-document-list', to: `/routines/${entry.routine.id}` };
		if (!group) {
			return [[view], [{ label: 'Bỏ khỏi hôm nay', icon: 'i-heroicons-x-mark', onSelect: () => emit('undo', entry.changeId!) }]];
		}
		const original = entry.replaces ?? entry.routine;
		const items: DropdownMenuItem[] = [
			{ label: 'Đổi sang buổi khác…', icon: 'i-heroicons-arrows-right-left', onSelect: () => openSwap(group, entry) },
			{
				label: 'Bỏ qua hôm nay',
				icon: 'i-heroicons-forward',
				onSelect: () => emit('change', { kind: 'skip', date: props.plan.date, programId: group.id, routineId: original.id }),
			},
		];
		if (entry.replaces) {
			items.unshift({
				label: `Về lại "${entry.replaces.name}"`,
				icon: 'i-heroicons-arrow-uturn-left',
				onSelect: () => emit('undo', entry.changeId!),
			});
		}
		return [items, [view]];
	}

	function phaseLine(g: PlanProgramDTO): string {
		const status = describeProgramStatus(g.status);
		return g.phase && g.status.kind === 'active' && g.status.totalWeeks > g.phase.weeks ? `${status} · ${g.phase.name}` : status;
	}
</script>

<template>
	<UCard>
		<div class="mb-3 flex items-center gap-2 border-b border-(--ui-border) pb-3">
			<UIcon name="i-heroicons-calendar-days" class="size-4 shrink-0 text-(--ui-primary)" />
			<h3 class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">Lịch hôm nay</h3>
			<span v-if="todo.length > 0" class="text-xs text-(--ui-text-muted)">
				Xong {{ doneCount }}/{{ todo.length }} · ~{{ formatDuration(totalSec) }}
			</span>
		</div>

		<p v-if="allDone" class="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
			<UIcon name="i-heroicons-check-badge" class="size-5 shrink-0" />
			Đã xong mọi buổi hôm nay. Tuyệt vời!
		</p>

		<!-- Chưa theo chương trình nào: gợi ý chương trình có sẵn -->
		<div v-if="plan.programs.length === 0" class="space-y-2">
			<p class="text-sm text-(--ui-text-muted)">
				Chưa theo chương trình nào nên hôm nay chưa có lịch. Chọn một chương trình theo mục tiêu của bạn:
			</p>
			<NuxtLink
				v-for="p in plan.idlePrograms"
				:key="p.id"
				:to="`/programs/${p.id}`"
				class="flex items-center gap-2 rounded-xl border border-(--ui-border) px-3 py-2"
			>
				<GoalChip :goal="p.goal" />
				<span class="min-w-0 flex-1 truncate text-sm text-(--ui-text-highlighted)">{{ p.name }}</span>
				<UIcon name="i-heroicons-chevron-right" class="size-4 text-(--ui-text-dimmed)" />
			</NuxtLink>
			<UButton block variant="soft" icon="i-heroicons-plus" to="/programs">Tạo chương trình</UButton>
		</div>

		<div class="space-y-4">
			<section v-for="g in active" :key="g.id" class="space-y-2">
				<div class="flex items-start gap-2">
					<GoalChip :goal="g.goal" />
					<NuxtLink :to="`/programs/${g.id}`" class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold text-(--ui-text-highlighted)">{{ g.name }}</p>
						<p class="text-[11px] text-(--ui-text-muted)">{{ phaseLine(g) }}</p>
					</NuxtLink>
					<UButton
						v-if="g.description"
						size="xs"
						color="neutral"
						variant="ghost"
						:icon="expanded.has(g.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-information-circle'"
						:aria-expanded="expanded.has(g.id)"
						@click="toggle(g.id)"
					>
						Vì sao
					</UButton>
				</div>
				<p v-if="g.description && expanded.has(g.id)" class="whitespace-pre-line rounded-xl bg-(--ui-bg-elevated) px-3 py-2 text-xs text-(--ui-text-muted)">
					{{ g.description }}
				</p>
				<p v-if="g.phase?.note" class="flex gap-1.5 text-xs text-(--ui-text-muted)">
					<UIcon name="i-heroicons-light-bulb" class="mt-0.5 size-3.5 shrink-0 text-amber-500" />
					<span>{{ g.phase.note }}</span>
				</p>

				<p v-if="g.entries.length === 0" class="rounded-xl border border-dashed border-(--ui-border-accented) px-3 py-2 text-sm text-(--ui-text-muted)">
					Hôm nay nghỉ theo lịch chương trình.
				</p>
				<PlanEntryRow
					v-for="e in g.entries"
					:key="`${e.routine.id}-${e.changeId}`"
					:entry="e"
					:menu="entryMenu(g, e)"
					:busy="busy"
					@undo="(id) => emit('undo', id)"
				/>
			</section>

			<section v-if="plan.extras.length > 0" class="space-y-2">
				<p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">
					<UIcon name="i-heroicons-plus-circle" class="size-4" />
					Thêm riêng hôm nay
				</p>
				<PlanEntryRow
					v-for="e in plan.extras"
					:key="`extra-${e.changeId}`"
					:entry="e"
					:menu="entryMenu(null, e)"
					:busy="busy"
					@undo="(id) => emit('undo', id)"
				/>
			</section>

			<div v-for="g in finished" :key="g.id" class="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2">
				<UIcon name="i-heroicons-trophy" class="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
				<p class="min-w-0 flex-1 text-sm text-(--ui-text-highlighted)">
					Đã hoàn thành <strong>{{ g.name }}</strong>
					<span v-if="g.status.kind === 'finished'" class="text-(--ui-text-muted)"> ({{ formatDate(g.status.endDate) }})</span>
				</p>
				<UButton size="xs" variant="soft" :to="`/programs/${g.id}`">Tiếp theo</UButton>
			</div>

			<p v-for="g in upcoming" :key="g.id" class="flex items-center gap-2 text-xs text-(--ui-text-muted)">
				<GoalChip :goal="g.goal" />
				<span><strong>{{ g.name }}</strong> {{ describeProgramStatus(g.status).toLowerCase() }}</span>
			</p>
		</div>

		<div class="mt-4 grid grid-cols-2 gap-2 border-t border-(--ui-border) pt-3">
			<UButton block color="neutral" variant="soft" icon="i-heroicons-plus" :disabled="busy" @click="openAdd">Thêm buổi</UButton>
			<UButton block color="neutral" variant="soft" icon="i-heroicons-adjustments-horizontal" to="/programs">Sửa lịch</UButton>
		</div>
		<p class="mt-2 text-center text-[11px] text-(--ui-text-dimmed)">
			Đổi / bỏ / thêm buổi chỉ áp cho hôm nay. Muốn đổi lâu dài: Sửa lịch.
		</p>

		<RoutinePickerSheet
			v-model:open="pickerOpen"
			:title="pickMode.kind === 'swap' ? 'Đổi buổi hôm nay' : 'Thêm buổi hôm nay'"
			:subtitle="pickMode.kind === 'swap' ? `Thay cho “${pickMode.name}” — chỉ hôm nay` : 'Ngoài lịch các chương trình — chỉ hôm nay'"
			:exclude-ids="excludeIds"
			@pick="onPick"
		/>
	</UCard>
</template>

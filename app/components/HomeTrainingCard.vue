<script setup lang="ts">
	/**
	 * Tóm tắt tập luyện trên trang chủ: chuỗi ngày + tuần này + các buổi hôm nay (tên, phút, nút
	 * Tập). Mô tả chương trình, lời dặn giai đoạn, đổi / bỏ qua buổi nằm ở /today.
	 */
	import type { TodayPlanDTO } from '#shared/types/plan';
	import type { StatsOverviewDTO } from '#shared/types/stats';
	import { addDays, startOfIsoWeek } from '#shared/utils/date';
	import { WEEKDAY_SHORT_LABELS } from '#shared/utils/weekday';
	import { formatDate, formatDuration } from '~/utils/format';

	const props = defineProps<{ plan: TodayPlanDTO; overview: StatsOverviewDTO | null; today: string }>();

	const active = computed(() => props.plan.programs.filter((p) => p.status.kind === 'active'));
	const rows = computed(() => [
		...active.value.flatMap((g) => g.entries.filter((e) => !e.skipped).map((e) => ({ entry: e, goal: g.goal }))),
		...props.plan.extras.map((e) => ({ entry: e, goal: null })),
	]);
	const doneCount = computed(() => rows.value.filter((r) => r.entry.doneCount > 0).length);
	const totalSec = computed(() => rows.value.reduce((sum, r) => sum + r.entry.routine.estimatedSec, 0));

	const emptyText = computed(() => {
		if (props.plan.programs.length === 0) return 'Chưa theo chương trình nào nên hôm nay chưa có lịch.';
		if (active.value.length === 0) return 'Không có chương trình nào đang chạy hôm nay.';
		return 'Hôm nay nghỉ theo lịch.';
	});

	const streak = computed(() => props.overview?.currentStreak ?? 0);

	// Tuần hiện tại (T2 → CN) lấy từ heatmap — heatmap luôn phủ trọn tuần này tới hôm nay.
	const weekDays = computed(() => {
		const start = startOfIsoWeek(props.today);
		const byDate = new Map((props.overview?.heatmap ?? []).map((d) => [d.date, d]));
		return WEEKDAY_SHORT_LABELS.map((label, i) => {
			const date = addDays(start, i);
			return {
				date,
				label,
				done: (byDate.get(date)?.sessions ?? 0) > 0,
				isToday: date === props.today,
				future: date > props.today,
			};
		});
	});
</script>

<template>
	<UCard>
		<div class="flex items-center gap-2">
			<UIcon name="i-heroicons-bolt" class="size-4 shrink-0 text-(--ui-primary)" />
			<h2 class="flex-1 text-sm font-semibold text-(--ui-text-highlighted)">Tập luyện</h2>
			<span class="flex items-center gap-1 text-sm tabular-nums text-(--ui-text-muted)" :aria-label="`Chuỗi ${streak} ngày liên tiếp`">
				<span aria-hidden="true" :class="streak > 0 ? '' : 'grayscale opacity-50'">🔥</span>
				<span class="font-semibold text-(--ui-text-highlighted)">{{ streak }}</span> ngày
			</span>
		</div>

		<!-- Tuần này: ngày đã tập có dấu ✓ — không để màu một mình gánh nghĩa -->
		<div class="mt-3 grid grid-cols-7 gap-1" role="list" aria-label="Các ngày đã tập trong tuần">
			<div
				v-for="d in weekDays"
				:key="d.date"
				role="listitem"
				class="flex flex-col items-center gap-1"
				:aria-label="`${d.label} ${formatDate(d.date)}: ${d.done ? 'đã tập' : d.future ? 'chưa tới' : 'chưa tập'}`"
			>
				<span class="text-[10px]" :class="d.isToday ? 'font-semibold text-(--ui-text-highlighted)' : 'text-(--ui-text-muted)'">{{ d.label }}</span>
				<span
					class="flex size-6 items-center justify-center rounded-full"
					:class="[
						d.done
							? 'bg-(--ui-primary) text-white'
							: d.future
								? 'border border-dashed border-(--ui-border-accented)'
								: 'bg-(--ui-bg-elevated)',
						d.isToday ? 'ring-2 ring-(--ui-primary) ring-offset-1 ring-offset-(--ui-bg)' : '',
					]"
				>
					<UIcon v-if="d.done" name="i-heroicons-check" class="size-3.5" />
				</span>
			</div>
		</div>

		<div class="mt-3 border-t border-(--ui-border) pt-1">
			<p v-if="rows.length === 0" class="py-2 text-sm text-(--ui-text-muted)">{{ emptyText }}</p>
			<div v-for="r in rows" :key="`${r.entry.routine.id}-${r.entry.changeId}`" class="flex items-center gap-2.5 py-2">
				<GoalChip v-if="r.goal" :goal="r.goal" />
				<span v-else class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-(--ui-bg-elevated)" aria-label="Thêm riêng hôm nay">
					<UIcon name="i-heroicons-plus" class="size-3.5 text-(--ui-text-muted)" />
				</span>
				<NuxtLink :to="`/routines/${r.entry.routine.id}`" class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium" :class="r.entry.doneCount > 0 ? 'text-(--ui-text-muted)' : 'text-(--ui-text-highlighted)'">
						{{ r.entry.routine.name }}
					</span>
					<span class="flex items-center gap-1 text-xs text-(--ui-text-muted)">
						<template v-if="r.entry.doneCount > 0">
							<UIcon name="i-heroicons-check-circle" class="size-3.5 text-emerald-500" /> Đã tập
						</template>
						<template v-else>~{{ formatDuration(r.entry.routine.estimatedSec) }}</template>
					</span>
				</NuxtLink>
				<UButton
					size="sm"
					:icon="r.entry.doneCount > 0 ? 'i-heroicons-arrow-path' : 'i-heroicons-play'"
					:variant="r.entry.doneCount > 0 ? 'soft' : 'solid'"
					:color="r.entry.doneCount > 0 ? 'neutral' : 'primary'"
					:to="`/play?routine=${r.entry.routine.id}`"
					:aria-label="`${r.entry.doneCount > 0 ? 'Tập lại' : 'Tập'} ${r.entry.routine.name}`"
				>
					{{ r.entry.doneCount > 0 ? 'Lại' : 'Tập' }}
				</UButton>
			</div>
		</div>

		<NuxtLink to="/today" class="mt-1 flex items-center gap-2 border-t border-(--ui-border) pt-3 text-xs">
			<span class="flex-1 text-(--ui-text-muted)">
				<template v-if="rows.length > 0">Xong {{ doneCount }}/{{ rows.length }} · ~{{ formatDuration(totalSec) }}</template>
				<template v-else-if="plan.programs.length === 0">Chọn chương trình theo mục tiêu</template>
			</span>
			<span class="font-medium text-(--ui-primary)">{{ plan.programs.length === 0 ? 'Chọn chương trình' : 'Chi tiết · đổi lịch' }}</span>
			<UIcon name="i-heroicons-chevron-right" class="size-4 text-(--ui-primary)" />
		</NuxtLink>
	</UCard>
</template>

<script setup lang="ts">
	/** Thẻ chương trình ở danh sách: mục tiêu, trạng thái theo, lịch tuần của giai đoạn đang chạy. */
	import type { ProgramDetailDTO } from '#shared/types/programs';
	import { isoWeekday } from '#shared/utils/date';
	import { programStatus, totalWeeks } from '#shared/utils/program';
	import { GOAL_LABELS, describeProgramStatus } from '~/utils/labels';
	import { focusPhaseIndex, slotsMask, weekLoad } from '~/utils/program';
	import { formatDuration } from '~/utils/format';

	const props = defineProps<{ program: ProgramDetailDTO; today: string }>();

	const status = computed(() => programStatus(props.program, props.today));
	const phase = computed(() => props.program.phases[focusPhaseIndex(props.program, props.today)] ?? null);
	const load = computed(() => weekLoad(phase.value?.slots ?? []));
	const weeks = computed(() => totalWeeks(props.program.phases));
	const progress = computed(() => {
		const s = status.value;
		return s.kind === 'active' && s.totalWeeks > 1 ? s.week / s.totalWeeks : null;
	});
</script>

<template>
	<NuxtLink :to="`/programs/${program.id}`" class="block">
		<UCard>
			<div class="flex items-start gap-3">
				<GoalChip :goal="program.goal" large />
				<div class="min-w-0 flex-1">
					<div class="flex items-start gap-2">
						<h3 class="min-w-0 flex-1 truncate font-semibold text-(--ui-text-highlighted)">{{ program.name }}</h3>
						<UBadge v-if="status.kind === 'active'" color="primary" variant="soft" size="sm">Đang theo</UBadge>
						<UBadge v-else-if="status.kind === 'finished'" color="success" variant="soft" size="sm">Hoàn thành</UBadge>
						<UBadge v-else-if="status.kind === 'upcoming'" color="neutral" variant="soft" size="sm">Sắp bắt đầu</UBadge>
					</div>
					<p class="text-xs text-(--ui-text-muted)">
						{{ GOAL_LABELS[program.goal] }} · {{ describeProgramStatus(status)
						}}<template v-if="status.kind === 'active' && program.phases.length > 1 && phase"> · {{ phase.name }}</template>
					</p>
					<p v-if="program.description" class="mt-1 line-clamp-2 text-sm text-(--ui-text-muted)">{{ program.description }}</p>
				</div>
			</div>

			<div
				v-if="progress !== null"
				class="mt-3 h-1.5 rounded-full bg-(--ui-bg-elevated)"
				role="progressbar"
				:aria-valuenow="Math.round(progress * 100)"
				aria-valuemin="0"
				aria-valuemax="100"
				:aria-label="`Tiến độ ${describeProgramStatus(status)}`"
			>
				<div class="h-full rounded-full bg-(--ui-primary)" :style="{ width: `${progress * 100}%` }" />
			</div>

			<WeekdayPills :mask="slotsMask(phase?.slots ?? [])" :today="isoWeekday(today)" class="mt-3" />
			<p class="mt-2 text-xs text-(--ui-text-dimmed)">
				{{ load.sessions }} buổi/tuần · ~{{ formatDuration(load.sec) }}/tuần ·
				{{ program.phases.length > 1 ? `${program.phases.length} giai đoạn, ` : '' }}{{ weeks }} tuần{{ program.repeat ? ', lặp lại' : '' }}
			</p>
		</UCard>
	</NuxtLink>
</template>

<script setup lang="ts">
	/** Icon mục tiêu chương trình trên nền màu nhóm; `label` thêm tên mục tiêu (màu không đứng một mình). */
	import type { ProgramGoal } from '#shared/types/programs';
	import { GOAL_ICONS, GOAL_LABELS, GOAL_TONES } from '~/utils/labels';

	defineProps<{ goal: ProgramGoal; label?: boolean; large?: boolean }>();
</script>

<template>
	<span class="inline-flex min-w-0 items-center gap-1.5" :class="GOAL_TONES[goal]">
		<span
			class="flex shrink-0 items-center justify-center rounded-lg bg-(--tone)/15 text-(--tone)"
			:class="large ? 'size-10' : 'size-6'"
			:aria-label="label ? undefined : GOAL_LABELS[goal]"
		>
			<UIcon :name="GOAL_ICONS[goal]" :class="large ? 'size-5' : 'size-3.5'" />
		</span>
		<span v-if="label" class="truncate text-xs font-medium text-(--ui-text-muted)">{{ GOAL_LABELS[goal] }}</span>
	</span>
</template>

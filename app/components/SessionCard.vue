<script setup lang="ts">
	import type { SessionDTO } from '#shared/types/sessions';
	import { feelingEmoji } from '~/utils/labels';
	import { formatDuration } from '~/utils/format';

	const props = defineProps<{ session: SessionDTO }>();
	const emit = defineEmits<{ edit: []; delete: [] }>();

	const expanded = ref(false);

	const startTime = computed(() => {
		if (!props.session.startedAt) return null;
		const d = new Date(props.session.startedAt);
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	});

	function entryDetail(e: SessionDTO['entries'][number]): string {
		if (e.mode === 'duration') return `${e.durationSec}s/set`;
		if (e.mode === 'hold') return `${e.reps} lần · giữ ${e.holdSec}s`;
		return `${e.reps} lần/set`;
	}
</script>

<template>
	<div class="rounded-xl border border-(--ui-border) px-3 py-2.5">
		<button type="button" class="flex w-full items-start gap-2 text-left" @click="expanded = !expanded">
			<div class="min-w-0 flex-1">
				<p class="flex items-center gap-1.5">
					<span class="truncate font-medium text-(--ui-text-highlighted)">{{ session.title }}</span>
					<span v-if="session.feeling" class="text-base leading-none">{{ feelingEmoji(session.feeling) }}</span>
				</p>
				<p class="mt-0.5 text-xs text-(--ui-text-muted)">
					<template v-if="startTime">{{ startTime }} · </template>{{ formatDuration(session.durationSec) }}
					<template v-if="session.entries.length"> · {{ session.entries.length }} bài</template>
				</p>
			</div>
			<UBadge v-if="!session.completed" color="warning" variant="soft" size="sm">Dừng sớm</UBadge>
			<UIcon name="i-heroicons-chevron-down" class="mt-1 size-4 shrink-0 text-(--ui-text-muted) transition-transform" :class="expanded ? 'rotate-180' : ''" />
		</button>

		<div v-if="expanded" class="mt-2 space-y-1 border-t border-(--ui-border) pt-2">
			<div v-for="e in session.entries" :key="e.id" class="flex items-baseline justify-between gap-2 text-sm">
				<span class="truncate text-(--ui-text-highlighted)">{{ e.exerciseName }}</span>
				<span class="shrink-0 text-xs tabular-nums text-(--ui-text-muted)">
					{{ e.setsDone }}/{{ e.setsPlanned }} set · {{ entryDetail(e) }}
				</span>
			</div>
			<p v-if="session.note" class="pt-1 text-sm italic text-(--ui-text-muted)">“{{ session.note }}”</p>
			<div class="flex justify-end gap-1 pt-1">
				<UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-pencil-square" @click="emit('edit')">Sửa</UButton>
				<UButton size="xs" color="error" variant="soft" icon="i-heroicons-trash" @click="emit('delete')">Xoá</UButton>
			</div>
		</div>
	</div>
</template>

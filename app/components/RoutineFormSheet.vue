<script setup lang="ts">
	import type { CreateRoutineInput, RoutineDTO } from '#shared/types/routines';
	import { ALL_DAYS_MASK, WEEKDAY_SHORT_LABELS, WEEKDAYS_MASK, WEEKEND_MASK, describeMask } from '#shared/utils/weekday';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ routine: RoutineDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: [input: CreateRoutineInput] }>();

	const name = ref('');
	const description = ref('');
	const mask = ref(ALL_DAYS_MASK);
	const prepSec = ref<number | null>(5);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		name.value = props.routine?.name ?? '';
		description.value = props.routine?.description ?? '';
		mask.value = props.routine?.scheduleMask ?? ALL_DAYS_MASK;
		prepSec.value = props.routine?.prepSec ?? 5;
	});

	function toggleDay(isoDay: number) {
		mask.value ^= 1 << (isoDay - 1);
	}

	const PRESETS = [
		{ label: 'Mỗi ngày', mask: ALL_DAYS_MASK },
		{ label: 'Ngày thường', mask: WEEKDAYS_MASK },
		{ label: 'Cuối tuần', mask: WEEKEND_MASK },
		{ label: 'Không lịch', mask: 0 },
	];

	function submit() {
		if (!name.value.trim()) {
			formError.value = 'Nhập tên giáo án';
			return;
		}
		emit('save', {
			name: name.value.trim(),
			description: description.value.trim() || null,
			scheduleMask: mask.value,
			prepSec: prepSec.value ?? 5,
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="routine ? 'Sửa giáo án' : 'Tạo giáo án'">
		<form class="space-y-4" @submit.prevent="submit">
			<UFormField label="Tên giáo án" required>
				<UInput v-model="name" placeholder="VD: Kegel buổi sáng" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>

			<UFormField label="Mô tả">
				<UTextarea v-model="description" :rows="2" autoresize class="w-full" />
			</UFormField>

			<UFormField label="Lịch tập" :hint="describeMask(mask)">
				<div class="grid grid-cols-7 gap-1">
					<button
						v-for="(label, i) in WEEKDAY_SHORT_LABELS"
						:key="label"
						type="button"
						class="h-10 rounded-lg text-sm font-medium transition-colors"
						:class="mask & (1 << i) ? 'bg-(--ui-primary) text-white' : 'bg-(--ui-bg-elevated) text-(--ui-text-muted)'"
						:aria-pressed="(mask & (1 << i)) !== 0"
						@click="toggleDay(i + 1)"
					>
						{{ label }}
					</button>
				</div>
				<div class="mt-2 flex flex-wrap gap-1.5">
					<UButton
						v-for="p in PRESETS"
						:key="p.label"
						size="xs"
						color="neutral"
						:variant="mask === p.mask ? 'solid' : 'soft'"
						@click="() => { mask = p.mask }"
					>
						{{ p.label }}
					</UButton>
				</div>
			</UFormField>

			<UFormField label="Đếm ngược chuẩn bị trước mỗi bài (giây)">
				<UInputNumber v-model="prepSec" :min="0" :max="60" class="w-full" />
			</UFormField>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">Lưu</UButton>
		</template>
	</AppSheet>
</template>

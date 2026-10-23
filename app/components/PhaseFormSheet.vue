<script setup lang="ts">
	/** Thêm / sửa giai đoạn. Thêm mới mặc định chép lịch tuần của giai đoạn cuối — sửa vài buổi nhanh hơn soạn lại cả tuần. */
	import type { CreatePhaseInput, ProgramPhaseDTO } from '#shared/types/programs';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{
		phase: ProgramPhaseDTO | null; // null = thêm mới
		phases: readonly ProgramPhaseDTO[]; // để chọn giai đoạn chép lịch
		saving: boolean;
	}>();
	const emit = defineEmits<{ save: [input: CreatePhaseInput] }>();

	const NO_COPY = 0;

	const name = ref('');
	const weeks = ref<number | null>(4);
	const note = ref('');
	const copyFrom = ref<number>(NO_COPY);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		name.value = props.phase?.name ?? `Giai đoạn ${props.phases.length + 1}`;
		weeks.value = props.phase?.weeks ?? 4;
		note.value = props.phase?.note ?? '';
		copyFrom.value = props.phase ? NO_COPY : (props.phases.at(-1)?.id ?? NO_COPY);
	});

	const copyItems = computed(() => [
		{ label: 'Lịch trống', value: NO_COPY },
		...props.phases.map((p) => ({ label: `Chép lịch "${p.name}"`, value: p.id })),
	]);

	function submit() {
		if (!name.value.trim()) {
			formError.value = 'Nhập tên giai đoạn';
			return;
		}
		if (!weeks.value || weeks.value < 1) {
			formError.value = 'Giai đoạn ít nhất 1 tuần';
			return;
		}
		emit('save', {
			name: name.value.trim(),
			weeks: weeks.value,
			note: note.value.trim() || null,
			...(copyFrom.value !== NO_COPY ? { copyFromPhaseId: copyFrom.value } : {}),
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="phase ? 'Sửa giai đoạn' : 'Thêm giai đoạn'">
		<form class="space-y-4" @submit.prevent="submit">
			<div class="grid grid-cols-3 gap-3">
				<UFormField label="Tên giai đoạn" required class="col-span-2">
					<UInput v-model="name" class="w-full" :ui="{ base: 'text-base' }" />
				</UFormField>
				<UFormField label="Số tuần">
					<UInputNumber v-model="weeks" :min="1" :max="52" class="w-full" />
				</UFormField>
			</div>

			<UFormField label="Lời dặn" hint="Hiện ở màn Hôm nay trong suốt giai đoạn">
				<UTextarea v-model="note" :rows="2" autoresize class="w-full" placeholder="VD: Tăng tạ 5–10% so với giai đoạn trước" />
			</UFormField>

			<UFormField v-if="!phase && phases.length > 0" label="Lịch tuần ban đầu">
				<USelect v-model="copyFrom" :items="copyItems" value-key="value" class="w-full" />
			</UFormField>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">{{ phase ? 'Lưu' : 'Thêm' }}</UButton>
		</template>
	</AppSheet>
</template>

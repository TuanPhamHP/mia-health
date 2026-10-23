<script setup lang="ts">
	import type { CreateProgramInput, ProgramDTO, ProgramGoal } from '#shared/types/programs';
	import { GOAL_ICONS, GOAL_LABELS, GOAL_ORDER, GOAL_TONES } from '~/utils/labels';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ program: ProgramDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: [input: CreateProgramInput] }>();

	const name = ref('');
	const goal = ref<ProgramGoal>('fat_loss');
	const description = ref('');
	const repeat = ref(false);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		name.value = props.program?.name ?? '';
		goal.value = props.program?.goal ?? 'fat_loss';
		description.value = props.program?.description ?? '';
		repeat.value = props.program?.repeat ?? false;
	});

	function submit() {
		if (!name.value.trim()) {
			formError.value = 'Nhập tên chương trình';
			return;
		}
		emit('save', {
			name: name.value.trim(),
			goal: goal.value,
			description: description.value.trim() || null,
			repeat: repeat.value,
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" :title="program ? 'Sửa chương trình' : 'Tạo chương trình'">
		<form class="space-y-4" @submit.prevent="submit">
			<UFormField label="Tên chương trình" required>
				<UInput v-model="name" placeholder="VD: Phục hồi đau lưng" class="w-full" :ui="{ base: 'text-base' }" />
			</UFormField>

			<UFormField label="Mục tiêu">
				<div class="grid grid-cols-2 gap-1.5">
					<button
						v-for="g in GOAL_ORDER"
						:key="g"
						type="button"
						class="flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition-colors"
						:class="[
							GOAL_TONES[g],
							goal === g
								? 'border-(--tone) bg-(--tone)/10 text-(--ui-text-highlighted)'
								: 'border-(--ui-border) text-(--ui-text-muted)',
						]"
						:aria-pressed="goal === g"
						@click="() => { goal = g }"
					>
						<UIcon :name="GOAL_ICONS[g]" class="size-4 shrink-0 text-(--tone)" />
						<span class="min-w-0 leading-tight">{{ GOAL_LABELS[g] }}</span>
					</button>
				</div>
			</UFormField>

			<UFormField label="Vì sao tập" hint="Hiện ở màn Hôm nay">
				<UTextarea v-model="description" :rows="3" autoresize class="w-full" placeholder="VD: Hết đau lưng dưới khi ngồi làm việc cả ngày" />
			</UFormField>

			<label class="flex items-start gap-3 rounded-xl border border-(--ui-border) px-3 py-2.5">
				<USwitch v-model="repeat" class="mt-0.5" />
				<span class="text-sm">
					<span class="block font-medium text-(--ui-text-highlighted)">Lặp lại khi hết giai đoạn cuối</span>
					<span class="block text-xs text-(--ui-text-muted)">
						Tắt: hết thời hạn là chương trình hoàn thành. Bật: quay lại giai đoạn 1 (lịch duy trì, Kegel…).
					</span>
				</span>
			</label>

			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">{{ program ? 'Lưu' : 'Tạo' }}</UButton>
		</template>
	</AppSheet>
</template>

<script setup lang="ts">
	/** Hồ sơ cơ thể: giới tính, năm sinh, chiều cao, mức vận động, mục tiêu cân nặng. */
	import type { BodyProfileDTO, UpdateBodyProfileInput } from '#shared/types/body';
	import type { ActivityLevel, Sex, WeightGoal } from '#shared/utils/body';
	import { ACTIVITY_LABELS, GOAL_WEIGHT_LABELS } from '~/utils/body';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ profile: BodyProfileDTO | null; today: string; saving: boolean }>();
	const emit = defineEmits<{ save: [input: UpdateBodyProfileInput] }>();

	const sex = ref<Sex>('male');
	const birthYear = ref<number | null>(1996);
	const heightCm = ref<number | null>(170);
	const activity = ref<ActivityLevel>('moderate');
	const goal = ref<WeightGoal>('lose');
	const rate = ref<number>(0.5);
	const targetWeight = ref<number | null>(null);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		const p = props.profile;
		sex.value = p?.sex ?? 'male';
		birthYear.value = p?.birthYear ?? Number(props.today.slice(0, 4)) - 30;
		heightCm.value = p?.heightCm ?? 170;
		activity.value = p?.activityLevel ?? 'moderate';
		goal.value = p?.goal ?? 'lose';
		rate.value = p?.goalRateKg ?? 0.5;
		targetWeight.value = p?.targetWeightKg ?? null;
	});

	const RATES = [0.25, 0.5, 0.75, 1];
	const activityItems = (Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => ({ label: ACTIVITY_LABELS[k].label, value: k }));

	function submit() {
		if (!birthYear.value || !heightCm.value) return void (formError.value = 'Nhập năm sinh và chiều cao');
		emit('save', {
			today: props.today,
			sex: sex.value,
			birthYear: birthYear.value,
			heightCm: heightCm.value,
			activityLevel: activity.value,
			goal: goal.value,
			goalRateKg: goal.value === 'maintain' ? 0 : rate.value,
			targetWeightKg: goal.value === 'maintain' ? null : targetWeight.value,
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" title="Hồ sơ cơ thể" subtitle="Dùng để tính BMR, TDEE và mục tiêu dinh dưỡng">
		<form class="space-y-4" @submit.prevent="submit">
			<div class="grid grid-cols-2 gap-1 rounded-xl bg-(--ui-bg-elevated) p-1">
				<UButton block size="sm" :color="sex === 'male' ? 'primary' : 'neutral'" :variant="sex === 'male' ? 'solid' : 'ghost'" @click="() => { sex = 'male' }">Nam</UButton>
				<UButton block size="sm" :color="sex === 'female' ? 'primary' : 'neutral'" :variant="sex === 'female' ? 'solid' : 'ghost'" @click="() => { sex = 'female' }">Nữ</UButton>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<UFormField label="Năm sinh" required>
					<UInputNumber v-model="birthYear" :min="1920" :max="2015" :format-options="{ useGrouping: false }" class="w-full" />
				</UFormField>
				<UFormField label="Chiều cao (cm)" required>
					<UInputNumber v-model="heightCm" :min="100" :max="250" :step="0.5" class="w-full" />
				</UFormField>
			</div>
			<UFormField label="Mức vận động" :description="ACTIVITY_LABELS[activity].hint">
				<USelect v-model="activity" :items="activityItems" value-key="value" class="w-full" />
			</UFormField>
			<UFormField label="Mục tiêu">
				<div class="grid grid-cols-3 gap-1 rounded-xl bg-(--ui-bg-elevated) p-1">
					<UButton
						v-for="g in (['lose', 'maintain', 'gain'] as const)"
						:key="g"
						block
						size="sm"
						:color="goal === g ? 'primary' : 'neutral'"
						:variant="goal === g ? 'solid' : 'ghost'"
						@click="() => { goal = g }"
					>
						{{ GOAL_WEIGHT_LABELS[g] }}
					</UButton>
				</div>
			</UFormField>
			<template v-if="goal !== 'maintain'">
				<UFormField label="Tốc độ (kg / tuần)" description="0,25–0,5 kg / tuần bền nhất, ít mất cơ">
					<div class="flex flex-wrap gap-1.5">
						<UButton v-for="r in RATES" :key="r" size="sm" :color="rate === r ? 'primary' : 'neutral'" :variant="rate === r ? 'solid' : 'soft'" @click="() => { rate = r }">
							{{ String(r).replace('.', ',') }} kg
						</UButton>
					</div>
				</UFormField>
				<UFormField label="Cân nặng mục tiêu (kg)">
					<UInputNumber v-model="targetWeight" :min="30" :max="300" :step="0.5" placeholder="—" class="w-full" />
				</UFormField>
			</template>
			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>
		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">Lưu hồ sơ</UButton>
		</template>
	</AppSheet>
</template>

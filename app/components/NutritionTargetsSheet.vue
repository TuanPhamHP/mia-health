<script setup lang="ts">
	/** Mục tiêu dinh dưỡng mỗi ngày — dùng chung mọi ngày. Ô trống = không đặt mục tiêu cho chất đó. */
	import type { NutritionTargetsDTO, UpdateNutritionTargetsInput } from '#shared/types/meals';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ targets: NutritionTargetsDTO | null; saving: boolean }>();
	const emit = defineEmits<{ save: [input: UpdateNutritionTargetsInput] }>();

	const energy = ref<number | null>(2000);
	const protein = ref<number | null>(null);
	const fat = ref<number | null>(null);
	const carb = ref<number | null>(null);
	const fiber = ref<number | null>(null);
	const sodium = ref<number | null>(null);
	const formError = ref<string | null>(null);

	watch(open, (v) => {
		if (!v) return;
		formError.value = null;
		const t = props.targets;
		energy.value = t?.energyKcal ?? 2000;
		protein.value = t?.proteinG ?? null;
		fat.value = t?.fatG ?? null;
		carb.value = t?.carbG ?? null;
		fiber.value = t?.fiberG ?? null;
		sodium.value = t?.sodiumMg ?? null;
	});

	// Năng lượng từ 3 chất đa lượng đã đặt — gợi ý để khớp với mục tiêu kcal.
	const macroKcal = computed(() => (protein.value ?? 0) * 4 + (fat.value ?? 0) * 9 + (carb.value ?? 0) * 4);

	function submit() {
		if (!energy.value || energy.value < 800) return void (formError.value = 'Năng lượng tối thiểu 800 kcal');
		emit('save', {
			energyKcal: energy.value,
			proteinG: protein.value,
			fatG: fat.value,
			carbG: carb.value,
			fiberG: fiber.value,
			sodiumMg: sodium.value,
		});
	}
</script>

<template>
	<AppSheet v-model:open="open" title="Mục tiêu mỗi ngày" subtitle="Dùng chung mọi ngày. Ô trống = không đặt mục tiêu cho chất đó">
		<form class="space-y-4" @submit.prevent="submit">
			<NuxtLink to="/body" class="flex items-center gap-2 rounded-lg bg-(--ui-bg-elevated) p-2.5 text-sm text-(--ui-text-highlighted)" @click="() => { open = false }">
				<UIcon name="i-heroicons-scale" class="size-4 shrink-0 text-(--ui-primary)" />
				<span class="flex-1">Tính từ cân nặng, BMI, TDEE ở mục Cơ thể</span>
				<UIcon name="i-heroicons-chevron-right" class="size-4 shrink-0 text-(--ui-text-dimmed)" />
			</NuxtLink>
			<UFormField label="Năng lượng (kcal)" required>
				<UInputNumber v-model="energy" :min="800" :max="8000" :step="50" class="w-full" />
			</UFormField>
			<div class="grid grid-cols-3 gap-3">
				<UFormField label="Đạm (g)">
					<UInputNumber v-model="protein" :min="0" :max="500" :step="5" placeholder="—" class="w-full" />
				</UFormField>
				<UFormField label="Béo (g)">
					<UInputNumber v-model="fat" :min="0" :max="500" :step="5" placeholder="—" class="w-full" />
				</UFormField>
				<UFormField label="Glucid (g)">
					<UInputNumber v-model="carb" :min="0" :max="1000" :step="5" placeholder="—" class="w-full" />
				</UFormField>
			</div>
			<p v-if="macroKcal > 0" class="text-xs text-(--ui-text-muted)">
				Đạm × 4 + béo × 9 + glucid × 4 = {{ Math.round(macroKcal) }} kcal{{
					energy ? ` (mục tiêu ${energy} kcal)` : ''
				}}
			</p>
			<div class="grid grid-cols-2 gap-3">
				<UFormField label="Chất xơ (g)">
					<UInputNumber v-model="fiber" :min="0" :max="150" :step="1" placeholder="—" class="w-full" />
				</UFormField>
				<UFormField label="Natri tối đa (mg)">
					<UInputNumber v-model="sodium" :min="0" :max="10000" :step="100" placeholder="—" class="w-full" />
				</UFormField>
			</div>
			<p v-if="formError" class="text-sm text-red-600 dark:text-red-400" role="alert">{{ formError }}</p>
		</form>

		<template #footer>
			<UButton block size="lg" :loading="saving" @click="submit">Lưu mục tiêu</UButton>
		</template>
	</AppSheet>
</template>

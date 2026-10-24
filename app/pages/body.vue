<script setup lang="ts">
	import type { UpdateBodyProfileInput } from '#shared/types/body';
	import { localDateIso } from '#shared/utils/date';
	import { ACTIVITY_LABELS, BMI_CLASS_LABELS, GOAL_WEIGHT_LABELS } from '~/utils/body';
	import { formatAmount } from '~/utils/foods';
	import { formatDate } from '~/utils/format';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Ăn uống';
	useHead({ title: 'Chỉ số cơ thể — Mia Health' });

	const toast = useToast();
	const { body, loading, error, load, saveProfile, addWeight, removeWeight, applyTargets } = useBody();

	const today = localDateIso();
	const busy = ref(false);

	onMounted(async () => {
		await load(today);
		if (error.value) toast.add({ title: 'Lỗi tải chỉ số', description: error.value, color: 'error' });
	});

	async function act(fn: () => Promise<unknown>, success?: string): Promise<boolean> {
		busy.value = true;
		const res = await fn();
		busy.value = false;
		if (res === null) {
			toast.add({ title: 'Có lỗi', description: error.value ?? undefined, color: 'error' });
			return false;
		}
		if (success) toast.add({ title: success, color: 'success' });
		return true;
	}

	const profile = computed(() => body.value?.profile ?? null);
	const metrics = computed(() => body.value?.metrics ?? null);
	const weights = computed(() => body.value?.weights ?? []);

	// ---- Hồ sơ ----
	const profileOpen = ref(false);
	const goalLine = computed(() => {
		const p = profile.value;
		if (!p) return '';
		const parts = [`Vận động ${ACTIVITY_LABELS[p.activityLevel].label.toLowerCase()}`, GOAL_WEIGHT_LABELS[p.goal]];
		if (p.goal !== 'maintain') {
			parts[1] += ` ${formatAmount(p.goalRateKg)} kg / tuần`;
			if (p.targetWeightKg !== null) parts[1] += ` → ${formatAmount(p.targetWeightKg)} kg`;
		}
		return parts.join(' · ');
	});
	async function onSaveProfile(input: UpdateBodyProfileInput) {
		if (await act(() => saveProfile(input), 'Đã lưu hồ sơ')) profileOpen.value = false;
	}

	// ---- Cân nặng ----
	const weightDate = ref(today);
	const weightKg = ref<number | null>(null);
	watch(
		() => weights.value[0]?.weightKg,
		(kg) => {
			if (weightKg.value === null && kg !== undefined) weightKg.value = kg;
		},
	);

	async function onAddWeight() {
		if (!weightKg.value) return;
		await act(() => addWeight(today, weightDate.value, weightKg.value!), 'Đã ghi cân nặng');
	}

	async function onRemoveWeight(id: number, date: string) {
		if (!confirm(`Xoá lần cân ngày ${formatDate(date)}?`)) return;
		await act(() => removeWeight(today, id), 'Đã xoá');
	}

	/** Chênh so với lần cân TRƯỚC đó (danh sách mới nhất trước). */
	function deltaAt(i: number): number | null {
		const next = weights.value[i + 1];
		return next ? weights.value[i]!.weightKg - next.weightKg : null;
	}

	function signed(v: number, unit: string): string {
		if (Math.abs(v) < 0.05) return `±0 ${unit}`;
		return `${v > 0 ? '+' : '−'}${formatAmount(Math.abs(v))} ${unit}`;
	}

	// ---- Áp mục tiêu ----
	async function onApplyTargets() {
		await act(() => applyTargets(today), 'Đã cập nhật mục tiêu nhật ký ăn');
	}

	const showFormula = ref(false);
</script>

<template>
	<div class="py-4 space-y-3">
		<MealsTabs />

		<div v-if="!body && loading" class="h-56 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />

		<template v-else-if="body">
			<!-- Chưa có hồ sơ -->
			<UCard v-if="!profile">
				<div class="space-y-2 text-center">
					<UIcon name="i-heroicons-user-circle" class="size-10 text-(--ui-text-dimmed)" />
					<p class="font-semibold text-(--ui-text-highlighted)">Nhập hồ sơ để tính chỉ số</p>
					<p class="text-sm text-(--ui-text-muted)">
						Giới tính, năm sinh, chiều cao, mức vận động + một lần cân ⇒ BMI, BMR, TDEE và mục tiêu kcal / đạm mỗi ngày.
					</p>
					<UButton icon="i-heroicons-pencil-square" @click="() => { profileOpen = true }">Nhập hồ sơ</UButton>
				</div>
			</UCard>

			<template v-else>
				<!-- Hồ sơ tóm tắt -->
				<UCard>
					<div class="flex items-start gap-2">
						<div class="min-w-0 flex-1 text-sm">
							<p class="font-semibold text-(--ui-text-highlighted)">
								{{ profile.sex === 'male' ? 'Nam' : 'Nữ' }} · {{ metrics?.age ?? Number(today.slice(0, 4)) - profile.birthYear }} tuổi ·
								{{ formatAmount(profile.heightCm) }} cm
							</p>
							<p class="text-(--ui-text-muted)">{{ goalLine }}</p>
						</div>
						<UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-pencil-square" @click="() => { profileOpen = true }">Sửa</UButton>
					</div>
				</UCard>

				<!-- Chỉ số -->
				<UCard v-if="metrics">
					<div class="flex items-end justify-between gap-3">
						<div>
							<p class="text-xs text-(--ui-text-muted)">BMI</p>
							<p class="text-4xl font-bold leading-none tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(metrics.bmi) }}</p>
						</div>
						<div class="text-right">
							<UBadge :color="metrics.bmiClass === 'normal' ? 'success' : metrics.bmiClass === 'underweight' ? 'info' : 'warning'" variant="soft">
								{{ BMI_CLASS_LABELS[metrics.bmiClass] }}
							</UBadge>
							<p class="mt-1 text-xs text-(--ui-text-muted)">{{ formatAmount(metrics.weightKg) }} kg · cân {{ formatDate(metrics.weightDate) }}</p>
						</div>
					</div>
					<p class="mt-2 text-sm text-(--ui-text-muted)">
						Cân nặng bình thường với {{ formatAmount(profile.heightCm) }} cm:
						<span class="tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(metrics.healthyMinKg) }}–{{ formatAmount(metrics.healthyMaxKg) }} kg</span>
						<span class="text-(--ui-text-dimmed)"> (ngưỡng châu Á 18,5–22,9)</span>
					</p>

					<div class="mt-3 grid grid-cols-2 gap-2">
						<div class="rounded-lg bg-(--ui-bg-elevated) p-2.5">
							<p class="text-xs text-(--ui-text-muted)">BMR · nghỉ ngơi</p>
							<p class="text-lg font-semibold tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(metrics.bmr) }} <span class="text-xs font-normal text-(--ui-text-muted)">kcal</span></p>
						</div>
						<div class="rounded-lg bg-(--ui-bg-elevated) p-2.5">
							<p class="text-xs text-(--ui-text-muted)">TDEE · cả ngày</p>
							<p class="text-lg font-semibold tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(metrics.tdee) }} <span class="text-xs font-normal text-(--ui-text-muted)">kcal</span></p>
						</div>
					</div>
				</UCard>

				<!-- Mục tiêu đề xuất -->
				<UCard v-if="metrics">
					<p class="text-sm font-semibold text-(--ui-text-highlighted)">Mục tiêu mỗi ngày đề xuất</p>
					<p class="tabular-nums">
						<span class="text-3xl font-bold text-(--ui-text-highlighted)">{{ formatAmount(metrics.targets.energyKcal) }}</span>
						<span class="ml-1 text-sm text-(--ui-text-muted)">kcal</span>
					</p>
					<p class="text-xs text-(--ui-text-muted)">
						<template v-if="metrics.targets.adjustKcal === 0">Bằng TDEE — giữ cân</template>
						<template v-else>TDEE {{ signed(metrics.targets.adjustKcal, 'kcal') }}</template>
						<template v-if="metrics.weeksToTarget !== null && metrics.weeksToTarget > 0"> · ~{{ metrics.weeksToTarget }} tuần tới {{ formatAmount(profile.targetWeightKg!) }} kg</template>
						<template v-else-if="metrics.weeksToTarget === 0"> · đã tới cân nặng mục tiêu</template>
					</p>
					<p v-if="metrics.targets.floorApplied" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
						Thâm hụt bị chặn ở mức sàn (không ăn dưới BMR / {{ profile.sex === 'male' ? '1.500' : '1.200' }} kcal) — giảm chậm hơn tốc độ đã chọn.
					</p>
					<div class="mt-3 grid grid-cols-3 gap-2 text-center">
						<div class="rounded-lg bg-(--ui-bg-elevated) p-2">
							<p class="text-xs text-(--ui-text-muted)">Đạm</p>
							<p class="font-semibold tabular-nums text-(--ui-text-highlighted)">{{ metrics.targets.proteinG }} g</p>
						</div>
						<div class="rounded-lg bg-(--ui-bg-elevated) p-2">
							<p class="text-xs text-(--ui-text-muted)">Béo</p>
							<p class="font-semibold tabular-nums text-(--ui-text-highlighted)">{{ metrics.targets.fatG }} g</p>
						</div>
						<div class="rounded-lg bg-(--ui-bg-elevated) p-2">
							<p class="text-xs text-(--ui-text-muted)">Glucid</p>
							<p class="font-semibold tabular-nums text-(--ui-text-highlighted)">{{ metrics.targets.carbG }} g</p>
						</div>
					</div>
					<p class="mt-2 text-xs text-(--ui-text-muted)">
						Chất xơ ≥ {{ metrics.targets.fiberG }} g · natri ≤ {{ formatAmount(metrics.targets.sodiumMg) }} mg (≈ 5 g muối)
					</p>
					<UButton class="mt-3" block icon="i-heroicons-check" :loading="busy" @click="onApplyTargets">Áp dụng làm mục tiêu nhật ký ăn</UButton>
				</UCard>

				<UCard v-else>
					<p class="text-sm text-(--ui-text-muted)">Ghi một lần cân bên dưới để tính BMI, TDEE và mục tiêu.</p>
				</UCard>
			</template>

			<!-- Cân nặng -->
			<UCard>
				<p class="mb-2 text-sm font-semibold text-(--ui-text-highlighted)">Cân nặng</p>
				<form class="flex items-end gap-2" @submit.prevent="onAddWeight">
					<UFormField label="Ngày" class="flex-1">
						<UInput v-model="weightDate" type="date" :max="today" class="w-full" />
					</UFormField>
					<UFormField label="kg" class="w-28">
						<UInputNumber v-model="weightKg" :min="25" :max="300" :step="0.1" placeholder="—" class="w-full" />
					</UFormField>
					<UButton type="submit" icon="i-heroicons-plus" :disabled="busy || !weightKg" aria-label="Ghi cân nặng" />
				</form>
				<p class="mt-1 text-xs text-(--ui-text-dimmed)">Cân cùng giờ mỗi lần (sáng, sau khi đi vệ sinh) — cân lại trong ngày sẽ ghi đè.</p>

				<p v-if="weights.length === 0" class="mt-3 text-sm text-(--ui-text-dimmed)">Chưa có lần cân nào.</p>
				<div v-for="(w, i) in weights" :key="w.id" class="mt-2 flex items-center gap-2 border-t border-(--ui-border) pt-2 text-sm">
					<span class="flex-1 text-(--ui-text-muted)">{{ formatDate(w.date) }}</span>
					<span v-if="deltaAt(i) !== null" class="text-xs tabular-nums text-(--ui-text-dimmed)">{{ signed(deltaAt(i)!, 'kg') }}</span>
					<span class="w-16 text-right font-medium tabular-nums text-(--ui-text-highlighted)">{{ formatAmount(w.weightKg) }} kg</span>
					<UButton icon="i-heroicons-trash" size="xs" color="neutral" variant="ghost" :disabled="busy" :aria-label="`Xoá lần cân ${formatDate(w.date)}`" @click="onRemoveWeight(w.id, w.date)" />
				</div>
			</UCard>

			<!-- Cách tính -->
			<UCard>
				<UButton
					block
					color="neutral"
					variant="ghost"
					class="justify-between"
					:trailing-icon="showFormula ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
					@click="() => { showFormula = !showFormula }"
				>
					Cách tính
				</UButton>
				<ul v-if="showFormula" class="mt-2 list-disc space-y-1.5 pl-5 text-xs text-(--ui-text-muted)">
					<li>
						<b>BMI</b> = cân nặng / chiều cao². Ngưỡng cho người châu Á (WHO Tây Thái Bình Dương 2000, Bộ Y tế VN dùng): thiếu cân &lt; 18,5 · bình thường
						18,5–22,9 · thừa cân 23–24,9 · béo phì I 25–29,9 · béo phì II ≥ 30. Người châu Á tích mỡ nội tạng ở BMI thấp hơn nên ngưỡng thấp hơn mức toàn
						cầu 25 / 30.
					</li>
					<li><b>BMR</b> (năng lượng lúc nghỉ) theo Mifflin-St Jeor: 10 × kg + 6,25 × cm − 5 × tuổi + 5 (nam) / − 161 (nữ).</li>
					<li><b>TDEE</b> = BMR × hệ số vận động (1,2 → 1,9). Chọn theo cả ngày, không chỉ buổi tập — chọn cao quá là lý do hay gặp nhất khiến không giảm được.</li>
					<li><b>Mục tiêu kcal</b> = TDEE ± tốc độ × 7.700 kcal / 7 ngày (1 kg mỡ ≈ 7.700 kcal). Giảm cân không xuống dưới BMR và 1.500 (nam) / 1.200 (nữ) kcal.</li>
					<li>
						<b>Đạm</b> 1,8 g/kg khi giảm hoặc tăng cân, 1,6 g/kg khi giữ cân (ISSN 2017) · <b>béo</b> 27% năng lượng · <b>glucid</b> phần còn lại ·
						<b>xơ</b> 14 g / 1.000 kcal · <b>natri</b> ≤ 2.000 mg (WHO).
					</li>
					<li>Đây là ước lượng — theo dõi cân 2–3 tuần rồi chỉnh: cân không đổi thì bớt ~150 kcal.</li>
				</ul>
			</UCard>
		</template>

		<BodyProfileSheet v-model:open="profileOpen" :profile="profile" :today="today" :saving="busy" @save="onSaveProfile" />
	</div>
</template>

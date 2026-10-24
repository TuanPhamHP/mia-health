<script setup lang="ts">
	/**
	 * Trang chủ = TÓM TẮT hôm nay của cả app: tập luyện · ăn uống · cơ thể. Mỗi thẻ chỉ giữ con số
	 * cần nhìn lướt + một hành động chính; chi tiết nằm ở trang riêng (/today, /diary, /body).
	 * Thống kê tập theo tuần / nhóm nằm ở Lịch sử.
	 */
	import { isoWeekday, localDateIso } from '#shared/utils/date';
	import { formatDate, weekdayLabel } from '~/utils/format';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Hôm nay';
	useHead({ title: 'Hôm nay — Mia Health' });

	const toast = useToast();
	const { overview, error: statsError, loadOverview } = useStats();
	const { plan, error: planError, load: loadPlan } = usePlan();
	const { day, error: mealError, load: loadDay } = useMealLog();
	const { body, error: bodyError, load: loadBody } = useBody();
	const { seedPresets, error: seedError } = useExercises();

	const todayIso = localDateIso();
	const loaded = ref(false);

	async function load() {
		await Promise.all([loadOverview(todayIso), loadPlan(todayIso), loadDay(todayIso), loadBody(todayIso)]);
		const message = statsError.value ?? planError.value ?? mealError.value ?? bodyError.value;
		if (message) toast.add({ title: 'Lỗi tải dữ liệu', description: message, color: 'error' });
		loaded.value = true;
	}
	onMounted(load);

	// Chưa có chương trình nào (kể cả chưa theo) ⇒ người dùng mới: mời thêm bộ mẫu.
	const isEmpty = computed(() => plan.value !== null && plan.value.programs.length === 0 && plan.value.idlePrograms.length === 0);

	const seeding = ref(false);
	async function seed() {
		seeding.value = true;
		const res = await seedPresets();
		seeding.value = false;
		if (!res) {
			toast.add({ title: 'Lỗi', description: seedError.value ?? undefined, color: 'error' });
			return;
		}
		toast.add({
			title: 'Đã thêm bộ mẫu',
			description: `${res.programsCreated} chương trình, ${res.routinesCreated} giáo án, ${res.exercisesCreated} bài tập`,
			color: 'success',
		});
		await load();
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<p class="px-1 text-xs text-(--ui-text-muted)">{{ weekdayLabel(isoWeekday(todayIso)) }}, {{ formatDate(todayIso) }}</p>

		<!-- Onboarding -->
		<UCard v-if="loaded && isEmpty">
			<div class="flex flex-col items-center gap-3 py-2 text-center">
				<span class="flex size-14 items-center justify-center rounded-2xl bg-(--ui-primary)/15">
					<UIcon name="i-heroicons-sparkles" class="size-8 text-(--ui-primary)" />
				</span>
				<p class="font-semibold text-(--ui-text-highlighted)">Chào mừng đến Mia Health</p>
				<p class="text-sm text-(--ui-text-muted)">
					Thêm bộ mẫu: chương trình "Giảm mỡ tại nhà" 8 tuần (tạ ấm, tạ tay, máy chạy bộ, 30–40 phút mỗi sáng), "Sàn chậu &amp; sinh lý nam" và hơn 60 bài tập — sửa lại theo ý bạn sau.
				</p>
				<UButton :loading="seeding" icon="i-heroicons-sparkles" @click="seed">Thêm bộ mẫu</UButton>
				<UButton variant="ghost" color="neutral" size="sm" to="/programs">Hoặc tự tạo chương trình</UButton>
			</div>
		</UCard>
		<div v-else-if="!plan" class="h-52 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		<HomeTrainingCard v-else :plan="plan" :overview="overview" :today="todayIso" />

		<div v-if="!day" class="h-40 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		<HomeMealsCard v-else :day="day" />

		<div v-if="!body" class="h-16 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		<HomeBodyCard v-else :body="body" :today="todayIso" />
	</div>
</template>

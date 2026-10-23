<script setup lang="ts">
	import type { CreateProgramInput } from '#shared/types/programs';
	import { localDateIso } from '#shared/utils/date';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Kế hoạch';
	useHead({ title: 'Chương trình — Mia Health' });

	const toast = useToast();
	const { programs, loading, error, list, create } = usePrograms();
	const { seedPresets, error: seedError } = useExercises();

	const today = localDateIso();
	const loaded = ref(false);

	async function load() {
		await list();
		if (error.value) toast.add({ title: 'Lỗi tải chương trình', description: error.value, color: 'error' });
		loaded.value = true;
	}
	onMounted(load);

	const following = computed(() => programs.value.filter((p) => p.startDate !== null));
	const idle = computed(() => programs.value.filter((p) => p.startDate === null));

	const sheetOpen = ref(false);
	const saving = ref(false);

	async function onCreate(input: CreateProgramInput) {
		saving.value = true;
		const saved = await create(input);
		saving.value = false;
		if (!saved) {
			toast.add({ title: 'Không tạo được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		sheetOpen.value = false;
		await navigateTo(`/programs/${saved.id}`);
	}

	const seeding = ref(false);
	async function seed() {
		seeding.value = true;
		const res = await seedPresets();
		seeding.value = false;
		if (!res) {
			toast.add({ title: 'Lỗi', description: seedError.value ?? undefined, color: 'error' });
			return;
		}
		const created = res.exercisesCreated + res.routinesCreated + res.programsCreated;
		toast.add(
			created === 0
				? { title: 'Đã đủ bộ mẫu', description: 'Không có bài, giáo án hay chương trình mẫu nào mới', color: 'neutral' }
				: {
						title: 'Đã thêm bộ mẫu',
						description: `${res.programsCreated} chương trình, ${res.routinesCreated} giáo án, ${res.exercisesCreated} bài tập mới`,
						color: 'success',
					},
		);
		await load();
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<PlanTabs />

		<UButton icon="i-heroicons-plus" @click="() => { sheetOpen = true }">Tạo chương trình</UButton>

		<template v-if="!loaded && loading">
			<div v-for="i in 2" :key="i" class="h-40 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="loaded && programs.length === 0">
			<div class="flex flex-col items-center gap-3 py-4 text-center">
				<UIcon name="i-heroicons-flag" class="size-10 text-(--ui-text-muted)" />
				<p class="text-sm text-(--ui-text-muted)">
					Chưa có chương trình nào. Dùng bộ mẫu ("Giảm mỡ tại nhà" 8 tuần, "Sàn chậu & sinh lý nam"…) hoặc tự tạo theo mục tiêu của bạn.
				</p>
				<UButton :loading="seeding" icon="i-heroicons-sparkles" @click="seed">Thêm chương trình mẫu</UButton>
			</div>
		</UCard>

		<section v-if="following.length > 0" class="space-y-2">
			<h2 class="pt-1 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">Đang theo · quyết định lịch Hôm nay</h2>
			<ProgramCard v-for="p in following" :key="p.id" :program="p" :today="today" />
		</section>

		<section v-if="idle.length > 0" class="space-y-2">
			<h2 class="pt-1 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">Chưa theo</h2>
			<ProgramCard v-for="p in idle" :key="p.id" :program="p" :today="today" />
		</section>

		<!-- Seed idempotent theo tên: bấm lại chỉ thêm phần mẫu mới, không đụng cái đã có -->
		<div v-if="loaded && programs.length > 0" class="flex justify-center pt-1">
			<UButton :loading="seeding" variant="ghost" color="neutral" size="sm" icon="i-heroicons-sparkles" @click="seed">
				Bổ sung mẫu còn thiếu
			</UButton>
		</div>

		<ProgramFormSheet v-model:open="sheetOpen" :program="null" :saving="saving" @save="onCreate" />
	</div>
</template>

<script setup lang="ts">
	import type { CreateRoutineInput } from '#shared/types/routines';
	import { formatDuration } from '~/utils/format';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Kế hoạch';
	useHead({ title: 'Giáo án — Mia Health' });

	const toast = useToast();
	const { routines, loading, error, list, create } = useRoutines();
	const { seedPresets, error: seedError } = useExercises();

	const showArchived = ref(false);
	const loaded = ref(false);

	async function load() {
		await list({ includeArchived: showArchived.value });
		if (error.value) toast.add({ title: 'Lỗi tải giáo án', description: error.value, color: 'error' });
		loaded.value = true;
	}
	onMounted(load);
	watch(showArchived, load);

	const sheetOpen = ref(false);
	const saving = ref(false);

	async function onCreate(input: CreateRoutineInput) {
		saving.value = true;
		const saved = await create(input);
		saving.value = false;
		if (!saved) {
			toast.add({ title: 'Không tạo được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		sheetOpen.value = false;
		await navigateTo(`/routines/${saved.id}`);
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
		toast.add(
			res.exercisesCreated + res.routinesCreated + res.programsCreated === 0
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

		<div class="flex items-center gap-2">
			<UButton icon="i-heroicons-plus" @click="() => { sheetOpen = true }">Tạo giáo án</UButton>
			<div class="flex-1" />
			<label class="flex items-center gap-2 text-xs text-(--ui-text-muted)">
				<USwitch v-model="showArchived" size="sm" />
				Đã lưu trữ
			</label>
		</div>

		<template v-if="!loaded && loading">
			<div v-for="i in 3" :key="i" class="h-36 rounded-xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="routines.length === 0">
			<div class="flex flex-col items-center gap-3 py-4 text-center">
				<UIcon name="i-heroicons-clipboard-document-list" class="size-10 text-(--ui-text-muted)" />
				<p class="text-sm text-(--ui-text-muted)">
					Giáo án là một buổi tập — danh sách bài theo thứ tự. Tạo mới hoặc dùng bộ mẫu, rồi nhặt vào lịch của một chương trình.
				</p>
				<UButton :loading="seeding" icon="i-heroicons-sparkles" @click="seed">Thêm giáo án mẫu</UButton>
			</div>
		</UCard>

		<UCard v-for="r in routines" :key="r.id" :class="r.isArchived ? 'opacity-60' : ''">
			<NuxtLink :to="`/routines/${r.id}`" class="block">
				<div class="flex items-start gap-3">
					<PreviewMosaic :previews="r.previews" class="size-16" />
					<div class="min-w-0 flex-1">
						<div class="flex items-start gap-2">
							<h3 class="min-w-0 flex-1 truncate font-semibold text-(--ui-text-highlighted)">{{ r.name }}</h3>
							<UBadge v-if="r.isArchived" color="neutral" variant="soft" size="sm">Lưu trữ</UBadge>
						</div>
						<p v-if="r.description" class="mt-0.5 line-clamp-2 text-sm text-(--ui-text-muted)">{{ r.description }}</p>
						<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--ui-text-muted)">
							<span class="flex items-center gap-1"><UIcon name="i-heroicons-list-bullet" class="size-3.5" />{{ r.itemCount }} bài</span>
							<span class="flex items-center gap-1"><UIcon name="i-heroicons-clock" class="size-3.5" />~{{ formatDuration(r.estimatedSec) }}</span>
						</div>
					</div>
				</div>
				<p class="mt-2 flex items-start gap-1.5 text-xs text-(--ui-text-dimmed)">
					<UIcon name="i-heroicons-flag" class="mt-0.5 size-3.5 shrink-0" />
					<span v-if="r.programs.length > 0">Trong lịch: {{ r.programs.map((p) => p.name).join(', ') }}</span>
					<span v-else>Chưa nằm trong lịch chương trình nào — chỉ tập khi tự chọn</span>
				</p>
			</NuxtLink>
			<UButton
				v-if="r.itemCount > 0 && !r.isArchived"
				block
				class="mt-3"
				icon="i-heroicons-play"
				:to="`/play?routine=${r.id}`"
			>
				Bắt đầu
			</UButton>
		</UCard>

		<!-- Seed idempotent theo tên: bấm lại chỉ thêm bài / giáo án mẫu mới, không đụng cái đã có -->
		<div v-if="loaded && routines.length > 0" class="flex justify-center pt-1">
			<UButton :loading="seeding" variant="ghost" color="neutral" size="sm" icon="i-heroicons-sparkles" @click="seed">
				Bổ sung mẫu còn thiếu
			</UButton>
		</div>

		<RoutineFormSheet v-model:open="sheetOpen" :routine="null" :saving="saving" @save="onCreate" />
	</div>
</template>

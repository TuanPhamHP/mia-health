<script setup lang="ts">
	import type { CreateExerciseInput, ExerciseCategory } from '#shared/types/exercises';
	import { coverOf } from '#shared/utils/media';
	import { foldText } from '~/utils/format';
	import {
		CATEGORY_ICONS,
		CATEGORY_LABELS,
		CATEGORY_ORDER,
		CATEGORY_TONES,
		COMBO_ICON,
		describeComponents,
		describeExercise,
	} from '~/utils/labels';

	const pageTitle = usePageTitle();
	pageTitle.value = 'Thư viện bài tập';
	useHead({ title: 'Bài tập — Mia Health' });

	const toast = useToast();
	const { exercises, loading, error, list, create, seedPresets } = useExercises();

	const filter = ref<ExerciseCategory | 'all'>('all');
	const search = ref('');
	const showArchived = ref(false);
	const loaded = ref(false);

	async function load() {
		await list({ includeArchived: showArchived.value });
		if (error.value) toast.add({ title: 'Lỗi tải bài tập', description: error.value, color: 'error' });
		loaded.value = true;
	}
	onMounted(load);
	watch(showArchived, load);

	// Tìm không dấu: "gap bung" khớp "Gập bụng"; bài kết hợp khớp cả theo tên bài con.
	const visible = computed(() => {
		const q = foldText(search.value.trim());
		return exercises.value.filter((e) => {
			if (filter.value !== 'all' && e.category !== filter.value) return false;
			if (!q) return true;
			const haystack = [e.name, ...e.components.map((c) => c.exercise.name)].map(foldText);
			return haystack.some((h) => h.includes(q));
		});
	});

	const groups = computed(() =>
		CATEGORY_ORDER.map((c) => ({ category: c, items: visible.value.filter((e) => e.category === c) })).filter(
			(g) => g.items.length > 0,
		),
	);

	const presentCategories = computed(() => CATEGORY_ORDER.filter((c) => exercises.value.some((e) => e.category === c)));

	// ---- Tạo mới (sửa / xoá nằm ở trang chi tiết) ----
	const sheetOpen = ref(false);
	const comboOpen = ref(false);
	const saving = ref(false);

	async function onCreate(input: CreateExerciseInput) {
		saving.value = true;
		const saved = await create(input);
		saving.value = false;
		if (!saved) {
			toast.add({ title: 'Không lưu được', description: error.value ?? undefined, color: 'error' });
			return;
		}
		sheetOpen.value = false;
		comboOpen.value = false;
		toast.add({
			title: input.mode === 'combo' ? 'Đã tạo bài kết hợp' : 'Đã thêm bài tập',
			description: 'Thêm ảnh hoặc video hướng dẫn ngay ở đây.',
			color: 'success',
		});
		await navigateTo(`/exercises/${saved.id}`);
	}

	const seeding = ref(false);
	async function seed() {
		seeding.value = true;
		const res = await seedPresets();
		seeding.value = false;
		if (!res) {
			toast.add({ title: 'Lỗi', description: error.value ?? undefined, color: 'error' });
			return;
		}
		toast.add({
			title: 'Đã thêm bộ mẫu',
			description: `${res.exercisesCreated} bài tập, ${res.routinesCreated} giáo án`,
			color: 'success',
		});
		await load();
	}
</script>

<template>
	<div class="py-4 space-y-3">
		<div class="flex items-center gap-2">
			<UButton icon="i-heroicons-plus" @click="() => { sheetOpen = true }">Bài tập</UButton>
			<UButton :icon="COMBO_ICON" variant="soft" @click="() => { comboOpen = true }">Kết hợp</UButton>
			<div class="flex-1" />
			<label class="flex items-center gap-2 text-xs text-(--ui-text-muted)">
				<USwitch v-model="showArchived" size="sm" />
				Lưu trữ
			</label>
		</div>

		<UInput
			v-if="exercises.length > 0"
			v-model="search"
			icon="i-heroicons-magnifying-glass"
			placeholder="Tìm bài tập…"
			class="w-full"
			:ui="{ base: 'text-base' }"
		>
			<template v-if="search" #trailing>
				<UButton color="neutral" variant="link" size="sm" icon="i-heroicons-x-circle" aria-label="Xoá tìm kiếm" @click="() => { search = '' }" />
			</template>
		</UInput>

		<div v-if="presentCategories.length > 1" class="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
			<UButton
				size="sm"
				:color="filter === 'all' ? 'primary' : 'neutral'"
				:variant="filter === 'all' ? 'solid' : 'soft'"
				class="shrink-0"
				@click="() => { filter = 'all' }"
			>
				Tất cả
			</UButton>
			<UButton
				v-for="c in presentCategories"
				:key="c"
				size="sm"
				:color="filter === c ? 'primary' : 'neutral'"
				:variant="filter === c ? 'solid' : 'soft'"
				:icon="CATEGORY_ICONS[c]"
				class="shrink-0"
				@click="() => { filter = c }"
			>
				{{ CATEGORY_LABELS[c] }}
			</UButton>
		</div>

		<template v-if="!loaded && loading">
			<div v-for="i in 5" :key="i" class="h-[72px] rounded-2xl bg-(--ui-bg-elevated) animate-pulse" />
		</template>

		<UCard v-else-if="exercises.length === 0">
			<div class="flex flex-col items-center gap-3 py-4 text-center">
				<UIcon name="i-heroicons-book-open" class="size-10 text-(--ui-text-muted)" />
				<p class="text-sm text-(--ui-text-muted)">
					Chưa có bài tập nào. Bắt đầu nhanh với bộ mẫu (Kegel, tạ ấm, tạ tay, máy chạy bộ, core, giãn cơ) rồi chỉnh theo ý bạn.
				</p>
				<UButton :loading="seeding" icon="i-heroicons-sparkles" @click="seed">Thêm bộ bài tập mẫu</UButton>
			</div>
		</UCard>

		<p v-else-if="groups.length === 0" class="py-8 text-center text-sm text-(--ui-text-muted)">
			Không có bài nào khớp "{{ search }}".
		</p>

		<section v-for="g in groups" :key="g.category" class="space-y-2">
			<h2 class="flex items-center gap-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">
				<span class="flex size-5 items-center justify-center rounded-md bg-(--tone)/15 text-(--tone)" :class="CATEGORY_TONES[g.category]">
					<UIcon :name="CATEGORY_ICONS[g.category]" class="size-3.5" />
				</span>
				{{ CATEGORY_LABELS[g.category] }}
				<span class="font-normal normal-case tracking-normal text-(--ui-text-dimmed)">· {{ g.items.length }}</span>
			</h2>
			<div
				v-for="e in g.items"
				:key="e.id"
				class="flex items-center gap-1 rounded-2xl border border-(--ui-border) p-2"
				:class="e.isArchived ? 'opacity-60' : ''"
			>
				<NuxtLink :to="`/exercises/${e.id}`" class="flex min-w-0 flex-1 items-center gap-3">
					<ExerciseThumb :cover="coverOf(e)" :category="e.category" :combo="e.mode === 'combo'" class="size-14" />
					<span class="min-w-0 flex-1">
						<span class="flex items-center gap-1.5">
							<span class="truncate font-medium text-(--ui-text-highlighted)">{{ e.name }}</span>
							<UBadge v-if="e.mode === 'combo'" size="sm" color="primary" variant="soft" class="shrink-0">Kết hợp</UBadge>
							<UBadge v-if="e.isArchived" size="sm" color="neutral" variant="soft" class="shrink-0">Lưu trữ</UBadge>
						</span>
						<span class="block truncate text-xs text-(--ui-text-muted)">{{ describeExercise(e, e) }}</span>
						<span v-if="e.mode === 'combo'" class="block truncate text-xs text-(--ui-text-dimmed)">
							{{ describeComponents(e.components) }}
						</span>
						<span v-else-if="e.media.length" class="flex items-center gap-1 text-[11px] text-(--ui-text-dimmed)">
							<UIcon name="i-heroicons-photo" class="size-3" />{{ e.media.length }} ảnh / video
						</span>
					</span>
				</NuxtLink>
				<UButton
					icon="i-heroicons-play"
					color="primary"
					variant="soft"
					size="md"
					class="rounded-full"
					:aria-label="`Tập thử ${e.name}`"
					:disabled="e.isArchived"
					:to="`/play?exercise=${e.id}`"
				/>
			</div>
		</section>

		<ExerciseFormSheet v-model:open="sheetOpen" :exercise="null" :saving="saving" @save="onCreate" />
		<ComboFormSheet v-model:open="comboOpen" :combo="null" :exercises="exercises" :saving="saving" @save="onCreate" />
	</div>
</template>

<script setup lang="ts">
	/**
	 * Ba mục của tab "Kế hoạch": Chương trình (mục tiêu + lịch theo tuần) → Giáo án (từng buổi
	 * tập) → Bài tập (thư viện). Dòng giải thích bên dưới để người dùng biết thứ nào quyết định
	 * "hôm nay tập gì".
	 */
	const route = useRoute();

	const TABS = [
		{
			label: 'Chương trình',
			to: '/programs',
			icon: 'i-heroicons-flag',
			hint: 'Chương trình = mục tiêu + lịch theo tuần, chia giai đoạn. Màn Hôm nay lấy buổi tập từ các chương trình đang theo.',
		},
		{
			label: 'Giáo án',
			to: '/routines',
			icon: 'i-heroicons-clipboard-document-list',
			hint: 'Giáo án = một buổi tập (danh sách bài). Muốn tập theo lịch thì nhặt giáo án vào ngày của một chương trình.',
		},
		{
			label: 'Bài tập',
			to: '/exercises',
			icon: 'i-heroicons-book-open',
			hint: 'Thư viện bài tập kèm ảnh / video hướng dẫn — soạn giáo án bằng cách nhặt bài từ đây.',
		},
	];

	const active = computed(() => TABS.find((t) => route.path.startsWith(t.to)) ?? TABS[0]!);
</script>

<template>
	<div class="space-y-1.5">
		<nav class="grid grid-cols-3 gap-1 rounded-xl bg-(--ui-bg-elevated) p-1" aria-label="Kế hoạch">
			<NuxtLink
				v-for="t in TABS"
				:key="t.to"
				:to="t.to"
				class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors"
				:class="active.to === t.to ? 'bg-(--ui-bg) text-(--ui-text-highlighted) shadow-sm' : 'text-(--ui-text-muted)'"
				:aria-current="active.to === t.to ? 'page' : undefined"
			>
				<UIcon :name="t.icon" class="size-4" />
				{{ t.label }}
			</NuxtLink>
		</nav>
		<p class="px-1 text-xs text-(--ui-text-dimmed)">{{ active.hint }}</p>
	</div>
</template>

<script setup lang="ts">
	/**
	 * Ảnh bìa của bài tập: ảnh / thumbnail YouTube nếu có, không thì ô màu theo nhóm + icon.
	 * Ảnh lỗi (link chết, hết phiên đăng nhập) cũng rơi về ô màu — không bao giờ hiện ảnh vỡ.
	 * Kích thước + bo góc do nơi dùng truyền qua class (`class="size-14"`).
	 */
	import type { ExerciseCategory } from '#shared/types/exercises';
	import type { Cover } from '#shared/utils/media';
	import { CATEGORY_ICONS, CATEGORY_TONES, COMBO_ICON } from '~/utils/labels';

	const props = defineProps<{ cover: Cover | null; category: ExerciseCategory; combo?: boolean }>();

	const failed = ref(false);
	watch(
		() => props.cover?.url,
		() => {
			failed.value = false;
		},
	);
	const showImage = computed(() => props.cover !== null && !failed.value);
</script>

<template>
	<span
		class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-(--tone)/15 text-(--tone)"
		:class="CATEGORY_TONES[category]"
	>
		<img
			v-if="showImage"
			:src="cover!.url"
			alt=""
			loading="lazy"
			decoding="async"
			class="absolute inset-0 size-full object-cover"
			@error="failed = true"
		>
		<UIcon v-else :name="combo ? COMBO_ICON : CATEGORY_ICONS[category]" class="size-[45%]" />
		<span v-if="showImage && cover!.video" class="absolute inset-0 flex items-center justify-center bg-black/25">
			<UIcon name="i-heroicons-play-solid" class="size-[38%] text-white drop-shadow" />
		</span>
	</span>
</template>

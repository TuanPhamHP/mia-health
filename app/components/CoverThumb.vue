<script setup lang="ts">
	/**
	 * Ảnh bìa vuông cho món ăn / thực phẩm / dòng media: ảnh (hoặc thumbnail YouTube kèm nút play);
	 * chưa có ảnh hay ảnh lỗi ⇒ emoji theo nhóm trên nền nhạt — không bao giờ hiện ảnh vỡ.
	 * Kích thước + bo góc do nơi dùng truyền qua class (`class="size-12"`).
	 */
	import type { Cover } from '#shared/utils/media';

	const props = defineProps<{ cover: Cover | null; emoji?: string }>();

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
	<span class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-(--ui-bg-elevated)">
		<img
			v-if="showImage"
			:src="cover!.url"
			alt=""
			loading="lazy"
			decoding="async"
			class="absolute inset-0 size-full object-cover"
			@error="failed = true"
		>
		<span v-else-if="emoji" class="text-[1.6em] leading-none" aria-hidden="true">{{ emoji }}</span>
		<UIcon v-else name="i-heroicons-photo" class="size-[45%] text-(--ui-text-dimmed)" />
		<span v-if="showImage && cover!.video" class="absolute inset-0 flex items-center justify-center bg-black/25">
			<UIcon name="i-heroicons-play-solid" class="size-[38%] text-white drop-shadow" />
		</span>
	</span>
</template>

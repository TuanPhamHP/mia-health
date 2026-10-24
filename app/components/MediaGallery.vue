<script setup lang="ts">
	/**
	 * Dải ảnh / video hướng dẫn vuốt ngang. YouTube nhúng kiểu "lite": chỉ hiện thumbnail, chạm
	 * mới nạp iframe — không kéo cả trình phát YouTube (~1 MB JS) cho mỗi lần mở trang. Chạm
	 * ảnh để xem toàn màn hình (zoom bằng hai ngón như ảnh thường). Ảnh có `credit` (ảnh mẫu
	 * giấy phép CC) hiện tác giả · giấy phép + link nguồn dưới dải — điều kiện của giấy phép.
	 */
	import type { PlanMedia } from '#shared/utils/timeline';
	import { parseYouTube, youtubeEmbedUrl, youtubeThumbUrl } from '#shared/utils/media';

	const props = defineProps<{ media: readonly (PlanMedia & { credit?: string | null; sourceUrl?: string | null })[] }>();

	const slides = computed(() =>
		props.media.map((m) => {
			const yt = m.kind === 'youtube' ? parseYouTube(m.url) : null;
			return { ...m, yt, thumb: yt ? youtubeThumbUrl(yt) : m.url };
		}),
	);

	const playing = ref<number | null>(null);
	const active = ref(0);
	const track = ref<HTMLElement | null>(null);
	const zoomed = ref<string | null>(null);

	function onScroll() {
		const el = track.value;
		if (el) active.value = Math.round(el.scrollLeft / el.clientWidth);
	}

	function goTo(i: number) {
		const el = track.value;
		if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
	}

	// Vuốt sang slide khác ⇒ dừng video đang phát (gỡ iframe).
	watch(active, (i) => {
		if (playing.value !== null && playing.value !== i) playing.value = null;
	});
</script>

<template>
	<div>
		<div
			ref="track"
			class="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-black/30"
			@scroll.passive="onScroll"
		>
			<figure v-for="(s, i) in slides" :key="i" class="relative aspect-video w-full shrink-0 snap-center">
				<template v-if="s.yt">
					<iframe
						v-if="playing === i"
						:src="youtubeEmbedUrl(s.yt, true)"
						:title="s.caption ?? 'Video hướng dẫn'"
						class="absolute inset-0 size-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					/>
					<button
						v-else
						type="button"
						class="group absolute inset-0"
						:aria-label="`Phát video${s.caption ? `: ${s.caption}` : ''}`"
						@click="() => { playing = i }"
					>
						<img :src="s.thumb" alt="" loading="lazy" class="size-full object-cover" >
						<span class="absolute inset-0 flex items-center justify-center bg-black/20">
							<span class="flex size-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-active:scale-95">
								<UIcon name="i-heroicons-play-solid" class="size-7 translate-x-0.5" />
							</span>
						</span>
					</button>
				</template>
				<button v-else type="button" class="absolute inset-0" aria-label="Xem ảnh toàn màn hình" @click="() => { zoomed = s.url }">
					<img :src="s.url" :alt="s.caption ?? ''" loading="lazy" class="size-full object-contain" >
				</button>
				<figcaption
					v-if="s.caption && playing !== i"
					class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-sm text-white"
				>
					{{ s.caption }}
				</figcaption>
			</figure>
		</div>

		<p v-if="slides[active]?.credit" class="mt-1 truncate px-1 text-[11px] text-(--ui-text-dimmed)">
			Ảnh:
			<a v-if="slides[active]!.sourceUrl" :href="slides[active]!.sourceUrl!" target="_blank" rel="noopener" class="underline">{{ slides[active]!.credit }}</a>
			<template v-else>{{ slides[active]!.credit }}</template>
		</p>
		<div v-if="slides.length > 1" class="mt-2 flex justify-center gap-1.5">
			<button
				v-for="(_, i) in slides"
				:key="i"
				type="button"
				class="h-1.5 rounded-full transition-all"
				:class="active === i ? 'w-5 bg-(--ui-primary)' : 'w-1.5 bg-(--ui-border-accented)'"
				:aria-label="`Ảnh ${i + 1}`"
				:aria-current="active === i"
				@click="goTo(i)"
			/>
		</div>

		<Teleport to="body">
			<div
				v-if="zoomed"
				class="fixed inset-0 z-[400] flex items-center justify-center bg-black/90"
				role="dialog"
				aria-label="Ảnh hướng dẫn"
				@click="() => { zoomed = null }"
			>
				<img :src="zoomed" alt="" class="max-h-full max-w-full object-contain" >
				<button
					type="button"
					class="absolute right-3 flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
					:style="{ top: 'calc(12px + env(safe-area-inset-top, 0px))' }"
					aria-label="Đóng"
				>
					<UIcon name="i-heroicons-x-mark" class="size-6" />
				</button>
			</div>
		</Teleport>
	</div>
</template>

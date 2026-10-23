<script setup lang="ts">
	/**
	 * Quản lý ảnh / video của một bài: tải ảnh từ máy (chụp hoặc chọn — thu nhỏ + xoá EXIF trước
	 * khi gửi), dán link ảnh hoặc YouTube (server tự nhận loại), sửa chú thích, đổi thứ tự, xoá.
	 * Mỗi thao tác gọi API ngay và phát `update` với bài tập mới nhất — trang cha gán thẳng.
	 */
	import type { ExerciseDTO, ExerciseMediaDTO } from '#shared/types/exercises';
	import { mediaThumb, parseYouTube } from '#shared/utils/media';
	import { prepareImage } from '~/utils/image';

	const open = defineModel<boolean>('open', { default: false });
	const props = defineProps<{ exercise: ExerciseDTO }>();
	const emit = defineEmits<{ update: [exercise: ExerciseDTO] }>();

	const MAX_MEDIA = 10; // khớp MAX_MEDIA_PER_EXERCISE ở server

	const api = useExercises();
	const toast = useToast();

	const busy = ref(false);
	const progress = ref<string | null>(null);
	const link = ref('');
	const fileInput = ref<HTMLInputElement | null>(null);
	const captions = reactive<Record<number, string>>({});

	// Chỉ nạp chú thích cho media mới — không ghi đè ô đang gõ dở khi danh sách cập nhật.
	watch(
		() => props.exercise.media,
		(list) => {
			for (const m of list) if (!(m.id in captions)) captions[m.id] = m.caption ?? '';
		},
		{ immediate: true },
	);

	const remaining = computed(() => MAX_MEDIA - props.exercise.media.length);
	const linkKind = computed(() => {
		const v = link.value.trim();
		if (!v) return null;
		return parseYouTube(v) ? 'youtube' : 'image';
	});

	function done(saved: ExerciseDTO | null): boolean {
		if (!saved) {
			toast.add({ title: 'Có lỗi', description: api.error.value ?? undefined, color: 'error' });
			return false;
		}
		emit('update', saved);
		return true;
	}

	async function onFiles(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = [...(input.files ?? [])].slice(0, remaining.value);
		input.value = ''; // chọn lại đúng file đó vẫn kích hoạt change
		if (files.length === 0) return;
		busy.value = true;
		try {
			for (const [i, file] of files.entries()) {
				progress.value = files.length > 1 ? `Đang tải ${i + 1}/${files.length}…` : 'Đang tải ảnh…';
				let image: Blob;
				try {
					image = await prepareImage(file);
				} catch (err) {
					toast.add({ title: `Bỏ qua "${file.name}"`, description: err instanceof Error ? err.message : undefined, color: 'error' });
					continue;
				}
				if (!done(await api.uploadMedia(props.exercise.id, image))) break;
			}
		} finally {
			busy.value = false;
			progress.value = null;
		}
	}

	async function addLink() {
		if (!linkKind.value) return;
		busy.value = true;
		const saved = await api.addMediaLink(props.exercise.id, { url: link.value.trim() });
		busy.value = false;
		if (done(saved)) link.value = '';
	}

	async function saveCaption(m: ExerciseMediaDTO) {
		const value = (captions[m.id] ?? '').trim();
		if (value === (m.caption ?? '')) return;
		done(await api.updateMedia(props.exercise.id, m.id, { caption: value || null }));
	}

	async function move(index: number, dir: -1 | 1) {
		const ids = props.exercise.media.map((m) => m.id);
		const target = index + dir;
		if (target < 0 || target >= ids.length) return;
		[ids[index], ids[target]] = [ids[target]!, ids[index]!];
		busy.value = true;
		done(await api.reorderMedia(props.exercise.id, ids));
		busy.value = false;
	}

	async function remove(m: ExerciseMediaDTO) {
		const what = m.kind === 'youtube' ? 'video' : 'ảnh';
		if (!confirm(`Xoá ${what} này khỏi bài tập?${m.storageKey ? ' Ảnh tải lên sẽ bị xoá hẳn.' : ''}`)) return;
		busy.value = true;
		done(await api.removeMedia(props.exercise.id, m.id));
		busy.value = false;
	}

	function sourceLabel(m: ExerciseMediaDTO): string {
		if (m.kind === 'youtube') return 'Video YouTube';
		return m.storageKey ? 'Ảnh tải lên' : 'Ảnh từ link';
	}
</script>

<template>
	<AppSheet v-model:open="open" title="Ảnh & video hướng dẫn" :subtitle="exercise.name">
		<div class="space-y-4">
			<div class="space-y-2">
				<UButton
					block
					size="lg"
					icon="i-heroicons-camera"
					:loading="busy && progress !== null"
					:disabled="busy || remaining <= 0"
					@click="fileInput?.click()"
				>
					{{ progress ?? 'Chụp / chọn ảnh từ máy' }}
				</UButton>
				<input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFiles" >

				<form class="flex gap-2" @submit.prevent="addLink">
					<UInput
						v-model="link"
						icon="i-heroicons-link"
						placeholder="Dán link ảnh hoặc YouTube…"
						inputmode="url"
						class="min-w-0 flex-1"
						:ui="{ base: 'text-base' }"
					/>
					<UButton type="submit" variant="soft" :disabled="!linkKind || busy || remaining <= 0">Thêm</UButton>
				</form>
				<p class="text-xs text-(--ui-text-muted)">
					<template v-if="remaining <= 0">Đã đủ {{ MAX_MEDIA }} ảnh / video — xoá bớt để thêm.</template>
					<template v-else-if="linkKind === 'youtube'">Nhận ra video YouTube — giữ được mốc thời gian (?t=…).</template>
					<template v-else-if="linkKind === 'image'">Sẽ thêm như link ảnh (https).</template>
					<template v-else>Ảnh được thu nhỏ và xoá thông tin vị trí trước khi tải lên. Link YouTube phát ngay trong app.</template>
				</p>
			</div>

			<div v-if="exercise.media.length" class="space-y-2">
				<div
					v-for="(m, idx) in exercise.media"
					:key="m.id"
					class="flex items-start gap-3 rounded-xl border border-(--ui-border) p-2"
				>
					<ExerciseThumb :cover="mediaThumb(m)" :category="exercise.category" class="size-16" />
					<div class="min-w-0 flex-1 space-y-1">
						<p class="flex items-center gap-1 text-xs text-(--ui-text-muted)">
							<span v-if="idx === 0" class="font-medium text-(--ui-primary)">Ảnh bìa ·</span>
							{{ sourceLabel(m) }}
						</p>
						<UInput
							v-model="captions[m.id]"
							placeholder="Chú thích (tuỳ chọn)"
							class="w-full"
							:ui="{ base: 'text-base' }"
							@blur="saveCaption(m)"
							@keydown.enter.prevent="saveCaption(m)"
						/>
					</div>
					<div class="flex shrink-0 flex-col">
						<UButton icon="i-heroicons-chevron-up" color="neutral" variant="ghost" size="xs" :disabled="busy || idx === 0" aria-label="Lên" @click="move(idx, -1)" />
						<UButton icon="i-heroicons-chevron-down" color="neutral" variant="ghost" size="xs" :disabled="busy || idx === exercise.media.length - 1" aria-label="Xuống" @click="move(idx, 1)" />
						<UButton icon="i-heroicons-trash" color="error" variant="ghost" size="xs" :disabled="busy" aria-label="Xoá" @click="remove(m)" />
					</div>
				</div>
			</div>
			<p v-else class="rounded-xl border border-dashed border-(--ui-border-accented) py-6 text-center text-sm text-(--ui-text-muted)">
				Chưa có ảnh hay video nào.
			</p>
		</div>
	</AppSheet>
</template>

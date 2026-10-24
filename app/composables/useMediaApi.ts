import { ref } from 'vue';
import type { AddMediaLinkInput, MediaKind, UpdateMediaInput } from '#shared/types/exercises';
import { createRunner } from '~/utils/api';

/** Chủ có ảnh — API cùng dạng `/api/<owner>/<id>/media…`, mọi thao tác trả DTO mới nhất của chủ. */
export type MediaOwnerPath = 'exercises' | 'dishes' | 'foods';

/** Phần chung của ExerciseMediaDTO / NutritionMediaDTO mà sheet quản lý ảnh cần. */
export interface ManagedMedia {
	id: number;
	kind: MediaKind;
	url: string;
	storageKey: string | null;
	caption: string | null;
	credit?: string | null;
}

export function useMediaApi<T>(owner: MediaOwnerPath) {
	const loading = ref(false);
	const error = ref<string | null>(null);
	const run = createRunner(loading, error);
	const base = (id: number) => `/api/${owner}/${id}/media`;
	// $fetch suy kiểu trả về theo route; ở đây URL dựng động và T do nơi gọi chọn ⇒ ép một lần tại đây.
	const call = (url: string, opts?: Parameters<typeof $fetch>[1]) => $fetch(url, opts) as unknown as Promise<T>;

	function upload(id: number, image: Blob, caption?: string): Promise<T | null> {
		const form = new FormData();
		form.append('file', image, `upload.${image.type.split('/')[1] ?? 'bin'}`);
		if (caption) form.append('caption', caption);
		return run(() => call(`${base(id)}/upload`, { method: 'POST', body: form }));
	}

	const addLink = (id: number, input: AddMediaLinkInput) => run(() => call(base(id), { method: 'POST', body: input }));

	const update = (id: number, mediaId: number, input: UpdateMediaInput) =>
		run(() => call(`${base(id)}/${mediaId}`, { method: 'PATCH', body: input }));

	const remove = (id: number, mediaId: number) => run(() => call(`${base(id)}/${mediaId}`, { method: 'DELETE' }));

	const reorder = (id: number, mediaIds: number[]) =>
		run(() => call(`${base(id)}/reorder`, { method: 'POST', body: { mediaIds } }));

	return { loading, error, upload, addLink, update, remove, reorder };
}

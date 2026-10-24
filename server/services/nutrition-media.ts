import * as repo from '../repositories/nutrition-media';
import * as mediaSvc from './media';
import { mediaThumb, parseYouTube, youtubeWatchUrl } from '../../shared/utils/media';
import type { Cover } from '../../shared/utils/media';
import type { MediaOwner, MediaOwnerKind, NutritionMediaRow } from '../repositories/nutrition-media';

// Ảnh / video của món ăn và thực phẩm — cùng luật với ảnh bài tập (services/media.ts): ghi R2
// trước, row sau; xoá row xong mới dọn R2 (lỗi chỉ log). Route handler đi qua service của chủ
// (dishes / foods) để trả DTO mới nhất; file này không import hai service đó để khỏi vòng.

export const MAX_MEDIA_PER_OWNER = 10;

const OWNER_PREFIX: Record<MediaOwnerKind, string> = { dish: 'dishes', food: 'foods' };
const OWNER_LABEL: Record<MediaOwnerKind, string> = { dish: 'món', food: 'thực phẩm' };

/** ownerId → media theo thứ tự; `ids` bỏ trống = mọi chủ cùng loại. */
export async function mediaByOwner(kind: MediaOwnerKind, ids?: number[]): Promise<Map<number, NutritionMediaRow[]>> {
	const rows = await repo.listMedia(kind, ids === undefined ? undefined : [...new Set(ids)]);
	const byOwner = new Map<number, NutritionMediaRow[]>();
	for (const row of rows) {
		const id = (kind === 'dish' ? row.dishId : row.foodId)!;
		byOwner.set(id, [...(byOwner.get(id) ?? []), row]);
	}
	return byOwner;
}

/** Ảnh bìa = media đầu tiên dựng được ảnh (ảnh, hoặc thumbnail YouTube). */
export function coverOf(media: readonly NutritionMediaRow[] | undefined): Cover | null {
	for (const m of media ?? []) {
		const cover = mediaThumb(m);
		if (cover) return cover;
	}
	return null;
}

export async function coversByOwner(kind: MediaOwnerKind, ids?: number[]): Promise<Map<number, Cover>> {
	const covers = new Map<number, Cover>();
	for (const [id, media] of await mediaByOwner(kind, ids)) {
		const cover = coverOf(media);
		if (cover) covers.set(id, cover);
	}
	return covers;
}

const ownerFields = (owner: MediaOwner) => ({
	dishId: owner.kind === 'dish' ? owner.id : null,
	foodId: owner.kind === 'food' ? owner.id : null,
});

async function nextPosition(owner: MediaOwner): Promise<number> {
	const ids = await repo.listMediaIds(owner);
	if (ids.length >= MAX_MEDIA_PER_OWNER) {
		throw createError({ statusCode: 400, message: `Mỗi ${OWNER_LABEL[owner.kind]} tối đa ${MAX_MEDIA_PER_OWNER} ảnh / video` });
	}
	return (await repo.maxPosition(owner)) + 1;
}

const cleanCaption = (caption: string | null | undefined): string | null => caption?.trim() || null;

export async function addUpload(owner: MediaOwner, data: Uint8Array, caption: string | null) {
	const position = await nextPosition(owner);
	const { key, url } = await mediaSvc.storeImage(`${OWNER_PREFIX[owner.kind]}/${owner.id}`, data);
	try {
		await repo.createMedia({ ...ownerFields(owner), position, kind: 'image', url, storageKey: key, caption: cleanCaption(caption) });
	} catch (err) {
		await mediaSvc.deleteObjectsQuietly([key]);
		throw err;
	}
}

export async function addLink(owner: MediaOwner, data: { url: string; caption?: string | null }) {
	const position = await nextPosition(owner);
	const yt = parseYouTube(data.url);
	await repo.createMedia({
		...ownerFields(owner),
		position,
		kind: yt ? 'youtube' : 'image',
		url: yt ? youtubeWatchUrl(yt) : data.url.trim(),
		storageKey: null,
		caption: cleanCaption(data.caption),
	});
}

async function requireMediaOf(owner: MediaOwner, mediaId: number) {
	const media = await repo.getMediaById(mediaId);
	const ownerId = owner.kind === 'dish' ? media?.dishId : media?.foodId;
	if (!media || ownerId !== owner.id) throw createError({ statusCode: 404, message: 'Ảnh / video không tồn tại' });
	return media;
}

export async function editMedia(owner: MediaOwner, mediaId: number, data: { caption: string | null }) {
	await requireMediaOf(owner, mediaId);
	await repo.updateMedia(mediaId, { caption: cleanCaption(data.caption) });
}

export async function removeMedia(owner: MediaOwner, mediaId: number) {
	const media = await requireMediaOf(owner, mediaId);
	await repo.removeMedia(mediaId);
	if (media.storageKey) await mediaSvc.deleteObjectsQuietly([media.storageKey]);
}

// Hoán vị ĐÚNG của các media hiện có — cùng lý do với reorder item giáo án.
export async function reorderMedia(owner: MediaOwner, mediaIds: number[]) {
	const current = await repo.listMediaIds(owner);
	const sameSet =
		mediaIds.length === current.length && new Set(mediaIds).size === mediaIds.length && mediaIds.every((id) => current.includes(id));
	if (!sameSet) {
		throw createError({ statusCode: 400, message: `mediaIds phải chứa đúng và đủ ảnh / video hiện có của ${OWNER_LABEL[owner.kind]}` });
	}
	await repo.reorderMedia(owner, mediaIds);
}

/** Lấy TRƯỚC khi xoá chủ — CASCADE xoá row thì không còn biết key nào để dọn R2. */
export function storageKeysOf(owner: MediaOwner): Promise<string[]> {
	return repo.listStorageKeys(owner);
}

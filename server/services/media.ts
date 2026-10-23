import * as repo from '../repositories/media';
import { parseYouTube, youtubeWatchUrl } from '../../shared/utils/media';
import type { MediaRow } from '../repositories/media';
import type { ExerciseMediaComputed } from '../types/exercises';

// Module con của exercises: route handler đi qua exercises service (trả ExerciseDTO mới nhất,
// như item giáo án trả RoutineDetailDTO); file này không import exercises service để khỏi vòng.

export const MAX_MEDIA_PER_EXERCISE = 10;
// Client đã thu nhỏ ảnh (~100–300 KB) trước khi gửi — trần này chỉ chặn file thô bất thường.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Chỉ phục vụ đúng dạng key do app sinh: chặn path traversal và dò key lạ trong bucket.
const KEY_PATTERN = /^exercises\/\d+\/[0-9a-f-]{36}\.(webp|jpg|png|gif)$/;

const IMAGE_SIGNATURES: { type: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
	{ type: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	{ type: 'image/png', ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
	{ type: 'image/gif', ext: 'gif', test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
	{
		type: 'image/webp',
		ext: 'webp',
		test: (b) => String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP',
	},
];

/** Nhận định dạng từ magic bytes — KHÔNG tin Content-Type client gửi. */
function sniffImage(data: Uint8Array) {
	return IMAGE_SIGNATURES.find((s) => s.test(data)) ?? null;
}

const toComputed = (row: MediaRow): ExerciseMediaComputed => row;

/** exerciseId → media theo thứ tự. */
export async function mediaByExercise(exerciseIds: number[]): Promise<Map<number, ExerciseMediaComputed[]>> {
	const rows = await repo.listMedia([...new Set(exerciseIds)]);
	const byExercise = new Map<number, ExerciseMediaComputed[]>();
	for (const row of rows) {
		const list = byExercise.get(row.exerciseId) ?? [];
		list.push(toComputed(row));
		byExercise.set(row.exerciseId, list);
	}
	return byExercise;
}

async function nextPosition(exerciseId: number): Promise<number> {
	const ids = await repo.listMediaIds(exerciseId);
	if (ids.length >= MAX_MEDIA_PER_EXERCISE) {
		throw createError({ statusCode: 400, message: `Mỗi bài tối đa ${MAX_MEDIA_PER_EXERCISE} ảnh / video` });
	}
	return (await repo.maxPosition(exerciseId)) + 1;
}

function cleanCaption(caption: string | null | undefined): string | null {
	return caption?.trim() || null;
}

export async function addUpload(exerciseId: number, data: Uint8Array, caption: string | null) {
	if (data.byteLength > MAX_UPLOAD_BYTES) {
		throw createError({ statusCode: 413, message: 'Ảnh quá lớn (tối đa 5 MB)' });
	}
	const image = sniffImage(data);
	if (!image) throw createError({ statusCode: 400, message: 'Chỉ nhận ảnh JPEG, PNG, WebP hoặc GIF' });
	const position = await nextPosition(exerciseId);

	const key = `exercises/${exerciseId}/${crypto.randomUUID()}.${image.ext}`;
	await repo.putObject(key, data, image.type);
	// Ghi R2 trước, D1 sau: row lỗi thì xoá object vừa ghi — không để row trỏ vào file không có.
	try {
		await repo.createMedia({
			exerciseId,
			position,
			kind: 'image',
			url: `/media/${key}`,
			storageKey: key,
			caption: cleanCaption(caption),
		});
	} catch (err) {
		await deleteObjectsQuietly([key]);
		throw err;
	}
}

export async function addLink(exerciseId: number, data: { url: string; caption?: string | null }) {
	const position = await nextPosition(exerciseId);
	const yt = parseYouTube(data.url);
	await repo.createMedia({
		exerciseId,
		position,
		kind: yt ? 'youtube' : 'image',
		url: yt ? youtubeWatchUrl(yt) : data.url.trim(),
		storageKey: null,
		caption: cleanCaption(data.caption),
	});
}

async function requireMediaOf(exerciseId: number, mediaId: number) {
	const media = await repo.getMediaById(mediaId);
	if (!media || media.exerciseId !== exerciseId) {
		throw createError({ statusCode: 404, message: 'Ảnh / video không tồn tại' });
	}
	return media;
}

export async function editMedia(exerciseId: number, mediaId: number, data: { caption: string | null }) {
	await requireMediaOf(exerciseId, mediaId);
	await repo.updateMedia(mediaId, { caption: cleanCaption(data.caption) });
}

export async function removeMedia(exerciseId: number, mediaId: number) {
	const media = await requireMediaOf(exerciseId, mediaId);
	await repo.removeMedia(mediaId);
	if (media.storageKey) await deleteObjectsQuietly([media.storageKey]);
}

// Hoán vị ĐÚNG của các media hiện có — cùng lý do với reorder item giáo án.
export async function reorderMedia(exerciseId: number, mediaIds: number[]) {
	const current = await repo.listMediaIds(exerciseId);
	const sameSet =
		mediaIds.length === current.length &&
		new Set(mediaIds).size === mediaIds.length &&
		mediaIds.every((id) => current.includes(id));
	if (!sameSet) {
		throw createError({ statusCode: 400, message: 'mediaIds phải chứa đúng và đủ ảnh / video hiện có của bài' });
	}
	await repo.reorderMedia(exerciseId, mediaIds);
}

/** Lấy trước khi xoá bài tập — CASCADE xoá row thì không còn biết key nào để dọn R2. */
export function storageKeysOf(exerciseId: number): Promise<string[]> {
	return repo.listStorageKeys(exerciseId);
}

// Row đã xoá xong thì việc dọn R2 lỗi KHÔNG được làm request thất bại (người dùng tưởng chưa
// xoá được) — object mồ côi chỉ tốn chỗ, không ai trỏ tới.
export async function deleteObjectsQuietly(keys: string[]) {
	if (keys.length === 0) return;
	try {
		await repo.deleteObjects(keys);
	} catch (err) {
		console.warn('[media] không xoá được object R2', keys, err);
	}
}

export async function getObject(key: string) {
	if (!KEY_PATTERN.test(key)) throw createError({ statusCode: 404, message: 'Không tìm thấy ảnh' });
	const obj = await repo.getObject(key);
	if (!obj) throw createError({ statusCode: 404, message: 'Không tìm thấy ảnh' });
	return obj;
}

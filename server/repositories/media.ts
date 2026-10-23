import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { exerciseMedia } from '../database/schema';
import type { NewExerciseMedia } from '../database/schema';

// --- D1 ---

// Bỏ created_at: DTO không cần, và Serialized<> không đi sâu vào mảng lồng (xem server/types).
const mediaColumns = {
	id: exerciseMedia.id,
	exerciseId: exerciseMedia.exerciseId,
	position: exerciseMedia.position,
	kind: exerciseMedia.kind,
	url: exerciseMedia.url,
	storageKey: exerciseMedia.storageKey,
	caption: exerciseMedia.caption,
};

export type MediaRow = Awaited<ReturnType<typeof listMedia>>[number];

export async function listMedia(exerciseIds: number[]) {
	if (exerciseIds.length === 0) return [];
	const db = useDB();
	const parts = await Promise.all(
		chunk(exerciseIds, D1_MAX_PARAMS - 10).map((ids) =>
			db
				.select(mediaColumns)
				.from(exerciseMedia)
				.where(inArray(exerciseMedia.exerciseId, ids))
				.orderBy(asc(exerciseMedia.exerciseId), asc(exerciseMedia.position), asc(exerciseMedia.id)),
		),
	);
	return parts.flat();
}

export async function getMediaById(id: number) {
	const rows = await useDB().select(mediaColumns).from(exerciseMedia).where(eq(exerciseMedia.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function listMediaIds(exerciseId: number): Promise<number[]> {
	const rows = await useDB()
		.select({ id: exerciseMedia.id })
		.from(exerciseMedia)
		.where(eq(exerciseMedia.exerciseId, exerciseId));
	return rows.map((r) => r.id);
}

export async function listStorageKeys(exerciseId: number): Promise<string[]> {
	const rows = await useDB()
		.select({ key: exerciseMedia.storageKey })
		.from(exerciseMedia)
		.where(and(eq(exerciseMedia.exerciseId, exerciseId), isNotNull(exerciseMedia.storageKey)));
	return rows.map((r) => r.key).filter((k): k is string => k !== null);
}

export async function maxPosition(exerciseId: number): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${exerciseMedia.position})` })
		.from(exerciseMedia)
		.where(eq(exerciseMedia.exerciseId, exerciseId));
	return rows[0]?.max ?? -1;
}

export async function createMedia(data: Omit<NewExerciseMedia, 'id' | 'createdAt'>) {
	const db = useDB();
	const result = await db.insert(exerciseMedia).values(data).run();
	const saved = await getMediaById(getLastRowId(result));
	if (!saved) throw new Error('Media insert failed — row not found after insert');
	return saved;
}

export async function updateMedia(id: number, data: { caption: string | null }) {
	await useDB().update(exerciseMedia).set(data).where(eq(exerciseMedia.id, id));
}

export async function removeMedia(id: number) {
	await useDB().delete(exerciseMedia).where(eq(exerciseMedia.id, id));
}

/** Ghi lại position = thứ tự trong `mediaIds`. Một batch = một transaction ở D1. */
export async function reorderMedia(exerciseId: number, mediaIds: number[]) {
	const db = useDB();
	const [first, ...rest] = mediaIds.map((id, position) =>
		db
			.update(exerciseMedia)
			.set({ position })
			.where(and(eq(exerciseMedia.id, id), eq(exerciseMedia.exerciseId, exerciseId))),
	);
	if (first) await db.batch([first, ...rest]);
}

// --- R2 ---

export async function putObject(key: string, data: Uint8Array, contentType: string) {
	await useMediaBucket().put(key, data, { httpMetadata: { contentType } });
}

export async function getObject(key: string) {
	const obj = await useMediaBucket().get(key);
	if (!obj) return null;
	return {
		body: new Uint8Array(await obj.arrayBuffer()),
		contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream',
		etag: obj.httpEtag,
	};
}

export async function deleteObjects(keys: string[]) {
	// R2 delete nhận tối đa 1000 key mỗi lần.
	for (const part of chunk(keys, 1000)) await useMediaBucket().delete(part);
}

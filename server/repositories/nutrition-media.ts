import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { nutritionMedia } from '../database/schema';
import type { NewNutritionMedia } from '../database/schema';

/** Chủ của ảnh: món ăn hoặc thực phẩm. */
export type MediaOwnerKind = 'dish' | 'food';
export interface MediaOwner {
	kind: MediaOwnerKind;
	id: number;
}

const ownerColumn = (kind: MediaOwnerKind) => (kind === 'dish' ? nutritionMedia.dishId : nutritionMedia.foodId);

// Bỏ created_at như exercise_media: DTO không cần.
const mediaColumns = {
	id: nutritionMedia.id,
	dishId: nutritionMedia.dishId,
	foodId: nutritionMedia.foodId,
	position: nutritionMedia.position,
	kind: nutritionMedia.kind,
	url: nutritionMedia.url,
	storageKey: nutritionMedia.storageKey,
	caption: nutritionMedia.caption,
	credit: nutritionMedia.credit,
	sourceUrl: nutritionMedia.sourceUrl,
};

export type NutritionMediaRow = NonNullable<Awaited<ReturnType<typeof getMediaById>>>;

/**
 * Media theo thứ tự của các chủ `ids`; `ids` bỏ trống = mọi chủ cùng loại (danh sách thực phẩm
 * cần ảnh bìa của ~600 dòng — bảng media nhỏ, một câu rẻ hơn 7 câu `inArray` cắt lô).
 */
export async function listMedia(kind: MediaOwnerKind, ids?: number[]) {
	const col = ownerColumn(kind);
	const db = useDB();
	const order = [asc(col), asc(nutritionMedia.position), asc(nutritionMedia.id)];
	if (ids === undefined) return db.select(mediaColumns).from(nutritionMedia).where(isNotNull(col)).orderBy(...order);
	if (ids.length === 0) return [];
	const parts = await Promise.all(
		chunk(ids, D1_MAX_PARAMS - 10).map((part) => db.select(mediaColumns).from(nutritionMedia).where(inArray(col, part)).orderBy(...order)),
	);
	return parts.flat();
}

export async function getMediaById(id: number) {
	const rows = await useDB().select(mediaColumns).from(nutritionMedia).where(eq(nutritionMedia.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function listMediaIds(owner: MediaOwner): Promise<number[]> {
	const rows = await useDB()
		.select({ id: nutritionMedia.id })
		.from(nutritionMedia)
		.where(eq(ownerColumn(owner.kind), owner.id));
	return rows.map((r) => r.id);
}

export async function listStorageKeys(owner: MediaOwner): Promise<string[]> {
	const rows = await useDB()
		.select({ key: nutritionMedia.storageKey })
		.from(nutritionMedia)
		.where(and(eq(ownerColumn(owner.kind), owner.id), isNotNull(nutritionMedia.storageKey)));
	return rows.map((r) => r.key).filter((k): k is string => k !== null);
}

export async function maxPosition(owner: MediaOwner): Promise<number> {
	const rows = await useDB()
		.select({ max: sql<number | null>`MAX(${nutritionMedia.position})` })
		.from(nutritionMedia)
		.where(eq(ownerColumn(owner.kind), owner.id));
	return rows[0]?.max ?? -1;
}

export async function createMedia(data: Omit<NewNutritionMedia, 'id' | 'createdAt'>) {
	const result = await useDB().insert(nutritionMedia).values(data).run();
	const saved = await getMediaById(getLastRowId(result));
	if (!saved) throw new Error('Media insert failed — row not found after insert');
	return saved;
}

export async function updateMedia(id: number, data: { caption: string | null }) {
	await useDB().update(nutritionMedia).set(data).where(eq(nutritionMedia.id, id));
}

export async function removeMedia(id: number) {
	await useDB().delete(nutritionMedia).where(eq(nutritionMedia.id, id));
}

/** Ghi lại position = thứ tự trong `mediaIds`. Một batch = một transaction ở D1. */
export async function reorderMedia(owner: MediaOwner, mediaIds: number[]) {
	const db = useDB();
	const col = ownerColumn(owner.kind);
	const [first, ...rest] = mediaIds.map((id, position) =>
		db
			.update(nutritionMedia)
			.set({ position })
			.where(and(eq(nutritionMedia.id, id), eq(col, owner.id))),
	);
	if (first) await db.batch([first, ...rest]);
}

import { desc, eq } from 'drizzle-orm';
import { bodyProfile, bodyWeights } from '../database/schema';
import type { BodyProfile } from '../database/schema';

// --- Hồ sơ (một dòng, id = 1) ---

export async function getProfile(): Promise<BodyProfile | null> {
	const rows = await useDB().select().from(bodyProfile).where(eq(bodyProfile.id, 1)).limit(1);
	return rows[0] ?? null;
}

export async function upsertProfile(data: Omit<BodyProfile, 'id' | 'updatedAt'>) {
	const row = { ...data, updatedAt: new Date() };
	await useDB()
		.insert(bodyProfile)
		.values({ id: 1, ...row })
		.onConflictDoUpdate({ target: bodyProfile.id, set: row });
}

// --- Cân nặng (mỗi ngày một dòng) ---

export function listWeights(limit: number) {
	return useDB().select().from(bodyWeights).orderBy(desc(bodyWeights.date)).limit(limit);
}

export async function getWeightById(id: number) {
	const rows = await useDB().select().from(bodyWeights).where(eq(bodyWeights.id, id)).limit(1);
	return rows[0] ?? null;
}

/** Cân lại trong cùng ngày ⇒ ghi đè (unique theo date). */
export async function upsertWeight(date: string, weightKg: number) {
	await useDB()
		.insert(bodyWeights)
		.values({ date, weightKg })
		.onConflictDoUpdate({ target: bodyWeights.date, set: { weightKg, updatedAt: new Date() } });
}

export async function removeWeight(id: number) {
	await useDB().delete(bodyWeights).where(eq(bodyWeights.id, id));
}

import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { sessionEntries, workoutSessions } from '../database/schema';

export function dailyAggregate(from: string, to: string) {
	return useDB()
		.select({
			date: workoutSessions.date,
			sessions: sql<number>`COUNT(*)`,
			durationSec: sql<number>`COALESCE(SUM(${workoutSessions.durationSec}), 0)`,
		})
		.from(workoutSessions)
		.where(and(gte(workoutSessions.date, from), lte(workoutSessions.date, to)))
		.groupBy(workoutSessions.date)
		.orderBy(asc(workoutSessions.date));
}

export async function distinctDates(): Promise<string[]> {
	const rows = await useDB()
		.selectDistinct({ date: workoutSessions.date })
		.from(workoutSessions)
		.orderBy(asc(workoutSessions.date));
	return rows.map((r) => r.date);
}

export async function totals(): Promise<{ sessions: number; durationSec: number }> {
	const rows = await useDB()
		.select({
			sessions: sql<number>`COUNT(*)`,
			durationSec: sql<number>`COALESCE(SUM(${workoutSessions.durationSec}), 0)`,
		})
		.from(workoutSessions);
	return rows[0] ?? { sessions: 0, durationSec: 0 };
}

export function categoryAggregate(from: string, to: string) {
	const setsDone = sql<number>`COALESCE(SUM(${sessionEntries.setsDone}), 0)`;
	return useDB()
		.select({
			category: sessionEntries.category,
			entries: sql<number>`COUNT(*)`,
			setsDone,
		})
		.from(sessionEntries)
		.innerJoin(workoutSessions, eq(workoutSessions.id, sessionEntries.sessionId))
		.where(and(gte(workoutSessions.date, from), lte(workoutSessions.date, to)))
		.groupBy(sessionEntries.category)
		.orderBy(desc(setsDone));
}

// Infrastructure probe — được phép gọi useDB() trực tiếp (không qua repository)
// vì đây là health check hạ tầng, không phải business logic.
export default defineEventHandler(async () => {
	try {
		const db = useDB();
		await db.run('SELECT 1');
		return { ok: true, db: 'connected' };
	}
	catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw createError({ statusCode: 500, message: `D1 binding error: ${message}` });
	}
});

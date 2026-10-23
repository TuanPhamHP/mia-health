import * as service from '../../services/stats';

export default defineEventHandler(async (event) => {
	const parsed = statsTodayQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.getToday(parsed.data.date);
});

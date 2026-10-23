import * as service from '../../services/plan';

export default defineEventHandler(async (event) => {
	const parsed = planTodayQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.getTodayPlan(parsed.data.date);
});

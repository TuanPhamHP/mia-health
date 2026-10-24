import * as service from '../services/meals';

export default defineEventHandler(async (event) => {
	const parsed = mealLogQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.getDayLog(parsed.data.date);
});

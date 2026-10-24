import * as service from '../services/foods';

export default defineEventHandler(async (event) => {
	const parsed = foodQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.listFoods(parsed.data);
});

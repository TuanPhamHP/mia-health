import * as service from '../services/dishes';

export default defineEventHandler(async (event) => {
	const parsed = dishQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.listDishes(parsed.data);
});

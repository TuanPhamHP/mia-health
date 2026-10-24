import * as service from '../services/body';

export default defineEventHandler(async (event) => {
	const parsed = bodyQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.getBody(parsed.data.today);
});

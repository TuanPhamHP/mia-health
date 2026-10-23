import * as service from '../services/routines';

export default defineEventHandler(async (event) => {
	const parsed = routineQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.listRoutines(parsed.data);
});

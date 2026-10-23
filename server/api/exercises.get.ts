import * as service from '../services/exercises';

export default defineEventHandler(async (event) => {
	const parsed = exerciseQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.listExercises(parsed.data);
});

import * as service from '../services/exercises';

export default defineEventHandler(async (event) => {
	const parsed = createExerciseSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addExercise(parsed.data);
});

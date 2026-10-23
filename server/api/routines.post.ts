import * as service from '../services/routines';

export default defineEventHandler(async (event) => {
	const parsed = createRoutineSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addRoutine(parsed.data);
});

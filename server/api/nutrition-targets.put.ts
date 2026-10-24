import * as service from '../services/meals';

export default defineEventHandler(async (event) => {
	const parsed = updateNutritionTargetsSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.setTargets(parsed.data);
});

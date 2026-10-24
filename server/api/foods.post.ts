import * as service from '../services/foods';

export default defineEventHandler(async (event) => {
	const parsed = createFoodSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addFood(parsed.data);
});

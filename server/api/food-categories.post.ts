import * as service from '../services/foods';

export default defineEventHandler(async (event) => {
	const parsed = createFoodCategorySchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addCategory(parsed.data);
});

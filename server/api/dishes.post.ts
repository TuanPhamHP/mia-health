import * as service from '../services/dishes';

export default defineEventHandler(async (event) => {
	const parsed = createDishSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addDish(parsed.data);
});

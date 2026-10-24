import * as service from '../../services/meals';

export default defineEventHandler(async (event) => {
	const parsed = applyMenuSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.applyMenu(parsed.data.date, parsed.data.menuId);
});

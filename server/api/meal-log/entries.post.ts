import * as service from '../../services/meals';

export default defineEventHandler(async (event) => {
	const parsed = addMealEntrySchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addEntry(parsed.data);
});

import * as service from '../../services/plan';

export default defineEventHandler(async (event) => {
	const parsed = planChangeSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addChange(parsed.data);
});

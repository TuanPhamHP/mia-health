import * as service from '../../services/body';

export default defineEventHandler(async (event) => {
	const parsed = addBodyWeightSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.addWeight(parsed.data);
});

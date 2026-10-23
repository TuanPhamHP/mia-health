import * as service from '../services/sessions';

export default defineEventHandler(async (event) => {
	const parsed = sessionQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.listSessions(parsed.data);
});

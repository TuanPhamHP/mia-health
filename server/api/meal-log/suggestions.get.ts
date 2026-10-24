import * as service from '../../services/meals';

export default defineEventHandler(async (event) => {
	const parsed = suggestionsQuerySchema.safeParse(getQuery(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.getSuggestions(parsed.data.date);
});

import * as service from '../../../../services/routines';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	const itemId = parseInt(getRouterParam(event, 'itemId') ?? '', 10);
	if (!id || isNaN(id) || !itemId || isNaN(itemId)) {
		throw createError({ statusCode: 400, message: 'id không hợp lệ' });
	}

	const parsed = updateRoutineItemSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.editItem(id, itemId, parsed.data);
});

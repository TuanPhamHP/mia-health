import * as service from '../../../../services/routines';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	const itemId = parseInt(getRouterParam(event, 'itemId') ?? '', 10);
	if (!id || isNaN(id) || !itemId || isNaN(itemId)) {
		throw createError({ statusCode: 400, message: 'id không hợp lệ' });
	}

	return service.removeItem(id, itemId);
});

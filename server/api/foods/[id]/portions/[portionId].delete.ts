import * as service from '../../../../services/foods';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	const portionId = parseInt(getRouterParam(event, 'portionId') ?? '', 10);
	if (!id || isNaN(id) || !portionId || isNaN(portionId)) {
		throw createError({ statusCode: 400, message: 'id không hợp lệ' });
	}

	return service.removePortion(id, portionId);
});

import * as service from '../../../../services/foods';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	const portionId = parseInt(getRouterParam(event, 'portionId') ?? '', 10);
	if (!id || isNaN(id) || !portionId || isNaN(portionId)) {
		throw createError({ statusCode: 400, message: 'id không hợp lệ' });
	}

	const parsed = updateFoodPortionSchema.safeParse(await readBody(event));
	if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

	return service.editPortion(id, portionId, parsed.data);
});

import * as service from '../../../../../../services/programs';

export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	const phaseId = parseInt(getRouterParam(event, 'phaseId') ?? '', 10);
	const slotId = parseInt(getRouterParam(event, 'slotId') ?? '', 10);
	if (!id || isNaN(id) || !phaseId || isNaN(phaseId) || !slotId || isNaN(slotId)) {
		throw createError({ statusCode: 400, message: 'id không hợp lệ' });
	}

	return service.removeSlot(id, phaseId, slotId);
});

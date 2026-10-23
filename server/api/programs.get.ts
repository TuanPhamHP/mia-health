import * as service from '../services/programs';

export default defineEventHandler(async () => {
	return service.listPrograms();
});

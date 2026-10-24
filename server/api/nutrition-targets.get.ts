import * as service from '../services/meals';

export default defineEventHandler(async () => {
	return service.getTargets();
});

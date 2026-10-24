import * as service from '../services/foods';

export default defineEventHandler(async () => {
	return service.categoryTree();
});

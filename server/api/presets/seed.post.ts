import * as service from '../../services/presets';

// Idempotent theo tên — chạy lại bao nhiêu lần cũng chỉ thêm phần còn thiếu.
export default defineEventHandler(async () => {
	return service.seedPresets();
});

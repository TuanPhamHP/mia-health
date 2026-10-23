import * as service from '../../../../services/exercises';
import { MAX_UPLOAD_BYTES } from '../../../../services/media';

// multipart/form-data: `file` (bắt buộc) + `caption` (tuỳ chọn).
export default defineEventHandler(async (event) => {
	const id = parseInt(getRouterParam(event, 'id') ?? '', 10);
	if (!id || isNaN(id)) throw createError({ statusCode: 400, message: 'id không hợp lệ' });

	// Chặn sớm theo header trước khi đọc cả body vào bộ nhớ (dư 64 KB cho phần multipart).
	const length = Number(getRequestHeader(event, 'content-length') ?? 0);
	if (length > MAX_UPLOAD_BYTES + 64 * 1024) {
		throw createError({ statusCode: 413, message: 'Ảnh quá lớn (tối đa 5 MB)' });
	}

	const parts = await readMultipartFormData(event);
	const file = parts?.find((p) => p.name === 'file');
	if (!file?.data.length) throw createError({ statusCode: 400, message: 'Thiếu file ảnh' });

	const captionPart = parts?.find((p) => p.name === 'caption');
	const caption = mediaCaption.safeParse(captionPart ? new TextDecoder().decode(captionPart.data) : null);
	if (!caption.success) throw createError({ statusCode: 400, message: caption.error.message });

	return service.addMediaUpload(id, new Uint8Array(file.data), caption.data);
});

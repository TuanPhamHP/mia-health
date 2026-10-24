import type { H3Event } from 'h3';
import { MAX_UPLOAD_BYTES } from '../services/media';
import { mediaCaption } from '../../shared/schemas/media';

/**
 * Đọc form tải ảnh (multipart/form-data: `file` bắt buộc + `caption` tuỳ chọn) — dùng chung cho
 * ảnh bài tập, món ăn, thực phẩm. Chặn sớm theo Content-Length trước khi đọc cả body vào bộ nhớ
 * (dư 64 KB cho phần multipart); định dạng thật do service soát bằng magic bytes.
 */
export async function readImageUpload(event: H3Event): Promise<{ data: Uint8Array; caption: string | null }> {
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

	return { data: new Uint8Array(file.data), caption: caption.data };
}

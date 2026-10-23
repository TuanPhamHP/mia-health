import * as service from '../../services/media';

// Ảnh tải lên — ngoài /api để service worker được cache (luật: KHÔNG cache /api), vẫn cần
// đăng nhập (server/middleware/auth.ts). Key chứa uuid, nội dung không bao giờ đổi ⇒ cache
// vĩnh viễn; `private` vì là dữ liệu riêng.
export default defineEventHandler(async (event) => {
	const obj = await service.getObject(getRouterParam(event, 'key') ?? '');
	setResponseHeaders(event, {
		'Content-Type': obj.contentType,
		'Cache-Control': 'private, max-age=31536000, immutable',
		'X-Content-Type-Options': 'nosniff',
		ETag: obj.etag,
	});
	return obj.body;
});

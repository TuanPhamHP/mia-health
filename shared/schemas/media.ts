import { z } from 'zod';

export const mediaCaption = z.string().trim().max(200, 'Chú thích tối đa 200 ký tự').nullable();

// Link ảnh hoặc YouTube — service tự nhận loại (parseYouTube). Chỉ https: ảnh http bị trình
// duyệt chặn (mixed content) trên app https.
export const addMediaLinkSchema = z.object({
	url: z.url({ protocol: /^https$/, error: 'Link phải bắt đầu bằng https://' }).max(2000),
	caption: mediaCaption.optional(),
});

export const updateMediaSchema = z.object({
	caption: mediaCaption,
});

export const reorderMediaSchema = z.object({
	mediaIds: z.array(z.number().int().positive()).min(1, 'Danh sách rỗng'),
});

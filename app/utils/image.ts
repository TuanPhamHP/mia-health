/**
 * Chuẩn bị ảnh trước khi tải lên: cạnh dài ≤ `maxEdge`, mã hoá lại WebP (Safari cũ không mã
 * hoá được WebP — canvas lặng lẽ trả PNG — thì thử JPEG). Ảnh chụp điện thoại 3–8 MB còn
 * ~150–300 KB. Mã hoá lại qua canvas còn XOÁ EXIF — ảnh chụp thường mang toạ độ GPS.
 * GIF giữ nguyên để không mất chuyển động.
 */
export async function prepareImage(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
	if (file.type === 'image/gif') return file;
	const source = await decode(file);
	const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
	const width = Math.round(source.width * scale);
	const height = Math.round(source.height * scale);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Trình duyệt không xử lý được ảnh');
	ctx.drawImage(source, 0, 0, width, height);
	if (source instanceof ImageBitmap) source.close();

	const webp = await toBlob(canvas, 'image/webp', quality);
	if (webp?.type === 'image/webp') return webp;
	const jpeg = await toBlob(canvas, 'image/jpeg', quality);
	if (!jpeg) throw new Error('Không nén được ảnh');
	return jpeg;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
	if (typeof createImageBitmap === 'function') {
		try {
			return await createImageBitmap(file, { imageOrientation: 'from-image' });
		} catch {
			// Định dạng createImageBitmap không giải mã được (HEIC…) → thử qua <img>.
		}
	}
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Không đọc được ảnh — thử ảnh JPEG hoặc PNG'));
		};
		img.src = url;
	});
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

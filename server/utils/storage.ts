// Phần R2Bucket mà app dùng — tự khai thay vì kéo cả @cloudflare/workers-types
// (nitro-cloudflare-dev chỉ gõ `env` là Record<string, unknown>).
export interface MediaObject {
	arrayBuffer(): Promise<ArrayBuffer>;
	httpEtag: string;
	httpMetadata?: { contentType?: string };
}

export interface MediaBucket {
	put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
	get(key: string): Promise<MediaObject | null>;
	delete(keys: string | string[]): Promise<void>;
}

/** R2 chứa ảnh tải lên. Như useDB(): CHỈ repository được gọi. */
export function useMediaBucket(): MediaBucket {
	const bucket = useEvent().context.cloudflare?.env?.MEDIA as MediaBucket | undefined;
	if (!bucket) {
		throw new Error('R2 binding "MEDIA" not found — khai r2_buckets trong wrangler.jsonc rồi chạy lại `yarn dev`');
	}
	return bucket;
}

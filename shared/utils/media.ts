import type { MediaKind } from '../types/exercises';

// ---------------------------------------------------------------------------
// Ảnh / video hướng dẫn — pure function dùng chung: server chuẩn hoá link YouTube lúc lưu,
// client dựng link nhúng + thumbnail từ cùng hàm.
// ---------------------------------------------------------------------------

export interface YouTubeRef {
	id: string;
	startSec: number;
}

const YT_ID = /^[\w-]{11}$/;
const YT_HOSTS = new Set([
	'youtube.com',
	'www.youtube.com',
	'm.youtube.com',
	'music.youtube.com',
	'youtu.be',
	'youtube-nocookie.com',
	'www.youtube-nocookie.com',
]);

/** "90", "90s", "1m30s", "1h2m3s" → giây; sai định dạng → 0. */
function parseStart(raw: string | null): number {
	if (!raw) return 0;
	if (/^\d+$/.test(raw)) return Number(raw);
	const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
	if (!m) return 0;
	return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/**
 * Nhận mọi dạng link YouTube hay gặp — watch?v=, youtu.be/, shorts/, embed/, live/ — kèm
 * mốc thời gian `t=` / `start=`. Không phải YouTube → null.
 */
export function parseYouTube(input: string): YouTubeRef | null {
	let u: URL;
	try {
		u = new URL(input.trim());
	} catch {
		return null;
	}
	if (!YT_HOSTS.has(u.hostname)) return null;
	let id: string | null;
	if (u.hostname === 'youtu.be') id = u.pathname.split('/')[1] ?? null;
	else if (u.pathname === '/watch') id = u.searchParams.get('v');
	else id = /^\/(?:shorts|embed|live|v)\/([^/]+)/.exec(u.pathname)?.[1] ?? null;
	if (!id || !YT_ID.test(id)) return null;
	return { id, startSec: parseStart(u.searchParams.get('t') ?? u.searchParams.get('start')) };
}

/** Dạng lưu DB — một link duy nhất cho mọi kiểu dán. */
export function youtubeWatchUrl(ref: YouTubeRef): string {
	return `https://www.youtube.com/watch?v=${ref.id}${ref.startSec > 0 ? `&t=${ref.startSec}s` : ''}`;
}

export function youtubeEmbedUrl(ref: YouTubeRef, autoplay = false): string {
	const params = new URLSearchParams({ rel: '0', playsinline: '1' });
	if (ref.startSec > 0) params.set('start', String(ref.startSec));
	if (autoplay) params.set('autoplay', '1');
	return `https://www.youtube-nocookie.com/embed/${ref.id}?${params.toString()}`;
}

export function youtubeThumbUrl(ref: YouTubeRef): string {
	return `https://i.ytimg.com/vi/${ref.id}/hqdefault.jpg`;
}

export interface MediaLike {
	kind: MediaKind;
	url: string;
}

export interface Cover {
	url: string;
	video: boolean;
}

/** Ảnh đại diện của một media: ảnh thì chính nó, YouTube thì thumbnail của video. */
export function mediaThumb(m: MediaLike): Cover | null {
	if (m.kind === 'image') return { url: m.url, video: false };
	const ref = parseYouTube(m.url);
	return ref ? { url: youtubeThumbUrl(ref), video: true } : null;
}

/**
 * Ảnh bìa của bài tập: media đầu tiên; bài kết hợp chưa có media riêng thì mượn ảnh bìa
 * của bài con đầu tiên có media.
 */
export function coverOf(ex: {
	media: readonly MediaLike[];
	components?: readonly { exercise: { media: readonly MediaLike[] } }[];
}): Cover | null {
	const all = [ex.media, ...(ex.components ?? []).map((c) => c.exercise.media)];
	for (const list of all) {
		for (const m of list) {
			const cover = mediaThumb(m);
			if (cover) return cover;
		}
	}
	return null;
}

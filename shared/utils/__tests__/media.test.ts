import { describe, expect, it } from 'vitest';
import { coverOf, parseYouTube, youtubeEmbedUrl, youtubeWatchUrl } from '../media';

const ID = 'dQw4w9WgXcQ';

describe('parseYouTube', () => {
	it.each([
		[`https://www.youtube.com/watch?v=${ID}`, 0],
		[`https://m.youtube.com/watch?v=${ID}&feature=share`, 0],
		[`https://youtu.be/${ID}?si=abc`, 0],
		[`https://youtu.be/${ID}?t=90`, 90],
		[`https://www.youtube.com/watch?v=${ID}&t=1m30s`, 90],
		[`https://www.youtube.com/shorts/${ID}`, 0],
		[`https://www.youtube.com/embed/${ID}?start=45`, 45],
		[`https://www.youtube-nocookie.com/embed/${ID}`, 0],
		[`  https://www.youtube.com/live/${ID}?t=1h2m3s  `, 3723],
	])('%s', (url, startSec) => {
		expect(parseYouTube(url)).toEqual({ id: ID, startSec });
	});

	it.each([
		'https://vimeo.com/123456',
		'https://www.youtube.com/watch?v=short',
		'https://www.youtube.com/@channel',
		'https://example.com/watch?v=dQw4w9WgXcQ',
		'không phải link',
	])('không nhận %s', (url) => {
		expect(parseYouTube(url)).toBeNull();
	});

	it('chuẩn hoá về một dạng lưu DB, dựng link nhúng giữ mốc thời gian', () => {
		const ref = parseYouTube(`https://youtu.be/${ID}?t=90`)!;
		expect(youtubeWatchUrl(ref)).toBe(`https://www.youtube.com/watch?v=${ID}&t=90s`);
		expect(parseYouTube(youtubeWatchUrl(ref))).toEqual(ref);
		expect(youtubeEmbedUrl(ref)).toBe(`https://www.youtube-nocookie.com/embed/${ID}?rel=0&playsinline=1&start=90`);
	});
});

describe('coverOf', () => {
	const yt = { kind: 'youtube' as const, url: `https://www.youtube.com/watch?v=${ID}` };
	const img = { kind: 'image' as const, url: '/media/exercises/1/a.webp' };

	it('media đầu tiên; YouTube dùng thumbnail', () => {
		expect(coverOf({ media: [yt, img] })).toEqual({ url: `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`, video: true });
		expect(coverOf({ media: [img, yt] })).toEqual({ url: img.url, video: false });
	});

	it('bài kết hợp không có media riêng ⇒ mượn bài con đầu tiên có media', () => {
		const components = [{ exercise: { media: [] } }, { exercise: { media: [img] } }];
		expect(coverOf({ media: [], components })).toEqual({ url: img.url, video: false });
		expect(coverOf({ media: [], components: [] })).toBeNull();
	});
});

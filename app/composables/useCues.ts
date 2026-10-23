import { reactive, watch } from 'vue';

/**
 * Tín hiệu cho màn hình tập: tiếng bíp (WebAudio), rung (Vibration API — Android;
 * iOS Safari không hỗ trợ, gọi vào là no-op), giọng đọc tiếng Việt (speechSynthesis)
 * và giữ màn hình sáng (Screen Wake Lock).
 *
 * iOS chỉ cho phát âm thanh / đọc sau một cử chỉ của người dùng → `unlock()` PHẢI
 * được gọi trong handler của nút "Bắt đầu".
 */

interface CueSettings {
	sound: boolean;
	vibrate: boolean;
	voice: boolean;
}

const STORAGE_KEY = 'mia-health:cues';

function loadSettings(): CueSettings {
	const defaults: CueSettings = { sound: true, vibrate: true, voice: true };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<CueSettings>) } : defaults;
	} catch {
		return defaults;
	}
}

export function useCues() {
	const settings = reactive<CueSettings>(loadSettings());
	watch(settings, (v) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
		} catch {
			// private mode / storage bị chặn — chỉ mất tuỳ chọn, không ảnh hưởng buổi tập
		}
	});

	let ctx: AudioContext | null = null;
	let voice: SpeechSynthesisVoice | null = null;
	let wakeLock: WakeLockSentinel | null = null;
	let wantWakeLock = false;

	function pickVoice() {
		if (!('speechSynthesis' in window)) return;
		const voices = window.speechSynthesis.getVoices();
		voice = voices.find((v) => v.lang?.toLowerCase().startsWith('vi')) ?? null;
	}

	function unlock() {
		try {
			const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (AC && !ctx) ctx = new AC();
			void ctx?.resume();
		} catch {
			ctx = null;
		}
		if ('speechSynthesis' in window) {
			pickVoice();
			window.speechSynthesis.onvoiceschanged = pickVoice;
			// "Mồi" speechSynthesis bằng một câu rỗng trong cử chỉ người dùng (iOS).
			window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
		}
	}

	function beep(freq = 880, ms = 150, volume = 0.25) {
		if (!settings.sound || !ctx) return;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		const t = ctx.currentTime;
		// Bao biên độ mềm để không "tách" loa.
		gain.gain.setValueAtTime(0.0001, t);
		gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
		osc.connect(gain).connect(ctx.destination);
		osc.start(t);
		osc.stop(t + ms / 1000 + 0.02);
	}

	function vibrate(pattern: number | number[]) {
		if (!settings.vibrate || !('vibrate' in navigator)) return;
		try {
			navigator.vibrate(pattern);
		} catch {
			// một số trình duyệt ném lỗi khi chưa có cử chỉ người dùng — bỏ qua
		}
	}

	function say(text: string) {
		if (!settings.voice || !('speechSynthesis' in window)) return;
		const synth = window.speechSynthesis;
		synth.cancel();
		const u = new SpeechSynthesisUtterance(text);
		u.lang = 'vi-VN';
		if (voice) u.voice = voice;
		u.rate = 1.05;
		synth.speak(u);
	}

	function stopSpeech() {
		if ('speechSynthesis' in window) window.speechSynthesis.cancel();
	}

	async function requestWakeLock() {
		if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
		try {
			wakeLock = await navigator.wakeLock.request('screen');
		} catch {
			wakeLock = null;
		}
	}

	// Wake lock tự nhả khi tab ẩn → xin lại khi quay về.
	function onVisibility() {
		if (wantWakeLock && document.visibilityState === 'visible') void requestWakeLock();
	}

	async function keepAwake(on: boolean) {
		wantWakeLock = on;
		if (on) {
			document.addEventListener('visibilitychange', onVisibility);
			await requestWakeLock();
		} else {
			document.removeEventListener('visibilitychange', onVisibility);
			await wakeLock?.release().catch(() => undefined);
			wakeLock = null;
		}
	}

	function dispose() {
		stopSpeech();
		void keepAwake(false);
		void ctx?.close().catch(() => undefined);
		ctx = null;
	}

	return { settings, unlock, beep, vibrate, say, stopSpeech, keepAwake, dispose };
}

export type Cues = ReturnType<typeof useCues>;

import type { Ref } from 'vue';

export function getApiErrorMessage(e: unknown): string {
	if (e !== null && typeof e === 'object') {
		const err = e as Record<string, unknown>;
		const data = err['data'];
		if (data !== null && typeof data === 'object') {
			const msg = (data as Record<string, unknown>)['message'];
			if (typeof msg === 'string' && msg) return msg;
		}
		if (typeof err['statusMessage'] === 'string' && err['statusMessage']) {
			return err['statusMessage'] as string;
		}
		if (typeof err['message'] === 'string' && err['message']) {
			return err['message'] as string;
		}
	}
	return 'Đã có lỗi';
}

/**
 * Bọc một lời gọi API với state `loading`/`error` chung của composable.
 * Lỗi được nuốt thành `error.value` (message tiếng Việt từ server) và trả `null` —
 * caller kiểm `null` rồi toast, đúng pattern của mọi composable trong app.
 */
export function createRunner(loading: Ref<boolean>, error: Ref<string | null>) {
	return async function run<T>(fn: () => Promise<T>): Promise<T | null> {
		loading.value = true;
		error.value = null;
		try {
			return await fn();
		} catch (e) {
			error.value = getApiErrorMessage(e);
			return null;
		} finally {
			loading.value = false;
		}
	};
}

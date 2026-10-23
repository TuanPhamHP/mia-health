/**
 * Map mọi field kiểu Date sang string, Date|null sang string|null — mô phỏng
 * JSON.stringify mà Nitro thực hiện trước khi trả response. Dùng tuple-wrap
 * để tắt distribution, tránh union type bị tách nhầm.
 *
 * Ví dụ: Serialized<{ createdAt: Date; updatedAt: Date | null; amount: number }>
 *        → { createdAt: string; updatedAt: string | null; amount: number }
 */
export type Serialized<T> = {
	[K in keyof T]: [T[K]] extends [Date]
		? string
		: [T[K]] extends [Date | null]
			? string | null
			: T[K];
};

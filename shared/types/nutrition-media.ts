import type { MediaKind } from './exercises';

/** Ảnh / video của món ăn hoặc thực phẩm — đúng một trong `dishId` / `foodId`. */
export interface NutritionMediaDTO {
	id: number;
	dishId: number | null;
	foodId: number | null;
	position: number;
	kind: MediaKind;
	/** Ảnh: '/media/…' (tải lên), '/seed/…' (ảnh mẫu đi kèm app) hoặc link https. YouTube: link đã chuẩn hoá. */
	url: string;
	/** Có ⇒ ảnh tải lên R2 — xoá media là xoá luôn file. */
	storageKey: string | null;
	caption: string | null;
	/** Ảnh mẫu lấy từ nguồn ngoài: "Tác giả · CC BY-SA 4.0" — điều kiện giấy phép, phải hiện kèm ảnh. */
	credit: string | null;
	/** Trang gốc của ảnh (Wikimedia Commons). */
	sourceUrl: string | null;
}


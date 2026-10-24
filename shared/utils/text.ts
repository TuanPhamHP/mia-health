/** Bỏ dấu + hạ chữ để tìm kiếm: "gap bung" khớp "Gập bụng (Crunch)", "uc ga" khớp "Ức gà". */
export function foldText(s: string): string {
	return s
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.toLocaleLowerCase('vi');
}

// Món ăn mẫu: công thức với định lượng phổ biến của bữa cơm Việt (ƯỚC LƯỢNG — không có nguồn
// công bố công thức chuẩn). Dinh dưỡng KHÔNG ghi ở đây: app luôn tính từ thực phẩm trong kho.
//
// - Khối lượng = PHẦN ĂN ĐƯỢC (đã bỏ xương, vỏ), cho CẢ công thức; `servings` = số phần.
// - Dầu rán / xào = lượng ngấm vào món, không phải cả chảo dầu.
// - Sả, ớt nhỏ, nước dùng xương không có trong kho / gần như không có năng lượng ⇒ ghi trong
//   mô tả, không tính.
// - `ref` = kcal một phần theo nguồn công bố để build-dishes.mjs đối chiếu (lệch > 30% ⇒ cảnh báo):
//     NIN      — số liệu Viện Dinh dưỡng Quốc gia được báo chí trích dẫn (vietnamnet.vn)
//     NUTRIHOME — "Bảng lượng calo trong thực phẩm, thức ăn Việt Nam" (nutrihome.vn, tổng hợp)

export const DISH_REFS = {
  NIN: 'Viện Dinh dưỡng Quốc gia (qua vietnamnet.vn)',
  NUTRIHOME: 'Nutrihome — Bảng lượng calo trong thực phẩm, thức ăn Việt Nam',
}

export const DISHES = [
  // --- Món mặn ---
  {
    name: 'Gà luộc', category: 'main', servings: 4,
    description: 'Gà ta luộc với gừng, chấm muối tiêu chanh. 1 con ~1,2 kg cho ~600 g thịt ăn được.',
    ingredients: [['Thịt gà ta', 600], ['Gừng tươi', 10], ['Muối', 4], ['Hạt tiêu', 1]],
  },
  {
    name: 'Gà rang gừng', category: 'main', servings: 4,
    description: 'Má đùi gà chặt miếng, rang với gừng, hành, nước mắm, đường đến khi săn và bóng.',
    ingredients: [['Má đùi gà có da (sống)', 500], ['Gừng tươi', 30], ['Hành củ tươi', 15], ['Nước mắm cá', 20], ['Đường kính', 10], ['Dầu đậu tương', 15]],
    ref: ['NUTRIHOME', 301, 'Gà kho gừng'],
  },
  {
    name: 'Gà xào sả ớt', category: 'main', servings: 4,
    description: 'Má đùi gà xào với sả, ớt băm (không tính vào dinh dưỡng), hành, nước mắm.',
    ingredients: [['Má đùi gà có da (sống)', 400], ['Hành củ tươi', 15], ['Nước mắm cá', 20], ['Đường kính', 5], ['Dầu đậu tương', 20]],
    ref: ['NUTRIHOME', 272, 'Gà xào sả ớt'],
  },
  {
    name: 'Ức gà áp chảo', category: 'main', servings: 1,
    description: 'Ức gà không da áp chảo ít dầu ô liu, muối, tiêu. Món giàu đạm, ít béo cho người tập.',
    ingredients: [['Ức gà không da (sống)', 150], ['Dầu oliu', 5], ['Muối', 1], ['Hạt tiêu', 0.5]],
  },
  {
    name: 'Thịt kho trứng', category: 'main', servings: 5,
    description: 'Thịt nửa nạc nửa mỡ kho nước dừa với trứng vịt luộc, nước mắm, đường.',
    ingredients: [['Thịt lợn nửa nạc, nửa mỡ', 400], ['Trứng vịt', 300], ['Nước dừa non tươi', 400], ['Nước mắm cá', 40], ['Đường kính', 15], ['Hành củ tươi', 10]],
    ref: ['NUTRIHOME', 315, 'Thịt kho trứng'],
  },
  {
    name: 'Thịt kho tiêu', category: 'main', servings: 4,
    description: 'Thịt nửa nạc nửa mỡ kho keo với nước mắm, đường, nhiều tiêu.',
    ingredients: [['Thịt lợn nửa nạc, nửa mỡ', 400], ['Nước mắm cá', 30], ['Đường kính', 15], ['Hạt tiêu', 3], ['Hành củ tươi', 10]],
    ref: ['NUTRIHOME', 312, 'Thịt kho tiêu'],
  },
  {
    name: 'Thịt rang cháy cạnh', category: 'main', servings: 4,
    description: 'Thịt nửa nạc nửa mỡ thái mỏng rang cháy cạnh với hành, nước mắm, đường. Mỡ chảy ra chắt bỏ thì ít béo hơn số tính.',
    ingredients: [['Thịt lợn nửa nạc, nửa mỡ', 400], ['Hành củ tươi', 20], ['Nước mắm cá', 20], ['Đường kính', 10]],
  },
  {
    name: 'Thịt lợn luộc', category: 'main', servings: 4,
    description: 'Thịt nửa nạc nửa mỡ luộc, thái mỏng, chấm nước mắm.',
    ingredients: [['Thịt lợn nửa nạc, nửa mỡ', 400]],
  },
  {
    name: 'Sườn xào chua ngọt', category: 'main', servings: 4,
    description: 'Sườn non rim với cà chua, dứa, đường, nước mắm. ~600 g sườn cả xương cho ~400 g thịt.',
    ingredients: [['Sườn non lợn (sống)', 400], ['Cà chua', 100], ['Dứa ta', 50], ['Đường kính', 20], ['Nước mắm cá', 20], ['Dầu đậu tương', 15], ['Hành củ tươi', 10]],
  },
  {
    name: 'Chả lá lốt', category: 'main', servings: 4,
    description: 'Thịt lợn xay ướp hành, tiêu, nước mắm, cuộn lá lốt, áp chảo.',
    ingredients: [['Thịt lợn xay (sống)', 300], ['Lá lốt', 40], ['Hành củ tươi', 15], ['Nước mắm cá', 10], ['Hạt tiêu', 1], ['Dầu đậu tương', 30]],
  },
  {
    name: 'Nem rán', category: 'main', servings: 4,
    description: '~20 chiếc: nhân thịt xay, miến, mộc nhĩ, cà rốt, trứng; cuốn bánh đa nem, rán ngập dầu (tính ~60 g dầu ngấm).',
    ingredients: [['Thịt lợn xay (sống)', 300], ['Miến dong', 30], ['Mộc nhĩ', 10], ['Cà rốt (củ đỏ, vàng)', 60], ['Trứng gà', 50], ['Hành củ tươi', 15], ['Bánh đa nem', 60], ['Dầu đậu tương', 60]],
  },
  {
    name: 'Đậu phụ sốt cà chua', category: 'main', servings: 4,
    description: '4 bìa đậu rán vàng rồi sốt với cà chua, hành lá, nước mắm.',
    ingredients: [['Đậu phụ', 480], ['Cà chua', 200], ['Dầu đậu tương', 30], ['Hành lá (hành hoa)', 10], ['Nước mắm cá', 15], ['Đường kính', 5]],
  },
  {
    name: 'Đậu phụ rán', category: 'main', servings: 4,
    description: '4 bìa đậu rán vàng (tính ~30 g dầu ngấm).',
    ingredients: [['Đậu phụ', 480], ['Dầu đậu tương', 30]],
  },
  {
    name: 'Trứng rán', category: 'main', servings: 1,
    description: '2 quả trứng gà rán với ít nước mắm.',
    ingredients: [['Trứng gà', 100], ['Dầu đậu tương', 10], ['Nước mắm cá', 5]],
  },
  {
    name: 'Trứng đúc thịt', category: 'main', servings: 2,
    description: '3 quả trứng đánh với thịt xay, hành lá, rán thành bánh.',
    ingredients: [['Trứng gà', 150], ['Thịt lợn xay (sống)', 100], ['Hành lá (hành hoa)', 10], ['Dầu đậu tương', 15], ['Nước mắm cá', 5]],
  },
  {
    name: 'Cá kho tộ', category: 'main', servings: 4,
    description: 'Cá quả (cá lóc) kho keo với nước mắm, đường, tiêu, hành.',
    // Không đối chiếu với "Cá lóc kho" của Nutrihome: mốc đó tính cho 1 lát, một phần ở đây ~125 g cá (~2 lát).
    ingredients: [['Cá quả', 500], ['Nước mắm cá', 40], ['Đường kính', 20], ['Dầu đậu tương', 15], ['Hành củ tươi', 15], ['Hạt tiêu', 2]],
  },
  {
    name: 'Cá rô phi rán', category: 'main', servings: 4,
    description: 'Cá rô phi rán giòn (tính ~30 g dầu ngấm).',
    ingredients: [['Cá rô phi', 500], ['Dầu đậu tương', 30], ['Muối', 3]],
  },
  {
    name: 'Cá thu sốt cà chua', category: 'main', servings: 4,
    description: 'Cá thu rán sơ rồi sốt cà chua, hành lá.',
    ingredients: [['Cá thu', 400], ['Cà chua', 200], ['Dầu đậu tương', 20], ['Nước mắm cá', 15], ['Đường kính', 5], ['Hành lá (hành hoa)', 10]],
  },
  {
    name: 'Cá hồi áp chảo', category: 'main', servings: 1,
    description: 'Phi lê cá hồi áp chảo ít dầu ô liu, muối.',
    ingredients: [['Cá hồi nuôi (Đại Tây Dương, sống)', 150], ['Dầu oliu', 5], ['Muối', 1]],
  },
  {
    name: 'Tôm rim', category: 'main', servings: 4,
    description: 'Tôm rim với nước mắm, đường, hành đến khi sệt.',
    ingredients: [['Tôm biển', 400], ['Đường kính', 15], ['Nước mắm cá', 20], ['Dầu đậu tương', 15], ['Hành củ tươi', 10]],
  },
  {
    name: 'Mực xào cần tây', category: 'main', servings: 3,
    description: 'Mực tươi xào nhanh với cần tây, hành tây, tỏi.',
    ingredients: [['Mực tươi', 300], ['Cần tây', 80], ['Hành tây', 100], ['Tỏi ta', 5], ['Dầu đậu tương', 15], ['Nước mắm cá', 10]],
    ref: ['NUTRIHOME', 137, 'Mực xào thập cẩm'],
  },
  {
    name: 'Bò xào hành tây', category: 'main', servings: 3,
    description: 'Thịt bò thái mỏng xào nhanh với hành tây, tỏi.',
    ingredients: [['Thịt bò loại I', 250], ['Hành tây', 150], ['Tỏi ta', 5], ['Dầu đậu tương', 15], ['Nước mắm cá', 10]],
    ref: ['NUTRIHOME', 133, 'Thịt bò xào hành tây'],
  },

  // --- Rau ---
  {
    name: 'Rau muống xào tỏi', category: 'veg', servings: 3,
    description: '1 mớ rau muống (~300 g phần ăn được) xào tỏi.',
    ingredients: [['Rau muống', 300], ['Tỏi ta', 15], ['Dầu đậu tương', 15], ['Nước mắm cá', 5]],
  },
  {
    name: 'Rau muống luộc', category: 'veg', servings: 3,
    description: '1 mớ rau muống luộc (nước luộc vắt chanh làm canh).',
    ingredients: [['Rau muống', 300]],
  },
  {
    name: 'Bắp cải luộc', category: 'veg', servings: 3,
    description: 'Bắp cải luộc chấm nước mắm trứng.',
    ingredients: [['Cải bắp', 300]],
  },
  {
    name: 'Súp lơ xanh luộc', category: 'veg', servings: 3,
    description: 'Súp lơ xanh luộc hoặc hấp.',
    ingredients: [['Súp lơ xanh', 300]],
  },
  {
    name: 'Đậu cô ve xào tỏi', category: 'veg', servings: 3,
    description: 'Đậu cô ve xào tỏi.',
    ingredients: [['Đậu cô ve', 250], ['Tỏi ta', 10], ['Dầu đậu tương', 15], ['Nước mắm cá', 5]],
  },
  {
    name: 'Giá xào', category: 'veg', servings: 3,
    description: 'Giá đỗ xanh xào hành lá.',
    ingredients: [['Giá đậu xanh', 300], ['Hành lá (hành hoa)', 15], ['Dầu đậu tương', 15], ['Nước mắm cá', 5]],
  },
  {
    name: 'Salad dưa chuột cà chua', category: 'veg', servings: 2,
    description: 'Xà lách, cà chua, dưa chuột trộn dầu ô liu, muối.',
    ingredients: [['Rau sà lách', 100], ['Cà chua', 100], ['Dưa chuột', 100], ['Dầu oliu', 10], ['Muối', 1]],
  },

  // --- Canh ---
  {
    name: 'Canh rau ngót thịt băm', category: 'soup', servings: 4,
    description: '1 mớ rau ngót nấu với thịt xay.',
    ingredients: [['Rau ngót', 200], ['Thịt lợn xay (sống)', 100], ['Nước mắm cá', 10]],
  },
  {
    name: 'Canh chua cá', category: 'soup', servings: 4,
    description: 'Cá rô phi nấu chua với cà chua, dứa, giá, me, rau thơm.',
    ingredients: [['Cá rô phi', 300], ['Cà chua', 150], ['Dứa ta', 100], ['Giá đậu xanh', 100], ['Quả me chua', 30], ['Rau thơm', 10], ['Nước mắm cá', 20], ['Đường kính', 15]],
  },
  {
    name: 'Canh bí đao nấu tôm', category: 'soup', servings: 4,
    description: 'Bí xanh nấu tôm, hành lá.',
    ingredients: [['Bí đao (bí xanh)', 400], ['Tôm biển', 100], ['Hành lá (hành hoa)', 10], ['Nước mắm cá', 10]],
  },
  {
    name: 'Canh bầu nấu tôm', category: 'soup', servings: 4,
    description: 'Bầu nấu tôm, hành lá.',
    ingredients: [['Bầu', 400], ['Tôm biển', 80], ['Hành lá (hành hoa)', 10], ['Nước mắm cá', 10]],
  },
  {
    name: 'Canh cải nấu thịt', category: 'soup', servings: 4,
    description: 'Cải xanh nấu thịt nạc thái mỏng, gừng.',
    ingredients: [['Cải xanh', 300], ['Thịt lợn nạc', 100], ['Gừng tươi', 5], ['Nước mắm cá', 10]],
  },
  {
    name: 'Canh cua rau đay', category: 'soup', servings: 4,
    description: 'Cua đồng giã lọc, nấu rau đay, mồng tơi, mướp.',
    ingredients: [['Cua đồng', 200], ['Rau đay', 150], ['Rau mồng tơi', 100], ['Mướp', 150], ['Muối', 3]],
  },
  {
    name: 'Canh trứng cà chua', category: 'soup', servings: 4,
    description: 'Cà chua xào sơ, nấu canh, đổ 2 quả trứng.',
    ingredients: [['Trứng gà', 100], ['Cà chua', 200], ['Hành lá (hành hoa)', 10], ['Dầu đậu tương', 5], ['Nước mắm cá', 10]],
  },

  // --- Bún, phở, miến (1 bát) ---
  {
    name: 'Phở bò tái', category: 'noodle', servings: 1,
    description: 'Bánh phở, thịt bò thăn tái, hành tây, hành lá, rau mùi; nước dùng xương (không tính).',
    ingredients: [['Bánh phở', 150], ['Thăn bò nạc (sống)', 70], ['Hành tây', 20], ['Hành lá (hành hoa)', 10], ['Rau mùi', 5], ['Nước mắm cá', 10]],
    ref: ['NIN', 314, 'Phở bò tái'],
  },
  {
    name: 'Phở bò chín', category: 'noodle', servings: 1,
    description: 'Bánh phở, bắp bò chín thái mỏng, hành, rau mùi; nước dùng xương (không tính).',
    ingredients: [['Bánh phở', 150], ['Bắp bò nạc (sống)', 60], ['Hành tây', 20], ['Hành lá (hành hoa)', 10], ['Rau mùi', 5], ['Nước mắm cá', 10]],
    ref: ['NIN', 291, 'Phở chín'],
  },
  {
    name: 'Phở gà', category: 'noodle', servings: 1,
    description: 'Bánh phở, thịt gà ta xé, hành lá, rau mùi; nước dùng gà (không tính).',
    ingredients: [['Bánh phở', 150], ['Thịt gà ta', 80], ['Hành lá (hành hoa)', 10], ['Rau mùi', 5], ['Nước mắm cá', 10]],
    ref: ['NIN', 356, 'Phở gà'],
  },
  {
    name: 'Bún chả', category: 'noodle', servings: 1,
    description: 'Bún, chả viên + chả miếng nướng, nước chấm chua ngọt, đu đủ cà rốt ngâm, rau sống.',
    ingredients: [['Bún', 180], ['Thịt lợn nửa nạc, nửa mỡ', 100], ['Đường kính', 15], ['Nước mắm cá', 20], ['Đu đủ xanh', 30], ['Cà rốt (củ đỏ, vàng)', 20], ['Rau sà lách', 30], ['Rau thơm', 10], ['Tỏi ta', 3]],
    ref: ['NIN', 518, 'Bún chả'],
  },
  {
    name: 'Bún riêu cua', category: 'noodle', servings: 1,
    description: 'Bún, riêu cua đồng, cà chua, đậu phụ rán, rau sống, mắm tôm (không tính).',
    ingredients: [['Bún', 200], ['Cua đồng', 80], ['Cà chua', 60], ['Đậu phụ', 50], ['Dầu đậu tương', 5], ['Rau sà lách', 20], ['Rau thơm', 10], ['Nước mắm cá', 10]],
    ref: ['NUTRIHOME', 413, 'Bún riêu cua'],
  },
  {
    name: 'Bún bò Huế', category: 'noodle', servings: 1,
    description: 'Bún sợi to, bắp bò, chân giò, tiết, sả ớt phi (sả không tính), hành, rau thơm.',
    ingredients: [['Bún', 200], ['Bắp bò nạc (sống)', 70], ['Chân giò lợn', 60], ['Tiết lợn luộc', 30], ['Hành tây', 15], ['Hành lá (hành hoa)', 10], ['Rau thơm', 10], ['Dầu đậu tương', 5], ['Nước mắm cá', 15]],
    ref: ['NUTRIHOME', 479, 'Bún bò Huế'],
  },
  {
    name: 'Miến gà', category: 'noodle', servings: 1,
    description: 'Miến dong, thịt gà ta xé, mộc nhĩ, hành, rau mùi; nước dùng gà (không tính).',
    ingredients: [['Miến dong', 60], ['Thịt gà ta', 80], ['Mộc nhĩ', 5], ['Hành lá (hành hoa)', 10], ['Rau mùi', 5], ['Nước mắm cá', 10]],
  },

  // --- Cơm, xôi, cháo (1 phần) ---
  {
    name: 'Cơm rang trứng', category: 'rice', servings: 1,
    description: 'Cơm nguội rang với 1 quả trứng, hành lá.',
    ingredients: [['Cơm trắng', 250], ['Trứng gà', 50], ['Dầu đậu tương', 15], ['Hành lá (hành hoa)', 10], ['Nước mắm cá', 5]],
    ref: ['NUTRIHOME', 532, 'Cơm chiên Dương Châu'],
  },
  {
    name: 'Cơm tấm sườn', category: 'rice', servings: 1,
    description: 'Cơm tấm, sườn nướng, mỡ hành, dưa leo, nước mắm chua ngọt.',
    ingredients: [['Cơm trắng', 200], ['Sườn non lợn (sống)', 80], ['Đường kính', 10], ['Nước mắm cá', 20], ['Dưa chuột', 30], ['Hành lá (hành hoa)', 5], ['Dầu đậu tương', 5]],
    ref: ['NUTRIHOME', 529, 'Cơm tấm sườn'],
  },
  {
    name: 'Xôi đậu xanh', category: 'rice', servings: 1,
    description: '1 gói xôi nếp đồ với đậu xanh, hành phi mỡ.',
    ingredients: [['Gạo nếp cái', 100], ['Đậu xanh (đậu tắt)', 30], ['Mỡ lợn nước', 10], ['Hành củ tươi', 10], ['Muối', 1]],
    ref: ['NUTRIHOME', 534, 'Xôi đậu xanh'],
  },
  {
    name: 'Xôi lạc', category: 'rice', servings: 1,
    description: '1 gói xôi nếp đồ với lạc.',
    ingredients: [['Gạo nếp cái', 100], ['Lạc hạt', 30], ['Muối', 1]],
  },
  {
    name: 'Cháo trắng', category: 'rice', servings: 1,
    description: '1 bát cháo trắng (~300 g, nấu từ ~70 g gạo).',
    ingredients: [['Gạo tẻ máy', 70]],
    ref: ['NUTRIHOME', 252, 'Cháo trắng (300 g)'],
  },
  {
    name: 'Cháo thịt bằm', category: 'rice', servings: 1,
    description: '1 bát cháo nấu với thịt xay, hành lá, tiêu.',
    ingredients: [['Gạo tẻ máy', 60], ['Thịt lợn xay (sống)', 50], ['Hành lá (hành hoa)', 5], ['Nước mắm cá', 5], ['Hạt tiêu', 0.5]],
    ref: ['NUTRIHOME', 328, 'Cháo sườn'],
  },
  {
    name: 'Cháo gà', category: 'rice', servings: 1,
    description: '1 bát cháo nấu nước gà, thịt gà xé, hành, gừng.',
    ingredients: [['Gạo tẻ máy', 60], ['Thịt gà ta', 60], ['Hành lá (hành hoa)', 5], ['Gừng tươi', 3], ['Nước mắm cá', 5]],
  },

  // --- Bánh, ăn sáng, ăn vặt ---
  {
    name: 'Bánh mì trứng ốp la', category: 'snack', servings: 1,
    description: '1 ổ bánh mì, 1 trứng ốp la, dưa chuột, rau mùi, xì dầu.',
    ingredients: [['Bánh mỳ', 80], ['Trứng gà', 50], ['Dầu đậu tương', 5], ['Dưa chuột', 20], ['Rau mùi', 3], ['Xì dầu', 5]],
  },
  {
    name: 'Bánh mì chả lụa', category: 'snack', servings: 1,
    description: '1 ổ bánh mì, giò lụa, pa tê, dưa chuột, rau mùi.',
    ingredients: [['Bánh mỳ', 80], ['Giò lụa', 60], ['Ba tê', 20], ['Dưa chuột', 20], ['Rau mùi', 3], ['Xì dầu', 5]],
    ref: ['NUTRIHOME', 431, 'Bánh mì kẹp chả lụa'],
  },
  {
    name: 'Yến mạch sữa chuối', category: 'snack', servings: 1,
    description: 'Yến mạch nấu / ngâm với sữa tách béo, thêm chuối. Bữa sáng nhiều xơ, đủ đạm.',
    ingredients: [['Yến mạch cán (khô)', 40], ['Sữa bò tách béo', 200], ['Chuối tiêu', 80]],
  },
  {
    name: 'Chè đỗ đen', category: 'snack', servings: 1,
    description: '1 cốc chè đỗ đen (đường kính).',
    ingredients: [['Đậu đen (hạt)', 30], ['Đường kính', 30]],
  },

  // --- Đồ uống ---
  {
    name: 'Sinh tố whey chuối', category: 'drink', servings: 1,
    description: '1 muỗng whey, 1 quả chuối, sữa tách béo — uống sau tập.',
    ingredients: [['Bột whey protein', 30], ['Chuối tiêu', 100], ['Sữa bò tách béo', 250]],
  },
  {
    name: 'Cà phê sữa đá', category: 'drink', servings: 1,
    description: '1 ly cà phê phin với ~2 thìa sữa đặc (cà phê gần như 0 kcal, chỉ tính sữa đặc).',
    ingredients: [['Sữa đặc có đường Việt Nam', 30]],
  },
]

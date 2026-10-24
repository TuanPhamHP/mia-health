// Phần "biên tập" của kho thực phẩm: cây danh mục, luật xếp thực phẩm VN vào loại, danh sách
// chọn từ USDA, khẩu phần quen dùng. build-foods.mjs đọc file này + dữ liệu gốc ⇒ sinh SQL.

// Cây 2 cấp. `key` chỉ dùng trong script; nhóm gốc khớp 14 nhóm của Bảng thành phần thực phẩm
// Việt Nam (mã số: 1xxx = nhóm 1 … 14xxx = nhóm 14), sắp lại theo thứ tự hay tra.
export const CATEGORIES = [
  { key: 'meat', name: 'Thịt', vnGroup: 7, children: [
    { key: 'chicken', name: 'Gà' },
    { key: 'pork', name: 'Lợn' },
    { key: 'beef', name: 'Bò' },
    { key: 'poultry', name: 'Vịt, ngỗng, chim' },
    { key: 'othermeat', name: 'Trâu, dê, cừu & khác' },
    { key: 'processed', name: 'Giò chả, xúc xích' },
  ] },
  { key: 'seafood', name: 'Cá & hải sản', vnGroup: 8, children: [
    { key: 'fish', name: 'Cá' },
    { key: 'shellfish', name: 'Tôm, cua, ghẹ' },
    { key: 'mollusk', name: 'Mực, ốc, nghêu sò' },
    { key: 'seaprocessed', name: 'Hải sản chế biến' },
  ] },
  { key: 'egg', name: 'Trứng', vnGroup: 9 },
  { key: 'dairy', name: 'Sữa & chế phẩm', vnGroup: 10 },
  { key: 'grain', name: 'Ngũ cốc & tinh bột', vnGroup: 1, children: [
    { key: 'rice', name: 'Gạo & cơm' },
    { key: 'noodle', name: 'Bún, phở, mì' },
    { key: 'bread', name: 'Bánh mì & bánh' },
    { key: 'cereal', name: 'Ngô, yến mạch & hạt khác' },
    { key: 'flour', name: 'Bột' },
  ] },
  { key: 'tuber', name: 'Khoai củ', vnGroup: 2 },
  { key: 'legume', name: 'Đậu, hạt & đậu phụ', vnGroup: 3, children: [
    { key: 'bean', name: 'Đậu hạt' },
    { key: 'nut', name: 'Hạt & dừa' },
    { key: 'soy', name: 'Đậu phụ & sữa đậu' },
  ] },
  { key: 'veg', name: 'Rau', vnGroup: 4, children: [
    { key: 'leafy', name: 'Rau lá' },
    { key: 'vegfruit', name: 'Củ, quả làm rau' },
    { key: 'herb', name: 'Rau thơm, hành tỏi' },
    { key: 'mushroom', name: 'Nấm' },
    { key: 'pickled', name: 'Dưa muối & rau khô' },
  ] },
  { key: 'fruit', name: 'Trái cây', vnGroup: 5 },
  { key: 'fat', name: 'Dầu, mỡ, bơ', vnGroup: 6 },
  { key: 'spice', name: 'Gia vị & nước chấm', vnGroup: 13 },
  { key: 'sweet', name: 'Đường, bánh kẹo', vnGroup: 12 },
  { key: 'drink', name: 'Đồ uống', vnGroup: 14 },
  { key: 'canned', name: 'Đồ hộp', vnGroup: 11 },
]

// Xếp thực phẩm VN vào loại: luật đầu tiên khớp tên thắng; không khớp ⇒ loại `fallback`. Thứ
// tự quan trọng: "Giò bò" là giò chả trước khi là bò, "Thịt gà tây" là gia cầm khác chứ không phải gà.
export const VN_RULES = {
  meat: { fallback: 'othermeat', rules: [
    ['processed', /^(Ba tê|Chả|Dăm bông|Dồi|Giò|Lạp xường|Nem|Ruốc|Thịt bò khô|Thịt trâu khô|Xúc xích)/],
    ['poultry', /vịt|ngỗng|bồ câu|gà tây/i],
    ['chicken', /gà/i],
    ['pork', /lợn|Chân giò/i],
    ['beef', /bò|bê/i],
  ] },
  seafood: { fallback: 'fish', rules: [
    ['seaprocessed', /^(Bánh phồng|Bột cá|Ruốc)/],
    ['shellfish', /^(Tôm|Tép|Cua|ghẹ|Rạm)/i],
    ['mollusk', /^(Mực|ốc|Hến|Sò|Trai|Hải sâm|Rươi)/i],
  ] },
  grain: { fallback: 'cereal', rules: [
    ['rice', /^(Gạo|Cơm)/],
    ['noodle', /^(Bún|Bánh phở|Mỳ sợi|Bánh đa nem)/],
    ['flour', /^Bột/],
    ['bread', /^Bánh/],
  ] },
  legume: { fallback: 'bean', rules: [
    ['soy', /^(Đậu phụ|Tào phớ|Sữa .*đậu nành|Bột đậu tương)/],
    ['nut', /^(Hạt|Lạc|Vừng|Cùi dừa|Quả cọ|Quả đại|Bột lạc)/],
  ] },
  veg: { fallback: 'vegfruit', rules: [
    ['mushroom', /^(Nấm|Mộc nhĩ|Men bia)/],
    ['pickled', /muối|^Dưa (cải|giá)|^Nhút|khô$|^Măng (chua|khô)|^Rau câu khô/],
    ['herb', /^(Hành|Tỏi|Hẹ|Rau mùi|Rau húng|Rau thơm|Rau răm|Rau ngổ|Rau kinh giới|Tía tô|Thìa là|Lá lốt|Lá mơ|Ngải cứu|Rau giấp cá|Xương sông|Cần|Rau mùi tàu)/],
    ['leafy', /^(Rau |Cải |Dọc củ cải|Lá |Ngó |Hoa )/],
  ] },
}

// Đổi tên cho rõ khi tên gốc dễ nhầm (mã số → tên mới).
export const VN_RENAMES = {
  5045: 'Quả trứng gà (lêkima)',
}

// Chọn từ USDA SR Legacy (FDC ID). Gà/lợn/bò ở đây là giống công nghiệp kiểu Mỹ — bảng VN không
// tách ức / đùi / cánh, có / không da. Món chín (cơm, ức gà luộc…) để nhập theo khối lượng chín.
export const USDA_PICKS = [
  // Gà ("Chicken, broilers or fryers" — gà công nghiệp)
  { fdc: 171077, cat: 'chicken', name: 'Ức gà không da (sống)' },
  { fdc: 171474, cat: 'chicken', name: 'Ức gà có da (sống)' },
  { fdc: 171478, cat: 'chicken', name: 'Ức gà không da, luộc' },
  { fdc: 171534, cat: 'chicken', name: 'Ức gà không da, nướng' },
  { fdc: 173627, cat: 'chicken', name: 'Má đùi gà không da (sống)' },
  { fdc: 172385, cat: 'chicken', name: 'Má đùi gà có da (sống)' },
  { fdc: 172388, cat: 'chicken', name: 'Má đùi gà không da, nướng' },
  { fdc: 173614, cat: 'chicken', name: 'Đùi tỏi gà không da (sống)' },
  { fdc: 172373, cat: 'chicken', name: 'Đùi tỏi gà có da (sống)' },
  { fdc: 172378, cat: 'chicken', name: 'Đùi gà cả (má đùi + tỏi) có da (sống)' },
  { fdc: 172390, cat: 'chicken', name: 'Cánh gà có da (sống)' },
  { fdc: 173630, cat: 'chicken', name: 'Cánh gà có da, nướng' },
  { fdc: 171452, cat: 'chicken', name: 'Da gà (sống)' },
  { fdc: 171116, cat: 'chicken', name: 'Thịt gà xay (sống)' },
  { fdc: 171119, cat: 'chicken', name: 'Chân gà luộc' },
  // Lợn
  { fdc: 168249, cat: 'pork', name: 'Thăn chuột lợn (sống)' },
  { fdc: 168230, cat: 'pork', name: 'Thăn lợn nạc (sống)' },
  { fdc: 167845, cat: 'pork', name: 'Nạc vai lợn (sống)' },
  { fdc: 167812, cat: 'pork', name: 'Ba chỉ lợn (sống)' },
  { fdc: 167853, cat: 'pork', name: 'Sườn non lợn (sống)' },
  { fdc: 167902, cat: 'pork', name: 'Thịt lợn xay (sống)' },
  // Bò
  { fdc: 171812, cat: 'beef', name: 'Thăn bò nạc (sống)' },
  { fdc: 169441, cat: 'beef', name: 'Bắp bò nạc (sống)' },
  { fdc: 168609, cat: 'beef', name: 'Nạm bò nạc (sống)' },
  { fdc: 174030, cat: 'beef', name: 'Thịt bò xay 90% nạc (sống)' },
  // Cá & hải sản
  { fdc: 175167, cat: 'fish', name: 'Cá hồi nuôi (Đại Tây Dương, sống)' },
  { fdc: 175168, cat: 'fish', name: 'Cá hồi nuôi, áp chảo' },
  { fdc: 171986, cat: 'fish', name: 'Cá ngừ hộp ngâm nước (để ráo)' },
  { fdc: 171971, cat: 'shellfish', name: 'Tôm luộc' },
  // Trứng
  { fdc: 173424, cat: 'egg', name: 'Trứng gà luộc' },
  { fdc: 173423, cat: 'egg', name: 'Trứng gà ốp la' },
  // Sữa
  { fdc: 171267, cat: 'dairy', name: 'Sữa bò ít béo 2%' },
  { fdc: 171269, cat: 'dairy', name: 'Sữa bò tách béo' },
  { fdc: 170894, cat: 'dairy', name: 'Sữa chua Hy Lạp không đường, không béo' },
  { fdc: 170845, cat: 'dairy', name: 'Phô mai mozzarella' },
  { fdc: 173180, cat: 'dairy', name: 'Bột whey protein' },
  // Ngũ cốc & tinh bột (đã nấu chín, trừ yến mạch)
  { fdc: 169757, cat: 'rice', name: 'Cơm trắng' },
  { fdc: 169704, cat: 'rice', name: 'Cơm gạo lứt' },
  { fdc: 168928, cat: 'noodle', name: 'Mì Ý luộc' },
  { fdc: 173904, cat: 'cereal', name: 'Yến mạch cán (khô)' },
  { fdc: 172688, cat: 'bread', name: 'Bánh mì sandwich nguyên cám' },
  { fdc: 174924, cat: 'bread', name: 'Bánh mì sandwich trắng' },
  { fdc: 168483, cat: 'tuber', name: 'Khoai lang nướng' },
  { fdc: 170440, cat: 'tuber', name: 'Khoai tây luộc' },
  // Hạt
  { fdc: 170567, cat: 'nut', name: 'Hạnh nhân' },
  { fdc: 172470, cat: 'nut', name: 'Bơ đậu phộng (không muối)' },
  { fdc: 170554, cat: 'nut', name: 'Hạt chia' },
]

// Khẩu phần quen dùng — gram PHẦN ĂN ĐƯỢC, ước lượng theo cỡ thường gặp ở VN (tham khảo cỡ
// khẩu phần của USDA khi có). Người dùng sửa / thêm trong app. Khoá = tên thực phẩm sau cùng.
export const PORTIONS = {
  'Cơm trắng': [['1 bát con', 150], ['1 lưng bát', 100]],
  'Cơm gạo lứt': [['1 bát con', 150], ['1 lưng bát', 100]],
  'Bún': [['1 bát bún', 200]],
  'Bánh phở': [['1 bát phở (phần bánh)', 200]],
  'Mì Ý luộc': [['1 đĩa', 200]],
  'Yến mạch cán (khô)': [['1/2 cốc', 40]],
  'Bánh mỳ': [['1 ổ', 80]],
  'Bánh mì sandwich nguyên cám': [['1 lát', 32]],
  'Bánh mì sandwich trắng': [['1 lát', 28]],
  'Trứng gà': [['1 quả', 50]],
  'Trứng gà luộc': [['1 quả', 50]],
  'Trứng gà ốp la': [['1 quả', 46]],
  'Trứng vịt': [['1 quả', 60]],
  'Trứng chim cút': [['1 quả', 9]],
  'Lòng trắng trứng gà': [['1 quả', 33]],
  'Lòng đỏ trứng gà': [['1 quả', 17]],
  'Sữa bò tươi': [['1 hộp 180 ml', 186], ['1 cốc 250 ml', 258]],
  'Sữa bò ít béo 2%': [['1 hộp 180 ml', 186], ['1 cốc 250 ml', 258]],
  'Sữa bò tách béo': [['1 hộp 180 ml', 186], ['1 cốc 250 ml', 258]],
  'Sữa đậu nành (100g đậu/lít)': [['1 cốc 250 ml', 255]],
  'Sữa chua (từ sữa bò)': [['1 hộp', 100]],
  'Sữa chua Hy Lạp không đường, không béo': [['1 hộp', 100]],
  'Bột whey protein': [['1 muỗng (scoop)', 30]],
  'Ức gà không da (sống)': [['1 miếng ức', 150]],
  'Ức gà không da, luộc': [['1 miếng ức', 120]],
  'Ức gà không da, nướng': [['1 miếng ức', 120]],
  'Má đùi gà có da (sống)': [['1 má đùi (bỏ xương)', 120]],
  'Đùi tỏi gà có da (sống)': [['1 đùi tỏi (bỏ xương)', 70]],
  'Cánh gà có da (sống)': [['1 cánh (bỏ xương)', 50]],
  'Cánh gà có da, nướng': [['1 cánh (bỏ xương)', 35]],
  'Đậu phụ': [['1 bìa', 120]],
  'Hạnh nhân': [['1 nắm (~23 hạt)', 28]],
  'Lạc hạt': [['1 nắm', 30]],
  'Bơ đậu phộng (không muối)': [['1 thìa canh', 16]],
  'Chuối tiêu': [['1 quả', 80]],
  'Chuối tây': [['1 quả', 70]],
  'Táo tây': [['1 quả', 150]],
  'Cam': [['1 quả', 130]],
  'Khoai lang': [['1 củ vừa', 150]],
  'Khoai lang nướng': [['1 củ vừa', 130]],
  'Dầu đậu tương': [['1 thìa canh', 14]],
  'Dầu lạc': [['1 thìa canh', 14]],
  'Dầu oliu': [['1 thìa canh', 14]],
  'Mỡ lợn nước': [['1 thìa canh', 13]],
  'Đường kính': [['1 thìa cà phê', 4]],
  'Mật ong': [['1 thìa canh', 21]],
  'Nước mắm cá': [['1 thìa canh', 18]],
  'Muối': [['1 thìa cà phê', 6]],
}

-- Ảnh mẫu cho món mẫu — SINH bởi scripts/foods/build-dish-images.mjs từ scripts/foods/dish-images.mjs, KHÔNG sửa tay.
-- Ảnh: Wikimedia Commons, giấy phép tự do; file tĩnh ở public/seed/dishes/. credit + source_url phải hiện kèm ảnh.
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/ga-luoc.webp', 'N509FZ · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:White_cut_chicken_at_Xiaoshaoxing,_Shanghai_(20191113183809).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Gà luộc'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/ga-xao-sa-ot.webp', 'Brian Bilek · CC BY-SA 2.0', 'https://commons.wikimedia.org/wiki/File:Lemongrass_chicken_at_Quan_Nem_Ninh_Hoa,_Sacramento.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Gà xào sả ớt'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/uc-ga-ap-chao.webp', 'FarhanTahir90 · CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Chiken_Steaks_in_Pakistan.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Ức gà áp chảo'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/thit-kho-trung.webp', 'HungryHuy · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Vietnamese_thit_kho,_braised_pork_belly_and_boiled_eggs_-_47693228262.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Thịt kho trứng'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/thit-kho-tieu.webp', 'Mkat · CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Thit-kho-tieu-1.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Thịt kho tiêu'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/thit-rang-chay-canh.webp', 'Buileducanh · CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Thit_rang_chay_canh.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Thịt rang cháy cạnh'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/thit-lon-luoc.webp', 'Phương Huy · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Cam_L%E1%BB%99_th5n2023_(m%C3%B3n_%C4%83n_%C4%91%E1%BB%8Ba_ph%C6%B0%C6%A1ng,_th%E1%BB%8Bt_lu%E1%BB%99c_Cam_L%E1%BB%99)_(1).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Thịt lợn luộc'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/suon-xao-chua-ngot.webp', 'Liam Chucao Maixlld · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:HK_CWB_%E9%8A%85%E9%91%BC%E7%81%A3_Causeway_Bay_%E6%BA%AB%E8%8E%8E%E5%A4%A7%E5%BB%88_Windsor_House_mall_shop_%E7%A8%BB%E9%A6%99%E9%85%92%E5%AE%B6_Tao_Heung_Restaurant_%E7%B3%96%E9%86%8B%E6%8E%92%E9%AA%A8_Sweet_and_Sour_Ribs_September_2022_Px3_01.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Sườn xào chua ngọt'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/cha-la-lot.webp', 'Phương Huy · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Nh%C3%A0_m%E1%BB%87_d%E1%BB%8Bp_L%E1%BB%85_2_th%C3%A1ng_9_n2023_(m%C3%B3n_ch%E1%BA%A3_cu%E1%BB%91n_l%C3%A1_l%E1%BB%91t)_(1).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Chả lá lốt'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/nem-ran.webp', 'Phương Huy · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Ch%E1%BA%A3_gi%C3%B2_SG_(nem_r%C3%A1n_gi%C3%B2n)_%E1%BB%9F_qu%C3%A1n_b%C3%BAn_ri%C3%AAu_B%C3%A0_Ti_ng26th7n2023_(1).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Nem rán'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/dau-phu-sot-ca-chua.webp', 'HungryHuy · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Dau_sot_ca,_tofu_stuffed_with_pork,_in_tomato_sauce.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Đậu phụ sốt cà chua'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/trung-ran.webp', 'Balise42 · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Two_fried_eggs.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Trứng rán'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/ca-kho-to.webp', 'Charles Haynes · CC BY-SA 2.0', 'https://commons.wikimedia.org/wiki/File:C%C3%A1_kho_t%E1%BB%99,_c%C3%A1_h%C3%BA.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Cá kho tộ'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/ca-ro-phi-ran.webp', 'HaJunkiyada · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Liat_Portal_for_Foodie_Disorder_-_Fried_Tilapia_with_Roasted_Potatoes_and_Onions.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Cá rô phi rán'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/ca-thu-sot-ca-chua.webp', 'Phương Huy · Public domain', 'https://commons.wikimedia.org/wiki/File:C%C3%A1_thu_s%E1%BB%91t_c%C3%A0,_th%C3%A1ng_4_n%C4%83m_2018_(1).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Cá thu sốt cà chua'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/ca-hoi-ap-chao.webp', 'PattayaPatrol · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:DFC_1189_Pan-seared_salmon_fillet_served_with_creamy_mashed_potatoes_a_lime_wedge_and_a_side_of_sauce.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Cá hồi áp chảo'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/muc-xao-can-tay.webp', 'Phương Huy · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:M%C3%B3n_%C4%83n_T%E1%BA%BFt_2023_(n%E1%BA%A5u_m%C3%B3n_m%E1%BB%B1c_x%C3%A0o,_%C4%91ang_x%C3%A0o_tr%C3%AAn_b%E1%BA%BFp)_(3).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Mực xào cần tây'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/bo-xao-hanh-tay.webp', 'Phương Huy · CC0', 'https://commons.wikimedia.org/wiki/File:Cafe_UK_ng2th10n2022_(B%C3%B2_x%C3%A0o_h%C3%A0nh_t%C3%A2y)_(5).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Bò xào hành tây'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/rau-muong-xao-toi.webp', 'Phương Huy · Public domain', 'https://commons.wikimedia.org/wiki/File:Rau_mu%E1%BB%91ng_x%C3%A0o_t%E1%BB%8Fi,_th%C3%A1ng_4_n%C4%83m_2018.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Rau muống xào tỏi'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/rau-muong-luoc.webp', 'Buileducanh · CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Noi_rau_muong_luoc.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Rau muống luộc'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/sup-lo-xanh-luoc.webp', 'HaJunkiyada · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Liat_Portal_for_Foodie_Disorder_-_Steamed_Broccoli.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Súp lơ xanh luộc'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/salad-dua-chuot-ca-chua.webp', 'Lablascovegmenu from London · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Tomato_and_cucumber_salad_(7592786440).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Salad dưa chuột cà chua'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/canh-chua-ca.webp', 'Jason Hutchens · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Canhchua2.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Canh chua cá'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/canh-bi-dao-nau-tom.webp', 'Phương Huy · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:B%E1%BB%AFa_c%C6%A1m_nh%C3%A0_Mheo,_ng19th1n2020_(n%E1%BB%93i_canh_b%C3%AD_%C4%91ao).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Canh bí đao nấu tôm'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/canh-cai-nau-thit.webp', 'Nguyen Thi Quynh Tram · CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Canh_bap_cai_cuon_thit.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Canh cải nấu thịt'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/canh-trung-ca-chua.webp', 'Nguyen Thi Quynh Tram · CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Canh_ca_chua_trung.png'
FROM dishes WHERE source = 'preset' AND name = 'Canh trứng cà chua'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/pho-bo-tai.webp', 'Phương Huy · CC0', 'https://commons.wikimedia.org/wiki/File:T%C3%B4_ph%E1%BB%9F_b%C3%B2_t%C3%A1i_%E1%BB%9F_Q1_(Ph%E1%BB%9F_24)_ng25th9n2023_(1).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Phở bò tái'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/pho-bo-chin.webp', 'T.Tseng · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Pho,_beef_brisket,_tendon,_tripe_(30025527004).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Phở bò chín'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/pho-ga.webp', 'David McKelvey from Brisbane, Australia · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Pho_ga_(noodle_soup_with_chicken),_Hanoi_(6945821707).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Phở gà'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/bun-cha.webp', 'Viethavvh · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:B%C3%BAn_ch%E1%BA%A3_Th%E1%BB%A5y_Khu%C3%AA.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Bún chả'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/bun-rieu-cua.webp', 'Alpha from Melbourne, Australia · CC BY-SA 2.0', 'https://commons.wikimedia.org/wiki/File:Bun_Rieu_-_Dakao_Hoang.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Bún riêu cua'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/bun-bo-hue.webp', 'TarnishedPath · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:B%C3%BAn_b%C3%B2_Hu%E1%BA%BF-Feb_2025.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Bún bò Huế'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/mien-ga.webp', 'Phương Huy · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:V%C3%B9ng_C%C3%B9a_%E1%BB%9F_Cam_L%E1%BB%99_th5n2023-Ph%C6%B0%C6%A1ng_Gia_Trang_(t%C3%B4_mi%E1%BA%BFn_g%C3%A0)_(1).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Miến gà'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/com-rang-trung.webp', 'Viethavvh · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:C%C6%A1m_chi%C3%AAn.JPG'
FROM dishes WHERE source = 'preset' AND name = 'Cơm rang trứng'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/com-tam-suon.webp', 'Phương Huy · CC0', 'https://commons.wikimedia.org/wiki/File:C%C6%A1m_t%E1%BA%A5m_SG_(c%C6%A1m_s%C6%B0%E1%BB%9Dn)_ng27th9n2020_(1).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Cơm tấm sườn'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/xoi-dau-xanh.webp', 'Viethavvh · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:X%C3%B4i_x%C3%A9o.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Xôi đậu xanh'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/chao-trang.webp', 'Memberofc1 · CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Ch%C3%A1o_tr%E1%BA%AFng_h%E1%BB%99t_v%E1%BB%8Bt_mu%E1%BB%91i.JPG'
FROM dishes WHERE source = 'preset' AND name = 'Cháo trắng'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/chao-thit-bam.webp', 'Baoothersks · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:M%E1%BB%99t_t%C3%B4_ch%C3%A1o_h%C3%A0nh.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Cháo thịt bằm'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/chao-ga.webp', 'Phương Huy · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Ch%C3%A1o_g%C3%A0_nh%C3%A0_l%C3%A0m,_th%C3%A1ng_5_n%C4%83m_2020_(3).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Cháo gà'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/banh-mi-trung-op-la.webp', 'Vinnie Cartabiano · CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:M%E1%BB%99t_ph%E1%BA%A7n_b%C3%A1nh_m%C3%AC_ch%E1%BA%A3o_v%E1%BB%9Bi_tr%E1%BB%A9ng_v%C3%A0_ch%E1%BA%A3_(38657217774).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Bánh mì trứng ốp la'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/banh-mi-cha-lua.webp', 'Bahnfrend · CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Traditional_Viet_Pork_Sausage_B%C3%A1nh_M%C3%AC,_B%C3%A1nh_M%C3%AC_B%C3%A1nh_M%C3%AC_Westfield_Carousel,_2026_(01).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Bánh mì chả lụa'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/yen-mach-sua-chuoi.webp', 'Shisma · CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:Banana_oatmeal.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Yến mạch sữa chuối'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/che-do-den.webp', 'Phương Huy · Public domain', 'https://commons.wikimedia.org/wiki/File:Ch%C3%A8_%C4%91%E1%BA%ADu_%C4%91en_nh%C3%A0_l%C3%A0m_(th%C3%A1ng_1_n%C4%83m_2018)_(1).jpg'
FROM dishes WHERE source = 'preset' AND name = 'Chè đỗ đen'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/sinh-to-whey-chuoi.webp', 'Ourlibrary · CC0', 'https://commons.wikimedia.org/wiki/File:Banana_Smoothie.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Sinh tố whey chuối'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);
--> statement-breakpoint
INSERT INTO nutrition_media (dish_id, position, kind, url, credit, source_url)
SELECT id, 0, 'image', '/seed/dishes/ca-phe-sua-da.webp', '하나두리 · CC BY 2.0 kr', 'https://commons.wikimedia.org/wiki/File:C%C3%A0_ph%C3%AA_s%E1%BB%AFa_%C4%91%C3%A1.jpg'
FROM dishes WHERE source = 'preset' AND name = 'Cà phê sữa đá'
  AND NOT EXISTS (SELECT 1 FROM nutrition_media m WHERE m.dish_id = dishes.id);

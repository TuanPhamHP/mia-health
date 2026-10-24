import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// Thư viện bài tập
// ---------------------------------------------------------------------------

export const EXERCISE_CATEGORIES = [
	'kegel',
	'strength',
	'gymnastics',
	'stretching',
	'cardio',
	'breathing',
	'other',
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

// Cách thực hiện — quyết định timeline của màn hình tập:
//   reps     — sets × reps, user tự bấm "Xong set" (hít đất, squat…)
//   hold     — sets × reps, mỗi rep = giữ holdSec + thả relaxSec, chạy tự động (kegel, thở)
//   duration — sets × durationSec, đếm ngược tự động (plank, giãn cơ…)
//   combo    — bài kết hợp: chuỗi bài con (exercise_components), chạy theo `comboStyle`
export const SINGLE_MODES = ['reps', 'hold', 'duration'] as const;
export type SingleMode = (typeof SINGLE_MODES)[number];
export const EXERCISE_MODES = [...SINGLE_MODES, 'combo'] as const;
export type ExerciseMode = (typeof EXERCISE_MODES)[number];

// Cách chạy bài kết hợp:
//   circuit  — luân phiên theo vòng: mỗi vòng 1 set của từng bài con; `sets` = số vòng,
//              `restSec` = nghỉ giữa vòng
//   sequence — lần lượt: hết các set của bài con này mới sang bài kế, y như các bài rời
//              trong giáo án
export const COMBO_STYLES = ['circuit', 'sequence'] as const;
export type ComboStyle = (typeof COMBO_STYLES)[number];

export const exercises = sqliteTable(
	'exercises',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		category: text('category', { enum: EXERCISE_CATEGORIES }).notNull(),
		mode: text('mode', { enum: EXERCISE_MODES }).notNull(),
		// Chỉ có nghĩa khi mode = 'combo' — NOT NULL cùng lý do với các cột thông số bên dưới.
		comboStyle: text('combo_style', { enum: COMBO_STYLES }).notNull().default('circuit'),
		// Thông số mặc định. Cả 6 cột luôn có giá trị — `mode` quyết định cột nào được
		// dùng; để NOT NULL thì đổi mode không bao giờ rơi vào trạng thái thiếu số.
		sets: integer('sets').notNull().default(3),
		reps: integer('reps').notNull().default(10),
		holdSec: integer('hold_sec').notNull().default(5),
		relaxSec: integer('relax_sec').notNull().default(5),
		durationSec: integer('duration_sec').notNull().default(30),
		restSec: integer('rest_sec').notNull().default(30), // nghỉ giữa các set
		instructions: text('instructions'),
		isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [
		uniqueIndex('exercises_name_unique').on(t.name),
		index('exercises_category_idx').on(t.category),
	],
);

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

// Bài con của bài kết hợp. Chỉ một tầng: bài con luôn là bài đơn (service chặn lồng).
export const exerciseComponents = sqliteTable(
	'exercise_components',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		// Bài con là một phần của bài kết hợp — xoá bài kết hợp thì danh sách đi theo.
		comboId: integer('combo_id')
			.notNull()
			.references(() => exercises.id, { onDelete: 'cascade' }),
		// RESTRICT: service chặn xoá bài đang nằm trong bài kết hợp (409, gợi ý lưu trữ),
		// FK chỉ là lưới an toàn cuối.
		exerciseId: integer('exercise_id')
			.notNull()
			.references(() => exercises.id, { onDelete: 'restrict' }),
		position: integer('position').notNull().default(0),
		// Thông số RIÊNG của bài con — copy từ thư viện lúc thêm, như routine_items.
		// Luân phiên: `sets` không dùng (số vòng nằm ở bài kết hợp), `restSec` = nghỉ trước
		// bài kế trong vòng. Lần lượt: nghĩa y như bài rời.
		sets: integer('sets').notNull(),
		reps: integer('reps').notNull(),
		holdSec: integer('hold_sec').notNull(),
		relaxSec: integer('relax_sec').notNull(),
		durationSec: integer('duration_sec').notNull(),
		restSec: integer('rest_sec').notNull(),
		// Không có updated_at: danh sách bài con luôn được ghi đè cả cụm khi sửa.
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [
		index('exercise_components_combo_idx').on(t.comboId),
		index('exercise_components_exercise_idx').on(t.exerciseId),
	],
);

export type ExerciseComponent = typeof exerciseComponents.$inferSelect;
export type NewExerciseComponent = typeof exerciseComponents.$inferInsert;

// ---------------------------------------------------------------------------
// Ảnh / video hướng dẫn của bài tập
// ---------------------------------------------------------------------------

//   image   — ảnh tải lên R2 (storage_key có giá trị, url = '/media/<key>') hoặc link https ngoài
//   youtube — link YouTube đã chuẩn hoá (shared/utils/media.ts), phát bằng iframe youtube-nocookie
export const MEDIA_KINDS = ['image', 'youtube'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const exerciseMedia = sqliteTable(
	'exercise_media',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		exerciseId: integer('exercise_id')
			.notNull()
			.references(() => exercises.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0),
		kind: text('kind', { enum: MEDIA_KINDS }).notNull(),
		url: text('url').notNull(),
		// Key object trong R2 nếu là ảnh tải lên, null = link ngoài. Xoá media / xoá bài tập
		// phải xoá cả object — CASCADE của D1 không với tới R2.
		storageKey: text('storage_key'),
		caption: text('caption'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [index('exercise_media_exercise_idx').on(t.exerciseId)],
);

export type ExerciseMedia = typeof exerciseMedia.$inferSelect;
export type NewExerciseMedia = typeof exerciseMedia.$inferInsert;

// ---------------------------------------------------------------------------
// Giáo án (routine) = một buổi tập: danh sách bài có thứ tự. KHÔNG mang lịch — lịch nằm ở
// chương trình (program_slots), một chỗ duy nhất để biết vì sao hôm nay phải tập buổi này.
// ---------------------------------------------------------------------------

export const routines = sqliteTable(
	'routines',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		description: text('description'),
		prepSec: integer('prep_sec').notNull().default(5), // đếm ngược chuẩn bị trước mỗi bài
		sortOrder: integer('sort_order').notNull().default(0),
		isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [uniqueIndex('routines_name_unique').on(t.name)],
);

export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;

export const routineItems = sqliteTable(
	'routine_items',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		// Item là con của giáo án — xoá giáo án thì item đi theo.
		routineId: integer('routine_id')
			.notNull()
			.references(() => routines.id, { onDelete: 'cascade' }),
		// RESTRICT: service chặn xoá bài tập đang nằm trong giáo án (409, gợi ý lưu trữ),
		// FK chỉ là lưới an toàn cuối.
		exerciseId: integer('exercise_id')
			.notNull()
			.references(() => exercises.id, { onDelete: 'restrict' }),
		position: integer('position').notNull().default(0),
		// Thông số RIÊNG của item — copy từ bài tập lúc thêm, sửa độc lập sau đó.
		// Cùng một bài kegel có thể 3×10 ở giáo án sáng và 2×15 ở giáo án tối.
		sets: integer('sets').notNull(),
		reps: integer('reps').notNull(),
		holdSec: integer('hold_sec').notNull(),
		relaxSec: integer('relax_sec').notNull(),
		durationSec: integer('duration_sec').notNull(),
		restSec: integer('rest_sec').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [
		index('routine_items_routine_idx').on(t.routineId),
		index('routine_items_exercise_idx').on(t.exerciseId),
	],
);

export type RoutineItem = typeof routineItems.$inferSelect;
export type NewRoutineItem = typeof routineItems.$inferInsert;

// ---------------------------------------------------------------------------
// Chương trình = mục tiêu + các giai đoạn nối tiếp, mỗi giai đoạn một lịch tuần (thứ → giáo án)
// ---------------------------------------------------------------------------

export const PROGRAM_GOALS = ['fat_loss', 'muscle', 'health', 'rehab', 'pelvic', 'mobility', 'other'] as const;
export type ProgramGoal = (typeof PROGRAM_GOALS)[number];

export const programs = sqliteTable(
	'programs',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		goal: text('goal', { enum: PROGRAM_GOALS }).notNull(),
		description: text('description'), // "vì sao" — hiện ở màn Hôm nay
		// 'YYYY-MM-DD' giờ địa phương do client gửi (như sessions.date); null = không theo.
		// Tuần 1 = tuần ISO chứa ngày này. Nhiều chương trình được theo cùng lúc.
		startDate: text('start_date'),
		// Hết giai đoạn cuối: true ⇒ quay lại giai đoạn 1, false ⇒ chương trình hoàn thành.
		repeat: integer('repeat', { mode: 'boolean' }).notNull().default(false),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [uniqueIndex('programs_name_unique').on(t.name)],
);

export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;

export const programPhases = sqliteTable(
	'program_phases',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		programId: integer('program_id')
			.notNull()
			.references(() => programs.id, { onDelete: 'cascade' }),
		position: integer('position').notNull().default(0),
		name: text('name').notNull(),
		weeks: integer('weeks').notNull().default(4),
		note: text('note'), // lời dặn của giai đoạn (VD "tăng tạ 5–10%") — hiện ở màn Hôm nay
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [index('program_phases_program_idx').on(t.programId)],
);

export type ProgramPhase = typeof programPhases.$inferSelect;
export type NewProgramPhase = typeof programPhases.$inferInsert;

// Một buổi trong lịch tuần của giai đoạn. Giáo án THAM CHIẾU (không copy như item giáo án):
// sửa giáo án là sửa buổi tập ở mọi chương trình dùng nó — cùng lý do với bài kết hợp.
export const programSlots = sqliteTable(
	'program_slots',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		phaseId: integer('phase_id')
			.notNull()
			.references(() => programPhases.id, { onDelete: 'cascade' }),
		weekday: integer('weekday').notNull(), // ISO 1 = Thứ 2 … 7 = Chủ nhật
		// RESTRICT: service chặn xoá giáo án đang nằm trong chương trình (409, gợi ý lưu trữ).
		routineId: integer('routine_id')
			.notNull()
			.references(() => routines.id, { onDelete: 'restrict' }),
		position: integer('position').notNull().default(0), // thứ tự trong cùng một ngày
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [
		index('program_slots_phase_idx').on(t.phaseId),
		index('program_slots_routine_idx').on(t.routineId),
	],
);

export type ProgramSlot = typeof programSlots.$inferSelect;
export type NewProgramSlot = typeof programSlots.$inferInsert;

// Thay đổi lịch CHỈ cho một ngày — sửa lâu dài thì sửa chương trình:
//   skip — bỏ buổi `routineId` của chương trình `programId` hôm đó
//   swap — tập `replacementId` thay cho buổi `routineId` của chương trình `programId`
//   add  — thêm buổi `routineId` ngoài mọi chương trình (`programId` null)
export const PLAN_CHANGE_KINDS = ['skip', 'swap', 'add'] as const;
export type PlanChangeKind = (typeof PLAN_CHANGE_KINDS)[number];

export const planChanges = sqliteTable(
	'plan_changes',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // 'YYYY-MM-DD' giờ địa phương của client
		kind: text('kind', { enum: PLAN_CHANGE_KINDS }).notNull(),
		programId: integer('program_id').references(() => programs.id, { onDelete: 'cascade' }),
		routineId: integer('routine_id')
			.notNull()
			.references(() => routines.id, { onDelete: 'cascade' }),
		replacementId: integer('replacement_id').references(() => routines.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [index('plan_changes_date_idx').on(t.date)],
);

export type PlanChange = typeof planChanges.$inferSelect;
export type NewPlanChange = typeof planChanges.$inferInsert;

// ---------------------------------------------------------------------------
// Buổi tập đã thực hiện
// ---------------------------------------------------------------------------

export const workoutSessions = sqliteTable(
	'workout_sessions',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // 'YYYY-MM-DD' theo giờ ĐỊA PHƯƠNG của client
		// Xoá giáo án KHÔNG được xoá lịch sử — chỉ cắt liên kết, `title` giữ tên.
		routineId: integer('routine_id').references(() => routines.id, { onDelete: 'set null' }),
		title: text('title').notNull(), // snapshot tên giáo án / nhãn tự do
		startedAt: integer('started_at', { mode: 'timestamp' }),
		durationSec: integer('duration_sec').notNull().default(0),
		completed: integer('completed', { mode: 'boolean' }).notNull().default(true),
		feeling: integer('feeling'), // 1–5, nullable
		note: text('note'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [
		index('workout_sessions_date_idx').on(t.date),
		index('workout_sessions_routine_idx').on(t.routineId),
	],
);

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;

export const sessionEntries = sqliteTable(
	'session_entries',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		sessionId: integer('session_id')
			.notNull()
			.references(() => workoutSessions.id, { onDelete: 'cascade' }),
		// Xoá bài tập khỏi thư viện vẫn giữ lịch sử: cắt FK, name/category là snapshot.
		exerciseId: integer('exercise_id').references(() => exercises.id, { onDelete: 'set null' }),
		exerciseName: text('exercise_name').notNull(),
		category: text('category', { enum: EXERCISE_CATEGORIES }).notNull(),
		// Luôn là bài đơn: bài kết hợp được ghi thành từng bài con.
		mode: text('mode', { enum: SINGLE_MODES }).notNull(),
		position: integer('position').notNull().default(0),
		setsPlanned: integer('sets_planned').notNull(),
		setsDone: integer('sets_done').notNull(),
		reps: integer('reps').notNull(),
		holdSec: integer('hold_sec').notNull(),
		durationSec: integer('duration_sec').notNull(),
	},
	(t) => [index('session_entries_session_idx').on(t.sessionId)],
);

export type SessionEntry = typeof sessionEntries.$inferSelect;
export type NewSessionEntry = typeof sessionEntries.$inferInsert;

// ---------------------------------------------------------------------------
// Dinh dưỡng — thực phẩm (nguyên liệu). Số liệu trên 100 g PHẦN ĂN ĐƯỢC.
// ---------------------------------------------------------------------------

// Cây 2 cấp: nhóm (Thịt) → loại (Gà). Thực phẩm gắn vào loại, hoặc thẳng vào nhóm không chia loại.
export const foodCategories = sqliteTable(
	'food_categories',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		// RESTRICT: service chặn xoá nhóm còn loại con / còn thực phẩm (409).
		parentId: integer('parent_id').references((): AnySQLiteColumn => foodCategories.id, { onDelete: 'restrict' }),
		name: text('name').notNull(),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [index('food_categories_parent_idx').on(t.parentId)],
);

export type FoodCategory = typeof foodCategories.$inferSelect;
export type NewFoodCategory = typeof foodCategories.$inferInsert;

//   vn_fct_2007    — Bảng thành phần thực phẩm Việt Nam 2007 (Viện Dinh dưỡng), source_code = mã số
//   usda_sr_legacy — USDA FoodData Central SR Legacy 2018, source_code = FDC ID
//   user           — người dùng tự nhập
export const FOOD_SOURCES = ['vn_fct_2007', 'usda_sr_legacy', 'user'] as const;
export type FoodSource = (typeof FOOD_SOURCES)[number];

// Số liệu dinh dưỡng là REAL: giá trị đo có sai số phân tích sẵn (±10%), không phải dữ liệu
// cần chính xác như thời lượng. NULL = bảng nguồn không có số liệu — KHÁC 0, UI hiện "—".
// Glucid = carbohydrate KHÔNG gồm xơ (chuẩn Codex, như bảng VN); số USDA đã trừ xơ khi nhập.
// Thứ tự cột khớp NUTRIENTS ở shared/utils/nutrients.ts. Hàm (không phải object) để mỗi bảng
// có bộ column builder riêng — dùng chung cho foods và meal_entries (snapshot).
const nutrientColumns = () => ({
	energyKcal: real('energy_kcal').notNull(),
	waterG: real('water_g'),
	proteinG: real('protein_g'),
	fatG: real('fat_g'),
	satFatG: real('sat_fat_g'),
	monoFatG: real('mono_fat_g'),
	polyFatG: real('poly_fat_g'),
	transFatG: real('trans_fat_g'),
	cholesterolMg: real('cholesterol_mg'),
	carbG: real('carb_g'),
	fiberG: real('fiber_g'),
	sugarG: real('sugar_g'),
	sodiumMg: real('sodium_mg'),
	potassiumMg: real('potassium_mg'),
	calciumMg: real('calcium_mg'),
	phosphorusMg: real('phosphorus_mg'),
	magnesiumMg: real('magnesium_mg'),
	ironMg: real('iron_mg'),
	zincMg: real('zinc_mg'),
	vitaminAUg: real('vitamin_a_ug'), // RAE
	vitaminB1Mg: real('vitamin_b1_mg'),
	vitaminB2Mg: real('vitamin_b2_mg'),
	niacinMg: real('niacin_mg'),
	vitaminB6Mg: real('vitamin_b6_mg'),
	folateUg: real('folate_ug'),
	vitaminB12Ug: real('vitamin_b12_ug'),
	vitaminCMg: real('vitamin_c_mg'),
	vitaminDUg: real('vitamin_d_ug'),
	vitaminEMg: real('vitamin_e_mg'),
});

export const foods = sqliteTable(
	'foods',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		// RESTRICT: đổi / xoá nhóm phải chuyển thực phẩm trước.
		categoryId: integer('category_id')
			.notNull()
			.references(() => foodCategories.id, { onDelete: 'restrict' }),
		name: text('name').notNull(),
		source: text('source', { enum: FOOD_SOURCES }).notNull().default('user'),
		sourceCode: text('source_code'), // mã gốc để tra lại bảng nguồn
		sourceName: text('source_name'), // tên gốc trong bảng nguồn (tiếng Anh)
		refusePct: real('refuse_pct'), // % thải bỏ khi mua (xương, vỏ…) — số liệu tính trên phần ăn được
		note: text('note'),
		...nutrientColumns(),
		isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [uniqueIndex('foods_name_unique').on(t.name), index('foods_category_idx').on(t.categoryId)],
);

export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;

// Khẩu phần quen dùng: "1 quả trứng" = 50 g, "1 bát cơm" = 150 g — để nhập theo đơn vị đời thường.
export const foodPortions = sqliteTable(
	'food_portions',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		foodId: integer('food_id')
			.notNull()
			.references(() => foods.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		grams: real('grams').notNull(),
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [index('food_portions_food_idx').on(t.foodId)],
);

export type FoodPortion = typeof foodPortions.$inferSelect;
export type NewFoodPortion = typeof foodPortions.$inferInsert;

// ---------------------------------------------------------------------------
// Món ăn = công thức từ thực phẩm trong kho. Dinh dưỡng KHÔNG lưu — luôn tính từ nguyên liệu
// (sửa thực phẩm là món đổi theo, như bài kết hợp lấy bài con live).
// ---------------------------------------------------------------------------

export const DISH_CATEGORIES = ['main', 'veg', 'soup', 'noodle', 'rice', 'snack', 'drink', 'other'] as const;
export type DishCategory = (typeof DISH_CATEGORIES)[number];

//   preset — món mẫu nạp bằng migration (công thức ước lượng phổ biến)
//   user   — người dùng tự soạn
export const DISH_SOURCES = ['preset', 'user'] as const;
export type DishSource = (typeof DISH_SOURCES)[number];

export const dishes = sqliteTable(
	'dishes',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		category: text('category', { enum: DISH_CATEGORIES }).notNull(),
		description: text('description'), // cách nấu / ghi chú
		// Công thức nấu cho bao nhiêu phần — dinh dưỡng 1 phần = tổng nguyên liệu / servings.
		servings: integer('servings').notNull().default(1),
		// Khối lượng món sau khi nấu (cân cả nồi) — có thì tính được dinh dưỡng theo gam món chín.
		cookedWeightG: real('cooked_weight_g'),
		source: text('source', { enum: DISH_SOURCES }).notNull().default('user'),
		isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [uniqueIndex('dishes_name_unique').on(t.name), index('dishes_category_idx').on(t.category)],
);

export type Dish = typeof dishes.$inferSelect;
export type NewDish = typeof dishes.$inferInsert;

export const dishIngredients = sqliteTable(
	'dish_ingredients',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		dishId: integer('dish_id')
			.notNull()
			.references(() => dishes.id, { onDelete: 'cascade' }),
		// RESTRICT: service chặn xoá thực phẩm đang là nguyên liệu (409, gợi ý lưu trữ).
		foodId: integer('food_id')
			.notNull()
			.references(() => foods.id, { onDelete: 'restrict' }),
		grams: real('grams').notNull(), // khối lượng PHẦN ĂN ĐƯỢC của nguyên liệu cho cả công thức
		position: integer('position').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [index('dish_ingredients_dish_idx').on(t.dishId), index('dish_ingredients_food_idx').on(t.foodId)],
);

export type DishIngredient = typeof dishIngredients.$inferSelect;
export type NewDishIngredient = typeof dishIngredients.$inferInsert;

// ---------------------------------------------------------------------------
// Thực đơn (mẫu tái dùng) + nhật ký ăn theo ngày
// ---------------------------------------------------------------------------

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type Meal = (typeof MEALS)[number];

//   serving — số phần của món (dinh dưỡng 1 phần = công thức / servings)
//   g       — gam: thực phẩm (phần ăn được), hoặc món chín đã cân cả nồi (`cooked_weight_g`)
export const ENTRY_UNITS = ['serving', 'g'] as const;
export type EntryUnit = (typeof ENTRY_UNITS)[number];

export const menus = sqliteTable(
	'menus',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		description: text('description'),
		isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [uniqueIndex('menus_name_unique').on(t.name)],
);

export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;

// Thực đơn THAM CHIẾU món / thực phẩm (dinh dưỡng tính live) — áp dụng vào ngày thì mới chụp
// snapshot sang meal_entries. RESTRICT: xoá món / thực phẩm đang nằm trong thực đơn ⇒ 409.
export const menuItems = sqliteTable(
	'menu_items',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		menuId: integer('menu_id')
			.notNull()
			.references(() => menus.id, { onDelete: 'cascade' }),
		meal: text('meal', { enum: MEALS }).notNull(),
		position: integer('position').notNull().default(0),
		dishId: integer('dish_id').references(() => dishes.id, { onDelete: 'restrict' }),
		foodId: integer('food_id').references(() => foods.id, { onDelete: 'restrict' }),
		amount: real('amount').notNull(),
		unit: text('unit', { enum: ENTRY_UNITS }).notNull(),
		portionLabel: text('portion_label'), // "1 bát con" — chỉ để hiển thị, `amount` đã quy ra gam
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(t) => [
		index('menu_items_menu_idx').on(t.menuId),
		index('menu_items_dish_idx').on(t.dishId),
		index('menu_items_food_idx').on(t.foodId),
		check('menu_items_one_target', sql`(${t.dishId} IS NULL) <> (${t.foodId} IS NULL)`),
	],
);

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;

// Một dòng đã ăn. Dinh dưỡng là SNAPSHOT lúc ghi (như session_entries của buổi tập): sửa công
// thức / thực phẩm về sau KHÔNG viết lại những gì đã ăn. Xoá món / thực phẩm ⇒ FK về NULL,
// tên + dinh dưỡng vẫn giữ.
export const mealEntries = sqliteTable(
	'meal_entries',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // 'YYYY-MM-DD' giờ địa phương do client gửi
		meal: text('meal', { enum: MEALS }).notNull(),
		position: integer('position').notNull().default(0),
		dishId: integer('dish_id').references(() => dishes.id, { onDelete: 'set null' }),
		foodId: integer('food_id').references(() => foods.id, { onDelete: 'set null' }),
		name: text('name').notNull(), // snapshot tên món / thực phẩm
		amount: real('amount').notNull(),
		unit: text('unit', { enum: ENTRY_UNITS }).notNull(),
		portionLabel: text('portion_label'),
		...nutrientColumns(), // cho đúng lượng đã ăn
		// Chất có nguyên liệu thiếu số liệu (giá trị là mức tối thiểu), phân cách bằng dấu phẩy; null = không.
		missing: text('missing'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [index('meal_entries_date_idx').on(t.date)],
);

export type MealEntry = typeof mealEntries.$inferSelect;
export type NewMealEntry = typeof mealEntries.$inferInsert;

// Mục tiêu dinh dưỡng mỗi ngày — một dòng duy nhất (id = 1, app một người dùng). Chưa có dòng
// ⇒ service trả mặc định. Phần BMI / TDEE sẽ tính gợi ý rồi ghi vào đây.
export const nutritionTargets = sqliteTable('nutrition_targets', {
	id: integer('id').primaryKey(),
	energyKcal: real('energy_kcal').notNull(),
	proteinG: real('protein_g'),
	fatG: real('fat_g'),
	carbG: real('carb_g'),
	fiberG: real('fiber_g'),
	sodiumMg: real('sodium_mg'), // mức TỐI ĐA, không phải mục tiêu cần đạt
	updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export type NutritionTarget = typeof nutritionTargets.$inferSelect;

// ---------------------------------------------------------------------------
// Chỉ số cơ thể: hồ sơ (một dòng) + nhật ký cân nặng ⇒ BMI, BMR, TDEE, mục tiêu dinh dưỡng
// ---------------------------------------------------------------------------

export const SEXES = ['male', 'female'] as const;
export type Sex = (typeof SEXES)[number];

// Hệ số nhân BMR (shared/utils/body.ts): 1,2 · 1,375 · 1,55 · 1,725 · 1,9.
export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const WEIGHT_GOALS = ['lose', 'maintain', 'gain'] as const;
export type WeightGoal = (typeof WEIGHT_GOALS)[number];

// Một dòng duy nhất (id = 1, app một người dùng). Tuổi tính từ năm sinh + ngày client gửi.
export const bodyProfile = sqliteTable('body_profile', {
	id: integer('id').primaryKey(),
	sex: text('sex', { enum: SEXES }).notNull(),
	birthYear: integer('birth_year').notNull(),
	heightCm: real('height_cm').notNull(),
	activityLevel: text('activity_level', { enum: ACTIVITY_LEVELS }).notNull(),
	goal: text('goal', { enum: WEIGHT_GOALS }).notNull(),
	goalRateKg: real('goal_rate_kg').notNull().default(0.5), // kg / tuần — giảm hoặc tăng theo `goal`
	targetWeightKg: real('target_weight_kg'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export type BodyProfile = typeof bodyProfile.$inferSelect;

// Mỗi ngày một lần cân (cân lại trong ngày = ghi đè). Ngày do client gửi, giờ địa phương.
export const bodyWeights = sqliteTable(
	'body_weights',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(),
		weightKg: real('weight_kg').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }),
	},
	(t) => [uniqueIndex('body_weights_date_unique').on(t.date)],
);

export type BodyWeight = typeof bodyWeights.$inferSelect;

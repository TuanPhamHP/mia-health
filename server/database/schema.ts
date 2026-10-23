import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
// Giáo án (routine) = danh sách bài tập có thứ tự + lịch theo thứ trong tuần
// ---------------------------------------------------------------------------

export const routines = sqliteTable(
	'routines',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		description: text('description'),
		// Bitmask thứ trong tuần theo ISO: bit 0 = Thứ 2 … bit 6 = Chủ nhật.
		// 127 = mọi ngày, 0 = không lên lịch (chỉ bắt đầu thủ công).
		scheduleMask: integer('schedule_mask').notNull().default(127),
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

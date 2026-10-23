CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`mode` text NOT NULL,
	`sets` integer DEFAULT 3 NOT NULL,
	`reps` integer DEFAULT 10 NOT NULL,
	`hold_sec` integer DEFAULT 5 NOT NULL,
	`relax_sec` integer DEFAULT 5 NOT NULL,
	`duration_sec` integer DEFAULT 30 NOT NULL,
	`rest_sec` integer DEFAULT 30 NOT NULL,
	`instructions` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_name_unique` ON `exercises` (`name`);--> statement-breakpoint
CREATE INDEX `exercises_category_idx` ON `exercises` (`category`);--> statement-breakpoint
CREATE TABLE `routine_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`sets` integer NOT NULL,
	`reps` integer NOT NULL,
	`hold_sec` integer NOT NULL,
	`relax_sec` integer NOT NULL,
	`duration_sec` integer NOT NULL,
	`rest_sec` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `routine_items_routine_idx` ON `routine_items` (`routine_id`);--> statement-breakpoint
CREATE INDEX `routine_items_exercise_idx` ON `routine_items` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`schedule_mask` integer DEFAULT 127 NOT NULL,
	`prep_sec` integer DEFAULT 5 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routines_name_unique` ON `routines` (`name`);--> statement-breakpoint
CREATE TABLE `session_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`exercise_id` integer,
	`exercise_name` text NOT NULL,
	`category` text NOT NULL,
	`mode` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`sets_planned` integer NOT NULL,
	`sets_done` integer NOT NULL,
	`reps` integer NOT NULL,
	`hold_sec` integer NOT NULL,
	`duration_sec` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `session_entries_session_idx` ON `session_entries` (`session_id`);--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`routine_id` integer,
	`title` text NOT NULL,
	`started_at` integer,
	`duration_sec` integer DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT true NOT NULL,
	`feeling` integer,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workout_sessions_date_idx` ON `workout_sessions` (`date`);--> statement-breakpoint
CREATE INDEX `workout_sessions_routine_idx` ON `workout_sessions` (`routine_id`);
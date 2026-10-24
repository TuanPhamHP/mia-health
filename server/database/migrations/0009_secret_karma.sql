CREATE TABLE `body_profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`sex` text NOT NULL,
	`birth_year` integer NOT NULL,
	`height_cm` real NOT NULL,
	`activity_level` text NOT NULL,
	`goal` text NOT NULL,
	`goal_rate_kg` real DEFAULT 0.5 NOT NULL,
	`target_weight_kg` real,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `body_weights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`weight_kg` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `body_weights_date_unique` ON `body_weights` (`date`);
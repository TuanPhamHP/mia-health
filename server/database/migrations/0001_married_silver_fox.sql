CREATE TABLE `exercise_components` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`combo_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`sets` integer NOT NULL,
	`reps` integer NOT NULL,
	`hold_sec` integer NOT NULL,
	`relax_sec` integer NOT NULL,
	`duration_sec` integer NOT NULL,
	`rest_sec` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`combo_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `exercise_components_combo_idx` ON `exercise_components` (`combo_id`);--> statement-breakpoint
CREATE INDEX `exercise_components_exercise_idx` ON `exercise_components` (`exercise_id`);--> statement-breakpoint
ALTER TABLE `exercises` ADD `combo_style` text DEFAULT 'circuit' NOT NULL;
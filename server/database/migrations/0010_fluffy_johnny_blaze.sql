CREATE TABLE `nutrition_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dish_id` integer,
	`food_id` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`kind` text NOT NULL,
	`url` text NOT NULL,
	`storage_key` text,
	`caption` text,
	`credit` text,
	`source_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "nutrition_media_one_owner" CHECK(("nutrition_media"."dish_id" IS NULL) <> ("nutrition_media"."food_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `nutrition_media_dish_idx` ON `nutrition_media` (`dish_id`);--> statement-breakpoint
CREATE INDEX `nutrition_media_food_idx` ON `nutrition_media` (`food_id`);
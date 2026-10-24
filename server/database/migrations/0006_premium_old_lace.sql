CREATE TABLE `dish_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dish_id` integer NOT NULL,
	`food_id` integer NOT NULL,
	`grams` real NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `dish_ingredients_dish_idx` ON `dish_ingredients` (`dish_id`);--> statement-breakpoint
CREATE INDEX `dish_ingredients_food_idx` ON `dish_ingredients` (`food_id`);--> statement-breakpoint
CREATE TABLE `dishes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`servings` integer DEFAULT 1 NOT NULL,
	`cooked_weight_g` real,
	`source` text DEFAULT 'user' NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dishes_name_unique` ON `dishes` (`name`);--> statement-breakpoint
CREATE INDEX `dishes_category_idx` ON `dishes` (`category`);
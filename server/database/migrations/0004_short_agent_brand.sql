CREATE TABLE `food_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`parent_id`) REFERENCES `food_categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `food_categories_parent_idx` ON `food_categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `food_portions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`food_id` integer NOT NULL,
	`name` text NOT NULL,
	`grams` real NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `food_portions_food_idx` ON `food_portions` (`food_id`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`name` text NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`source_code` text,
	`source_name` text,
	`refuse_pct` real,
	`note` text,
	`energy_kcal` real NOT NULL,
	`water_g` real,
	`protein_g` real,
	`fat_g` real,
	`sat_fat_g` real,
	`mono_fat_g` real,
	`poly_fat_g` real,
	`trans_fat_g` real,
	`cholesterol_mg` real,
	`carb_g` real,
	`fiber_g` real,
	`sugar_g` real,
	`sodium_mg` real,
	`potassium_mg` real,
	`calcium_mg` real,
	`phosphorus_mg` real,
	`magnesium_mg` real,
	`iron_mg` real,
	`zinc_mg` real,
	`vitamin_a_ug` real,
	`vitamin_b1_mg` real,
	`vitamin_b2_mg` real,
	`niacin_mg` real,
	`vitamin_b6_mg` real,
	`folate_ug` real,
	`vitamin_b12_ug` real,
	`vitamin_c_mg` real,
	`vitamin_d_ug` real,
	`vitamin_e_mg` real,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `food_categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `foods_name_unique` ON `foods` (`name`);--> statement-breakpoint
CREATE INDEX `foods_category_idx` ON `foods` (`category_id`);
CREATE TABLE `meal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`meal` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`dish_id` integer,
	`food_id` integer,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`portion_label` text,
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
	`missing` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `meal_entries_date_idx` ON `meal_entries` (`date`);--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_id` integer NOT NULL,
	`meal` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`dish_id` integer,
	`food_id` integer,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`portion_label` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dish_id`) REFERENCES `dishes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "menu_items_one_target" CHECK(("menu_items"."dish_id" IS NULL) <> ("menu_items"."food_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `menu_items_menu_idx` ON `menu_items` (`menu_id`);--> statement-breakpoint
CREATE INDEX `menu_items_dish_idx` ON `menu_items` (`dish_id`);--> statement-breakpoint
CREATE INDEX `menu_items_food_idx` ON `menu_items` (`food_id`);--> statement-breakpoint
CREATE TABLE `menus` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menus_name_unique` ON `menus` (`name`);--> statement-breakpoint
CREATE TABLE `nutrition_targets` (
	`id` integer PRIMARY KEY NOT NULL,
	`energy_kcal` real NOT NULL,
	`protein_g` real,
	`fat_g` real,
	`carb_g` real,
	`fiber_g` real,
	`sodium_mg` real,
	`updated_at` integer
);

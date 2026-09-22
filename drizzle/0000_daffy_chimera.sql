CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`outcome` text DEFAULT 'running' NOT NULL,
	`elapsed_ms` integer,
	`finished_at` integer,
	`player_name` text
);
--> statement-breakpoint
CREATE INDEX `runs_ranking` ON `runs` (`outcome`,`elapsed_ms`,`finished_at`);--> statement-breakpoint
CREATE INDEX `runs_started` ON `runs` (`started_at`);
CREATE TABLE `group_activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`itemId` int,
	`userId` int NOT NULL,
	`userName` varchar(100) NOT NULL,
	`action` enum('item_created','item_updated','item_deleted','quantity_changed','alert_triggered','member_joined','member_left') NOT NULL,
	`previousValue` int,
	`newValue` int,
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`name` varchar(300) NOT NULL,
	`company` varchar(300),
	`modelNumber` varchar(200),
	`quantity` int NOT NULL DEFAULT 0,
	`location` varchar(300),
	`notes` text,
	`imageUrl` text,
	`alertThreshold` int NOT NULL DEFAULT 0,
	`tags` json DEFAULT ('[]'),
	`barcode` varchar(200),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`memberRole` enum('owner','member') NOT NULL DEFAULT 'member',
	`displayName` varchar(100),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`inviteCode` varchar(32) NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `groups_inviteCode_unique` UNIQUE(`inviteCode`)
);

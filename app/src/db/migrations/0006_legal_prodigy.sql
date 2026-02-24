CREATE TABLE "identity_changelog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_key" varchar(32) NOT NULL,
	"old_content" text,
	"new_content" text,
	"reason" text,
	"approved" boolean,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_identity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_key" varchar(32) NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" varchar(16) DEFAULT 'system',
	CONSTRAINT "user_identity_user_file_unique" UNIQUE("user_id","file_key")
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ALTER COLUMN "agent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "self_evolution_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "agent_name" varchar(64) DEFAULT 'Kira';--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "agent_emoji" varchar(8) DEFAULT '⚡';--> statement-breakpoint
ALTER TABLE "user_identity" ADD CONSTRAINT "user_identity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
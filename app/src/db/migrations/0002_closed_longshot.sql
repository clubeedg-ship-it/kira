CREATE TABLE "extracted_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extracted_suggestions" ADD CONSTRAINT "extracted_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_extracted_suggestions_user_id" ON "extracted_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_extracted_suggestions_status" ON "extracted_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_extracted_suggestions_conversation" ON "extracted_suggestions" USING btree ("conversation_id");
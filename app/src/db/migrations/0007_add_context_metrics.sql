CREATE TABLE IF NOT EXISTS "context_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "conversation_id" uuid NOT NULL,
  "message_id" uuid NOT NULL,
  "system_prompt_tokens" integer NOT NULL,
  "history_tokens" integer NOT NULL,
  "response_tokens" integer NOT NULL,
  "efficiency_score" real NOT NULL,
  "classification" varchar(32) NOT NULL,
  "sections_included" jsonb DEFAULT '[]',
  "sections_referenced" jsonb DEFAULT '[]',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_context_metrics_user" ON "context_metrics" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_context_metrics_conv" ON "context_metrics" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_context_metrics_created" ON "context_metrics" ("created_at");

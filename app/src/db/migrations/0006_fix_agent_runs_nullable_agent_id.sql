-- Make agent_id nullable so spawn_agent (ad-hoc runs) can work without a saved agent
ALTER TABLE "agent_runs" ALTER COLUMN "agent_id" DROP NOT NULL;

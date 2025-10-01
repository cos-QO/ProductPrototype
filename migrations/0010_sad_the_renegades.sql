ALTER TABLE "test_executions" ADD COLUMN "automation_level" varchar(20) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "test_executions" ADD COLUMN "test_type" varchar(50) DEFAULT 'integration';--> statement-breakpoint
ALTER TABLE "test_executions" ADD COLUMN "execution_time" integer;--> statement-breakpoint
ALTER TABLE "test_executions" ADD COLUMN "error_count" integer DEFAULT 0;
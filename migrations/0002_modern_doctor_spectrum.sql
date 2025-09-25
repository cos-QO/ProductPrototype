CREATE TABLE "field_mapping_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_field" varchar(255) NOT NULL,
	"target_field" varchar(255) NOT NULL,
	"confidence" integer,
	"strategy" varchar(50) NOT NULL,
	"data_type" varchar(50) NOT NULL,
	"sample_values" jsonb,
	"metadata" jsonb,
	"usage_count" integer DEFAULT 1,
	"last_used_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar,
	"batch_number" integer NOT NULL,
	"start_index" integer NOT NULL,
	"end_index" integer NOT NULL,
	"record_count" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"processing_time" integer,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"worker_thread" varchar(100),
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar,
	"record_index" integer NOT NULL,
	"record_data" jsonb NOT NULL,
	"validation_errors" jsonb,
	"import_status" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"processing_time" integer,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" varchar,
	"file_name" varchar(500),
	"file_size" integer,
	"file_type" varchar(50),
	"total_records" integer,
	"processed_records" integer DEFAULT 0,
	"successful_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'initiated',
	"error_log" jsonb,
	"field_mappings" jsonb,
	"import_config" jsonb,
	"processing_rate" integer,
	"estimated_time_remaining" integer,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "import_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_session_id_import_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."import_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_history" ADD CONSTRAINT "import_history_session_id_import_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."import_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
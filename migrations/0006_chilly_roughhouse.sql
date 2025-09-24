CREATE TABLE "approval_decisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_request_id" varchar NOT NULL,
	"decision" varchar(20) NOT NULL,
	"approver" varchar(100) NOT NULL,
	"reasoning" text,
	"conditions" jsonb,
	"timestamp" timestamp DEFAULT now(),
	"context_at_decision" jsonb NOT NULL,
	"system_recommendation" varchar(20),
	"confidence_score" numeric(3, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "approval_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"approver" varchar(100),
	"total_approvals" integer DEFAULT 0,
	"automated_approvals" integer DEFAULT 0,
	"manual_approvals" integer DEFAULT 0,
	"average_decision_time" interval,
	"correct_decisions" integer DEFAULT 0,
	"incorrect_decisions" integer DEFAULT 0,
	"accuracy_rate" numeric(5, 4),
	"approvals_by_type" jsonb DEFAULT '{}'::jsonb,
	"approvals_by_risk" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"auto_approve_low_risk" boolean DEFAULT false,
	"auto_approve_confidence_threshold" numeric(3, 2) DEFAULT 0.85,
	"preferred_notification_method" varchar(20) DEFAULT 'in_app',
	"delegate_to" varchar(100),
	"delegation_rules" jsonb DEFAULT '{}'::jsonb,
	"decision_patterns" jsonb DEFAULT '{}'::jsonb,
	"performance_metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"context" jsonb NOT NULL,
	"risk_assessment" jsonb NOT NULL,
	"assigned_to" varchar(100)[] NOT NULL,
	"current_approver" varchar(100),
	"escalation_path" varchar(100)[],
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"deadline" timestamp NOT NULL,
	"approved_at" timestamp,
	"approved_by" varchar(100),
	"decision" jsonb,
	"decision_reasoning" text,
	"test_execution_id" varchar,
	"import_session_id" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "automation_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"metric" varchar(100) NOT NULL,
	"current_value" numeric(10, 4) NOT NULL,
	"threshold" numeric(10, 4) NOT NULL,
	"deviation_percentage" numeric(6, 3),
	"component" varchar(100),
	"session_id" varchar,
	"test_execution_id" varchar,
	"user_id" varchar,
	"acknowledged_by" varchar,
	"acknowledged_at" timestamp,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"resolution" text,
	"escalation_level" integer DEFAULT 0,
	"escalated_at" timestamp,
	"escalated_to" varchar,
	"notifications_sent" integer DEFAULT 0,
	"last_notification_at" timestamp,
	"notification_channels" varchar[],
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_confidence" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"context" varchar(200),
	"current_confidence" numeric(5, 4) NOT NULL,
	"previous_confidence" numeric(5, 4),
	"confidence_change" numeric(5, 4),
	"evidence_count" integer DEFAULT 0,
	"validation_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"last_validated_at" timestamp,
	"confidence_decay" numeric(5, 4) DEFAULT 0.01,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"hourly" boolean DEFAULT false,
	"user_id" varchar,
	"total_tests" integer DEFAULT 0,
	"automated_tests" integer DEFAULT 0,
	"manual_interventions" integer DEFAULT 0,
	"automation_rate" numeric(5, 4) DEFAULT 0,
	"average_execution_time" integer DEFAULT 0,
	"total_processing_time" integer DEFAULT 0,
	"pass_rate" numeric(5, 4) DEFAULT 0,
	"error_rate" numeric(5, 4) DEFAULT 0,
	"edge_cases_detected" integer DEFAULT 0,
	"true_positives" integer DEFAULT 0,
	"false_positives" integer DEFAULT 0,
	"false_negatives" integer DEFAULT 0,
	"detection_accuracy" numeric(5, 4) DEFAULT 0,
	"llm_costs" numeric(10, 6) DEFAULT 0,
	"tokens_used" integer DEFAULT 0,
	"cost_per_test" numeric(8, 6) DEFAULT 0,
	"resource_utilization" numeric(5, 4) DEFAULT 0,
	"approval_requests" integer DEFAULT 0,
	"approval_rate" numeric(5, 4) DEFAULT 0,
	"average_approval_time" integer DEFAULT 0,
	"escalations" integer DEFAULT 0,
	"performance_regressions" integer DEFAULT 0,
	"regression_severity" varchar(20),
	"alerts_triggered" integer DEFAULT 0,
	"time_saved" integer DEFAULT 0,
	"manual_effort_reduction" numeric(5, 4) DEFAULT 0,
	"cost_savings" numeric(10, 2) DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cost_optimization_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"service" varchar(50) NOT NULL,
	"operation" varchar(100) NOT NULL,
	"request_count" integer DEFAULT 0,
	"token_count" integer DEFAULT 0,
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"total_cost" numeric(10, 6) DEFAULT 0,
	"cost_per_request" numeric(8, 6) DEFAULT 0,
	"cost_per_token" numeric(10, 8) DEFAULT 0,
	"average_latency" integer DEFAULT 0,
	"success_rate" numeric(5, 4) DEFAULT 0,
	"error_rate" numeric(5, 4) DEFAULT 0,
	"cache_hit_rate" numeric(5, 4) DEFAULT 0,
	"redundant_requests" integer DEFAULT 0,
	"optimization_opportunities" jsonb,
	"budget_used" numeric(5, 4) DEFAULT 0,
	"budget_remaining" numeric(10, 2),
	"projected_spend" numeric(10, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "edge_case_detections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"pattern" varchar(500) NOT NULL,
	"category" varchar(100) NOT NULL,
	"confidence" integer NOT NULL,
	"severity" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"error_count" integer NOT NULL,
	"data_context" jsonb NOT NULL,
	"risk_assessment" jsonb NOT NULL,
	"suggested_actions" jsonb NOT NULL,
	"automation_recommendation" jsonb,
	"test_recommendation" jsonb,
	"status" varchar(50) DEFAULT 'detected',
	"processing_time" integer,
	"llm_cost" numeric(8, 6),
	"approval_request_id" varchar,
	"import_session_id" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "edge_case_integration_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"status" varchar(50) DEFAULT 'initializing',
	"progress" integer DEFAULT 0,
	"current_step" varchar(100),
	"options" jsonb NOT NULL,
	"cost_limit" numeric(8, 6),
	"time_limit" integer,
	"detection_results" jsonb,
	"test_results" jsonb,
	"approval_results" jsonb,
	"processing_time" integer,
	"total_cost" numeric(8, 6),
	"resource_usage" jsonb,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "edge_case_integration_sessions_workflow_id_unique" UNIQUE("workflow_id")
);
--> statement-breakpoint
CREATE TABLE "edge_case_test_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detection_id" varchar NOT NULL,
	"test_case_id" varchar NOT NULL,
	"relevance_score" integer,
	"expected_outcome" varchar(100),
	"last_execution_status" varchar(50),
	"last_execution_results" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "error_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"pattern_signature" varchar(500) NOT NULL,
	"error_count" integer NOT NULL,
	"confidence" integer NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"user_context" jsonb,
	"data_context" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "error_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signature" varchar(500) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"frequency" integer DEFAULT 1,
	"total_occurrences" integer DEFAULT 1,
	"success_rate" numeric(5, 4) DEFAULT 0,
	"average_resolution_time" integer DEFAULT 0,
	"first_seen" timestamp DEFAULT now(),
	"last_seen" timestamp DEFAULT now(),
	"trend_direction" varchar(20),
	"resolution_strategies" jsonb,
	"automation_eligible" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "error_patterns_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "generated_test_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"suite_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"estimated_duration" integer,
	"test_data" jsonb NOT NULL,
	"expected_results" jsonb NOT NULL,
	"validation_rules" jsonb NOT NULL,
	"edge_case_pattern" varchar(500),
	"generated_by" varchar(50) NOT NULL,
	"generation_confidence" integer,
	"execution_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"last_executed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ml_feedback_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_type" varchar(50) NOT NULL,
	"feedback_data" jsonb NOT NULL,
	"learning_outcomes" jsonb,
	"accuracy_improvement" numeric(5, 4),
	"confidence_change" numeric(5, 4),
	"processing_time" integer,
	"approval_request_id" varchar,
	"detection_id" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ml_learning_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" varchar(50) NOT NULL,
	"pattern_data" jsonb NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"applicability" numeric(5, 4) NOT NULL,
	"effectiveness" numeric(5, 4) NOT NULL,
	"usage_count" integer DEFAULT 0,
	"success_rate" numeric(5, 4) DEFAULT 0,
	"user_context" jsonb,
	"domain_context" varchar(100),
	"last_used_at" timestamp,
	"last_updated_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_trends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric" varchar(100) NOT NULL,
	"timeframe" varchar(20) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"current_value" numeric(10, 4) NOT NULL,
	"previous_value" numeric(10, 4),
	"trend_direction" varchar(20),
	"change_percentage" numeric(6, 3),
	"average" numeric(10, 4),
	"median" numeric(10, 4),
	"standard_deviation" numeric(10, 4),
	"min" numeric(10, 4),
	"max" numeric(10, 4),
	"predicted_value" numeric(10, 4),
	"confidence_interval" numeric(5, 4),
	"seasonality_factor" numeric(5, 4),
	"is_anomaly" boolean DEFAULT false,
	"anomaly_score" numeric(5, 4),
	"anomaly_threshold" numeric(5, 4),
	"data_points" integer NOT NULL,
	"data_quality" numeric(3, 2),
	"missing_data_percentage" numeric(5, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_generations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"format" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'generating',
	"date_range" jsonb NOT NULL,
	"filters" jsonb,
	"include_charts" boolean DEFAULT true,
	"include_details" boolean DEFAULT true,
	"requested_by" varchar NOT NULL,
	"generation_time" integer,
	"file_size" integer,
	"file_path" varchar(500),
	"download_count" integer DEFAULT 0,
	"record_count" integer,
	"chart_count" integer,
	"page_count" integer,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"expires_at" timestamp,
	"last_accessed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roi_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" varchar(20) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"automation_investment" numeric(12, 2) DEFAULT 0,
	"development_costs" numeric(12, 2) DEFAULT 0,
	"maintenance_costs" numeric(12, 2) DEFAULT 0,
	"llm_costs" numeric(12, 2) DEFAULT 0,
	"infrastructure_costs" numeric(12, 2) DEFAULT 0,
	"total_investment" numeric(12, 2) DEFAULT 0,
	"manual_testing_cost_saved" numeric(12, 2) DEFAULT 0,
	"time_saved" integer DEFAULT 0,
	"defects_prevented" integer DEFAULT 0,
	"defect_cost_saved" numeric(12, 2) DEFAULT 0,
	"quality_improvement" numeric(5, 2),
	"total_savings" numeric(12, 2) DEFAULT 0,
	"roi" numeric(6, 3),
	"payback_period" integer,
	"net_present_value" numeric(12, 2),
	"break_even_point" date,
	"test_coverage_improvement" numeric(5, 2),
	"release_velocity_improvement" numeric(5, 2),
	"customer_satisfaction_impact" numeric(5, 2),
	"team_productivity_gain" numeric(5, 2),
	"security_risk_reduction" numeric(5, 2),
	"compliance_risk_reduction" numeric(5, 2),
	"operational_risk_reduction" numeric(5, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_performance_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"metric_type" varchar(50) NOT NULL,
	"value" numeric(10, 4) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"threshold" numeric(10, 4),
	"is_alert" boolean DEFAULT false,
	"component" varchar(100),
	"operation_id" varchar,
	"session_id" varchar,
	"details" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "test_execution_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_execution_id" varchar NOT NULL,
	"test_type" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"execution_time" integer NOT NULL,
	"setup_time" integer DEFAULT 0,
	"teardown_time" integer DEFAULT 0,
	"cpu_usage" numeric(5, 2),
	"memory_usage" integer,
	"network_latency" integer,
	"database_queries" integer DEFAULT 0,
	"code_coverage" numeric(5, 2),
	"assertions_passed" integer DEFAULT 0,
	"assertions_failed" integer DEFAULT 0,
	"warnings_generated" integer DEFAULT 0,
	"edge_cases_triggered" integer DEFAULT 0,
	"edge_cases_solved" integer DEFAULT 0,
	"llm_interactions" integer DEFAULT 0,
	"llm_cost" numeric(8, 6) DEFAULT 0,
	"error_details" jsonb,
	"error_category" varchar(100),
	"error_resolution" varchar(50),
	"environment" varchar(50),
	"browser_info" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_executions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"scenario" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"results" jsonb,
	"performance_metrics" jsonb,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_behavior_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"experience_level" varchar(20) DEFAULT 'intermediate',
	"risk_tolerance" varchar(20) DEFAULT 'balanced',
	"automation_preference" numeric(3, 2) DEFAULT 0.6,
	"decision_patterns" jsonb DEFAULT '{}'::jsonb,
	"performance_history" jsonb DEFAULT '{}'::jsonb,
	"learning_velocity" numeric(5, 4) DEFAULT 0.5,
	"adaptability_score" numeric(5, 4) DEFAULT 0.5,
	"preferred_notification_method" varchar(20) DEFAULT 'in_app',
	"explanation_depth" varchar(20) DEFAULT 'standard',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_behavior_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_decision_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar,
	"decision_type" varchar(50) NOT NULL,
	"decision_category" varchar(100),
	"risk_level" varchar(20),
	"decision" varchar(50) NOT NULL,
	"decision_time" integer NOT NULL,
	"confidence_level" numeric(3, 2),
	"system_recommendation" varchar(50),
	"agreed_with_system" boolean,
	"reasoning_provided" boolean,
	"outcome_correct" boolean,
	"business_impact" varchar(50),
	"learning_points" jsonb,
	"time_of_day" integer,
	"day_of_week" integer,
	"workload" varchar(20),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_approval_request_id_approval_requests_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_test_execution_id_test_executions_id_fk" FOREIGN KEY ("test_execution_id") REFERENCES "public"."test_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_import_session_id_import_sessions_session_id_fk" FOREIGN KEY ("import_session_id") REFERENCES "public"."import_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_alerts" ADD CONSTRAINT "automation_alerts_test_execution_id_test_executions_id_fk" FOREIGN KEY ("test_execution_id") REFERENCES "public"."test_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edge_case_detections" ADD CONSTRAINT "edge_case_detections_approval_request_id_approval_requests_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edge_case_detections" ADD CONSTRAINT "edge_case_detections_import_session_id_import_sessions_session_id_fk" FOREIGN KEY ("import_session_id") REFERENCES "public"."import_sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edge_case_test_cases" ADD CONSTRAINT "edge_case_test_cases_detection_id_edge_case_detections_id_fk" FOREIGN KEY ("detection_id") REFERENCES "public"."edge_case_detections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edge_case_test_cases" ADD CONSTRAINT "edge_case_test_cases_test_case_id_generated_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."generated_test_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_analytics" ADD CONSTRAINT "error_analytics_pattern_id_error_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."error_patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_feedback_sessions" ADD CONSTRAINT "ml_feedback_sessions_approval_request_id_approval_requests_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ml_feedback_sessions" ADD CONSTRAINT "ml_feedback_sessions_detection_id_edge_case_detections_id_fk" FOREIGN KEY ("detection_id") REFERENCES "public"."edge_case_detections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_execution_analytics" ADD CONSTRAINT "test_execution_analytics_test_execution_id_test_executions_id_fk" FOREIGN KEY ("test_execution_id") REFERENCES "public"."test_executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_approval_decisions_approval_request_id" ON "approval_decisions" USING btree ("approval_request_id");--> statement-breakpoint
CREATE INDEX "idx_approval_decisions_approver" ON "approval_decisions" USING btree ("approver");--> statement-breakpoint
CREATE INDEX "idx_approval_decisions_timestamp" ON "approval_decisions" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_approval_metrics_date" ON "approval_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_approval_metrics_approver" ON "approval_metrics" USING btree ("approver");--> statement-breakpoint
CREATE INDEX "idx_approval_preferences_user_id" ON "approval_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_status" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_assigned_to" ON "approval_requests" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_created_at" ON "approval_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_deadline" ON "approval_requests" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_risk_level" ON "approval_requests" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "idx_approval_requests_type" ON "approval_requests" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_automation_alerts_type" ON "automation_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "idx_automation_alerts_severity" ON "automation_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_automation_alerts_status" ON "automation_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_automation_alerts_metric" ON "automation_alerts" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "idx_automation_alerts_created_at" ON "automation_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_automation_alerts_user_id" ON "automation_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_automation_confidence_category" ON "automation_confidence" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_automation_confidence_current" ON "automation_confidence" USING btree ("current_confidence");--> statement-breakpoint
CREATE INDEX "idx_automation_confidence_updated" ON "automation_confidence" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_automation_metrics_date" ON "automation_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_automation_metrics_user_id" ON "automation_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_automation_metrics_hourly" ON "automation_metrics" USING btree ("hourly");--> statement-breakpoint
CREATE INDEX "idx_automation_metrics_automation_rate" ON "automation_metrics" USING btree ("automation_rate");--> statement-breakpoint
CREATE INDEX "idx_automation_metrics_created_at" ON "automation_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_cost_optimization_date" ON "cost_optimization_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_cost_optimization_service" ON "cost_optimization_metrics" USING btree ("service");--> statement-breakpoint
CREATE INDEX "idx_cost_optimization_operation" ON "cost_optimization_metrics" USING btree ("operation");--> statement-breakpoint
CREATE INDEX "idx_cost_optimization_total_cost" ON "cost_optimization_metrics" USING btree ("total_cost");--> statement-breakpoint
CREATE INDEX "idx_cost_optimization_created_at" ON "cost_optimization_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_edge_case_detections_session_id" ON "edge_case_detections" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_edge_case_detections_user_id" ON "edge_case_detections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_edge_case_detections_pattern" ON "edge_case_detections" USING btree ("pattern");--> statement-breakpoint
CREATE INDEX "idx_edge_case_detections_category" ON "edge_case_detections" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_edge_case_detections_severity" ON "edge_case_detections" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_edge_case_detections_created_at" ON "edge_case_detections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_edge_case_integration_workflow_id" ON "edge_case_integration_sessions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_edge_case_integration_session_id" ON "edge_case_integration_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_edge_case_integration_user_id" ON "edge_case_integration_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_edge_case_integration_status" ON "edge_case_integration_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_edge_case_integration_created_at" ON "edge_case_integration_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_edge_case_test_cases_detection_id" ON "edge_case_test_cases" USING btree ("detection_id");--> statement-breakpoint
CREATE INDEX "idx_edge_case_test_cases_test_case_id" ON "edge_case_test_cases" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "idx_error_analytics_pattern_id" ON "error_analytics" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "idx_error_analytics_session_id" ON "error_analytics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_error_analytics_timestamp" ON "error_analytics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_error_patterns_signature" ON "error_patterns" USING btree ("signature");--> statement-breakpoint
CREATE INDEX "idx_error_patterns_category" ON "error_patterns" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_error_patterns_risk_level" ON "error_patterns" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "idx_error_patterns_frequency" ON "error_patterns" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "idx_error_patterns_last_seen" ON "error_patterns" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX "idx_generated_test_cases_suite_id" ON "generated_test_cases" USING btree ("suite_id");--> statement-breakpoint
CREATE INDEX "idx_generated_test_cases_type" ON "generated_test_cases" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_generated_test_cases_priority" ON "generated_test_cases" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_generated_test_cases_pattern" ON "generated_test_cases" USING btree ("edge_case_pattern");--> statement-breakpoint
CREATE INDEX "idx_ml_feedback_sessions_user_id" ON "ml_feedback_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ml_feedback_sessions_type" ON "ml_feedback_sessions" USING btree ("session_type");--> statement-breakpoint
CREATE INDEX "idx_ml_feedback_sessions_created_at" ON "ml_feedback_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ml_learning_patterns_type" ON "ml_learning_patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX "idx_ml_learning_patterns_confidence" ON "ml_learning_patterns" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "idx_ml_learning_patterns_effectiveness" ON "ml_learning_patterns" USING btree ("effectiveness");--> statement-breakpoint
CREATE INDEX "idx_ml_learning_patterns_last_used" ON "ml_learning_patterns" USING btree ("last_used_at");--> statement-breakpoint
CREATE INDEX "idx_performance_trends_metric" ON "performance_trends" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "idx_performance_trends_timeframe" ON "performance_trends" USING btree ("timeframe");--> statement-breakpoint
CREATE INDEX "idx_performance_trends_start_date" ON "performance_trends" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "idx_performance_trends_trend_direction" ON "performance_trends" USING btree ("trend_direction");--> statement-breakpoint
CREATE INDEX "idx_performance_trends_anomaly" ON "performance_trends" USING btree ("is_anomaly");--> statement-breakpoint
CREATE INDEX "idx_report_generations_type" ON "report_generations" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "idx_report_generations_status" ON "report_generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_report_generations_requested_by" ON "report_generations" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "idx_report_generations_created_at" ON "report_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_report_generations_expires_at" ON "report_generations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_roi_metrics_period" ON "roi_metrics" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_roi_metrics_start_date" ON "roi_metrics" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "idx_roi_metrics_roi" ON "roi_metrics" USING btree ("roi");--> statement-breakpoint
CREATE INDEX "idx_roi_metrics_calculated_at" ON "roi_metrics" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "idx_system_performance_timestamp" ON "system_performance_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_system_performance_type" ON "system_performance_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "idx_system_performance_component" ON "system_performance_metrics" USING btree ("component");--> statement-breakpoint
CREATE INDEX "idx_system_performance_alert" ON "system_performance_metrics" USING btree ("is_alert");--> statement-breakpoint
CREATE INDEX "idx_system_performance_session" ON "system_performance_metrics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_test_execution_analytics_test_id" ON "test_execution_analytics" USING btree ("test_execution_id");--> statement-breakpoint
CREATE INDEX "idx_test_execution_analytics_type" ON "test_execution_analytics" USING btree ("test_type");--> statement-breakpoint
CREATE INDEX "idx_test_execution_analytics_status" ON "test_execution_analytics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_test_execution_analytics_execution_time" ON "test_execution_analytics" USING btree ("execution_time");--> statement-breakpoint
CREATE INDEX "idx_test_execution_analytics_created_at" ON "test_execution_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_behavior_profiles_user_id" ON "user_behavior_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_behavior_profiles_experience" ON "user_behavior_profiles" USING btree ("experience_level");--> statement-breakpoint
CREATE INDEX "idx_user_behavior_profiles_learning_velocity" ON "user_behavior_profiles" USING btree ("learning_velocity");--> statement-breakpoint
CREATE INDEX "idx_user_decision_analytics_user_id" ON "user_decision_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_decision_analytics_decision_type" ON "user_decision_analytics" USING btree ("decision_type");--> statement-breakpoint
CREATE INDEX "idx_user_decision_analytics_decision_time" ON "user_decision_analytics" USING btree ("decision_time");--> statement-breakpoint
CREATE INDEX "idx_user_decision_analytics_agreed_with_system" ON "user_decision_analytics" USING btree ("agreed_with_system");--> statement-breakpoint
CREATE INDEX "idx_user_decision_analytics_created_at" ON "user_decision_analytics" USING btree ("created_at");
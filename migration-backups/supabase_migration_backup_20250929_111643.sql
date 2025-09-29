--
-- PostgreSQL database dump
--

\restrict AVlyne715HJUvJjoskSGYVoKjnShNPVdDfaIfHbAOul5IarN7Ukcvf6f5sVpEst

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

-- Started on 2025-09-29 10:16:46 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 16637)
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 241 (class 1259 OID 16639)
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16638)
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- TOC entry 4226 (class 0 OID 0)
-- Dependencies: 240
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- TOC entry 250 (class 1259 OID 33034)
-- Name: approval_decisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_decisions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    approval_request_id character varying NOT NULL,
    decision character varying(20) NOT NULL,
    approver character varying(100) NOT NULL,
    reasoning text,
    conditions jsonb,
    "timestamp" timestamp without time zone DEFAULT now(),
    context_at_decision jsonb NOT NULL,
    system_recommendation character varying(20),
    confidence_score numeric(3,2),
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.approval_decisions OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 33044)
-- Name: approval_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_metrics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    approver character varying(100),
    total_approvals integer DEFAULT 0,
    automated_approvals integer DEFAULT 0,
    manual_approvals integer DEFAULT 0,
    average_decision_time interval,
    correct_decisions integer DEFAULT 0,
    incorrect_decisions integer DEFAULT 0,
    accuracy_rate numeric(5,4),
    approvals_by_type jsonb DEFAULT '{}'::jsonb,
    approvals_by_risk jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.approval_metrics OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 33060)
-- Name: approval_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_preferences (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(100) NOT NULL,
    auto_approve_low_risk boolean DEFAULT false,
    auto_approve_confidence_threshold numeric(3,2) DEFAULT 0.85,
    preferred_notification_method character varying(20) DEFAULT 'in_app'::character varying,
    delegate_to character varying(100),
    delegation_rules jsonb DEFAULT '{}'::jsonb,
    decision_patterns jsonb DEFAULT '{}'::jsonb,
    performance_metrics jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.approval_preferences OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 33076)
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    risk_level character varying(20) NOT NULL,
    priority character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    context jsonb NOT NULL,
    risk_assessment jsonb NOT NULL,
    assigned_to character varying(100)[] NOT NULL,
    current_approver character varying(100),
    escalation_path character varying(100)[],
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    deadline timestamp without time zone NOT NULL,
    approved_at timestamp without time zone,
    approved_by character varying(100),
    decision jsonb,
    decision_reasoning text,
    test_execution_id character varying,
    import_session_id character varying,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.approval_requests OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 33087)
-- Name: automation_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_alerts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    alert_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    metric character varying(100) NOT NULL,
    current_value numeric(10,4) NOT NULL,
    threshold numeric(10,4) NOT NULL,
    deviation_percentage numeric(6,3),
    component character varying(100),
    session_id character varying,
    test_execution_id character varying,
    user_id character varying,
    acknowledged_by character varying,
    acknowledged_at timestamp without time zone,
    resolved_by character varying,
    resolved_at timestamp without time zone,
    resolution text,
    escalation_level integer DEFAULT 0,
    escalated_at timestamp without time zone,
    escalated_to character varying,
    notifications_sent integer DEFAULT 0,
    last_notification_at timestamp without time zone,
    notification_channels character varying[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.automation_alerts OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 33101)
-- Name: automation_confidence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_confidence (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    category character varying(100) NOT NULL,
    context character varying(200),
    current_confidence numeric(5,4) NOT NULL,
    previous_confidence numeric(5,4),
    confidence_change numeric(5,4),
    evidence_count integer DEFAULT 0,
    validation_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    last_validated_at timestamp without time zone,
    confidence_decay numeric(5,4) DEFAULT 0.01,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.automation_confidence OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 33116)
-- Name: automation_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_metrics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    hourly boolean DEFAULT false,
    user_id character varying,
    total_tests integer DEFAULT 0,
    automated_tests integer DEFAULT 0,
    manual_interventions integer DEFAULT 0,
    automation_rate numeric(5,4) DEFAULT 0,
    average_execution_time integer DEFAULT 0,
    total_processing_time integer DEFAULT 0,
    pass_rate numeric(5,4) DEFAULT 0,
    error_rate numeric(5,4) DEFAULT 0,
    edge_cases_detected integer DEFAULT 0,
    true_positives integer DEFAULT 0,
    false_positives integer DEFAULT 0,
    false_negatives integer DEFAULT 0,
    detection_accuracy numeric(5,4) DEFAULT 0,
    llm_costs numeric(10,6) DEFAULT 0,
    tokens_used integer DEFAULT 0,
    cost_per_test numeric(8,6) DEFAULT 0,
    resource_utilization numeric(5,4) DEFAULT 0,
    approval_requests integer DEFAULT 0,
    approval_rate numeric(5,4) DEFAULT 0,
    average_approval_time integer DEFAULT 0,
    escalations integer DEFAULT 0,
    performance_regressions integer DEFAULT 0,
    regression_severity character varying(20),
    alerts_triggered integer DEFAULT 0,
    time_saved integer DEFAULT 0,
    manual_effort_reduction numeric(5,4) DEFAULT 0,
    cost_savings numeric(10,2) DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.automation_metrics OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16393)
-- Name: brand_retailers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.brand_retailers (
    id integer NOT NULL,
    brand_id integer,
    retailer_id character varying,
    permissions jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.brand_retailers OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 16392)
-- Name: brand_retailers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.brand_retailers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.brand_retailers_id_seq OWNER TO postgres;

--
-- TOC entry 4227 (class 0 OID 0)
-- Dependencies: 216
-- Name: brand_retailers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.brand_retailers_id_seq OWNED BY public.brand_retailers.id;


--
-- TOC entry 219 (class 1259 OID 16404)
-- Name: brands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.brands (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    story text,
    category character varying(100),
    logo_url character varying,
    owner_id character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.brands OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16403)
-- Name: brands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.brands_id_seq OWNER TO postgres;

--
-- TOC entry 4228 (class 0 OID 0)
-- Dependencies: 218
-- Name: brands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.brands_id_seq OWNED BY public.brands.id;


--
-- TOC entry 257 (class 1259 OID 33153)
-- Name: cost_optimization_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cost_optimization_metrics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    service character varying(50) NOT NULL,
    operation character varying(100) NOT NULL,
    request_count integer DEFAULT 0,
    token_count integer DEFAULT 0,
    input_tokens integer DEFAULT 0,
    output_tokens integer DEFAULT 0,
    total_cost numeric(10,6) DEFAULT 0,
    cost_per_request numeric(8,6) DEFAULT 0,
    cost_per_token numeric(10,8) DEFAULT 0,
    average_latency integer DEFAULT 0,
    success_rate numeric(5,4) DEFAULT 0,
    error_rate numeric(5,4) DEFAULT 0,
    cache_hit_rate numeric(5,4) DEFAULT 0,
    redundant_requests integer DEFAULT 0,
    optimization_opportunities jsonb,
    budget_used numeric(5,4) DEFAULT 0,
    budget_remaining numeric(10,2),
    projected_spend numeric(10,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cost_optimization_metrics OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 33176)
-- Name: edge_case_detections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edge_case_detections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying NOT NULL,
    user_id character varying NOT NULL,
    pattern character varying(500) NOT NULL,
    category character varying(100) NOT NULL,
    confidence integer NOT NULL,
    severity character varying(20) NOT NULL,
    description text NOT NULL,
    error_count integer NOT NULL,
    data_context jsonb NOT NULL,
    risk_assessment jsonb NOT NULL,
    suggested_actions jsonb NOT NULL,
    automation_recommendation jsonb,
    test_recommendation jsonb,
    status character varying(50) DEFAULT 'detected'::character varying,
    processing_time integer,
    llm_cost numeric(8,6),
    approval_request_id character varying,
    import_session_id character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.edge_case_detections OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 33188)
-- Name: edge_case_integration_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edge_case_integration_sessions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    workflow_id character varying NOT NULL,
    session_id character varying NOT NULL,
    user_id character varying NOT NULL,
    status character varying(50) DEFAULT 'initializing'::character varying,
    progress integer DEFAULT 0,
    current_step character varying(100),
    options jsonb NOT NULL,
    cost_limit numeric(8,6),
    time_limit integer,
    detection_results jsonb,
    test_results jsonb,
    approval_results jsonb,
    processing_time integer,
    total_cost numeric(8,6),
    resource_usage jsonb,
    start_time timestamp without time zone DEFAULT now(),
    end_time timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.edge_case_integration_sessions OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 33204)
-- Name: edge_case_test_cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edge_case_test_cases (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    detection_id character varying NOT NULL,
    test_case_id character varying NOT NULL,
    relevance_score integer,
    expected_outcome character varying(100),
    last_execution_status character varying(50),
    last_execution_results jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.edge_case_test_cases OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 33213)
-- Name: error_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.error_analytics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    pattern_id character varying NOT NULL,
    session_id character varying NOT NULL,
    pattern_signature character varying(500) NOT NULL,
    error_count integer NOT NULL,
    confidence integer NOT NULL,
    risk_level character varying(20) NOT NULL,
    user_context jsonb,
    data_context jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    "timestamp" timestamp without time zone DEFAULT now()
);


ALTER TABLE public.error_analytics OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 33223)
-- Name: error_patterns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.error_patterns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    signature character varying(500) NOT NULL,
    category character varying(100) NOT NULL,
    description text NOT NULL,
    risk_level character varying(20) NOT NULL,
    confidence numeric(5,4) NOT NULL,
    frequency integer DEFAULT 1,
    total_occurrences integer DEFAULT 1,
    success_rate numeric(5,4) DEFAULT 0,
    average_resolution_time integer DEFAULT 0,
    first_seen timestamp without time zone DEFAULT now(),
    last_seen timestamp without time zone DEFAULT now(),
    trend_direction character varying(20),
    resolution_strategies jsonb,
    automation_eligible boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.error_patterns OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16650)
-- Name: field_mapping_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field_mapping_cache (
    id integer NOT NULL,
    source_field character varying(255) NOT NULL,
    target_field character varying(255) NOT NULL,
    confidence integer,
    strategy character varying(50) NOT NULL,
    data_type character varying(50) NOT NULL,
    sample_values jsonb,
    metadata jsonb,
    usage_count integer DEFAULT 1,
    last_used_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    source_field_pattern character varying(255),
    success_rate integer DEFAULT 0
);


ALTER TABLE public.field_mapping_cache OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16649)
-- Name: field_mapping_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.field_mapping_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.field_mapping_cache_id_seq OWNER TO postgres;

--
-- TOC entry 4229 (class 0 OID 0)
-- Dependencies: 242
-- Name: field_mapping_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.field_mapping_cache_id_seq OWNED BY public.field_mapping_cache.id;


--
-- TOC entry 263 (class 1259 OID 33243)
-- Name: generated_test_cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.generated_test_cases (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    suite_id character varying NOT NULL,
    name character varying(255) NOT NULL,
    description text NOT NULL,
    type character varying(50) NOT NULL,
    priority character varying(20) NOT NULL,
    estimated_duration integer,
    test_data jsonb NOT NULL,
    expected_results jsonb NOT NULL,
    validation_rules jsonb NOT NULL,
    edge_case_pattern character varying(500),
    generated_by character varying(50) NOT NULL,
    generation_confidence integer,
    execution_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    last_executed_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.generated_test_cases OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16662)
-- Name: import_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_batches (
    id integer NOT NULL,
    session_id character varying,
    batch_number integer NOT NULL,
    start_index integer NOT NULL,
    end_index integer NOT NULL,
    record_count integer NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    processing_time integer,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    worker_thread character varying(100),
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.import_batches OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16661)
-- Name: import_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.import_batches_id_seq OWNER TO postgres;

--
-- TOC entry 4230 (class 0 OID 0)
-- Dependencies: 244
-- Name: import_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_batches_id_seq OWNED BY public.import_batches.id;


--
-- TOC entry 247 (class 1259 OID 16675)
-- Name: import_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_history (
    id integer NOT NULL,
    session_id character varying,
    record_index integer NOT NULL,
    record_data jsonb NOT NULL,
    validation_errors jsonb,
    import_status character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer,
    processing_time integer,
    retry_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.import_history OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16674)
-- Name: import_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.import_history_id_seq OWNER TO postgres;

--
-- TOC entry 4231 (class 0 OID 0)
-- Dependencies: 246
-- Name: import_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_history_id_seq OWNED BY public.import_history.id;


--
-- TOC entry 249 (class 1259 OID 16686)
-- Name: import_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_sessions (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    user_id character varying,
    file_name character varying(500),
    file_size integer,
    file_type character varying(50),
    total_records integer,
    processed_records integer DEFAULT 0,
    successful_records integer DEFAULT 0,
    failed_records integer DEFAULT 0,
    status character varying(50) DEFAULT 'initiated'::character varying,
    error_log jsonb,
    field_mappings jsonb,
    import_config jsonb,
    processing_rate integer,
    estimated_time_remaining integer,
    started_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    file_path character varying(1000),
    workflow_state character varying(50)
);


ALTER TABLE public.import_sessions OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 16685)
-- Name: import_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.import_sessions_id_seq OWNER TO postgres;

--
-- TOC entry 4232 (class 0 OID 0)
-- Dependencies: 248
-- Name: import_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_sessions_id_seq OWNED BY public.import_sessions.id;


--
-- TOC entry 221 (class 1259 OID 16418)
-- Name: media_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_assets (
    id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    original_name character varying(255),
    mime_type character varying(100),
    file_size integer,
    url character varying(500) NOT NULL,
    asset_type character varying(50) NOT NULL,
    product_id integer,
    brand_id integer,
    uploaded_by character varying,
    created_at timestamp without time zone DEFAULT now(),
    alt_text character varying(500),
    metadata jsonb
);


ALTER TABLE public.media_assets OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16417)
-- Name: media_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.media_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.media_assets_id_seq OWNER TO postgres;

--
-- TOC entry 4233 (class 0 OID 0)
-- Dependencies: 220
-- Name: media_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.media_assets_id_seq OWNED BY public.media_assets.id;


--
-- TOC entry 264 (class 1259 OID 33256)
-- Name: ml_feedback_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ml_feedback_sessions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    session_type character varying(50) NOT NULL,
    feedback_data jsonb NOT NULL,
    learning_outcomes jsonb,
    accuracy_improvement numeric(5,4),
    confidence_change numeric(5,4),
    processing_time integer,
    approval_request_id character varying,
    detection_id character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ml_feedback_sessions OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 33266)
-- Name: ml_learning_patterns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ml_learning_patterns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    pattern_type character varying(50) NOT NULL,
    pattern_data jsonb NOT NULL,
    confidence numeric(5,4) NOT NULL,
    applicability numeric(5,4) NOT NULL,
    effectiveness numeric(5,4) NOT NULL,
    usage_count integer DEFAULT 0,
    success_rate numeric(5,4) DEFAULT 0,
    user_context jsonb,
    domain_context character varying(100),
    last_used_at timestamp without time zone,
    last_updated_at timestamp without time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ml_learning_patterns OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 33279)
-- Name: performance_trends; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.performance_trends (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    metric character varying(100) NOT NULL,
    timeframe character varying(20) NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    current_value numeric(10,4) NOT NULL,
    previous_value numeric(10,4),
    trend_direction character varying(20),
    change_percentage numeric(6,3),
    average numeric(10,4),
    median numeric(10,4),
    standard_deviation numeric(10,4),
    min numeric(10,4),
    max numeric(10,4),
    predicted_value numeric(10,4),
    confidence_interval numeric(5,4),
    seasonality_factor numeric(5,4),
    is_anomaly boolean DEFAULT false,
    anomaly_score numeric(5,4),
    anomaly_threshold numeric(5,4),
    data_points integer NOT NULL,
    data_quality numeric(3,2),
    missing_data_percentage numeric(5,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    calculated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.performance_trends OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16428)
-- Name: product_associations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_associations (
    id integer NOT NULL,
    source_product_id integer,
    target_product_id integer,
    association_type character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_associations OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16427)
-- Name: product_associations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_associations_id_seq OWNER TO postgres;

--
-- TOC entry 4234 (class 0 OID 0)
-- Dependencies: 222
-- Name: product_associations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_associations_id_seq OWNED BY public.product_associations.id;


--
-- TOC entry 225 (class 1259 OID 16436)
-- Name: product_attributes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_attributes (
    id integer NOT NULL,
    product_id integer,
    attribute_name character varying(100) NOT NULL,
    attribute_value text,
    attribute_type character varying(50) DEFAULT 'text'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_attributes OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16435)
-- Name: product_attributes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_attributes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_attributes_id_seq OWNER TO postgres;

--
-- TOC entry 4235 (class 0 OID 0)
-- Dependencies: 224
-- Name: product_attributes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_attributes_id_seq OWNED BY public.product_attributes.id;


--
-- TOC entry 227 (class 1259 OID 16447)
-- Name: product_families; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_families (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    family_type character varying(50) NOT NULL,
    brand_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_families OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16446)
-- Name: product_families_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_families_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_families_id_seq OWNER TO postgres;

--
-- TOC entry 4236 (class 0 OID 0)
-- Dependencies: 226
-- Name: product_families_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_families_id_seq OWNED BY public.product_families.id;


--
-- TOC entry 229 (class 1259 OID 16457)
-- Name: product_family_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_family_items (
    id integer NOT NULL,
    family_id integer,
    product_id integer,
    quantity integer DEFAULT 1,
    sort_order integer DEFAULT 0
);


ALTER TABLE public.product_family_items OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16456)
-- Name: product_family_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_family_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_family_items_id_seq OWNER TO postgres;

--
-- TOC entry 4237 (class 0 OID 0)
-- Dependencies: 228
-- Name: product_family_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_family_items_id_seq OWNED BY public.product_family_items.id;


--
-- TOC entry 231 (class 1259 OID 16466)
-- Name: product_syndications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_syndications (
    id integer NOT NULL,
    product_id integer,
    channel_id integer,
    status character varying(50) DEFAULT 'pending'::character varying,
    external_id character varying(255),
    external_url character varying(500),
    last_sync_at timestamp without time zone,
    last_sync_status character varying(50),
    error_message text,
    sync_retries integer DEFAULT 0,
    is_enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_syndications OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16465)
-- Name: product_syndications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_syndications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_syndications_id_seq OWNER TO postgres;

--
-- TOC entry 4238 (class 0 OID 0)
-- Dependencies: 230
-- Name: product_syndications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_syndications_id_seq OWNED BY public.product_syndications.id;


--
-- TOC entry 275 (class 1259 OID 33621)
-- Name: product_variant_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variant_options (
    id integer NOT NULL,
    product_id integer NOT NULL,
    option_id integer NOT NULL,
    is_required boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_variant_options OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 33620)
-- Name: product_variant_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_variant_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_variant_options_id_seq OWNER TO postgres;

--
-- TOC entry 4239 (class 0 OID 0)
-- Dependencies: 274
-- Name: product_variant_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_variant_options_id_seq OWNED BY public.product_variant_options.id;


--
-- TOC entry 277 (class 1259 OID 33630)
-- Name: product_variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_variants (
    id integer NOT NULL,
    parent_product_id integer NOT NULL,
    variant_product_id integer NOT NULL,
    variant_sku character varying(100),
    variant_name character varying(255),
    price_adjustment integer DEFAULT 0,
    weight_adjustment integer DEFAULT 0,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.product_variants OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 33629)
-- Name: product_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_variants_id_seq OWNER TO postgres;

--
-- TOC entry 4240 (class 0 OID 0)
-- Dependencies: 276
-- Name: product_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_variants_id_seq OWNED BY public.product_variants.id;


--
-- TOC entry 233 (class 1259 OID 16480)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    short_description text,
    long_description text,
    story text,
    brand_id integer,
    parent_id integer,
    sku character varying(100),
    status character varying DEFAULT 'draft'::character varying,
    is_variant boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    gtin character varying(20),
    price integer,
    compare_at_price integer,
    stock integer,
    low_stock_threshold integer,
    meta_title character varying(60),
    meta_description text,
    canonical_url character varying(500),
    og_title character varying(60),
    og_description text,
    og_image character varying(500),
    focus_keywords text,
    schema_markup jsonb DEFAULT '{}'::jsonb,
    seo_score integer DEFAULT 0,
    seo_updated_at timestamp without time zone
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16479)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- TOC entry 4241 (class 0 OID 0)
-- Dependencies: 232
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 267 (class 1259 OID 33290)
-- Name: report_generations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_generations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    report_type character varying(50) NOT NULL,
    format character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'generating'::character varying,
    date_range jsonb NOT NULL,
    filters jsonb,
    include_charts boolean DEFAULT true,
    include_details boolean DEFAULT true,
    requested_by character varying NOT NULL,
    generation_time integer,
    file_size integer,
    file_path character varying(500),
    download_count integer DEFAULT 0,
    record_count integer,
    chart_count integer,
    page_count integer,
    error_message text,
    retry_count integer DEFAULT 0,
    expires_at timestamp without time zone,
    last_accessed_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


ALTER TABLE public.report_generations OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 33305)
-- Name: roi_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roi_metrics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    period character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    automation_investment numeric(12,2) DEFAULT 0,
    development_costs numeric(12,2) DEFAULT 0,
    maintenance_costs numeric(12,2) DEFAULT 0,
    llm_costs numeric(12,2) DEFAULT 0,
    infrastructure_costs numeric(12,2) DEFAULT 0,
    total_investment numeric(12,2) DEFAULT 0,
    manual_testing_cost_saved numeric(12,2) DEFAULT 0,
    time_saved integer DEFAULT 0,
    defects_prevented integer DEFAULT 0,
    defect_cost_saved numeric(12,2) DEFAULT 0,
    quality_improvement numeric(5,2),
    total_savings numeric(12,2) DEFAULT 0,
    roi numeric(6,3),
    payback_period integer,
    net_present_value numeric(12,2),
    break_even_point date,
    test_coverage_improvement numeric(5,2),
    release_velocity_improvement numeric(5,2),
    customer_satisfaction_impact numeric(5,2),
    team_productivity_gain numeric(5,2),
    security_risk_reduction numeric(5,2),
    compliance_risk_reduction numeric(5,2),
    operational_risk_reduction numeric(5,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    calculated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.roi_metrics OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16496)
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16504)
-- Name: syndication_channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.syndication_channels (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    endpoint character varying(500),
    api_key character varying(255),
    webhook_url character varying(500),
    settings jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.syndication_channels OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16503)
-- Name: syndication_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.syndication_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.syndication_channels_id_seq OWNER TO postgres;

--
-- TOC entry 4242 (class 0 OID 0)
-- Dependencies: 235
-- Name: syndication_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.syndication_channels_id_seq OWNED BY public.syndication_channels.id;


--
-- TOC entry 238 (class 1259 OID 16518)
-- Name: syndication_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.syndication_logs (
    id integer NOT NULL,
    channel_id integer,
    product_id integer,
    action character varying(50) NOT NULL,
    endpoint character varying(255) NOT NULL,
    method character varying(10) NOT NULL,
    status integer,
    response_time integer,
    request_payload jsonb,
    response_payload jsonb,
    error_message text,
    triggered_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.syndication_logs OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16517)
-- Name: syndication_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.syndication_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.syndication_logs_id_seq OWNER TO postgres;

--
-- TOC entry 4243 (class 0 OID 0)
-- Dependencies: 237
-- Name: syndication_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.syndication_logs_id_seq OWNED BY public.syndication_logs.id;


--
-- TOC entry 269 (class 1259 OID 33326)
-- Name: system_performance_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_performance_metrics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now(),
    metric_type character varying(50) NOT NULL,
    value numeric(10,4) NOT NULL,
    unit character varying(20) NOT NULL,
    threshold numeric(10,4),
    is_alert boolean DEFAULT false,
    component character varying(100),
    operation_id character varying,
    session_id character varying,
    details jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.system_performance_metrics OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 33338)
-- Name: test_execution_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_execution_analytics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    test_execution_id character varying NOT NULL,
    test_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    execution_time integer NOT NULL,
    setup_time integer DEFAULT 0,
    teardown_time integer DEFAULT 0,
    cpu_usage numeric(5,2),
    memory_usage integer,
    network_latency integer,
    database_queries integer DEFAULT 0,
    code_coverage numeric(5,2),
    assertions_passed integer DEFAULT 0,
    assertions_failed integer DEFAULT 0,
    warnings_generated integer DEFAULT 0,
    edge_cases_triggered integer DEFAULT 0,
    edge_cases_solved integer DEFAULT 0,
    llm_interactions integer DEFAULT 0,
    llm_cost numeric(8,6) DEFAULT 0,
    error_details jsonb,
    error_category character varying(100),
    error_resolution character varying(50),
    environment character varying(50),
    browser_info jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.test_execution_analytics OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 33358)
-- Name: test_executions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_executions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    session_id character varying NOT NULL,
    scenario jsonb NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    results jsonb,
    performance_metrics jsonb,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


ALTER TABLE public.test_executions OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 33368)
-- Name: user_behavior_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_behavior_profiles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    experience_level character varying(20) DEFAULT 'intermediate'::character varying,
    risk_tolerance character varying(20) DEFAULT 'balanced'::character varying,
    automation_preference numeric(3,2) DEFAULT 0.6,
    decision_patterns jsonb DEFAULT '{}'::jsonb,
    performance_history jsonb DEFAULT '{}'::jsonb,
    learning_velocity numeric(5,4) DEFAULT 0.5,
    adaptability_score numeric(5,4) DEFAULT 0.5,
    preferred_notification_method character varying(20) DEFAULT 'in_app'::character varying,
    explanation_depth character varying(20) DEFAULT 'standard'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_behavior_profiles OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 33390)
-- Name: user_decision_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_decision_analytics (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    session_id character varying,
    decision_type character varying(50) NOT NULL,
    decision_category character varying(100),
    risk_level character varying(20),
    decision character varying(50) NOT NULL,
    decision_time integer NOT NULL,
    confidence_level numeric(3,2),
    system_recommendation character varying(50),
    agreed_with_system boolean,
    reasoning_provided boolean,
    outcome_correct boolean,
    business_impact character varying(50),
    learning_points jsonb,
    time_of_day integer,
    day_of_week integer,
    workload character varying(20),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_decision_analytics OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16527)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    role character varying DEFAULT 'retailer'::character varying,
    password_hash character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 33643)
-- Name: variant_combinations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variant_combinations (
    id integer NOT NULL,
    variant_id integer NOT NULL,
    option_id integer NOT NULL,
    option_value_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.variant_combinations OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 33642)
-- Name: variant_combinations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.variant_combinations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.variant_combinations_id_seq OWNER TO postgres;

--
-- TOC entry 4244 (class 0 OID 0)
-- Dependencies: 278
-- Name: variant_combinations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.variant_combinations_id_seq OWNED BY public.variant_combinations.id;


--
-- TOC entry 281 (class 1259 OID 33651)
-- Name: variant_option_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variant_option_values (
    id integer NOT NULL,
    option_id integer NOT NULL,
    value character varying(255) NOT NULL,
    display_value character varying(255) NOT NULL,
    hex_color character varying(7),
    image_url character varying(500),
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.variant_option_values OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 33650)
-- Name: variant_option_values_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.variant_option_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.variant_option_values_id_seq OWNER TO postgres;

--
-- TOC entry 4245 (class 0 OID 0)
-- Dependencies: 280
-- Name: variant_option_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.variant_option_values_id_seq OWNED BY public.variant_option_values.id;


--
-- TOC entry 283 (class 1259 OID 33663)
-- Name: variant_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variant_options (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    option_type character varying(50) DEFAULT 'text'::character varying NOT NULL,
    is_global boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.variant_options OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 33662)
-- Name: variant_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.variant_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.variant_options_id_seq OWNER TO postgres;

--
-- TOC entry 4246 (class 0 OID 0)
-- Dependencies: 282
-- Name: variant_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.variant_options_id_seq OWNED BY public.variant_options.id;


--
-- TOC entry 3511 (class 2604 OID 16642)
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- TOC entry 3469 (class 2604 OID 16396)
-- Name: brand_retailers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brand_retailers ALTER COLUMN id SET DEFAULT nextval('public.brand_retailers_id_seq'::regclass);


--
-- TOC entry 3472 (class 2604 OID 16407)
-- Name: brands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands ALTER COLUMN id SET DEFAULT nextval('public.brands_id_seq'::regclass);


--
-- TOC entry 3512 (class 2604 OID 16653)
-- Name: field_mapping_cache id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_mapping_cache ALTER COLUMN id SET DEFAULT nextval('public.field_mapping_cache_id_seq'::regclass);


--
-- TOC entry 3517 (class 2604 OID 16665)
-- Name: import_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches ALTER COLUMN id SET DEFAULT nextval('public.import_batches_id_seq'::regclass);


--
-- TOC entry 3522 (class 2604 OID 16678)
-- Name: import_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_history ALTER COLUMN id SET DEFAULT nextval('public.import_history_id_seq'::regclass);


--
-- TOC entry 3525 (class 2604 OID 16689)
-- Name: import_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_sessions ALTER COLUMN id SET DEFAULT nextval('public.import_sessions_id_seq'::regclass);


--
-- TOC entry 3476 (class 2604 OID 16421)
-- Name: media_assets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets ALTER COLUMN id SET DEFAULT nextval('public.media_assets_id_seq'::regclass);


--
-- TOC entry 3478 (class 2604 OID 16431)
-- Name: product_associations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_associations ALTER COLUMN id SET DEFAULT nextval('public.product_associations_id_seq'::regclass);


--
-- TOC entry 3480 (class 2604 OID 16439)
-- Name: product_attributes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_attributes ALTER COLUMN id SET DEFAULT nextval('public.product_attributes_id_seq'::regclass);


--
-- TOC entry 3483 (class 2604 OID 16450)
-- Name: product_families id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_families ALTER COLUMN id SET DEFAULT nextval('public.product_families_id_seq'::regclass);


--
-- TOC entry 3485 (class 2604 OID 16460)
-- Name: product_family_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_family_items ALTER COLUMN id SET DEFAULT nextval('public.product_family_items_id_seq'::regclass);


--
-- TOC entry 3488 (class 2604 OID 16469)
-- Name: product_syndications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_syndications ALTER COLUMN id SET DEFAULT nextval('public.product_syndications_id_seq'::regclass);


--
-- TOC entry 3725 (class 2604 OID 33624)
-- Name: product_variant_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_options ALTER COLUMN id SET DEFAULT nextval('public.product_variant_options_id_seq'::regclass);


--
-- TOC entry 3728 (class 2604 OID 33633)
-- Name: product_variants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants ALTER COLUMN id SET DEFAULT nextval('public.product_variants_id_seq'::regclass);


--
-- TOC entry 3494 (class 2604 OID 16483)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 3501 (class 2604 OID 16507)
-- Name: syndication_channels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syndication_channels ALTER COLUMN id SET DEFAULT nextval('public.syndication_channels_id_seq'::regclass);


--
-- TOC entry 3505 (class 2604 OID 16521)
-- Name: syndication_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syndication_logs ALTER COLUMN id SET DEFAULT nextval('public.syndication_logs_id_seq'::regclass);


--
-- TOC entry 3735 (class 2604 OID 33646)
-- Name: variant_combinations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_combinations ALTER COLUMN id SET DEFAULT nextval('public.variant_combinations_id_seq'::regclass);


--
-- TOC entry 3737 (class 2604 OID 33654)
-- Name: variant_option_values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_option_values ALTER COLUMN id SET DEFAULT nextval('public.variant_option_values_id_seq'::regclass);


--
-- TOC entry 3741 (class 2604 OID 33666)
-- Name: variant_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_options ALTER COLUMN id SET DEFAULT nextval('public.variant_options_id_seq'::regclass);


--
-- TOC entry 4178 (class 0 OID 16639)
-- Dependencies: 241
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- TOC entry 4187 (class 0 OID 33034)
-- Dependencies: 250
-- Data for Name: approval_decisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_decisions (id, approval_request_id, decision, approver, reasoning, conditions, "timestamp", context_at_decision, system_recommendation, confidence_score, metadata) FROM stdin;
\.


--
-- TOC entry 4188 (class 0 OID 33044)
-- Dependencies: 251
-- Data for Name: approval_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_metrics (id, date, approver, total_approvals, automated_approvals, manual_approvals, average_decision_time, correct_decisions, incorrect_decisions, accuracy_rate, approvals_by_type, approvals_by_risk, created_at) FROM stdin;
\.


--
-- TOC entry 4189 (class 0 OID 33060)
-- Dependencies: 252
-- Data for Name: approval_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_preferences (id, user_id, auto_approve_low_risk, auto_approve_confidence_threshold, preferred_notification_method, delegate_to, delegation_rules, decision_patterns, performance_metrics, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4190 (class 0 OID 33076)
-- Dependencies: 253
-- Data for Name: approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_requests (id, type, risk_level, priority, title, description, context, risk_assessment, assigned_to, current_approver, escalation_path, status, created_at, deadline, approved_at, approved_by, decision, decision_reasoning, test_execution_id, import_session_id, metadata) FROM stdin;
\.


--
-- TOC entry 4191 (class 0 OID 33087)
-- Dependencies: 254
-- Data for Name: automation_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.automation_alerts (id, alert_type, severity, status, title, description, metric, current_value, threshold, deviation_percentage, component, session_id, test_execution_id, user_id, acknowledged_by, acknowledged_at, resolved_by, resolved_at, resolution, escalation_level, escalated_at, escalated_to, notifications_sent, last_notification_at, notification_channels, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4192 (class 0 OID 33101)
-- Dependencies: 255
-- Data for Name: automation_confidence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.automation_confidence (id, category, context, current_confidence, previous_confidence, confidence_change, evidence_count, validation_count, success_count, last_validated_at, confidence_decay, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4193 (class 0 OID 33116)
-- Dependencies: 256
-- Data for Name: automation_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.automation_metrics (id, date, hourly, user_id, total_tests, automated_tests, manual_interventions, automation_rate, average_execution_time, total_processing_time, pass_rate, error_rate, edge_cases_detected, true_positives, false_positives, false_negatives, detection_accuracy, llm_costs, tokens_used, cost_per_test, resource_utilization, approval_requests, approval_rate, average_approval_time, escalations, performance_regressions, regression_severity, alerts_triggered, time_saved, manual_effort_reduction, cost_savings, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4154 (class 0 OID 16393)
-- Dependencies: 217
-- Data for Name: brand_retailers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.brand_retailers (id, brand_id, retailer_id, permissions, is_active, created_at) FROM stdin;
\.


--
-- TOC entry 4156 (class 0 OID 16404)
-- Dependencies: 219
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.brands (id, name, slug, description, story, category, logo_url, owner_id, is_active, created_at, updated_at) FROM stdin;
25	Cos brand	cos-brand	Test cos brand	\N	\N	\N	local-dev-user	t	2025-09-24 11:38:02.515121	2025-09-24 11:38:02.515121
1	Kerouac Watches	kerouac-watches	Luxury timepieces inspired by the spirit of adventure	Founded in 1957, Kerouac Watches embodies the free spirit of exploration and the precision of Swiss craftsmanship. Each timepiece tells a story of journeys taken and adventures yet to come.	Luxury Watches	https://via.placeholder.com/200x200?text=Kerouac	local-dev-user	t	2025-09-17 12:33:17.075596	2025-09-24 19:18:11.245
2	Aurora Cosmetics	aurora-cosmetics	Natural beauty products for the modern woman	Aurora Cosmetics believes in enhancing natural beauty with sustainable, cruelty-free products sourced from the finest ingredients around the world.	Beauty & Personal Care	https://via.placeholder.com/200x200?text=Aurora	local-dev-user	t	2025-09-17 12:33:17.077535	2025-09-24 19:18:11.25
3	TechFlow Electronics	techflow-electronics	Innovative gadgets for the digital age	TechFlow brings cutting-edge technology to everyday life, making advanced electronics accessible and intuitive for everyone.	Electronics	https://via.placeholder.com/200x200?text=TechFlow	local-dev-user	t	2025-09-17 12:33:17.078295	2025-09-24 19:18:11.251
13	CSRF Test Brand	csrf-test-brand	Testing brand creation after CSRF fix	\N	\N	\N	local-dev-user	t	2025-09-18 13:55:11.065127	2025-09-18 13:55:11.065127
17	Database Fix Test Brand	database-fix-test-brand	UPDATED: Database connectivity fully restored!	\N	Test	\N	local-dev-user	t	2025-09-22 10:35:07.891016	2025-09-22 10:35:38.107
18	Integration Test Brand	integration-test-brand	End-to-end integration test	\N	\N	\N	local-dev-user	t	2025-09-22 10:41:33.29472	2025-09-22 10:41:33.29472
\.


--
-- TOC entry 4194 (class 0 OID 33153)
-- Dependencies: 257
-- Data for Name: cost_optimization_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cost_optimization_metrics (id, date, service, operation, request_count, token_count, input_tokens, output_tokens, total_cost, cost_per_request, cost_per_token, average_latency, success_rate, error_rate, cache_hit_rate, redundant_requests, optimization_opportunities, budget_used, budget_remaining, projected_spend, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4195 (class 0 OID 33176)
-- Dependencies: 258
-- Data for Name: edge_case_detections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edge_case_detections (id, session_id, user_id, pattern, category, confidence, severity, description, error_count, data_context, risk_assessment, suggested_actions, automation_recommendation, test_recommendation, status, processing_time, llm_cost, approval_request_id, import_session_id, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4196 (class 0 OID 33188)
-- Dependencies: 259
-- Data for Name: edge_case_integration_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edge_case_integration_sessions (id, workflow_id, session_id, user_id, status, progress, current_step, options, cost_limit, time_limit, detection_results, test_results, approval_results, processing_time, total_cost, resource_usage, start_time, end_time, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4197 (class 0 OID 33204)
-- Dependencies: 260
-- Data for Name: edge_case_test_cases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.edge_case_test_cases (id, detection_id, test_case_id, relevance_score, expected_outcome, last_execution_status, last_execution_results, created_at) FROM stdin;
\.


--
-- TOC entry 4198 (class 0 OID 33213)
-- Dependencies: 261
-- Data for Name: error_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.error_analytics (id, pattern_id, session_id, pattern_signature, error_count, confidence, risk_level, user_context, data_context, metadata, "timestamp") FROM stdin;
\.


--
-- TOC entry 4199 (class 0 OID 33223)
-- Dependencies: 262
-- Data for Name: error_patterns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.error_patterns (id, signature, category, description, risk_level, confidence, frequency, total_occurrences, success_rate, average_resolution_time, first_seen, last_seen, trend_direction, resolution_strategies, automation_eligible, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4180 (class 0 OID 16650)
-- Dependencies: 243
-- Data for Name: field_mapping_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.field_mapping_cache (id, source_field, target_field, confidence, strategy, data_type, sample_values, metadata, usage_count, last_used_at, created_at, source_field_pattern, success_rate) FROM stdin;
7	brand_id	brandId	85	llm	string	\N	{"score": 85, "dataTypeMatch": true, "transformationRequired": "none"}	1	2025-09-19 16:14:47.711	2025-09-19 16:14:47.712081	\N	0
5	category	name	75	semantic	string	\N	{"score": 75, "patternMatch": false, "dataTypeMatch": true}	2	2025-09-19 16:14:47.714	2025-09-19 15:02:22.799329	\N	0
8	column_1	name	75	semantic	string	\N	{"score": 75, "patternMatch": false, "dataTypeMatch": true}	1	2025-09-19 16:21:11.592	2025-09-19 16:21:11.592558	\N	0
4	product_name	name	89	llm	string	\N	{"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}	2	2025-09-20 08:49:45.08	2025-09-19 15:02:22.797612	\N	0
9	sku_code	sku	89	llm	string	\N	{"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}	1	2025-09-20 08:49:45.083	2025-09-20 08:49:45.083204	\N	0
11	stock_qty	stock	89	llm	string	\N	{"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}	1	2025-09-20 08:49:45.088	2025-09-20 08:49:45.088071	\N	0
12	brand_name	brandId	85	llm	string	\N	{"score": 85, "dataTypeMatch": false, "transformationRequired": "lookup"}	1	2025-09-20 08:49:45.09	2025-09-20 08:49:45.090437	\N	0
6	name	name	95	exact	string	\N	{"score": 95, "dataTypeMatch": true}	3	2025-09-22 12:08:53.652	2025-09-19 16:14:47.697551	\N	0
1	price	price	95	exact	string	\N	{"score": 95, "dataTypeMatch": true}	4	2025-09-22 12:08:53.659	2025-09-19 15:02:22.785355	\N	0
2	sku	sku	95	exact	string	\N	{"score": 95, "dataTypeMatch": false}	3	2025-09-22 12:08:53.663	2025-09-19 15:02:22.79335	\N	0
14	unique_id	sku	85	llm	string	\N	{"score": 85, "dataTypeMatch": true, "transformationRequired": "none"}	1	2025-09-22 12:22:40.627	2025-09-22 12:22:40.627923	\N	0
3	description	longDescription	89	llm	string	\N	{"score": 90, "dataTypeMatch": true, "transformationRequired": "none"}	6	2025-09-22 12:23:01.029	2025-09-19 15:02:22.795286	\N	0
13	product_title	name	89	llm	string	\N	{"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}	2	2025-09-22 12:23:01.032	2025-09-22 12:22:40.617413	\N	0
10	price_usd	price	89	llm	string	\N	{"score": 95, "dataTypeMatch": false, "transformationRequired": "convert"}	3	2025-09-22 12:23:01.036	2025-09-20 08:49:45.086077	\N	0
\.


--
-- TOC entry 4200 (class 0 OID 33243)
-- Dependencies: 263
-- Data for Name: generated_test_cases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.generated_test_cases (id, suite_id, name, description, type, priority, estimated_duration, test_data, expected_results, validation_rules, edge_case_pattern, generated_by, generation_confidence, execution_count, success_count, last_executed_at, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4182 (class 0 OID 16662)
-- Dependencies: 245
-- Data for Name: import_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_batches (id, session_id, batch_number, start_index, end_index, record_count, status, processing_time, success_count, failure_count, worker_thread, error_message, started_at, completed_at, created_at) FROM stdin;
\.


--
-- TOC entry 4184 (class 0 OID 16675)
-- Dependencies: 247
-- Data for Name: import_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_history (id, session_id, record_index, record_data, validation_errors, import_status, entity_type, entity_id, processing_time, retry_count, created_at) FROM stdin;
\.


--
-- TOC entry 4186 (class 0 OID 16686)
-- Dependencies: 249
-- Data for Name: import_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_sessions (id, session_id, user_id, file_name, file_size, file_type, total_records, processed_records, successful_records, failed_records, status, error_log, field_mappings, import_config, processing_rate, estimated_time_remaining, started_at, completed_at, created_at, updated_at, file_path, workflow_state) FROM stdin;
1	04087df6-6450-4a22-8444-f54ce41d886f	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-18 22:29:53.40079	\N	2025-09-18 22:29:53.40079	2025-09-18 22:29:53.40079	\N	\N
2	c04bd600-a28b-411a-961f-298e4f7a7d8a	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-18 22:32:30.186943	\N	2025-09-18 22:32:30.186943	2025-09-18 22:32:30.186943	\N	\N
21	2498dbac-70b1-4f44-8546-1c3394790fc4	local-dev-user	malformed-test.csv	160	text/csv	5	0	0	0	mapping	\N	[{"metadata": {"test": true}, "strategy": "exact", "confidence": 95, "sourceField": "product_name", "targetField": "name"}]	\N	0	0	2025-09-18 23:18:18.997774	\N	2025-09-18 23:18:18.997774	2025-09-18 23:18:19.098	\N	\N
3	94963441-6c8a-4c1f-888e-593ae96b83c6	local-dev-user	test-upload.csv	553	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 22:33:01.996207	\N	2025-09-18 22:33:01.996207	2025-09-18 22:33:20.51	\N	\N
17	183ecc03-ea9f-4377-a3f8-7b7e1ded9088	local-dev-user	test-upload.csv	331	text/csv	3	0	0	0	mapping	\N	[{"metadata": {"test": true}, "strategy": "exact", "confidence": 95, "sourceField": "product_name", "targetField": "name"}]	\N	0	0	2025-09-18 23:09:32.371155	\N	2025-09-18 23:09:32.371155	2025-09-18 23:09:32.387	\N	\N
22	184db1f7-9839-427c-beaf-8b2b849386be	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-19 09:53:41.407197	\N	2025-09-19 09:53:41.407197	2025-09-19 09:53:41.407197	\N	\N
4	bbb14705-da46-4026-98fe-6bc64f1d9fb0	local-dev-user	test-invalid.txt	22	text/plain	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 22:33:57.509484	\N	2025-09-18 22:33:57.509484	2025-09-18 22:34:33.497	\N	\N
5	89e8339d-4e10-4218-8aca-ac0496fb8448	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-18 22:44:02.124767	\N	2025-09-18 22:44:02.124767	2025-09-18 22:44:02.124767	\N	\N
6	a01e0051-fe1e-41ae-8662-778834a2a4bc	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-18 22:48:29.220331	\N	2025-09-18 22:48:29.220331	2025-09-18 22:48:29.220331	\N	\N
7	0136ab93-e8d8-47cb-91fb-630b759e7feb	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-18 22:48:35.619183	\N	2025-09-18 22:48:35.619183	2025-09-18 22:48:35.619183	\N	\N
18	abff6670-8610-4e0d-850d-725997970cd5	local-dev-user	test-upload.csv	331	text/csv	3	0	0	0	mapping	\N	[{"metadata": {"test": true}, "strategy": "exact", "confidence": 95, "sourceField": "product_name", "targetField": "name"}]	\N	0	0	2025-09-18 23:10:25.267247	\N	2025-09-18 23:10:25.267247	2025-09-18 23:10:25.282	\N	\N
8	85e765c3-da96-4427-84d6-b3a1d0d5b1ff	local-dev-user	test-upload.csv	331	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 23:02:42.516501	\N	2025-09-18 23:02:42.516501	2025-09-18 23:02:42.581	\N	\N
9	3c53c610-6b08-4948-9dba-eb7ae33e4f37	local-dev-user	test-upload.csv	331	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 23:03:45.767777	\N	2025-09-18 23:03:45.767777	2025-09-18 23:03:45.782	\N	\N
10	a370ebac-06a9-473f-a903-2c6bae911098	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-18 23:04:23.027465	\N	2025-09-18 23:04:23.027465	2025-09-18 23:04:23.027465	\N	\N
11	9bd658a5-43d1-445f-92d4-0090b89beefa	local-dev-user	test-upload.csv	331	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 23:05:44.731889	\N	2025-09-18 23:05:44.731889	2025-09-18 23:05:44.795	\N	\N
12	fc6e0956-21e2-45d7-a826-b9eb75234d19	local-dev-user	test-upload.csv	331	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 23:06:06.324856	\N	2025-09-18 23:06:06.324856	2025-09-18 23:06:06.336	\N	\N
19	0e1ddb75-0b7e-45e5-9c02-bd0e70dd534f	local-dev-user	products-template.csv	2015	text/csv	3	0	0	0	cancelled	\N	[{"metadata": {"test": true}, "strategy": "exact", "confidence": 95, "sourceField": "product_name", "targetField": "name"}]	\N	0	0	2025-09-18 23:15:52.705356	\N	2025-09-18 23:15:52.705356	2025-09-18 23:15:52.809	\N	\N
13	3664d628-68c6-453a-a742-3f108cc3b32f	local-dev-user	test-upload.csv	331	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 23:06:40.019491	\N	2025-09-18 23:06:40.019491	2025-09-18 23:06:40.037	\N	\N
14	d812ee0b-38eb-4985-bf7a-ec3c5516a15e	local-dev-user	test-upload.csv	331	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 23:07:11.67426	\N	2025-09-18 23:07:11.67426	2025-09-18 23:07:11.684	\N	\N
23	4434fd79-c185-440a-8c71-e72015024cee	local-dev-user	test-upload.csv	115	application/octet-stream	3	0	0	0	mapping	\N	[{"metadata": {"system": "simplified-fallback", "reasoning": "Direct match with the product name/title field."}, "strategy": "llm", "confidence": 95, "sourceField": "column_1", "targetField": "name"}, {"metadata": {"system": "simplified-fallback", "reasoning": "Price field matches, but values are in dollars and need to be converted to cents."}, "strategy": "llm", "confidence": 85, "sourceField": "column_2", "targetField": "price"}, {"metadata": {"system": "simplified-fallback", "reasoning": "Description field aligns well with the brief product description."}, "strategy": "llm", "confidence": 80, "sourceField": "column_3", "targetField": "shortDescription"}]	\N	0	0	2025-09-19 09:55:44.044301	\N	2025-09-19 09:55:44.044301	2025-09-19 09:55:57.084	\N	\N
15	261dc670-c820-4520-9da0-7fdad3f63771	local-dev-user	test-upload.csv	331	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 23:07:41.228906	\N	2025-09-18 23:07:41.228906	2025-09-18 23:07:41.24	\N	\N
16	0025ee1b-8b85-4d99-af73-2a785e96b5df	local-dev-user	test-upload.csv	331	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Cannot read properties of undefined (reading 'toString')"}	\N	\N	0	0	2025-09-18 23:08:53.391946	\N	2025-09-18 23:08:53.391946	2025-09-18 23:08:53.411	\N	\N
20	a2cdd2d1-d2d6-4680-ac7b-926eb176227c	local-dev-user	products-template.csv	2015	text/csv	3	0	0	0	cancelled	\N	[{"metadata": {"test": true}, "strategy": "exact", "confidence": 95, "sourceField": "product_name", "targetField": "name"}]	\N	0	0	2025-09-18 23:16:58.604292	\N	2025-09-18 23:16:58.604292	2025-09-18 23:16:58.689	\N	\N
24	1d2b63f7-dd97-4661-8689-a7d45dc94352	local-dev-user	test-upload.csv	115	application/octet-stream	3	0	0	0	previewing	\N	[{"metadata": {"system": "simplified-fallback", "reasoning": "The field 'column_1' directly corresponds to the product name/title."}, "strategy": "llm", "confidence": 95, "sourceField": "column_1", "targetField": "name"}, {"metadata": {"system": "simplified-fallback", "reasoning": "The field 'column_2' represents the product price, though it is in dollars and needs to be converted to cents."}, "strategy": "llm", "confidence": 85, "sourceField": "column_2", "targetField": "price"}, {"metadata": {"system": "simplified-fallback", "reasoning": "The field 'column_3' provides a brief description of the product, aligning with the shortDescription field."}, "strategy": "llm", "confidence": 80, "sourceField": "column_3", "targetField": "shortDescription"}]	\N	0	0	2025-09-19 10:00:16.605128	\N	2025-09-19 10:00:16.605128	2025-09-19 10:00:42.975	uploads/file-1758276026174-0cf7d4615f44.csv	\N
28	8f9d4d59-b656-4aea-9926-2dd45a4ddee7	local-dev-user	file-1758237418614-79c15cbce0d6.csv	2015	text/csv	3	0	0	0	mapping	\N	[{"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "name", "targetField": "name"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "slug", "targetField": "slug"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "story", "targetField": "story"}, {"metadata": {"score": 95, "dataTypeMatch": false}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "sku", "targetField": "sku"}, {"metadata": {"score": 95, "dataTypeMatch": false}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "gtin", "targetField": "gtin"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "status", "targetField": "status"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "price", "targetField": "price"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "stock", "targetField": "stock"}, {"metadata": {"score": 80, "dataTypeMatch": true, "similarityScore": 0.9411764705882353}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (94% similarity)", "confidence": 80, "sourceField": "short_description", "targetField": "shortDescription"}, {"metadata": {"score": 80, "dataTypeMatch": true, "similarityScore": 0.9375}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (94% similarity)", "confidence": 80, "sourceField": "long_description", "targetField": "longDescription"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": false}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "brand_id", "targetField": "sku"}, {"metadata": {"score": 76, "dataTypeMatch": true, "similarityScore": 0.8888888888888888}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (89% similarity)", "confidence": 76, "sourceField": "parent_id", "targetField": "parentId"}, {"metadata": {"score": 77, "dataTypeMatch": true, "similarityScore": 0.9}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (90% similarity)", "confidence": 77, "sourceField": "is_variant", "targetField": "isVariant"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": false}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "compare_at_price", "targetField": "sku"}, {"metadata": {"score": 76, "dataTypeMatch": true, "similarityScore": 0.8947368421052632}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (89% similarity)", "confidence": 76, "sourceField": "low_stock_threshold", "targetField": "lowStockThreshold"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": false}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "weight", "targetField": "sku"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "dimensions", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "tags", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "variants", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "category", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "condition", "targetField": "sku"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "warranty", "targetField": "name"}]	\N	0	0	2025-09-19 13:52:55.626953	\N	2025-09-19 13:52:55.626953	2025-09-19 13:52:55.655	uploads/file-1758289975639-4afd7b2ff1e7.csv	\N
25	95cbc691-51d2-49b3-b3d3-c3dad160a14d	local-dev-user	test-products.csv	214	application/octet-stream	4	0	0	0	previewing	\N	[{"metadata": {"system": "simplified-fallback", "reasoning": "The field 'column_1' contains product names which directly match the 'name' field."}, "strategy": "llm", "confidence": 85, "sourceField": "column_1", "targetField": "name"}, {"metadata": {"system": "simplified-fallback", "reasoning": "The field 'column_2' contains SKU identifiers that directly correspond to the 'sku' field."}, "strategy": "llm", "confidence": 90, "sourceField": "column_2", "targetField": "sku"}, {"metadata": {"system": "simplified-fallback", "reasoning": "The field 'column_3' contains price values in dollars, which can be converted to cents for the 'price' field."}, "strategy": "llm", "confidence": 75, "sourceField": "column_3", "targetField": "price"}, {"metadata": {"system": "simplified-fallback", "reasoning": "The field 'column_5' contains product descriptions that are suitable for the 'shortDescription' field."}, "strategy": "llm", "confidence": 80, "sourceField": "column_5", "targetField": "shortDescription"}, {"metadata": {"system": "simplified-fallback", "reasoning": "The field 'column_4' contains inventory counts which directly correspond to the 'stock' field."}, "strategy": "llm", "confidence": 70, "sourceField": "column_4", "targetField": "stock"}]	\N	0	0	2025-09-19 10:12:24.414486	\N	2025-09-19 10:12:24.414486	2025-09-19 10:13:46.776	uploads/file-1758276770130-b6e7e5141598.csv	\N
26	06ed537f-b8a8-4056-bbe7-0ad9b8bf785c	local-dev-user	file-1758234800429-5d9314f58e10.csv	553	text/csv	\N	0	0	0	failed	{"error": "Field extraction failed: Invalid Record Length: expect 22, got 24 on line 2"}	\N	\N	0	0	2025-09-19 13:12:37.0006	\N	2025-09-19 13:12:37.0006	2025-09-19 13:12:37.044	uploads/file-1758287557022-7faaafea7713.csv	\N
29	c5ae75c9-0be3-4fe3-9be5-69c094d40153	local-dev-user	file-1758237025279-a8cc2eff74c7.csv	331	text/csv	3	0	0	0	mapping	\N	[{"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "description", "targetField": "name"}, {"metadata": {"score": 79, "patternMatch": true, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 79, "sourceField": "product_name", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": false}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "sku_code", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Price field pattern match", "confidence": 75, "sourceField": "price_usd", "targetField": "price"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": false}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "stock_qty", "targetField": "sku"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "brand_name", "targetField": "name"}]	\N	0	0	2025-09-19 14:13:38.689467	\N	2025-09-19 14:13:38.689467	2025-09-19 14:13:38.71	uploads/file-1758291218699-241c7cb379cb.csv	\N
27	f2e737cb-55db-4bde-b216-d997fadb9d6b	local-dev-user	file-1758237352730-6fe69783c8a0.csv	2015	text/csv	3	0	0	0	mapping	\N	[{"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "name", "targetField": "name"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "slug", "targetField": "slug"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "story", "targetField": "story"}, {"metadata": {"score": 95, "dataTypeMatch": false}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "sku", "targetField": "sku"}, {"metadata": {"score": 95, "dataTypeMatch": false}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "gtin", "targetField": "gtin"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "status", "targetField": "status"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "price", "targetField": "price"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "stock", "targetField": "stock"}, {"metadata": {"score": 80, "dataTypeMatch": true, "similarityScore": 0.9411764705882353}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (94% similarity)", "confidence": 80, "sourceField": "short_description", "targetField": "shortDescription"}, {"metadata": {"score": 80, "dataTypeMatch": true, "similarityScore": 0.9375}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (94% similarity)", "confidence": 80, "sourceField": "long_description", "targetField": "longDescription"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": false}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "brand_id", "targetField": "sku"}, {"metadata": {"score": 76, "dataTypeMatch": true, "similarityScore": 0.8888888888888888}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (89% similarity)", "confidence": 76, "sourceField": "parent_id", "targetField": "parentId"}, {"metadata": {"score": 77, "dataTypeMatch": true, "similarityScore": 0.9}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (90% similarity)", "confidence": 77, "sourceField": "is_variant", "targetField": "isVariant"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": false}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "compare_at_price", "targetField": "sku"}, {"metadata": {"score": 76, "dataTypeMatch": true, "similarityScore": 0.8947368421052632}, "strategy": "fuzzy", "reasoning": "Fuzzy string match (89% similarity)", "confidence": 76, "sourceField": "low_stock_threshold", "targetField": "lowStockThreshold"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": false}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "weight", "targetField": "sku"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "dimensions", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "tags", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "variants", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "category", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "SKU/product code pattern match", "confidence": 75, "sourceField": "condition", "targetField": "sku"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "warranty", "targetField": "name"}]	\N	0	0	2025-09-19 13:52:09.605904	\N	2025-09-19 13:52:09.605904	2025-09-19 13:52:09.684	uploads/file-1758289929619-6419839add96.csv	\N
30	e4227429-00f9-43b2-9987-c212e3f43c2c	local-dev-user	file-1758236831681-c53766c9bd97.csv	331	text/csv	3	0	0	0	mapping	\N	[]	\N	0	0	2025-09-19 14:22:27.223989	\N	2025-09-19 14:22:27.223989	2025-09-19 14:22:37.386	uploads/file-1758291747250-78b1ce93cec0.csv	\N
31	b9a2ae82-5ef5-4217-9f14-539d63b515c0	local-dev-user	test-workflow-automation.csv	370	application/octet-stream	5	0	0	0	mapping	\N	[{"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "price", "targetField": "price"}, {"metadata": {"score": 95, "dataTypeMatch": false}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "sku", "targetField": "sku"}, {"metadata": {"score": 90, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'description' provides a detailed description of the product, which matches the longDescription field.", "confidence": 89, "sourceField": "description", "targetField": "longDescription"}, {"metadata": {"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'product_name' directly corresponds to the product name/title in the SKU database.", "confidence": 89, "sourceField": "product_name", "targetField": "name"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "category", "targetField": "name"}]	\N	0	0	2025-09-19 15:01:51.013126	\N	2025-09-19 15:01:51.013126	2025-09-19 15:02:22.802	uploads/file-1758294134076-b4e68a17bf26.csv	\N
38	526fac3d-abb9-41d1-9072-0f6e180399ee	local-dev-user	file-1758236800033-0fb820073271.csv	331	text/csv	3	0	0	0	cancelled	\N	[{"metadata": {"score": 89, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'description' closely matches the 'longDescription' field.", "confidence": 89, "sourceField": "description", "targetField": "longDescription"}, {"metadata": {"score": 89, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'product_name' closely matches the 'name' field in terms of content and purpose.", "confidence": 89, "sourceField": "product_name", "targetField": "name"}, {"metadata": {"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'sku_code' directly corresponds to the 'sku' field.", "confidence": 89, "sourceField": "sku_code", "targetField": "sku"}, {"metadata": {"score": 95, "dataTypeMatch": false, "transformationRequired": "convert"}, "strategy": "llm", "reasoning": "The field 'price_usd' can be converted to cents for the 'price' field.", "confidence": 89, "sourceField": "price_usd", "targetField": "price"}, {"metadata": {"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'stock_qty' directly corresponds to the 'stock' field.", "confidence": 89, "sourceField": "stock_qty", "targetField": "stock"}, {"metadata": {"score": 85, "dataTypeMatch": false, "transformationRequired": "lookup"}, "strategy": "llm", "reasoning": "The field 'brand_name' can be mapped to 'brandId' but requires a lookup for the actual ID.", "confidence": 85, "sourceField": "brand_name", "targetField": "brandId"}]	\N	0	0	2025-09-20 08:49:35.997111	\N	2025-09-20 08:49:35.997111	2025-09-20 08:49:46.614	uploads/file-1758358176017-40c25395abb9.csv	awaiting_approval
32	b71e08a1-250f-47da-9b8a-6dab1174cb52	local-dev-user	test-high-confidence.csv	520	application/octet-stream	5	0	0	0	awaiting_approval	\N	[{"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "name", "targetField": "name"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "price", "targetField": "price"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "sku", "targetField": "sku"}, {"metadata": {"score": 89, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "Fuzzy match of description to long description field in SKU database.", "confidence": 89, "sourceField": "description", "targetField": "longDescription"}, {"metadata": {"score": 85, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "Fuzzy match of brand_id to brandId field in SKU database.", "confidence": 85, "sourceField": "brand_id", "targetField": "brandId"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "category", "targetField": "name"}]	\N	0	0	2025-09-19 16:03:24.349169	\N	2025-09-19 16:03:24.349169	2025-09-19 16:14:49.228	uploads/file-1758298479069-7163c53ddda9.csv	awaiting_approval
35	ebb9bac4-7ff4-4ff8-b833-aa538406fe9a	local-dev-user	test-error-file.csv	223	application/octet-stream	5	0	0	0	failed	\N	[{"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "column_1", "targetField": "name"}]	\N	0	0	2025-09-19 16:20:38.834925	\N	2025-09-19 16:20:38.834925	2025-09-19 16:21:11.612	uploads/file-1758298868660-fe143f2fecc9.csv	failed
33	404da14d-85fd-4834-8716-420b833f853f	local-dev-user	test-low-confidence.csv	380	application/octet-stream	5	0	0	0	mapping_complete	\N	[]	\N	0	0	2025-09-19 16:16:07.846069	\N	2025-09-19 16:16:07.846069	2025-09-19 16:16:25.97	uploads/file-1758298575943-31160b7d94f1.csv	mapping_complete
34	316f5093-c4f9-4538-914d-4629f6288154	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-19 16:18:58.715215	\N	2025-09-19 16:18:58.715215	2025-09-19 16:18:58.715215	\N	\N
40	2b916876-8ec7-488d-a83c-fb06b5be3e7b	local-dev-user	edge-case-test.csv	155	text/csv	3	0	0	0	cancelled	\N	[{"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "name", "targetField": "name"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "price", "targetField": "price"}, {"metadata": {"score": 89, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "Description field matched with long description.", "confidence": 89, "sourceField": "description", "targetField": "longDescription"}]	\N	0	0	2025-09-20 09:30:09.845582	\N	2025-09-20 09:30:09.845582	2025-09-20 09:30:16.452	uploads/file-1758360609858-cddf3f0cbd9e.csv	awaiting_approval
36	ce3e0b96-b3d7-444b-8f5b-cc5e74aa5089	local-dev-user	test-performance.csv	1943	application/octet-stream	20	0	0	0	mapping_complete	\N	[]	\N	0	0	2025-09-19 16:22:35.213515	\N	2025-09-19 16:22:35.213515	2025-09-19 16:22:57.061	uploads/file-1758298967018-a710f897a9f5.csv	mapping_complete
37	5b5aa19b-a81c-4796-8b71-5b2bf139e2b6	local-dev-user	file-1758236831681-c53766c9bd97.csv	331	text/csv	3	0	0	0	mapping_complete	\N	[]	\N	0	0	2025-09-19 16:55:57.212499	\N	2025-09-19 16:55:57.212499	2025-09-19 16:56:07.313	uploads/file-1758300957225-44dd29ff578b.csv	mapping_complete
39	b3ac57c9-7615-420a-a668-594e6a261c21	local-dev-user	integration-test-products.csv	719	text/csv	10	0	0	0	cancelled	\N	[]	\N	0	0	2025-09-20 09:25:33.892479	\N	2025-09-20 09:25:33.892479	2025-09-20 09:25:44.03	uploads/file-1758360333904-dea032f3ecfe.csv	mapping_complete
41	03d66a73-f237-4e3b-9e71-70eefd30565b	local-dev-user	test-comprehensive-bulk-upload.csv	1531	text/csv	8	0	0	0	cancelled	\N	[]	\N	0	0	2025-09-22 11:11:19.103819	\N	2025-09-22 11:11:19.103819	2025-09-22 11:11:29.327	uploads/file-1758539479118-f13926dca73f.csv	mapping_complete
44	6350faaa-e4ce-44b2-ba6a-3260f83dbd64	local-dev-user	test-upload.csv	165	application/octet-stream	3	0	0	0	previewing	\N	[{"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "name", "targetField": "name"}, {"metadata": {"score": 95, "dataTypeMatch": true}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "price", "targetField": "price"}, {"metadata": {"score": 95, "dataTypeMatch": false}, "strategy": "exact", "reasoning": "Exact field name match", "confidence": 95, "sourceField": "sku", "targetField": "sku"}, {"metadata": {"score": 89, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "Fuzzy match found for product description.", "confidence": 89, "sourceField": "description", "targetField": "longDescription"}]	\N	0	0	2025-09-22 12:08:45.49737	\N	2025-09-22 12:08:45.49737	2025-09-22 12:09:01.633	uploads/file-1758542925512-e6455011b9e6.csv	awaiting_approval
42	8c619735-8edb-4d90-b5e2-29b2fb9a20eb	local-dev-user	test-bulk-upload-simulation.csv	554	text/csv	5	0	0	0	failed	\N	[{"metadata": {"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'item_title' directly corresponds to the product name/title.", "confidence": 89, "sourceField": "item_title", "targetField": "name"}, {"metadata": {"score": 90, "dataTypeMatch": true, "transformationRequired": "convert"}, "strategy": "llm", "reasoning": "The field 'cost' represents the product selling price, which is stored in cents.", "confidence": 89, "sourceField": "cost", "targetField": "price"}, {"metadata": {"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'identifier' directly corresponds to the SKU identifier.", "confidence": 89, "sourceField": "identifier", "targetField": "sku"}, {"metadata": {"score": 90, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'brief_description' directly corresponds to the short product description.", "confidence": 89, "sourceField": "brief_description", "targetField": "shortDescription"}, {"metadata": {"score": 75, "patternMatch": false, "dataTypeMatch": true}, "strategy": "semantic", "reasoning": "Product name pattern match", "confidence": 75, "sourceField": "category_type", "targetField": "name"}]	\N	0	0	2025-09-22 11:15:52.64202	\N	2025-09-22 11:15:52.64202	2025-09-22 11:15:59.294	uploads/file-1758539752657-1d170ba89ebb.csv	failed
43	c9c7a9f3-73a1-4c3c-88cb-dfa5ab848c73	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-22 12:05:54.220148	\N	2025-09-22 12:05:54.220148	2025-09-22 12:05:54.220148	\N	\N
46	d86ff1b8-e0e5-4fcd-ac24-0c4d75ced730	local-dev-user	test-edge-case-inconsistent-columns.csv	176	application/octet-stream	4	0	0	0	awaiting_approval	\N	[{"metadata": {"score": 95, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The field 'product_title' directly corresponds to the product name.", "confidence": 89, "sourceField": "product_title", "targetField": "name"}, {"metadata": {"score": 89, "dataTypeMatch": true, "transformationRequired": "convert"}, "strategy": "llm", "reasoning": "The price in USD can be converted to cents for the SKU database.", "confidence": 89, "sourceField": "price_usd", "targetField": "price"}, {"metadata": {"score": 85, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The 'unique_id' can serve as a SKU identifier based on historical mappings.", "confidence": 85, "sourceField": "unique_id", "targetField": "sku"}]	\N	0	0	2025-09-22 12:22:26.481304	\N	2025-09-22 12:22:26.481304	2025-09-22 12:22:42.149	uploads/file-1758543752694-452618eccaab.csv	awaiting_approval
45	5e523104-e178-458a-a810-c5862e463a7d	local-dev-user	test-comprehensive-bulk-upload.csv	1531	application/octet-stream	8	0	0	0	mapping_complete	\N	[]	\N	0	0	2025-09-22 12:20:37.293586	\N	2025-09-22 12:20:37.293586	2025-09-22 12:21:07.295	uploads/file-1758543657140-08984d2de141.csv	mapping_complete
54	5664a0d1-6afb-4a4d-a168-7c02d6c69c9c	local-dev-user	test-comprehensive-bulk-upload.csv	1531	application/octet-stream	8	0	0	0	mapping_complete	\N	[]	\N	0	0	2025-09-22 12:39:02.02513	\N	2025-09-22 12:39:02.02513	2025-09-22 12:39:12.062	uploads/file-1758544742040-6014abbeb14f.csv	mapping_complete
47	a1c07245-b7f0-4605-a028-628b7335f28a	local-dev-user	test-edge-case-quoted-commas.csv	323	application/octet-stream	3	0	0	0	awaiting_approval	\N	[{"metadata": {"score": 89, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The description field provides a detailed explanation suitable for longDescription.", "confidence": 89, "sourceField": "description", "targetField": "longDescription"}, {"metadata": {"score": 89, "dataTypeMatch": true, "transformationRequired": "none"}, "strategy": "llm", "reasoning": "The product title closely matches the required product name field.", "confidence": 89, "sourceField": "product_title", "targetField": "name"}, {"metadata": {"score": 89, "dataTypeMatch": false, "transformationRequired": "convert"}, "strategy": "llm", "reasoning": "The price in USD can be converted to cents for the price field.", "confidence": 89, "sourceField": "price_usd", "targetField": "price"}]	\N	0	0	2025-09-22 12:22:47.931457	\N	2025-09-22 12:22:47.931457	2025-09-22 12:23:02.549	uploads/file-1758543774026-2b43213c4366.csv	awaiting_approval
55	9dfea55d-8eac-491d-af8a-e060113ba3b9	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-23 14:32:59.89384	\N	2025-09-23 14:32:59.89384	2025-09-23 14:32:59.89384	\N	\N
48	34e378aa-4bc5-4c44-9519-adbb9eba1605	local-dev-user	test-invalid-file.txt	68	text/plain	\N	0	0	0	failed	{"error": "Field extraction failed: Invalid JSON format: Unexpected token 'T', \\"This is no\\"... is not valid JSON"}	\N	\N	0	0	2025-09-22 12:23:29.376076	\N	2025-09-22 12:23:29.376076	2025-09-22 12:31:41.438	uploads/file-1758544301412-20c8ceb82f77.txt	failed
49	efbe63cf-fe4e-4990-888b-09086104a148	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-22 12:38:18.785227	\N	2025-09-22 12:38:18.785227	2025-09-22 12:38:18.785227	\N	\N
50	79b0fcb5-2d01-45c6-9983-11b696d2b4d1	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-22 12:38:18.812398	\N	2025-09-22 12:38:18.812398	2025-09-22 12:38:18.812398	\N	\N
51	d6f56159-1720-4969-9738-3b7d849f3965	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-22 12:38:18.833693	\N	2025-09-22 12:38:18.833693	2025-09-22 12:38:18.833693	\N	\N
52	991b01fe-5fdf-4206-ad30-0e1917b0682e	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-22 12:38:18.868053	\N	2025-09-22 12:38:18.868053	2025-09-22 12:38:18.868053	\N	\N
53	f7be9f8e-572d-4247-bbe0-f96907ea6cd0	local-dev-user	\N	\N	\N	\N	0	0	0	initiated	\N	\N	\N	0	0	2025-09-22 12:38:18.884969	\N	2025-09-22 12:38:18.884969	2025-09-22 12:38:18.884969	\N	\N
56	21fc1fda-dee1-41c5-b26f-67a80db27070	local-dev-user	scenario1-perfect-upload.csv	1490	text/csv	10	0	0	0	cancelled	\N	[]	\N	0	0	2025-09-23 15:39:09.275355	\N	2025-09-23 15:39:09.275355	2025-09-23 15:39:19.511	uploads/file-1758641949284-ac56e50c8cd6.csv	mapping_complete
57	d7eaf697-3ac8-4b3e-ac7c-5996d220876c	local-dev-user	scenario2-unusual-field-names.csv	1485	text/csv	10	0	0	0	cancelled	\N	[]	\N	0	0	2025-09-23 15:40:09.488967	\N	2025-09-23 15:40:09.488967	2025-09-23 15:40:19.515	uploads/file-1758642009496-0d3fce00a78a.csv	mapping_complete
\.


--
-- TOC entry 4158 (class 0 OID 16418)
-- Dependencies: 221
-- Data for Name: media_assets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media_assets (id, file_name, original_name, mime_type, file_size, url, asset_type, product_id, brand_id, uploaded_by, created_at, alt_text, metadata) FROM stdin;
1	explorer-classic-hero.jpg	Explorer Classic Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Explorer%20Classic	hero	1	\N	user-brand-owner-1	2025-09-17 12:35:11.422214	\N	\N
2	dharma-chronograph-hero.jpg	Dharma Chronograph Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Dharma%20Chronograph	hero	2	\N	user-brand-owner-1	2025-09-17 12:35:11.423523	\N	\N
3	beat-generation-limited-hero.jpg	Beat Generation Limited Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Beat%20Generation%20Limited	hero	3	\N	user-brand-owner-1	2025-09-17 12:35:11.423947	\N	\N
4	explorer-classic-hero.jpg	Explorer Classic Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Explorer%20Classic	hero	1	\N	user-brand-owner-1	2025-09-17 12:38:04.647182	\N	\N
5	dharma-chronograph-hero.jpg	Dharma Chronograph Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Dharma%20Chronograph	hero	2	\N	user-brand-owner-1	2025-09-17 12:38:04.64843	\N	\N
6	beat-generation-limited-hero.jpg	Beat Generation Limited Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Beat%20Generation%20Limited	hero	3	\N	user-brand-owner-1	2025-09-17 12:38:04.649048	\N	\N
7	explorer-classic-hero.jpg	Explorer Classic Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Explorer%20Classic	hero	1	\N	user-brand-owner-1	2025-09-17 12:38:30.434486	\N	\N
8	dharma-chronograph-hero.jpg	Dharma Chronograph Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Dharma%20Chronograph	hero	2	\N	user-brand-owner-1	2025-09-17 12:38:30.435696	\N	\N
9	beat-generation-limited-hero.jpg	Beat Generation Limited Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Beat%20Generation%20Limited	hero	3	\N	user-brand-owner-1	2025-09-17 12:38:30.436569	\N	\N
10	explorer-classic-hero.jpg	Explorer Classic - CSRF FIX TEST Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Explorer%20Classic%20-%20CSRF%20FIX%20TEST	hero	1	\N	user-brand-owner-1	2025-09-19 15:08:34.194457	\N	\N
11	dharma-chronograph-hero.jpg	Dharma Chronograph Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Dharma%20Chronograph	hero	2	\N	user-brand-owner-1	2025-09-19 15:08:34.199325	\N	\N
12	beat-generation-limited-hero.jpg	Beat Generation Limited Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Beat%20Generation%20Limited	hero	3	\N	user-brand-owner-1	2025-09-19 15:08:34.200021	\N	\N
14	product-38-1758741250551-0.png	test-image.png	image/png	70	/uploads/product-38-1758741250551-0.png	product	38	\N	local-dev-user	2025-09-24 19:14:10.551394	\N	\N
15	product-38-1758741463855-0.png	test-image.png	image/png	70	/uploads/product-38-1758741463855-0.png	product	38	\N	local-dev-user	2025-09-24 19:17:43.85537	\N	\N
16	explorer-classic-hero.jpg	Explorer Classic - CSRF FIX TEST Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Explorer%20Classic%20-%20CSRF%20FIX%20TEST	hero	1	\N	user-brand-owner-1	2025-09-24 19:18:11.260888	\N	\N
17	dharma-chronograph-hero.jpg	Dharma Chronograph Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Dharma%20Chronograph	hero	2	\N	user-brand-owner-1	2025-09-24 19:18:11.262017	\N	\N
18	beat-generation-limited-hero.jpg	Beat Generation Limited Hero Image	image/jpeg	500000	https://via.placeholder.com/800x600?text=Beat%20Generation%20Limited	hero	3	\N	user-brand-owner-1	2025-09-24 19:18:11.262694	\N	\N
19	product-38-1758741564943-0.png	test-image.png	image/png	70	/uploads/product-38-1758741564943-0.png	hero	38	\N	local-dev-user	2025-09-24 19:19:24.944922	Updated via API test 2	{"format": "png", "extracted_at": "2025-09-24T19:19:24.945Z"}
\.


--
-- TOC entry 4201 (class 0 OID 33256)
-- Dependencies: 264
-- Data for Name: ml_feedback_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ml_feedback_sessions (id, user_id, session_type, feedback_data, learning_outcomes, accuracy_improvement, confidence_change, processing_time, approval_request_id, detection_id, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4202 (class 0 OID 33266)
-- Dependencies: 265
-- Data for Name: ml_learning_patterns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ml_learning_patterns (id, pattern_type, pattern_data, confidence, applicability, effectiveness, usage_count, success_rate, user_context, domain_context, last_used_at, last_updated_at, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4203 (class 0 OID 33279)
-- Dependencies: 266
-- Data for Name: performance_trends; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.performance_trends (id, metric, timeframe, start_date, end_date, current_value, previous_value, trend_direction, change_percentage, average, median, standard_deviation, min, max, predicted_value, confidence_interval, seasonality_factor, is_anomaly, anomaly_score, anomaly_threshold, data_points, data_quality, missing_data_percentage, metadata, calculated_at) FROM stdin;
\.


--
-- TOC entry 4160 (class 0 OID 16428)
-- Dependencies: 223
-- Data for Name: product_associations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_associations (id, source_product_id, target_product_id, association_type, created_at) FROM stdin;
\.


--
-- TOC entry 4162 (class 0 OID 16436)
-- Dependencies: 225
-- Data for Name: product_attributes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_attributes (id, product_id, attribute_name, attribute_value, attribute_type, created_at) FROM stdin;
\.


--
-- TOC entry 4164 (class 0 OID 16447)
-- Dependencies: 227
-- Data for Name: product_families; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_families (id, name, description, family_type, brand_id, created_at) FROM stdin;
\.


--
-- TOC entry 4166 (class 0 OID 16457)
-- Dependencies: 229
-- Data for Name: product_family_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_family_items (id, family_id, product_id, quantity, sort_order) FROM stdin;
\.


--
-- TOC entry 4168 (class 0 OID 16466)
-- Dependencies: 231
-- Data for Name: product_syndications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_syndications (id, product_id, channel_id, status, external_id, external_url, last_sync_at, last_sync_status, error_message, sync_retries, is_enabled, created_at, updated_at) FROM stdin;
1	38	8	error	\N	\N	2025-09-25 14:33:56.902	error	Channel type 'pos' not implemented	1	t	2025-09-24 19:21:35.047168	2025-09-25 14:33:56.903
3	38	2	error	\N	\N	2025-09-25 14:33:56.903	error	Channel type 'marketplace' not implemented	1	t	2025-09-24 20:45:56.254613	2025-09-25 14:33:56.903
2	38	9	error	\N	\N	2025-09-25 14:33:56.903	error	Channel type 'export' not implemented	1	t	2025-09-24 19:21:44.232511	2025-09-25 14:33:56.903
\.


--
-- TOC entry 4212 (class 0 OID 33621)
-- Dependencies: 275
-- Data for Name: product_variant_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variant_options (id, product_id, option_id, is_required, created_at) FROM stdin;
\.


--
-- TOC entry 4214 (class 0 OID 33630)
-- Dependencies: 277
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_variants (id, parent_product_id, variant_product_id, variant_sku, variant_name, price_adjustment, weight_adjustment, is_active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4170 (class 0 OID 16480)
-- Dependencies: 233
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, slug, short_description, long_description, story, brand_id, parent_id, sku, status, is_variant, created_at, updated_at, gtin, price, compare_at_price, stock, low_stock_threshold, meta_title, meta_description, canonical_url, og_title, og_description, og_image, focus_keywords, schema_markup, seo_score, seo_updated_at) FROM stdin;
2	Dharma Chronograph	dharma-chronograph	Precision timing for the modern explorer	The Dharma Chronograph features multiple complications including a tachymeter, 24-hour display, and precision chronograph movement.	Named after Kerouac's "Dharma Bums", this watch celebrates the philosophical journey as much as the physical one.	1	\N	KW-DHR-001	active	f	2025-09-17 12:35:11.417879	2025-09-24 19:18:11.254	1234567890124	349999	399999	15	3	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
3	Beat Generation Limited	beat-generation-limited	Limited edition tribute to the Beat Generation	Only 100 pieces worldwide, each individually numbered. Features a unique dial design inspired by 1950s typography and jazz culture.	Celebrating the literary movement that changed America, this limited edition piece is a collector's dream.	1	\N	KW-BGL-001	active	f	2025-09-17 12:35:11.418564	2025-09-24 19:18:11.255	1234567890125	599999	\N	3	1	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
26	Test Product	test-product	A test product	\N	\N	1	\N	\N	draft	f	2025-09-17 13:45:06.788083	2025-09-17 13:45:06.788083	\N	2999	3999	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
27	Test UI Product	test-ui-product				1	\N		draft	f	2025-09-17 13:46:45.908895	2025-09-17 13:46:45.908895	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
32	Test Fix Product	test-fix-product				3	\N	\N	draft	f	2025-09-17 14:28:36.410831	2025-09-17 14:28:36.410831	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
36	PowerHub 20000 Pro	powerhub-20000				1	\N	\N	draft	f	2025-09-17 14:58:56.240651	2025-09-17 15:49:12.491	\N	7999900	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
37	PowerHub 30000 Pro	powerhub-30000-pro	PowerHub			1	\N	\N	draft	f	2025-09-17 16:41:51.726217	2025-09-18 13:56:31.598	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
4	Glow Serum	glow-serum	Vitamin C brightening serum	Our signature Glow Serum combines vitamin C with hyaluronic acid for intense hydration and brightening. Suitable for all skin types.	Developed over 2 years of research with dermatologists, this serum represents the pinnacle of skincare science.	2	\N	AC-GLS-001	active	f	2025-09-17 12:35:11.419296	2025-09-24 19:18:11.256	2234567890123	6800	8500	150	20	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
1	Explorer Classic - CSRF FIX TEST	explorer-classic	Timeless elegance meets rugged durability	The Explorer Classic combines Swiss precision with American adventure spirit. Featuring a 42mm stainless steel case, sapphire crystal, and water resistance to 200m.	Inspired by cross-country journeys and the open road, the Explorer Classic was designed for those who seek adventure without compromising on style.	1	\N	\N	active	f	2025-09-17 12:35:11.415239	2025-09-24 19:18:11.252	1234567890123	249999	299999	25	5	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
5	Hydra Moisturizer	hydra-moisturizer	24-hour hydration cream	Deep hydration without the heavy feel. Our lightweight formula absorbs quickly while providing all-day moisture.	Inspired by Nordic skincare rituals, this moisturizer brings spa-quality hydration to your daily routine.	2	\N	AC-HYD-001	active	f	2025-09-17 12:35:11.420051	2025-09-24 19:18:11.257	2234567890124	5200	6500	200	30	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
6	AirFlow Pro Earbuds	airflow-pro-earbuds	Premium wireless earbuds with ANC	Experience crystal-clear audio with active noise cancellation, 30-hour battery life, and premium comfort.	Engineered for audiophiles who demand the best in wireless audio technology.	3	\N	TF-AFP-001	active	f	2025-09-17 12:35:11.420695	2025-09-24 19:18:11.258	3234567890123	24999	29999	75	10	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
7	PowerHub 10000	powerhub-10000	Ultra-fast charging power bank	10000mAh capacity with 65W fast charging. Charge multiple devices simultaneously with intelligent power distribution.	Never run out of power again. Designed for the modern professional who needs reliable power on the go.	3	\N	TF-PH1-001	active	f	2025-09-17 12:35:11.42169	2025-09-24 19:18:11.259	3234567890124	7999	9999	120	15	\N	\N	\N	\N	\N	\N	\N	{}	0	\N
38	Test Product - Quality Assurance Updated Name	crud-test-product	This is a comprehensive test of the General tab functionality including validation and data persistence.	\N	\N	1	\N	TEST-QA-001	live	f	2025-09-18 12:21:58.440163	2025-09-25 14:33:56.886	\N	19999	\N	\N	\N	SEO Test Product - Now with Working Fields!	This product description tests the newly implemented SEO fields functionality in the product management system.	https://example.com/products/seo-test-product	Amazing SEO Test Product	Perfect for testing Open Graph functionality and social media previews	https://example.com/images/seo-test.jpg	SEO, test, product, management	{}	0	\N
\.


--
-- TOC entry 4204 (class 0 OID 33290)
-- Dependencies: 267
-- Data for Name: report_generations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_generations (id, report_type, format, status, date_range, filters, include_charts, include_details, requested_by, generation_time, file_size, file_path, download_count, record_count, chart_count, page_count, error_message, retry_count, expires_at, last_accessed_at, metadata, created_at, completed_at) FROM stdin;
\.


--
-- TOC entry 4205 (class 0 OID 33305)
-- Dependencies: 268
-- Data for Name: roi_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roi_metrics (id, period, start_date, end_date, automation_investment, development_costs, maintenance_costs, llm_costs, infrastructure_costs, total_investment, manual_testing_cost_saved, time_saved, defects_prevented, defect_cost_saved, quality_improvement, total_savings, roi, payback_period, net_present_value, break_even_point, test_coverage_improvement, release_velocity_improvement, customer_satisfaction_impact, team_productivity_gain, security_risk_reduction, compliance_risk_reduction, operational_risk_reduction, metadata, calculated_at) FROM stdin;
\.


--
-- TOC entry 4171 (class 0 OID 16496)
-- Dependencies: 234
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- TOC entry 4173 (class 0 OID 16504)
-- Dependencies: 236
-- Data for Name: syndication_channels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.syndication_channels (id, name, slug, type, endpoint, api_key, webhook_url, settings, is_active, created_at, updated_at) FROM stdin;
2	Amazon Marketplace	amazon-marketplace	marketplace	https://api.amazon.com/v1	\N	\N	\N	t	2025-09-17 12:38:30.437	2025-09-17 12:38:30.437
3	Shopify Store	shopify-store	ecommerce	https://api.shopify.com/v1	\N	\N	\N	t	2025-09-17 12:38:30.437	2025-09-17 12:38:30.437
8	POS System	pos-system	pos	https://api.pos.com/v1	\N	\N	\N	t	2025-09-24 19:18:11.263	2025-09-24 19:18:11.263
9	CSV Export	csv-export	export	https://api.export.com/v1	\N	\N	\N	t	2025-09-24 19:18:11.263	2025-09-24 19:18:11.263
\.


--
-- TOC entry 4175 (class 0 OID 16518)
-- Dependencies: 238
-- Data for Name: syndication_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.syndication_logs (id, channel_id, product_id, action, endpoint, method, status, response_time, request_payload, response_payload, error_message, triggered_by, created_at) FROM stdin;
2	2	1	create	/api/external/sync	POST	200	257	\N	\N	\N	\N	2025-09-17 12:38:30.438
3	2	2	update	/api/external/sync	POST	200	551	\N	\N	\N	\N	2025-09-17 12:38:30.438
4	2	3	update	/api/external/sync	POST	200	216	\N	\N	\N	\N	2025-09-17 12:38:30.438
93	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 14:50:36.599121
96	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 14:53:59.24481
99	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 14:59:32.701888
102	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 14:59:53.085645
105	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 15:53:26.529929
108	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 16:41:59.376547
109	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 16:42:08.298394
114	8	38	update	https://api.pos.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'pos' not implemented	local-dev-user	2025-09-25 14:33:56.897121
117	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-25 14:33:56.902007
91	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 13:37:34.741954
94	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 14:50:36.603366
97	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 14:58:26.308332
100	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 14:59:32.707446
103	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 15:51:45.817178
41	2	36	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 20000 Pro\\",\\"slug\\":\\"powerhub-20000\\",\\"shortDescription\\":\\"\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-17 15:17:16.54059
42	3	36	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 20000 Pro\\",\\"slug\\":\\"powerhub-20000\\",\\"shortDescription\\":\\"\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-17 15:17:16.548339
43	2	36	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 20000 Pro\\",\\"slug\\":\\"powerhub-20000\\",\\"shortDescription\\":\\"\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-17 15:49:12.502002
44	3	36	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 20000 Pro\\",\\"slug\\":\\"powerhub-20000\\",\\"shortDescription\\":\\"\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-17 15:49:12.508799
45	2	37	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 30000 Pro\\",\\"slug\\":\\"powerhub-30000-pro\\",\\"shortDescription\\":\\"Powerhub\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-17 16:42:15.319568
46	3	37	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 30000 Pro\\",\\"slug\\":\\"powerhub-30000-pro\\",\\"shortDescription\\":\\"Powerhub\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-17 16:42:15.327513
47	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-18 12:22:09.899534
48	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-18 12:22:09.90481
106	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 15:53:26.535769
111	8	1	create	/api/external/sync	POST	200	426	\N	\N	\N	\N	2025-09-24 19:18:11.265
112	8	2	update	/api/external/sync	POST	200	559	\N	\N	\N	\N	2025-09-24 19:18:11.265
113	8	3	update	/api/external/sync	POST	200	147	\N	\N	\N	\N	2025-09-24 19:18:11.265
53	2	37	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 30000 Pro\\",\\"slug\\":\\"powerhub-30000-pro\\",\\"shortDescription\\":\\"\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-18 13:28:02.868879
54	3	37	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 30000 Pro\\",\\"slug\\":\\"powerhub-30000-pro\\",\\"shortDescription\\":\\"\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-18 13:28:02.872826
115	9	38	update	https://api.export.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'export' not implemented	local-dev-user	2025-09-25 14:33:56.901088
55	2	1	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"Explorer Classic - CSRF FIX TEST\\",\\"slug\\":\\"explorer-classic\\",\\"shortDescription\\":\\"Timeless elegance meets rugged durability\\",\\"longDescription\\":\\"The Explorer Classic combines Swiss precision with American adventure spirit. Featuring a 42mm stainless steel case, sapphire crystal, and water resistance to 200m.\\",\\"story\\":\\"Inspired by cross-country journeys and the open road, the Explorer Classic was designed for those who seek adventure without compromising on style.\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-18 13:50:54.678979
56	3	1	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"Explorer Classic - CSRF FIX TEST\\",\\"slug\\":\\"explorer-classic\\",\\"shortDescription\\":\\"Timeless elegance meets rugged durability\\",\\"longDescription\\":\\"The Explorer Classic combines Swiss precision with American adventure spirit. Featuring a 42mm stainless steel case, sapphire crystal, and water resistance to 200m.\\",\\"story\\":\\"Inspired by cross-country journeys and the open road, the Explorer Classic was designed for those who seek adventure without compromising on style.\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-18 13:50:54.683438
61	2	37	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 30000 Pro\\",\\"slug\\":\\"powerhub-30000-pro\\",\\"shortDescription\\":\\"PowerHub\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-18 13:56:31.608041
62	3	37	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"PowerHub 30000 Pro\\",\\"slug\\":\\"powerhub-30000-pro\\",\\"shortDescription\\":\\"PowerHub\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-18 13:56:31.608228
92	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 13:37:34.747299
95	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 14:53:59.23424
98	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 14:58:26.314147
101	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"CRUD Test Product UPDATED\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"Testing CRUD operations\\",\\"longDescription\\":\\"\\",\\"story\\":\\"\\",\\"sku\\":null,\\"status\\":\\"active\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 14:59:53.081334
104	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 15:51:45.822809
107	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-24 16:41:59.376156
110	3	38	update	https://api.shopify.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"draft\\",\\"brandId\\":1}"	\N	Channel type 'ecommerce' not implemented	local-dev-user	2025-09-24 16:42:08.298835
116	2	38	update	https://api.amazon.com/v1	PUT	501	0	"{\\"name\\":\\"Test Product - Quality Assurance Updated Name\\",\\"slug\\":\\"crud-test-product\\",\\"shortDescription\\":\\"This is a comprehensive test of the General tab functionality including validation and data persistence.\\",\\"longDescription\\":null,\\"story\\":null,\\"sku\\":\\"TEST-QA-001\\",\\"status\\":\\"live\\",\\"brandId\\":1}"	\N	Channel type 'marketplace' not implemented	local-dev-user	2025-09-25 14:33:56.901125
\.


--
-- TOC entry 4206 (class 0 OID 33326)
-- Dependencies: 269
-- Data for Name: system_performance_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_performance_metrics (id, "timestamp", metric_type, value, unit, threshold, is_alert, component, operation_id, session_id, details, metadata) FROM stdin;
\.


--
-- TOC entry 4207 (class 0 OID 33338)
-- Dependencies: 270
-- Data for Name: test_execution_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.test_execution_analytics (id, test_execution_id, test_type, status, execution_time, setup_time, teardown_time, cpu_usage, memory_usage, network_latency, database_queries, code_coverage, assertions_passed, assertions_failed, warnings_generated, edge_cases_triggered, edge_cases_solved, llm_interactions, llm_cost, error_details, error_category, error_resolution, environment, browser_info, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4208 (class 0 OID 33358)
-- Dependencies: 271
-- Data for Name: test_executions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.test_executions (id, session_id, scenario, status, results, performance_metrics, created_at, completed_at) FROM stdin;
\.


--
-- TOC entry 4209 (class 0 OID 33368)
-- Dependencies: 272
-- Data for Name: user_behavior_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_behavior_profiles (id, user_id, experience_level, risk_tolerance, automation_preference, decision_patterns, performance_history, learning_velocity, adaptability_score, preferred_notification_method, explanation_depth, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4210 (class 0 OID 33390)
-- Dependencies: 273
-- Data for Name: user_decision_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_decision_analytics (id, user_id, session_id, decision_type, decision_category, risk_level, decision, decision_time, confidence_level, system_recommendation, agreed_with_system, reasoning_provided, outcome_correct, business_impact, learning_points, time_of_day, day_of_week, workload, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4176 (class 0 OID 16527)
-- Dependencies: 239
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, profile_image_url, role, password_hash, created_at, updated_at) FROM stdin;
user-brand-owner-1	owner@queenone.com	Brand	Owner	\N	brand_owner	$argon2id$v=19$m=65536,t=3,p=1$c5y2JA6iwcPz5Iaq+FjKCw$fDniRPGG3PzQfK5Ylw4B8hfNHWT7i04EEDOfJUJiQ1Y	2025-09-17 12:33:17.066104	2025-09-17 12:33:17.066104
user-retailer-1	retailer@queenone.com	Retail	Partner	\N	retailer	$argon2id$v=19$m=65536,t=3,p=1$KgB/hzOMCzLbOKY58sMvUA$DQGAtYe/8b7fKZ6VMmq2OcuXK3GhG96CtOyWY0bOXZU	2025-09-17 12:33:17.073454	2025-09-17 12:33:17.073454
user-content-1	content@queenone.com	Content	Team	\N	content_team	$argon2id$v=19$m=65536,t=3,p=1$qGX69vkLoF676eCxqam7OA$vXZBfzMaX/D/NdM3dAVAoqEqDgur//g26fZF1JbmvjQ	2025-09-17 12:33:17.074184	2025-09-17 12:33:17.074184
local-dev-user	dev@localhost	Local	Developer	\N	brand_owner	$argon2id$v=19$m=65536,t=3,p=1$v7CRR2IKcw8FWfhYZ2k+Mg$FyFiZHMCQuRgWD6GWHkTDrfPViAoRQdlm6mITG9XCVE	2025-09-17 15:15:10.716825	2025-09-17 15:37:02.842889
\.


--
-- TOC entry 4216 (class 0 OID 33643)
-- Dependencies: 279
-- Data for Name: variant_combinations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_combinations (id, variant_id, option_id, option_value_id, created_at) FROM stdin;
\.


--
-- TOC entry 4218 (class 0 OID 33651)
-- Dependencies: 281
-- Data for Name: variant_option_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_option_values (id, option_id, value, display_value, hex_color, image_url, sort_order, is_active, created_at) FROM stdin;
\.


--
-- TOC entry 4220 (class 0 OID 33663)
-- Dependencies: 283
-- Data for Name: variant_options; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variant_options (id, name, slug, display_name, description, option_type, is_global, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4247 (class 0 OID 0)
-- Dependencies: 240
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- TOC entry 4248 (class 0 OID 0)
-- Dependencies: 216
-- Name: brand_retailers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.brand_retailers_id_seq', 1, false);


--
-- TOC entry 4249 (class 0 OID 0)
-- Dependencies: 218
-- Name: brands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.brands_id_seq', 28, true);


--
-- TOC entry 4250 (class 0 OID 0)
-- Dependencies: 242
-- Name: field_mapping_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.field_mapping_cache_id_seq', 14, true);


--
-- TOC entry 4251 (class 0 OID 0)
-- Dependencies: 244
-- Name: import_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.import_batches_id_seq', 1, false);


--
-- TOC entry 4252 (class 0 OID 0)
-- Dependencies: 246
-- Name: import_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.import_history_id_seq', 1, false);


--
-- TOC entry 4253 (class 0 OID 0)
-- Dependencies: 248
-- Name: import_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.import_sessions_id_seq', 57, true);


--
-- TOC entry 4254 (class 0 OID 0)
-- Dependencies: 220
-- Name: media_assets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.media_assets_id_seq', 20, true);


--
-- TOC entry 4255 (class 0 OID 0)
-- Dependencies: 222
-- Name: product_associations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_associations_id_seq', 1, false);


--
-- TOC entry 4256 (class 0 OID 0)
-- Dependencies: 224
-- Name: product_attributes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_attributes_id_seq', 1, false);


--
-- TOC entry 4257 (class 0 OID 0)
-- Dependencies: 226
-- Name: product_families_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_families_id_seq', 1, false);


--
-- TOC entry 4258 (class 0 OID 0)
-- Dependencies: 228
-- Name: product_family_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_family_items_id_seq', 1, false);


--
-- TOC entry 4259 (class 0 OID 0)
-- Dependencies: 230
-- Name: product_syndications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_syndications_id_seq', 3, true);


--
-- TOC entry 4260 (class 0 OID 0)
-- Dependencies: 274
-- Name: product_variant_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_variant_options_id_seq', 1, false);


--
-- TOC entry 4261 (class 0 OID 0)
-- Dependencies: 276
-- Name: product_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_variants_id_seq', 1, false);


--
-- TOC entry 4262 (class 0 OID 0)
-- Dependencies: 232
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 60, true);


--
-- TOC entry 4263 (class 0 OID 0)
-- Dependencies: 235
-- Name: syndication_channels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.syndication_channels_id_seq', 9, true);


--
-- TOC entry 4264 (class 0 OID 0)
-- Dependencies: 237
-- Name: syndication_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.syndication_logs_id_seq', 117, true);


--
-- TOC entry 4265 (class 0 OID 0)
-- Dependencies: 278
-- Name: variant_combinations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.variant_combinations_id_seq', 1, false);


--
-- TOC entry 4266 (class 0 OID 0)
-- Dependencies: 280
-- Name: variant_option_values_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.variant_option_values_id_seq', 1, false);


--
-- TOC entry 4267 (class 0 OID 0)
-- Dependencies: 282
-- Name: variant_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.variant_options_id_seq', 1, false);


--
-- TOC entry 3786 (class 2606 OID 16646)
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3798 (class 2606 OID 33043)
-- Name: approval_decisions approval_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_decisions
    ADD CONSTRAINT approval_decisions_pkey PRIMARY KEY (id);


--
-- TOC entry 3803 (class 2606 OID 33059)
-- Name: approval_metrics approval_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_metrics
    ADD CONSTRAINT approval_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3807 (class 2606 OID 33075)
-- Name: approval_preferences approval_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_preferences
    ADD CONSTRAINT approval_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 3810 (class 2606 OID 33086)
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 3818 (class 2606 OID 33100)
-- Name: automation_alerts automation_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_alerts
    ADD CONSTRAINT automation_alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 3826 (class 2606 OID 33115)
-- Name: automation_confidence automation_confidence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_confidence
    ADD CONSTRAINT automation_confidence_pkey PRIMARY KEY (id);


--
-- TOC entry 3831 (class 2606 OID 33152)
-- Name: automation_metrics automation_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_metrics
    ADD CONSTRAINT automation_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3749 (class 2606 OID 16402)
-- Name: brand_retailers brand_retailers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brand_retailers
    ADD CONSTRAINT brand_retailers_pkey PRIMARY KEY (id);


--
-- TOC entry 3751 (class 2606 OID 16414)
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- TOC entry 3753 (class 2606 OID 16416)
-- Name: brands brands_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_unique UNIQUE (slug);


--
-- TOC entry 3838 (class 2606 OID 33175)
-- Name: cost_optimization_metrics cost_optimization_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cost_optimization_metrics
    ADD CONSTRAINT cost_optimization_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3845 (class 2606 OID 33187)
-- Name: edge_case_detections edge_case_detections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_case_detections
    ADD CONSTRAINT edge_case_detections_pkey PRIMARY KEY (id);


--
-- TOC entry 3853 (class 2606 OID 33201)
-- Name: edge_case_integration_sessions edge_case_integration_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_case_integration_sessions
    ADD CONSTRAINT edge_case_integration_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3855 (class 2606 OID 33203)
-- Name: edge_case_integration_sessions edge_case_integration_sessions_workflow_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_case_integration_sessions
    ADD CONSTRAINT edge_case_integration_sessions_workflow_id_unique UNIQUE (workflow_id);


--
-- TOC entry 3862 (class 2606 OID 33212)
-- Name: edge_case_test_cases edge_case_test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_case_test_cases
    ADD CONSTRAINT edge_case_test_cases_pkey PRIMARY KEY (id);


--
-- TOC entry 3866 (class 2606 OID 33222)
-- Name: error_analytics error_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_analytics
    ADD CONSTRAINT error_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 3871 (class 2606 OID 33240)
-- Name: error_patterns error_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_patterns
    ADD CONSTRAINT error_patterns_pkey PRIMARY KEY (id);


--
-- TOC entry 3873 (class 2606 OID 33242)
-- Name: error_patterns error_patterns_signature_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_patterns
    ADD CONSTRAINT error_patterns_signature_unique UNIQUE (signature);


--
-- TOC entry 3788 (class 2606 OID 16660)
-- Name: field_mapping_cache field_mapping_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_mapping_cache
    ADD CONSTRAINT field_mapping_cache_pkey PRIMARY KEY (id);


--
-- TOC entry 3880 (class 2606 OID 33255)
-- Name: generated_test_cases generated_test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.generated_test_cases
    ADD CONSTRAINT generated_test_cases_pkey PRIMARY KEY (id);


--
-- TOC entry 3790 (class 2606 OID 16673)
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- TOC entry 3792 (class 2606 OID 16684)
-- Name: import_history import_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_history
    ADD CONSTRAINT import_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3794 (class 2606 OID 16700)
-- Name: import_sessions import_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_sessions
    ADD CONSTRAINT import_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3796 (class 2606 OID 16702)
-- Name: import_sessions import_sessions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_sessions
    ADD CONSTRAINT import_sessions_session_id_unique UNIQUE (session_id);


--
-- TOC entry 3755 (class 2606 OID 16426)
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- TOC entry 3889 (class 2606 OID 33265)
-- Name: ml_feedback_sessions ml_feedback_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_feedback_sessions
    ADD CONSTRAINT ml_feedback_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3895 (class 2606 OID 33278)
-- Name: ml_learning_patterns ml_learning_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_learning_patterns
    ADD CONSTRAINT ml_learning_patterns_pkey PRIMARY KEY (id);


--
-- TOC entry 3902 (class 2606 OID 33289)
-- Name: performance_trends performance_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_trends
    ADD CONSTRAINT performance_trends_pkey PRIMARY KEY (id);


--
-- TOC entry 3757 (class 2606 OID 16434)
-- Name: product_associations product_associations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_associations
    ADD CONSTRAINT product_associations_pkey PRIMARY KEY (id);


--
-- TOC entry 3759 (class 2606 OID 16445)
-- Name: product_attributes product_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT product_attributes_pkey PRIMARY KEY (id);


--
-- TOC entry 3761 (class 2606 OID 16455)
-- Name: product_families product_families_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_families
    ADD CONSTRAINT product_families_pkey PRIMARY KEY (id);


--
-- TOC entry 3763 (class 2606 OID 16464)
-- Name: product_family_items product_family_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_family_items
    ADD CONSTRAINT product_family_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3765 (class 2606 OID 16478)
-- Name: product_syndications product_syndications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_syndications
    ADD CONSTRAINT product_syndications_pkey PRIMARY KEY (id);


--
-- TOC entry 3949 (class 2606 OID 33628)
-- Name: product_variant_options product_variant_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_options
    ADD CONSTRAINT product_variant_options_pkey PRIMARY KEY (id);


--
-- TOC entry 3954 (class 2606 OID 33641)
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- TOC entry 3767 (class 2606 OID 16491)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 3769 (class 2606 OID 16495)
-- Name: products products_sku_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);


--
-- TOC entry 3771 (class 2606 OID 16493)
-- Name: products products_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_unique UNIQUE (slug);


--
-- TOC entry 3909 (class 2606 OID 33304)
-- Name: report_generations report_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_generations
    ADD CONSTRAINT report_generations_pkey PRIMARY KEY (id);


--
-- TOC entry 3915 (class 2606 OID 33325)
-- Name: roi_metrics roi_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roi_metrics
    ADD CONSTRAINT roi_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3774 (class 2606 OID 16502)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- TOC entry 3776 (class 2606 OID 16514)
-- Name: syndication_channels syndication_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syndication_channels
    ADD CONSTRAINT syndication_channels_pkey PRIMARY KEY (id);


--
-- TOC entry 3778 (class 2606 OID 16516)
-- Name: syndication_channels syndication_channels_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syndication_channels
    ADD CONSTRAINT syndication_channels_slug_unique UNIQUE (slug);


--
-- TOC entry 3780 (class 2606 OID 16526)
-- Name: syndication_logs syndication_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syndication_logs
    ADD CONSTRAINT syndication_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3922 (class 2606 OID 33337)
-- Name: system_performance_metrics system_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_performance_metrics
    ADD CONSTRAINT system_performance_metrics_pkey PRIMARY KEY (id);


--
-- TOC entry 3929 (class 2606 OID 33357)
-- Name: test_execution_analytics test_execution_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_execution_analytics
    ADD CONSTRAINT test_execution_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 3931 (class 2606 OID 33367)
-- Name: test_executions test_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_executions
    ADD CONSTRAINT test_executions_pkey PRIMARY KEY (id);


--
-- TOC entry 3936 (class 2606 OID 33387)
-- Name: user_behavior_profiles user_behavior_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_behavior_profiles
    ADD CONSTRAINT user_behavior_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 3938 (class 2606 OID 33389)
-- Name: user_behavior_profiles user_behavior_profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_behavior_profiles
    ADD CONSTRAINT user_behavior_profiles_user_id_unique UNIQUE (user_id);


--
-- TOC entry 3945 (class 2606 OID 33399)
-- Name: user_decision_analytics user_decision_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_decision_analytics
    ADD CONSTRAINT user_decision_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 3782 (class 2606 OID 16539)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 3784 (class 2606 OID 16537)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3958 (class 2606 OID 33649)
-- Name: variant_combinations variant_combinations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_combinations
    ADD CONSTRAINT variant_combinations_pkey PRIMARY KEY (id);


--
-- TOC entry 3961 (class 2606 OID 33661)
-- Name: variant_option_values variant_option_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_pkey PRIMARY KEY (id);


--
-- TOC entry 3965 (class 2606 OID 33676)
-- Name: variant_options variant_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_options
    ADD CONSTRAINT variant_options_pkey PRIMARY KEY (id);


--
-- TOC entry 3967 (class 2606 OID 33678)
-- Name: variant_options variant_options_slug_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_options
    ADD CONSTRAINT variant_options_slug_unique UNIQUE (slug);


--
-- TOC entry 3772 (class 1259 OID 16635)
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- TOC entry 3799 (class 1259 OID 33460)
-- Name: idx_approval_decisions_approval_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_decisions_approval_request_id ON public.approval_decisions USING btree (approval_request_id);


--
-- TOC entry 3800 (class 1259 OID 33461)
-- Name: idx_approval_decisions_approver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_decisions_approver ON public.approval_decisions USING btree (approver);


--
-- TOC entry 3801 (class 1259 OID 33462)
-- Name: idx_approval_decisions_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_decisions_timestamp ON public.approval_decisions USING btree ("timestamp");


--
-- TOC entry 3804 (class 1259 OID 33464)
-- Name: idx_approval_metrics_approver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_metrics_approver ON public.approval_metrics USING btree (approver);


--
-- TOC entry 3805 (class 1259 OID 33463)
-- Name: idx_approval_metrics_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_metrics_date ON public.approval_metrics USING btree (date);


--
-- TOC entry 3808 (class 1259 OID 33465)
-- Name: idx_approval_preferences_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_preferences_user_id ON public.approval_preferences USING btree (user_id);


--
-- TOC entry 3811 (class 1259 OID 33467)
-- Name: idx_approval_requests_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_assigned_to ON public.approval_requests USING btree (assigned_to);


--
-- TOC entry 3812 (class 1259 OID 33468)
-- Name: idx_approval_requests_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_created_at ON public.approval_requests USING btree (created_at);


--
-- TOC entry 3813 (class 1259 OID 33469)
-- Name: idx_approval_requests_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_deadline ON public.approval_requests USING btree (deadline);


--
-- TOC entry 3814 (class 1259 OID 33470)
-- Name: idx_approval_requests_risk_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_risk_level ON public.approval_requests USING btree (risk_level);


--
-- TOC entry 3815 (class 1259 OID 33466)
-- Name: idx_approval_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_status ON public.approval_requests USING btree (status);


--
-- TOC entry 3816 (class 1259 OID 33471)
-- Name: idx_approval_requests_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approval_requests_type ON public.approval_requests USING btree (type);


--
-- TOC entry 3819 (class 1259 OID 33476)
-- Name: idx_automation_alerts_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_alerts_created_at ON public.automation_alerts USING btree (created_at);


--
-- TOC entry 3820 (class 1259 OID 33475)
-- Name: idx_automation_alerts_metric; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_alerts_metric ON public.automation_alerts USING btree (metric);


--
-- TOC entry 3821 (class 1259 OID 33473)
-- Name: idx_automation_alerts_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_alerts_severity ON public.automation_alerts USING btree (severity);


--
-- TOC entry 3822 (class 1259 OID 33474)
-- Name: idx_automation_alerts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_alerts_status ON public.automation_alerts USING btree (status);


--
-- TOC entry 3823 (class 1259 OID 33472)
-- Name: idx_automation_alerts_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_alerts_type ON public.automation_alerts USING btree (alert_type);


--
-- TOC entry 3824 (class 1259 OID 33477)
-- Name: idx_automation_alerts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_alerts_user_id ON public.automation_alerts USING btree (user_id);


--
-- TOC entry 3827 (class 1259 OID 33478)
-- Name: idx_automation_confidence_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_confidence_category ON public.automation_confidence USING btree (category);


--
-- TOC entry 3828 (class 1259 OID 33479)
-- Name: idx_automation_confidence_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_confidence_current ON public.automation_confidence USING btree (current_confidence);


--
-- TOC entry 3829 (class 1259 OID 33480)
-- Name: idx_automation_confidence_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_confidence_updated ON public.automation_confidence USING btree (updated_at);


--
-- TOC entry 3832 (class 1259 OID 33484)
-- Name: idx_automation_metrics_automation_rate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_metrics_automation_rate ON public.automation_metrics USING btree (automation_rate);


--
-- TOC entry 3833 (class 1259 OID 33485)
-- Name: idx_automation_metrics_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_metrics_created_at ON public.automation_metrics USING btree (created_at);


--
-- TOC entry 3834 (class 1259 OID 33481)
-- Name: idx_automation_metrics_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_metrics_date ON public.automation_metrics USING btree (date);


--
-- TOC entry 3835 (class 1259 OID 33483)
-- Name: idx_automation_metrics_hourly; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_metrics_hourly ON public.automation_metrics USING btree (hourly);


--
-- TOC entry 3836 (class 1259 OID 33482)
-- Name: idx_automation_metrics_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_metrics_user_id ON public.automation_metrics USING btree (user_id);


--
-- TOC entry 3839 (class 1259 OID 33490)
-- Name: idx_cost_optimization_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cost_optimization_created_at ON public.cost_optimization_metrics USING btree (created_at);


--
-- TOC entry 3840 (class 1259 OID 33486)
-- Name: idx_cost_optimization_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cost_optimization_date ON public.cost_optimization_metrics USING btree (date);


--
-- TOC entry 3841 (class 1259 OID 33488)
-- Name: idx_cost_optimization_operation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cost_optimization_operation ON public.cost_optimization_metrics USING btree (operation);


--
-- TOC entry 3842 (class 1259 OID 33487)
-- Name: idx_cost_optimization_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cost_optimization_service ON public.cost_optimization_metrics USING btree (service);


--
-- TOC entry 3843 (class 1259 OID 33489)
-- Name: idx_cost_optimization_total_cost; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cost_optimization_total_cost ON public.cost_optimization_metrics USING btree (total_cost);


--
-- TOC entry 3846 (class 1259 OID 33494)
-- Name: idx_edge_case_detections_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_detections_category ON public.edge_case_detections USING btree (category);


--
-- TOC entry 3847 (class 1259 OID 33496)
-- Name: idx_edge_case_detections_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_detections_created_at ON public.edge_case_detections USING btree (created_at);


--
-- TOC entry 3848 (class 1259 OID 33493)
-- Name: idx_edge_case_detections_pattern; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_detections_pattern ON public.edge_case_detections USING btree (pattern);


--
-- TOC entry 3849 (class 1259 OID 33491)
-- Name: idx_edge_case_detections_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_detections_session_id ON public.edge_case_detections USING btree (session_id);


--
-- TOC entry 3850 (class 1259 OID 33495)
-- Name: idx_edge_case_detections_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_detections_severity ON public.edge_case_detections USING btree (severity);


--
-- TOC entry 3851 (class 1259 OID 33492)
-- Name: idx_edge_case_detections_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_detections_user_id ON public.edge_case_detections USING btree (user_id);


--
-- TOC entry 3856 (class 1259 OID 33501)
-- Name: idx_edge_case_integration_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_integration_created_at ON public.edge_case_integration_sessions USING btree (created_at);


--
-- TOC entry 3857 (class 1259 OID 33498)
-- Name: idx_edge_case_integration_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_integration_session_id ON public.edge_case_integration_sessions USING btree (session_id);


--
-- TOC entry 3858 (class 1259 OID 33500)
-- Name: idx_edge_case_integration_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_integration_status ON public.edge_case_integration_sessions USING btree (status);


--
-- TOC entry 3859 (class 1259 OID 33499)
-- Name: idx_edge_case_integration_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_integration_user_id ON public.edge_case_integration_sessions USING btree (user_id);


--
-- TOC entry 3860 (class 1259 OID 33497)
-- Name: idx_edge_case_integration_workflow_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_integration_workflow_id ON public.edge_case_integration_sessions USING btree (workflow_id);


--
-- TOC entry 3863 (class 1259 OID 33502)
-- Name: idx_edge_case_test_cases_detection_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_test_cases_detection_id ON public.edge_case_test_cases USING btree (detection_id);


--
-- TOC entry 3864 (class 1259 OID 33503)
-- Name: idx_edge_case_test_cases_test_case_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edge_case_test_cases_test_case_id ON public.edge_case_test_cases USING btree (test_case_id);


--
-- TOC entry 3867 (class 1259 OID 33504)
-- Name: idx_error_analytics_pattern_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_analytics_pattern_id ON public.error_analytics USING btree (pattern_id);


--
-- TOC entry 3868 (class 1259 OID 33505)
-- Name: idx_error_analytics_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_analytics_session_id ON public.error_analytics USING btree (session_id);


--
-- TOC entry 3869 (class 1259 OID 33506)
-- Name: idx_error_analytics_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_analytics_timestamp ON public.error_analytics USING btree ("timestamp");


--
-- TOC entry 3874 (class 1259 OID 33508)
-- Name: idx_error_patterns_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_patterns_category ON public.error_patterns USING btree (category);


--
-- TOC entry 3875 (class 1259 OID 33510)
-- Name: idx_error_patterns_frequency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_patterns_frequency ON public.error_patterns USING btree (frequency);


--
-- TOC entry 3876 (class 1259 OID 33511)
-- Name: idx_error_patterns_last_seen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_patterns_last_seen ON public.error_patterns USING btree (last_seen);


--
-- TOC entry 3877 (class 1259 OID 33509)
-- Name: idx_error_patterns_risk_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_patterns_risk_level ON public.error_patterns USING btree (risk_level);


--
-- TOC entry 3878 (class 1259 OID 33507)
-- Name: idx_error_patterns_signature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_error_patterns_signature ON public.error_patterns USING btree (signature);


--
-- TOC entry 3881 (class 1259 OID 33515)
-- Name: idx_generated_test_cases_pattern; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_generated_test_cases_pattern ON public.generated_test_cases USING btree (edge_case_pattern);


--
-- TOC entry 3882 (class 1259 OID 33514)
-- Name: idx_generated_test_cases_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_generated_test_cases_priority ON public.generated_test_cases USING btree (priority);


--
-- TOC entry 3883 (class 1259 OID 33512)
-- Name: idx_generated_test_cases_suite_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_generated_test_cases_suite_id ON public.generated_test_cases USING btree (suite_id);


--
-- TOC entry 3884 (class 1259 OID 33513)
-- Name: idx_generated_test_cases_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_generated_test_cases_type ON public.generated_test_cases USING btree (type);


--
-- TOC entry 3885 (class 1259 OID 33518)
-- Name: idx_ml_feedback_sessions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_feedback_sessions_created_at ON public.ml_feedback_sessions USING btree (created_at);


--
-- TOC entry 3886 (class 1259 OID 33517)
-- Name: idx_ml_feedback_sessions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_feedback_sessions_type ON public.ml_feedback_sessions USING btree (session_type);


--
-- TOC entry 3887 (class 1259 OID 33516)
-- Name: idx_ml_feedback_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_feedback_sessions_user_id ON public.ml_feedback_sessions USING btree (user_id);


--
-- TOC entry 3890 (class 1259 OID 33520)
-- Name: idx_ml_learning_patterns_confidence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_learning_patterns_confidence ON public.ml_learning_patterns USING btree (confidence);


--
-- TOC entry 3891 (class 1259 OID 33521)
-- Name: idx_ml_learning_patterns_effectiveness; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_learning_patterns_effectiveness ON public.ml_learning_patterns USING btree (effectiveness);


--
-- TOC entry 3892 (class 1259 OID 33522)
-- Name: idx_ml_learning_patterns_last_used; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_learning_patterns_last_used ON public.ml_learning_patterns USING btree (last_used_at);


--
-- TOC entry 3893 (class 1259 OID 33519)
-- Name: idx_ml_learning_patterns_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ml_learning_patterns_type ON public.ml_learning_patterns USING btree (pattern_type);


--
-- TOC entry 3896 (class 1259 OID 33527)
-- Name: idx_performance_trends_anomaly; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_performance_trends_anomaly ON public.performance_trends USING btree (is_anomaly);


--
-- TOC entry 3897 (class 1259 OID 33523)
-- Name: idx_performance_trends_metric; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_performance_trends_metric ON public.performance_trends USING btree (metric);


--
-- TOC entry 3898 (class 1259 OID 33525)
-- Name: idx_performance_trends_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_performance_trends_start_date ON public.performance_trends USING btree (start_date);


--
-- TOC entry 3899 (class 1259 OID 33524)
-- Name: idx_performance_trends_timeframe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_performance_trends_timeframe ON public.performance_trends USING btree (timeframe);


--
-- TOC entry 3900 (class 1259 OID 33526)
-- Name: idx_performance_trends_trend_direction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_performance_trends_trend_direction ON public.performance_trends USING btree (trend_direction);


--
-- TOC entry 3946 (class 1259 OID 33753)
-- Name: idx_product_variant_options_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variant_options_product_id ON public.product_variant_options USING btree (product_id);


--
-- TOC entry 3947 (class 1259 OID 33754)
-- Name: idx_product_variant_options_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variant_options_unique ON public.product_variant_options USING btree (product_id, option_id);


--
-- TOC entry 3950 (class 1259 OID 33755)
-- Name: idx_product_variants_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_parent ON public.product_variants USING btree (parent_product_id);


--
-- TOC entry 3951 (class 1259 OID 33757)
-- Name: idx_product_variants_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_unique ON public.product_variants USING btree (parent_product_id, variant_product_id);


--
-- TOC entry 3952 (class 1259 OID 33756)
-- Name: idx_product_variants_variant; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_variants_variant ON public.product_variants USING btree (variant_product_id);


--
-- TOC entry 3903 (class 1259 OID 33531)
-- Name: idx_report_generations_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_generations_created_at ON public.report_generations USING btree (created_at);


--
-- TOC entry 3904 (class 1259 OID 33532)
-- Name: idx_report_generations_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_generations_expires_at ON public.report_generations USING btree (expires_at);


--
-- TOC entry 3905 (class 1259 OID 33530)
-- Name: idx_report_generations_requested_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_generations_requested_by ON public.report_generations USING btree (requested_by);


--
-- TOC entry 3906 (class 1259 OID 33529)
-- Name: idx_report_generations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_generations_status ON public.report_generations USING btree (status);


--
-- TOC entry 3907 (class 1259 OID 33528)
-- Name: idx_report_generations_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_generations_type ON public.report_generations USING btree (report_type);


--
-- TOC entry 3910 (class 1259 OID 33536)
-- Name: idx_roi_metrics_calculated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_roi_metrics_calculated_at ON public.roi_metrics USING btree (calculated_at);


--
-- TOC entry 3911 (class 1259 OID 33533)
-- Name: idx_roi_metrics_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_roi_metrics_period ON public.roi_metrics USING btree (period);


--
-- TOC entry 3912 (class 1259 OID 33535)
-- Name: idx_roi_metrics_roi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_roi_metrics_roi ON public.roi_metrics USING btree (roi);


--
-- TOC entry 3913 (class 1259 OID 33534)
-- Name: idx_roi_metrics_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_roi_metrics_start_date ON public.roi_metrics USING btree (start_date);


--
-- TOC entry 3916 (class 1259 OID 33540)
-- Name: idx_system_performance_alert; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_performance_alert ON public.system_performance_metrics USING btree (is_alert);


--
-- TOC entry 3917 (class 1259 OID 33539)
-- Name: idx_system_performance_component; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_performance_component ON public.system_performance_metrics USING btree (component);


--
-- TOC entry 3918 (class 1259 OID 33541)
-- Name: idx_system_performance_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_performance_session ON public.system_performance_metrics USING btree (session_id);


--
-- TOC entry 3919 (class 1259 OID 33537)
-- Name: idx_system_performance_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_performance_timestamp ON public.system_performance_metrics USING btree ("timestamp");


--
-- TOC entry 3920 (class 1259 OID 33538)
-- Name: idx_system_performance_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_performance_type ON public.system_performance_metrics USING btree (metric_type);


--
-- TOC entry 3923 (class 1259 OID 33546)
-- Name: idx_test_execution_analytics_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_execution_analytics_created_at ON public.test_execution_analytics USING btree (created_at);


--
-- TOC entry 3924 (class 1259 OID 33545)
-- Name: idx_test_execution_analytics_execution_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_execution_analytics_execution_time ON public.test_execution_analytics USING btree (execution_time);


--
-- TOC entry 3925 (class 1259 OID 33544)
-- Name: idx_test_execution_analytics_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_execution_analytics_status ON public.test_execution_analytics USING btree (status);


--
-- TOC entry 3926 (class 1259 OID 33542)
-- Name: idx_test_execution_analytics_test_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_execution_analytics_test_id ON public.test_execution_analytics USING btree (test_execution_id);


--
-- TOC entry 3927 (class 1259 OID 33543)
-- Name: idx_test_execution_analytics_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_test_execution_analytics_type ON public.test_execution_analytics USING btree (test_type);


--
-- TOC entry 3932 (class 1259 OID 33548)
-- Name: idx_user_behavior_profiles_experience; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_behavior_profiles_experience ON public.user_behavior_profiles USING btree (experience_level);


--
-- TOC entry 3933 (class 1259 OID 33549)
-- Name: idx_user_behavior_profiles_learning_velocity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_behavior_profiles_learning_velocity ON public.user_behavior_profiles USING btree (learning_velocity);


--
-- TOC entry 3934 (class 1259 OID 33547)
-- Name: idx_user_behavior_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_behavior_profiles_user_id ON public.user_behavior_profiles USING btree (user_id);


--
-- TOC entry 3939 (class 1259 OID 33553)
-- Name: idx_user_decision_analytics_agreed_with_system; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_decision_analytics_agreed_with_system ON public.user_decision_analytics USING btree (agreed_with_system);


--
-- TOC entry 3940 (class 1259 OID 33554)
-- Name: idx_user_decision_analytics_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_decision_analytics_created_at ON public.user_decision_analytics USING btree (created_at);


--
-- TOC entry 3941 (class 1259 OID 33552)
-- Name: idx_user_decision_analytics_decision_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_decision_analytics_decision_time ON public.user_decision_analytics USING btree (decision_time);


--
-- TOC entry 3942 (class 1259 OID 33551)
-- Name: idx_user_decision_analytics_decision_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_decision_analytics_decision_type ON public.user_decision_analytics USING btree (decision_type);


--
-- TOC entry 3943 (class 1259 OID 33550)
-- Name: idx_user_decision_analytics_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_decision_analytics_user_id ON public.user_decision_analytics USING btree (user_id);


--
-- TOC entry 3955 (class 1259 OID 33759)
-- Name: idx_variant_combinations_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_combinations_unique ON public.variant_combinations USING btree (variant_id, option_id);


--
-- TOC entry 3956 (class 1259 OID 33758)
-- Name: idx_variant_combinations_variant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_combinations_variant_id ON public.variant_combinations USING btree (variant_id);


--
-- TOC entry 3959 (class 1259 OID 33760)
-- Name: idx_variant_option_values_option_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_option_values_option_id ON public.variant_option_values USING btree (option_id);


--
-- TOC entry 3962 (class 1259 OID 33761)
-- Name: idx_variant_options_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_options_slug ON public.variant_options USING btree (slug);


--
-- TOC entry 3963 (class 1259 OID 33762)
-- Name: idx_variant_options_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_variant_options_type ON public.variant_options USING btree (option_type);


--
-- TOC entry 3990 (class 2606 OID 33400)
-- Name: approval_decisions approval_decisions_approval_request_id_approval_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_decisions
    ADD CONSTRAINT approval_decisions_approval_request_id_approval_requests_id_fk FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id);


--
-- TOC entry 3991 (class 2606 OID 33773)
-- Name: approval_requests approval_requests_import_session_id_import_sessions_session_id_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_import_session_id_import_sessions_session_id_ FOREIGN KEY (import_session_id) REFERENCES public.import_sessions(session_id);


--
-- TOC entry 3992 (class 2606 OID 33405)
-- Name: approval_requests approval_requests_test_execution_id_test_executions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_test_execution_id_test_executions_id_fk FOREIGN KEY (test_execution_id) REFERENCES public.test_executions(id);


--
-- TOC entry 3993 (class 2606 OID 33415)
-- Name: automation_alerts automation_alerts_test_execution_id_test_executions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_alerts
    ADD CONSTRAINT automation_alerts_test_execution_id_test_executions_id_fk FOREIGN KEY (test_execution_id) REFERENCES public.test_executions(id);


--
-- TOC entry 3968 (class 2606 OID 16540)
-- Name: brand_retailers brand_retailers_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brand_retailers
    ADD CONSTRAINT brand_retailers_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- TOC entry 3969 (class 2606 OID 16545)
-- Name: brand_retailers brand_retailers_retailer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brand_retailers
    ADD CONSTRAINT brand_retailers_retailer_id_users_id_fk FOREIGN KEY (retailer_id) REFERENCES public.users(id);


--
-- TOC entry 3970 (class 2606 OID 16550)
-- Name: brands brands_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- TOC entry 3994 (class 2606 OID 33763)
-- Name: edge_case_detections edge_case_detections_approval_request_id_approval_requests_id_f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_case_detections
    ADD CONSTRAINT edge_case_detections_approval_request_id_approval_requests_id_f FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id);


--
-- TOC entry 3995 (class 2606 OID 33768)
-- Name: edge_case_detections edge_case_detections_import_session_id_import_sessions_session_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_case_detections
    ADD CONSTRAINT edge_case_detections_import_session_id_import_sessions_session_ FOREIGN KEY (import_session_id) REFERENCES public.import_sessions(session_id);


--
-- TOC entry 3996 (class 2606 OID 33430)
-- Name: edge_case_test_cases edge_case_test_cases_detection_id_edge_case_detections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_case_test_cases
    ADD CONSTRAINT edge_case_test_cases_detection_id_edge_case_detections_id_fk FOREIGN KEY (detection_id) REFERENCES public.edge_case_detections(id);


--
-- TOC entry 3997 (class 2606 OID 33435)
-- Name: edge_case_test_cases edge_case_test_cases_test_case_id_generated_test_cases_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edge_case_test_cases
    ADD CONSTRAINT edge_case_test_cases_test_case_id_generated_test_cases_id_fk FOREIGN KEY (test_case_id) REFERENCES public.generated_test_cases(id);


--
-- TOC entry 3998 (class 2606 OID 33440)
-- Name: error_analytics error_analytics_pattern_id_error_patterns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_analytics
    ADD CONSTRAINT error_analytics_pattern_id_error_patterns_id_fk FOREIGN KEY (pattern_id) REFERENCES public.error_patterns(id);


--
-- TOC entry 3987 (class 2606 OID 16703)
-- Name: import_batches import_batches_session_id_import_sessions_session_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_session_id_import_sessions_session_id_fk FOREIGN KEY (session_id) REFERENCES public.import_sessions(session_id);


--
-- TOC entry 3988 (class 2606 OID 16708)
-- Name: import_history import_history_session_id_import_sessions_session_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_history
    ADD CONSTRAINT import_history_session_id_import_sessions_session_id_fk FOREIGN KEY (session_id) REFERENCES public.import_sessions(session_id);


--
-- TOC entry 3989 (class 2606 OID 16713)
-- Name: import_sessions import_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_sessions
    ADD CONSTRAINT import_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3971 (class 2606 OID 16560)
-- Name: media_assets media_assets_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- TOC entry 3972 (class 2606 OID 16555)
-- Name: media_assets media_assets_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 3973 (class 2606 OID 16565)
-- Name: media_assets media_assets_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 3999 (class 2606 OID 33783)
-- Name: ml_feedback_sessions ml_feedback_sessions_approval_request_id_approval_requests_id_f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_feedback_sessions
    ADD CONSTRAINT ml_feedback_sessions_approval_request_id_approval_requests_id_f FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id);


--
-- TOC entry 4000 (class 2606 OID 33450)
-- Name: ml_feedback_sessions ml_feedback_sessions_detection_id_edge_case_detections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ml_feedback_sessions
    ADD CONSTRAINT ml_feedback_sessions_detection_id_edge_case_detections_id_fk FOREIGN KEY (detection_id) REFERENCES public.edge_case_detections(id);


--
-- TOC entry 3974 (class 2606 OID 16570)
-- Name: product_associations product_associations_source_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_associations
    ADD CONSTRAINT product_associations_source_product_id_products_id_fk FOREIGN KEY (source_product_id) REFERENCES public.products(id);


--
-- TOC entry 3975 (class 2606 OID 16575)
-- Name: product_associations product_associations_target_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_associations
    ADD CONSTRAINT product_associations_target_product_id_products_id_fk FOREIGN KEY (target_product_id) REFERENCES public.products(id);


--
-- TOC entry 3976 (class 2606 OID 16580)
-- Name: product_attributes product_attributes_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_attributes
    ADD CONSTRAINT product_attributes_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 3977 (class 2606 OID 16585)
-- Name: product_families product_families_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_families
    ADD CONSTRAINT product_families_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- TOC entry 3978 (class 2606 OID 16590)
-- Name: product_family_items product_family_items_family_id_product_families_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_family_items
    ADD CONSTRAINT product_family_items_family_id_product_families_id_fk FOREIGN KEY (family_id) REFERENCES public.product_families(id);


--
-- TOC entry 3979 (class 2606 OID 16595)
-- Name: product_family_items product_family_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_family_items
    ADD CONSTRAINT product_family_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 3980 (class 2606 OID 16605)
-- Name: product_syndications product_syndications_channel_id_syndication_channels_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_syndications
    ADD CONSTRAINT product_syndications_channel_id_syndication_channels_id_fk FOREIGN KEY (channel_id) REFERENCES public.syndication_channels(id);


--
-- TOC entry 3981 (class 2606 OID 16600)
-- Name: product_syndications product_syndications_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_syndications
    ADD CONSTRAINT product_syndications_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 4002 (class 2606 OID 33718)
-- Name: product_variant_options product_variant_options_option_id_variant_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_options
    ADD CONSTRAINT product_variant_options_option_id_variant_options_id_fk FOREIGN KEY (option_id) REFERENCES public.variant_options(id);


--
-- TOC entry 4003 (class 2606 OID 33713)
-- Name: product_variant_options product_variant_options_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variant_options
    ADD CONSTRAINT product_variant_options_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 4004 (class 2606 OID 33723)
-- Name: product_variants product_variants_parent_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_parent_product_id_products_id_fk FOREIGN KEY (parent_product_id) REFERENCES public.products(id);


--
-- TOC entry 4005 (class 2606 OID 33728)
-- Name: product_variants product_variants_variant_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_variant_product_id_products_id_fk FOREIGN KEY (variant_product_id) REFERENCES public.products(id);


--
-- TOC entry 3982 (class 2606 OID 16610)
-- Name: products products_brand_id_brands_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_brands_id_fk FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- TOC entry 3983 (class 2606 OID 16615)
-- Name: products products_parent_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_parent_id_products_id_fk FOREIGN KEY (parent_id) REFERENCES public.products(id);


--
-- TOC entry 3984 (class 2606 OID 16620)
-- Name: syndication_logs syndication_logs_channel_id_syndication_channels_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syndication_logs
    ADD CONSTRAINT syndication_logs_channel_id_syndication_channels_id_fk FOREIGN KEY (channel_id) REFERENCES public.syndication_channels(id);


--
-- TOC entry 3985 (class 2606 OID 16625)
-- Name: syndication_logs syndication_logs_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syndication_logs
    ADD CONSTRAINT syndication_logs_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- TOC entry 3986 (class 2606 OID 16630)
-- Name: syndication_logs syndication_logs_triggered_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syndication_logs
    ADD CONSTRAINT syndication_logs_triggered_by_users_id_fk FOREIGN KEY (triggered_by) REFERENCES public.users(id);


--
-- TOC entry 4001 (class 2606 OID 33778)
-- Name: test_execution_analytics test_execution_analytics_test_execution_id_test_executions_id_f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_execution_analytics
    ADD CONSTRAINT test_execution_analytics_test_execution_id_test_executions_id_f FOREIGN KEY (test_execution_id) REFERENCES public.test_executions(id);


--
-- TOC entry 4006 (class 2606 OID 33738)
-- Name: variant_combinations variant_combinations_option_id_variant_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_combinations
    ADD CONSTRAINT variant_combinations_option_id_variant_options_id_fk FOREIGN KEY (option_id) REFERENCES public.variant_options(id);


--
-- TOC entry 4007 (class 2606 OID 33743)
-- Name: variant_combinations variant_combinations_option_value_id_variant_option_values_id_f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_combinations
    ADD CONSTRAINT variant_combinations_option_value_id_variant_option_values_id_f FOREIGN KEY (option_value_id) REFERENCES public.variant_option_values(id);


--
-- TOC entry 4008 (class 2606 OID 33733)
-- Name: variant_combinations variant_combinations_variant_id_product_variants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_combinations
    ADD CONSTRAINT variant_combinations_variant_id_product_variants_id_fk FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- TOC entry 4009 (class 2606 OID 33748)
-- Name: variant_option_values variant_option_values_option_id_variant_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variant_option_values
    ADD CONSTRAINT variant_option_values_option_id_variant_options_id_fk FOREIGN KEY (option_id) REFERENCES public.variant_options(id);


-- Completed on 2025-09-29 10:16:46 UTC

--
-- PostgreSQL database dump complete
--

\unrestrict AVlyne715HJUvJjoskSGYVoKjnShNPVdDfaIfHbAOul5IarN7Ukcvf6f5sVpEst


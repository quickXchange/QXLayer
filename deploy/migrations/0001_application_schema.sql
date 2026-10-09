-- External Supabase schema only. No Production data. Execute through the pinned runner.

DO $guard$ BEGIN
 IF current_database()<>'postgres' OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='supabase_admin')
 OR coalesce(current_setting('qxlayer.external_migration_authorized',true),'')<>'yes'
 THEN RAISE EXCEPTION 'Refusing an unapproved/non-Supabase target'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')) THEN
 RAISE EXCEPTION 'Bootstrap requires an empty application schema'; END IF;
END $guard$;
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addon_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addon_entitlements (
    addon_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL
);

ALTER TABLE ONLY public.addon_entitlements FORCE ROW LEVEL SECURITY;


--
-- Name: addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    monthly_price numeric(22,2) DEFAULT 0 NOT NULL,
    yearly_price numeric(22,2) DEFAULT 0 NOT NULL,
    setup_fee numeric(22,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    pricing_configured boolean DEFAULT false NOT NULL,
    discount_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    pricing_confirmed boolean DEFAULT false NOT NULL,
    CONSTRAINT addons_discount CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric)))
);

ALTER TABLE ONLY public.addons FORCE ROW LEVEL SECURITY;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    label text NOT NULL,
    key_hash text NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT api_keys_sandbox_only CHECK ((environment = 'sandbox'::text))
);

ALTER TABLE ONLY public.api_keys FORCE ROW LEVEL SECURITY;


--
-- Name: asset_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_catalog (
    id text NOT NULL,
    symbol text NOT NULL,
    name text NOT NULL
);

ALTER TABLE ONLY public.asset_catalog FORCE ROW LEVEL SECURITY;


--
-- Name: asset_network_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_network_catalog (
    id text NOT NULL,
    asset_id text NOT NULL,
    network_id text NOT NULL
);

ALTER TABLE ONLY public.asset_network_catalog FORCE ROW LEVEL SECURITY;


--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    actor_id text NOT NULL,
    event_type text NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY public.audit_events FORCE ROW LEVEL SECURITY;


--
-- Name: blockchain_provider_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blockchain_provider_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    network_id text NOT NULL,
    adapter text DEFAULT 'sandbox'::text NOT NULL,
    priority text DEFAULT 'primary'::text NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    CONSTRAINT providers_sandbox_only CHECK (((environment = 'sandbox'::text) AND (adapter = 'sandbox'::text))),
    CONSTRAINT providers_valid_priority CHECK ((priority = ANY (ARRAY['primary'::text, 'secondary'::text, 'manual'::text])))
);

ALTER TABLE ONLY public.blockchain_provider_configs FORCE ROW LEVEL SECURITY;


--
-- Name: customer_notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_notification_reads (
    customer_user_id text NOT NULL,
    event_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.customer_notification_reads FORCE ROW LEVEL SECURITY;


--
-- Name: entitlement_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entitlement_definitions (
    key text NOT NULL,
    label text NOT NULL,
    kind text NOT NULL,
    value_type text NOT NULL,
    CONSTRAINT entitlement_definition_kind_type CHECK ((((kind = 'feature'::text) AND (value_type = 'boolean'::text)) OR ((kind = 'limit'::text) AND (value_type = ANY (ARRAY['integer'::text, 'decimal'::text])))))
);

ALTER TABLE ONLY public.entitlement_definitions FORCE ROW LEVEL SECURITY;


--
-- Name: exchange_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    pricing_rule_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    request jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_sandbox_only CHECK ((environment = 'sandbox'::text))
);

ALTER TABLE ONLY public.exchange_orders FORCE ROW LEVEL SECURITY;


--
-- Name: landing_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_products (
    key text NOT NULL,
    visible boolean DEFAULT true NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    starting_price numeric(12,2),
    setup_fee numeric(12,2),
    currency text DEFAULT 'USD'::text NOT NULL,
    billing_period text DEFAULT 'on_request'::text NOT NULL,
    status text DEFAULT 'coming_soon'::text NOT NULL,
    cta_label text DEFAULT 'Learn More'::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT landing_products_amounts CHECK ((((starting_price IS NULL) OR (starting_price >= (0)::numeric)) AND ((setup_fee IS NULL) OR (setup_fee >= (0)::numeric)))),
    CONSTRAINT landing_products_billing CHECK ((billing_period = ANY (ARRAY['monthly'::text, 'yearly'::text, 'one_time'::text, 'on_request'::text]))),
    CONSTRAINT landing_products_copy CHECK ((((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 100)) AND ((length(btrim(description)) >= 10) AND (length(btrim(description)) <= 500)) AND ((length(btrim(cta_label)) >= 2) AND (length(btrim(cta_label)) <= 40)))),
    CONSTRAINT landing_products_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT landing_products_icon CHECK ((icon = ANY (ARRAY['exchange'::text, 'card'::text, 'payments'::text, 'staking'::text, 'earn'::text, 'dex'::text, 'content'::text, 'telegram'::text, 'miniapp'::text, 'whatsapp'::text, 'ios'::text, 'android'::text, 'engine'::text, 'nodes'::text, 'mining'::text, 'kolo'::text]))),
    CONSTRAINT landing_products_order CHECK (((display_order >= 0) AND (display_order <= 10000))),
    CONSTRAINT landing_products_status CHECK ((status = ANY (ARRAY['available'::text, 'coming_soon'::text])))
);

ALTER TABLE ONLY public.landing_products FORCE ROW LEVEL SECURITY;


--
-- Name: module_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_catalog (
    key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    sandbox_available boolean DEFAULT true NOT NULL,
    definition jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY public.module_catalog FORCE ROW LEVEL SECURITY;


--
-- Name: network_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.network_catalog (
    id text NOT NULL,
    name text NOT NULL,
    testnet boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY public.network_catalog FORCE ROW LEVEL SECURITY;


--
-- Name: notification_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    channel text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'sandbox_queued'::text NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    CONSTRAINT notifications_sandbox_only CHECK ((environment = 'sandbox'::text))
);

ALTER TABLE ONLY public.notification_events FORCE ROW LEVEL SECURITY;


--
-- Name: payment_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    amount numeric(36,18) NOT NULL,
    currency text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_positive_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_sandbox_only CHECK ((environment = 'sandbox'::text)),
    CONSTRAINT payments_valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'waiting_for_payment'::text, 'payment_detected'::text, 'confirming'::text, 'paid'::text, 'expired'::text, 'underpaid'::text, 'overpaid'::text, 'failed'::text, 'refunded'::text])))
);

ALTER TABLE ONLY public.payment_invoices FORCE ROW LEVEL SECURITY;


--
-- Name: plan_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_entitlements (
    plan_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL
);

ALTER TABLE ONLY public.plan_entitlements FORCE ROW LEVEL SECURITY;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    monthly_price numeric(22,2) DEFAULT '0'::numeric NOT NULL,
    yearly_price numeric(22,2) DEFAULT '0'::numeric NOT NULL,
    setup_fee numeric(22,2) DEFAULT '0'::numeric NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    billing_label text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'disabled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pricing_configured boolean DEFAULT false NOT NULL,
    discount_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    CONSTRAINT plans_currency CHECK ((currency ~ '^[A-Z]{3}$'::text)),
    CONSTRAINT plans_discount CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT plans_nonnegative_metadata CHECK (((monthly_price >= (0)::numeric) AND (yearly_price >= (0)::numeric) AND (setup_fee >= (0)::numeric) AND (display_order >= 0))),
    CONSTRAINT plans_status CHECK ((status = ANY (ARRAY['enabled'::text, 'disabled'::text, 'archived'::text])))
);

ALTER TABLE ONLY public.plans FORCE ROW LEVEL SECURITY;


--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_admins (
    clerk_user_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.platform_admins FORCE ROW LEVEL SECURITY;


--
-- Name: pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    fee_bps numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    CONSTRAINT pricing_nonnegative_fee CHECK ((fee_bps >= (0)::numeric)),
    CONSTRAINT pricing_sandbox_only CHECK ((environment = 'sandbox'::text))
);

ALTER TABLE ONLY public.pricing_rules FORCE ROW LEVEL SECURITY;


--
-- Name: provider_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    capability text NOT NULL,
    environment text NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT provider_assignment_environment CHECK ((environment = ANY (ARRAY['sandbox'::text, 'test'::text, 'live'::text])))
);

ALTER TABLE ONLY public.provider_assignments FORCE ROW LEVEL SECURITY;


--
-- Name: provider_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    definition jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.provider_catalog FORCE ROW LEVEL SECURITY;


--
-- Name: provider_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    scope text NOT NULL,
    resource_id text NOT NULL,
    capability text NOT NULL,
    definition jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT provider_policy_resource CHECK ((scope = ANY (ARRAY['route'::text, 'network'::text])))
);

ALTER TABLE ONLY public.provider_policies FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_addons (
    tenant_id uuid NOT NULL,
    addon_id uuid NOT NULL
);

ALTER TABLE ONLY public.tenant_addons FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_asset_networks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_asset_networks (
    tenant_id uuid NOT NULL,
    asset_network_id text NOT NULL
);

ALTER TABLE ONLY public.tenant_asset_networks FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_branding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_branding (
    tenant_id uuid NOT NULL,
    brand_name text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#0F766E'::text NOT NULL,
    accent_color text DEFAULT '#14B8A6'::text NOT NULL,
    theme_mode text DEFAULT 'system'::text NOT NULL,
    default_language text DEFAULT 'en'::text NOT NULL,
    supported_languages text[] DEFAULT ARRAY['en'::text] NOT NULL,
    website_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT branding_valid_mode CHECK ((theme_mode = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])))
);

ALTER TABLE ONLY public.tenant_branding FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_configuration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_configuration (
    tenant_id uuid NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    exchange_enabled boolean DEFAULT false NOT NULL,
    payments_enabled boolean DEFAULT false NOT NULL,
    allow_guest_checkout boolean DEFAULT false NOT NULL,
    CONSTRAINT configuration_sandbox_only CHECK ((environment = 'sandbox'::text))
);

ALTER TABLE ONLY public.tenant_configuration FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_domains (
    tenant_id uuid NOT NULL,
    domain text NOT NULL,
    status text DEFAULT 'unverified'::text NOT NULL,
    verification_token text,
    verified_at timestamp with time zone,
    CONSTRAINT domains_valid_status CHECK ((status = ANY (ARRAY['unverified'::text, 'verified'::text])))
);

ALTER TABLE ONLY public.tenant_domains FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_entitlement_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_entitlement_overrides (
    tenant_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    reason text NOT NULL
);

ALTER TABLE ONLY public.tenant_entitlement_overrides FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider_key text NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    credential_management text DEFAULT 'super_admin'::text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    encrypted_credentials jsonb,
    credential_identity text,
    revision bigint DEFAULT 0 NOT NULL,
    last_nonce bigint DEFAULT 0 NOT NULL,
    health jsonb DEFAULT '{"state": "not_configured"}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_integration_management CHECK ((credential_management = ANY (ARRAY['super_admin'::text, 'customer'::text, 'both'::text]))),
    CONSTRAINT tenant_integration_sandbox CHECK ((environment = 'sandbox'::text))
);

ALTER TABLE ONLY public.tenant_integrations FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_memberships (
    tenant_id uuid NOT NULL,
    clerk_user_id text NOT NULL,
    role text DEFAULT 'client_admin'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT memberships_valid_role CHECK ((role = ANY (ARRAY['client_admin'::text, 'staff'::text])))
);

ALTER TABLE ONLY public.tenant_memberships FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_modules (
    tenant_id uuid NOT NULL,
    module_key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.tenant_modules FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    label text NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    CONSTRAINT payment_methods_sandbox CHECK ((environment = 'sandbox'::text))
);

ALTER TABLE ONLY public.tenant_payment_methods FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_product_configuration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_product_configuration (
    tenant_id uuid NOT NULL,
    module_key text NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_configuration_object CHECK ((jsonb_typeof(configuration) = 'object'::text))
);

ALTER TABLE ONLY public.tenant_product_configuration FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_subscriptions (
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    resume_status text DEFAULT 'draft'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    billing_period text DEFAULT 'monthly'::text NOT NULL,
    discount_percent numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    cancelled boolean DEFAULT false NOT NULL,
    operator_note text DEFAULT ''::text NOT NULL,
    CONSTRAINT subscription_billing_period CHECK ((billing_period = ANY (ARRAY['monthly'::text, 'yearly'::text]))),
    CONSTRAINT subscription_discount CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT subscription_resume_status CHECK ((resume_status = ANY (ARRAY['draft'::text, 'active'::text]))),
    CONSTRAINT subscription_status CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text])))
);

ALTER TABLE ONLY public.tenant_subscriptions FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_telegram_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_telegram_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    update_id bigint NOT NULL,
    payload_hash text NOT NULL,
    state text DEFAULT 'claimed'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);

ALTER TABLE ONLY public.tenant_telegram_receipts FORCE ROW LEVEL SECURITY;


--
-- Name: tenant_usage_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_usage_counters (
    tenant_id uuid NOT NULL,
    key text NOT NULL,
    period text NOT NULL,
    used numeric(36,18) DEFAULT '0'::numeric NOT NULL,
    CONSTRAINT usage_month_format CHECK ((period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text)),
    CONSTRAINT usage_nonnegative CHECK ((used >= (0)::numeric))
);

ALTER TABLE ONLY public.tenant_usage_counters FORCE ROW LEVEL SECURITY;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    completed_steps text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenants_sandbox_only CHECK ((environment = 'sandbox'::text)),
    CONSTRAINT tenants_valid_status CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'suspended'::text])))
);

ALTER TABLE ONLY public.tenants FORCE ROW LEVEL SECURITY;


--
-- Name: wallet_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    asset_network_id text NOT NULL,
    strategy text DEFAULT 'sandbox'::text NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    CONSTRAINT wallets_sandbox_only CHECK (((environment = 'sandbox'::text) AND (strategy = 'sandbox'::text)))
);

ALTER TABLE ONLY public.wallet_configurations FORCE ROW LEVEL SECURITY;


--
-- Name: webhook_endpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    url text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    environment text DEFAULT 'sandbox'::text NOT NULL,
    label text DEFAULT 'Webhook'::text NOT NULL,
    CONSTRAINT webhooks_sandbox_only CHECK ((environment = 'sandbox'::text))
);

ALTER TABLE ONLY public.webhook_endpoints FORCE ROW LEVEL SECURITY;


--
-- Name: white_label_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.white_label_attachments (
    id uuid NOT NULL,
    owner_user_id text NOT NULL,
    request_id uuid,
    object_key text NOT NULL,
    file_name text NOT NULL,
    content_type text NOT NULL,
    size integer NOT NULL,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT white_label_attachment_size CHECK (((size > 0) AND (size <= 8388608)))
);

ALTER TABLE ONLY public.white_label_attachments FORCE ROW LEVEL SECURITY;


--
-- Name: white_label_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.white_label_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    kind text NOT NULL,
    author_user_id text NOT NULL,
    visibility text DEFAULT 'customer'::text NOT NULL,
    message text NOT NULL,
    status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT white_label_event_kind CHECK ((kind = ANY (ARRAY['status'::text, 'note'::text]))),
    CONSTRAINT white_label_event_visibility CHECK ((visibility = ANY (ARRAY['customer'::text, 'internal'::text])))
);

ALTER TABLE ONLY public.white_label_events FORCE ROW LEVEL SECURITY;


--
-- Name: white_label_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.white_label_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_user_id text NOT NULL,
    idempotency_key uuid NOT NULL,
    configuration jsonb NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    monthly_price text,
    setup_price text,
    currency text,
    operator_note text DEFAULT ''::text NOT NULL,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    order_number integer NOT NULL,
    customization_price text,
    custom_design_decision text DEFAULT 'pending'::text NOT NULL,
    approved_configuration jsonb,
    CONSTRAINT white_label_request_delivery_requires_tenant CHECK (((status <> 'delivered'::text) OR (tenant_id IS NOT NULL))),
    CONSTRAINT white_label_request_status CHECK ((status = ANY (ARRAY['new'::text, 'reviewing'::text, 'waiting_for_client'::text, 'quote_ready'::text, 'approved'::text, 'in_setup'::text, 'customization'::text, 'ready'::text, 'delivered'::text, 'rejected'::text, 'cancelled'::text])))
);

ALTER TABLE ONLY public.white_label_requests FORCE ROW LEVEL SECURITY;


--
-- Name: white_label_requests_order_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.white_label_requests_order_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: white_label_requests_order_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.white_label_requests_order_number_seq OWNED BY public.white_label_requests.order_number;


--
-- Name: white_label_requests order_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_requests ALTER COLUMN order_number SET DEFAULT nextval('public.white_label_requests_order_number_seq'::regclass);


--
-- Name: addon_entitlements addon_entitlements_addon_id_key_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_entitlements
    ADD CONSTRAINT addon_entitlements_addon_id_key_pk PRIMARY KEY (addon_id, key);


--
-- Name: addons addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addons
    ADD CONSTRAINT addons_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: asset_catalog asset_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalog
    ADD CONSTRAINT asset_catalog_pkey PRIMARY KEY (id);


--
-- Name: asset_network_catalog asset_network_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_network_catalog
    ADD CONSTRAINT asset_network_catalog_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: blockchain_provider_configs blockchain_provider_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blockchain_provider_configs
    ADD CONSTRAINT blockchain_provider_configs_pkey PRIMARY KEY (id);


--
-- Name: customer_notification_reads customer_notification_reads_customer_user_id_event_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notification_reads
    ADD CONSTRAINT customer_notification_reads_customer_user_id_event_id_pk PRIMARY KEY (customer_user_id, event_id);


--
-- Name: entitlement_definitions entitlement_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlement_definitions
    ADD CONSTRAINT entitlement_definitions_pkey PRIMARY KEY (key);


--
-- Name: exchange_orders exchange_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_orders
    ADD CONSTRAINT exchange_orders_pkey PRIMARY KEY (id);


--
-- Name: landing_products landing_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_products
    ADD CONSTRAINT landing_products_pkey PRIMARY KEY (key);


--
-- Name: module_catalog module_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_catalog
    ADD CONSTRAINT module_catalog_pkey PRIMARY KEY (key);


--
-- Name: network_catalog network_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.network_catalog
    ADD CONSTRAINT network_catalog_pkey PRIMARY KEY (id);


--
-- Name: notification_events notification_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_pkey PRIMARY KEY (id);


--
-- Name: exchange_orders orders_id_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_orders
    ADD CONSTRAINT orders_id_tenant_unique UNIQUE (id, tenant_id);


--
-- Name: payment_invoices payment_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_invoices
    ADD CONSTRAINT payment_invoices_pkey PRIMARY KEY (id);


--
-- Name: payment_invoices payments_id_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_invoices
    ADD CONSTRAINT payments_id_tenant_unique UNIQUE (id, tenant_id);


--
-- Name: plan_entitlements plan_entitlements_plan_id_key_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_entitlements
    ADD CONSTRAINT plan_entitlements_plan_id_key_pk PRIMARY KEY (plan_id, key);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (clerk_user_id);


--
-- Name: pricing_rules pricing_id_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_id_tenant_unique UNIQUE (id, tenant_id);


--
-- Name: pricing_rules pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: provider_assignments provider_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_assignments
    ADD CONSTRAINT provider_assignments_pkey PRIMARY KEY (id);


--
-- Name: provider_catalog provider_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_catalog
    ADD CONSTRAINT provider_catalog_pkey PRIMARY KEY (id);


--
-- Name: provider_policies provider_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_policies
    ADD CONSTRAINT provider_policies_pkey PRIMARY KEY (id);


--
-- Name: tenant_addons tenant_addons_tenant_id_addon_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_addons
    ADD CONSTRAINT tenant_addons_tenant_id_addon_id_pk PRIMARY KEY (tenant_id, addon_id);


--
-- Name: tenant_asset_networks tenant_asset_networks_tenant_id_asset_network_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_asset_networks
    ADD CONSTRAINT tenant_asset_networks_tenant_id_asset_network_id_pk PRIMARY KEY (tenant_id, asset_network_id);


--
-- Name: tenant_branding tenant_branding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_branding
    ADD CONSTRAINT tenant_branding_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenant_configuration tenant_configuration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_configuration
    ADD CONSTRAINT tenant_configuration_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenant_domains tenant_domains_domain_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_domains
    ADD CONSTRAINT tenant_domains_domain_unique UNIQUE (domain);


--
-- Name: tenant_domains tenant_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_domains
    ADD CONSTRAINT tenant_domains_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenant_entitlement_overrides tenant_entitlement_overrides_tenant_id_key_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_entitlement_overrides
    ADD CONSTRAINT tenant_entitlement_overrides_tenant_id_key_pk PRIMARY KEY (tenant_id, key);


--
-- Name: tenant_integrations tenant_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_pkey PRIMARY KEY (id);


--
-- Name: tenant_memberships tenant_memberships_tenant_id_clerk_user_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_tenant_id_clerk_user_id_pk PRIMARY KEY (tenant_id, clerk_user_id);


--
-- Name: tenant_modules tenant_modules_tenant_id_module_key_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_modules
    ADD CONSTRAINT tenant_modules_tenant_id_module_key_pk PRIMARY KEY (tenant_id, module_key);


--
-- Name: tenant_payment_methods tenant_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_payment_methods
    ADD CONSTRAINT tenant_payment_methods_pkey PRIMARY KEY (id);


--
-- Name: tenant_product_configuration tenant_product_configuration_tenant_id_module_key_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_product_configuration
    ADD CONSTRAINT tenant_product_configuration_tenant_id_module_key_pk PRIMARY KEY (tenant_id, module_key);


--
-- Name: tenant_subscriptions tenant_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenant_telegram_receipts tenant_telegram_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_telegram_receipts
    ADD CONSTRAINT tenant_telegram_receipts_pkey PRIMARY KEY (id);


--
-- Name: tenant_usage_counters tenant_usage_counters_tenant_id_key_period_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage_counters
    ADD CONSTRAINT tenant_usage_counters_tenant_id_key_period_pk PRIMARY KEY (tenant_id, key, period);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);


--
-- Name: wallet_configurations wallet_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_configurations
    ADD CONSTRAINT wallet_configurations_pkey PRIMARY KEY (id);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: white_label_attachments white_label_attachments_object_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_attachments
    ADD CONSTRAINT white_label_attachments_object_key_unique UNIQUE (object_key);


--
-- Name: white_label_attachments white_label_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_attachments
    ADD CONSTRAINT white_label_attachments_pkey PRIMARY KEY (id);


--
-- Name: white_label_events white_label_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_events
    ADD CONSTRAINT white_label_events_pkey PRIMARY KEY (id);


--
-- Name: white_label_requests white_label_requests_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_requests
    ADD CONSTRAINT white_label_requests_order_number_unique UNIQUE (order_number);


--
-- Name: white_label_requests white_label_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_requests
    ADD CONSTRAINT white_label_requests_pkey PRIMARY KEY (id);


--
-- Name: white_label_requests white_label_requests_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_requests
    ADD CONSTRAINT white_label_requests_tenant_id_unique UNIQUE (tenant_id);


--
-- Name: provider_assignment_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX provider_assignment_scope ON public.provider_assignments USING btree (tenant_id, provider_id, capability, environment);


--
-- Name: provider_policy_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX provider_policy_scope ON public.provider_policies USING btree (tenant_id, scope, resource_id, capability);


--
-- Name: tenant_integration_independent_credentials; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_integration_independent_credentials ON public.tenant_integrations USING btree (provider_key, credential_identity);


--
-- Name: tenant_integration_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_integration_scope ON public.tenant_integrations USING btree (tenant_id, provider_key, environment);


--
-- Name: tenant_telegram_update_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_telegram_update_identity ON public.tenant_telegram_receipts USING btree (integration_id, update_id);


--
-- Name: white_label_request_idempotency; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX white_label_request_idempotency ON public.white_label_requests USING btree (customer_user_id, idempotency_key);


--
-- Name: addon_entitlements addon_entitlements_addon_id_addons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_entitlements
    ADD CONSTRAINT addon_entitlements_addon_id_addons_id_fk FOREIGN KEY (addon_id) REFERENCES public.addons(id);


--
-- Name: addon_entitlements addon_entitlements_key_entitlement_definitions_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_entitlements
    ADD CONSTRAINT addon_entitlements_key_entitlement_definitions_key_fk FOREIGN KEY (key) REFERENCES public.entitlement_definitions(key);


--
-- Name: api_keys api_keys_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: asset_network_catalog asset_network_catalog_asset_id_asset_catalog_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_network_catalog
    ADD CONSTRAINT asset_network_catalog_asset_id_asset_catalog_id_fk FOREIGN KEY (asset_id) REFERENCES public.asset_catalog(id);


--
-- Name: asset_network_catalog asset_network_catalog_network_id_network_catalog_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_network_catalog
    ADD CONSTRAINT asset_network_catalog_network_id_network_catalog_id_fk FOREIGN KEY (network_id) REFERENCES public.network_catalog(id);


--
-- Name: audit_events audit_events_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: blockchain_provider_configs blockchain_provider_configs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blockchain_provider_configs
    ADD CONSTRAINT blockchain_provider_configs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: customer_notification_reads customer_notification_reads_event_id_white_label_events_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_notification_reads
    ADD CONSTRAINT customer_notification_reads_event_id_white_label_events_id_fk FOREIGN KEY (event_id) REFERENCES public.white_label_events(id);


--
-- Name: exchange_orders exchange_orders_pricing_rule_id_tenant_id_pricing_rules_id_tena; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_orders
    ADD CONSTRAINT exchange_orders_pricing_rule_id_tenant_id_pricing_rules_id_tena FOREIGN KEY (pricing_rule_id, tenant_id) REFERENCES public.pricing_rules(id, tenant_id);


--
-- Name: exchange_orders exchange_orders_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_orders
    ADD CONSTRAINT exchange_orders_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: landing_products landing_products_key_module_catalog_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_products
    ADD CONSTRAINT landing_products_key_module_catalog_key_fk FOREIGN KEY (key) REFERENCES public.module_catalog(key);


--
-- Name: notification_events notification_events_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_events
    ADD CONSTRAINT notification_events_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: payment_invoices payment_invoices_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_invoices
    ADD CONSTRAINT payment_invoices_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: plan_entitlements plan_entitlements_key_entitlement_definitions_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_entitlements
    ADD CONSTRAINT plan_entitlements_key_entitlement_definitions_key_fk FOREIGN KEY (key) REFERENCES public.entitlement_definitions(key);


--
-- Name: plan_entitlements plan_entitlements_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_entitlements
    ADD CONSTRAINT plan_entitlements_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: pricing_rules pricing_rules_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: provider_assignments provider_assignments_provider_id_provider_catalog_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_assignments
    ADD CONSTRAINT provider_assignments_provider_id_provider_catalog_id_fk FOREIGN KEY (provider_id) REFERENCES public.provider_catalog(id);


--
-- Name: provider_assignments provider_assignments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_assignments
    ADD CONSTRAINT provider_assignments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: provider_policies provider_policies_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_policies
    ADD CONSTRAINT provider_policies_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_addons tenant_addons_addon_id_addons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_addons
    ADD CONSTRAINT tenant_addons_addon_id_addons_id_fk FOREIGN KEY (addon_id) REFERENCES public.addons(id);


--
-- Name: tenant_addons tenant_addons_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_addons
    ADD CONSTRAINT tenant_addons_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_asset_networks tenant_asset_networks_asset_network_id_asset_network_catalog_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_asset_networks
    ADD CONSTRAINT tenant_asset_networks_asset_network_id_asset_network_catalog_id FOREIGN KEY (asset_network_id) REFERENCES public.asset_network_catalog(id);


--
-- Name: tenant_asset_networks tenant_asset_networks_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_asset_networks
    ADD CONSTRAINT tenant_asset_networks_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_branding tenant_branding_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_branding
    ADD CONSTRAINT tenant_branding_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_configuration tenant_configuration_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_configuration
    ADD CONSTRAINT tenant_configuration_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_domains tenant_domains_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_domains
    ADD CONSTRAINT tenant_domains_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_entitlement_overrides tenant_entitlement_overrides_key_entitlement_definitions_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_entitlement_overrides
    ADD CONSTRAINT tenant_entitlement_overrides_key_entitlement_definitions_key_fk FOREIGN KEY (key) REFERENCES public.entitlement_definitions(key);


--
-- Name: tenant_entitlement_overrides tenant_entitlement_overrides_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_entitlement_overrides
    ADD CONSTRAINT tenant_entitlement_overrides_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_integrations tenant_integrations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_integrations
    ADD CONSTRAINT tenant_integrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_memberships tenant_memberships_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_modules tenant_modules_module_key_module_catalog_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_modules
    ADD CONSTRAINT tenant_modules_module_key_module_catalog_key_fk FOREIGN KEY (module_key) REFERENCES public.module_catalog(key);


--
-- Name: tenant_modules tenant_modules_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_modules
    ADD CONSTRAINT tenant_modules_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_payment_methods tenant_payment_methods_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_payment_methods
    ADD CONSTRAINT tenant_payment_methods_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_product_configuration tenant_product_configuration_module_key_module_catalog_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_product_configuration
    ADD CONSTRAINT tenant_product_configuration_module_key_module_catalog_key_fk FOREIGN KEY (module_key) REFERENCES public.module_catalog(key);


--
-- Name: tenant_product_configuration tenant_product_configuration_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_product_configuration
    ADD CONSTRAINT tenant_product_configuration_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_subscriptions tenant_subscriptions_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: tenant_subscriptions tenant_subscriptions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_telegram_receipts tenant_telegram_receipts_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_telegram_receipts
    ADD CONSTRAINT tenant_telegram_receipts_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.tenant_integrations(id);


--
-- Name: tenant_telegram_receipts tenant_telegram_receipts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_telegram_receipts
    ADD CONSTRAINT tenant_telegram_receipts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenant_usage_counters tenant_usage_counters_key_entitlement_definitions_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage_counters
    ADD CONSTRAINT tenant_usage_counters_key_entitlement_definitions_key_fk FOREIGN KEY (key) REFERENCES public.entitlement_definitions(key);


--
-- Name: tenant_usage_counters tenant_usage_counters_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_usage_counters
    ADD CONSTRAINT tenant_usage_counters_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: wallet_configurations wallet_configurations_tenant_id_asset_network_id_tenant_asset_n; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_configurations
    ADD CONSTRAINT wallet_configurations_tenant_id_asset_network_id_tenant_asset_n FOREIGN KEY (tenant_id, asset_network_id) REFERENCES public.tenant_asset_networks(tenant_id, asset_network_id);


--
-- Name: wallet_configurations wallet_configurations_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_configurations
    ADD CONSTRAINT wallet_configurations_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: webhook_endpoints webhook_endpoints_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: white_label_attachments white_label_attachments_request_id_white_label_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_attachments
    ADD CONSTRAINT white_label_attachments_request_id_white_label_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.white_label_requests(id) ON DELETE CASCADE;


--
-- Name: white_label_events white_label_events_request_id_white_label_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_events
    ADD CONSTRAINT white_label_events_request_id_white_label_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.white_label_requests(id) ON DELETE CASCADE;


--
-- Name: white_label_requests white_label_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.white_label_requests
    ADD CONSTRAINT white_label_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: addon_entitlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addon_entitlements ENABLE ROW LEVEL SECURITY;

--
-- Name: addons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_network_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_network_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: blockchain_provider_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blockchain_provider_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_notification_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_notification_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: entitlement_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entitlement_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: landing_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.landing_products ENABLE ROW LEVEL SECURITY;

--
-- Name: module_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.module_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: network_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.network_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_entitlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: provider_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.provider_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: provider_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.provider_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: provider_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.provider_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: addon_entitlements qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.addon_entitlements FOR SELECT USING (true);


--
-- Name: addons qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.addons FOR SELECT USING (true);


--
-- Name: api_keys qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.api_keys FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: asset_catalog qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.asset_catalog FOR SELECT USING (true);


--
-- Name: asset_network_catalog qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.asset_network_catalog FOR SELECT USING (true);


--
-- Name: audit_events qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.audit_events FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: blockchain_provider_configs qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.blockchain_provider_configs FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: customer_notification_reads qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.customer_notification_reads FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))));


--
-- Name: entitlement_definitions qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.entitlement_definitions FOR SELECT USING (true);


--
-- Name: exchange_orders qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.exchange_orders FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: landing_products qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.landing_products FOR SELECT USING (true);


--
-- Name: module_catalog qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.module_catalog FOR SELECT USING (true);


--
-- Name: network_catalog qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.network_catalog FOR SELECT USING (true);


--
-- Name: notification_events qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.notification_events FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: payment_invoices qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.payment_invoices FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: plan_entitlements qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.plan_entitlements FOR SELECT USING (true);


--
-- Name: plans qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.plans FOR SELECT USING (true);


--
-- Name: platform_admins qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.platform_admins FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (clerk_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))));


--
-- Name: pricing_rules qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.pricing_rules FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: provider_assignments qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.provider_assignments FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: provider_catalog qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.provider_catalog FOR SELECT USING (true);


--
-- Name: provider_policies qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.provider_policies FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_addons qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_addons FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_asset_networks qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_asset_networks FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_branding qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_branding FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_configuration qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_configuration FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_domains qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_domains FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (status = 'verified'::text))));


--
-- Name: tenant_entitlement_overrides qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_entitlement_overrides FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_integrations qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_integrations FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_memberships qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_memberships FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (clerk_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text)))));


--
-- Name: tenant_modules qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_modules FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_payment_methods qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_payment_methods FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_product_configuration qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_product_configuration FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_subscriptions qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_subscriptions FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_telegram_receipts qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_telegram_receipts FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenant_usage_counters qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenant_usage_counters FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: tenants qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.tenants FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (id IN ( SELECT tenant_memberships.tenant_id
   FROM public.tenant_memberships
  WHERE ((tenant_memberships.clerk_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text)) AND tenant_memberships.active)))) OR ((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text)) AND (status = 'active'::text)) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (status = 'active'::text) AND (id IN ( SELECT tenant_domains.tenant_id
   FROM public.tenant_domains
  WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))));


--
-- Name: wallet_configurations qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.wallet_configurations FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: webhook_endpoints qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.webhook_endpoints FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: white_label_attachments qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.white_label_attachments FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (owner_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))));


--
-- Name: white_label_events qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.white_label_events FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR ((visibility = 'customer'::text) AND (request_id IN ( SELECT white_label_requests.id
   FROM public.white_label_requests
  WHERE (white_label_requests.customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text)))))));


--
-- Name: white_label_requests qx_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_read ON public.white_label_requests FOR SELECT USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text)) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text)) OR ((COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = ''::text) AND (tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (((COALESCE(current_setting('app.public_slug'::text, true), ''::text) <> ''::text) AND (tenants.slug = COALESCE(current_setting('app.public_slug'::text, true), ''::text))) OR ((COALESCE(current_setting('app.public_domain'::text, true), ''::text) <> ''::text) AND (tenants.id IN ( SELECT tenant_domains.tenant_id
           FROM public.tenant_domains
          WHERE ((tenant_domains.domain = COALESCE(current_setting('app.public_domain'::text, true), ''::text)) AND (tenant_domains.status = 'verified'::text)))))))))));


--
-- Name: addon_entitlements qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.addon_entitlements USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: addons qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.addons USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: api_keys qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.api_keys USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: asset_catalog qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.asset_catalog USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: asset_network_catalog qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.asset_network_catalog USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: audit_events qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.audit_events USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: blockchain_provider_configs qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.blockchain_provider_configs USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: customer_notification_reads qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.customer_notification_reads USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: entitlement_definitions qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.entitlement_definitions USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: exchange_orders qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.exchange_orders USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: landing_products qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.landing_products USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: module_catalog qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.module_catalog USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: network_catalog qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.network_catalog USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: notification_events qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.notification_events USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: payment_invoices qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.payment_invoices USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: plan_entitlements qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.plan_entitlements USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: plans qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.plans USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: platform_admins qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.platform_admins USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: pricing_rules qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.pricing_rules USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: provider_assignments qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.provider_assignments USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: provider_catalog qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.provider_catalog USING (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK (((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: provider_policies qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.provider_policies USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_addons qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_addons USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_asset_networks qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_asset_networks USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_branding qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_branding USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_configuration qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_configuration USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_domains qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_domains USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_entitlement_overrides qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_entitlement_overrides USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_integrations qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_integrations USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_memberships qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_memberships USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text) AND (COALESCE(current_setting('app.can_manage_staff'::text, true), ''::text) = 'true'::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text) AND (COALESCE(current_setting('app.can_manage_staff'::text, true), ''::text) = 'true'::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_modules qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_modules USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_payment_methods qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_payment_methods USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_product_configuration qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_product_configuration USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_subscriptions qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_subscriptions USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_telegram_receipts qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_telegram_receipts USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (EXISTS ( SELECT 1
   FROM public.tenant_integrations i
  WHERE ((i.id = tenant_telegram_receipts.integration_id) AND (i.tenant_id = tenant_telegram_receipts.tenant_id)))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (EXISTS ( SELECT 1
   FROM public.tenant_integrations i
  WHERE ((i.id = tenant_telegram_receipts.integration_id) AND (i.tenant_id = tenant_telegram_receipts.tenant_id)))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_usage_counters qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenant_usage_counters USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenants qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.tenants USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: wallet_configurations qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.wallet_configurations USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: webhook_endpoints qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.webhook_endpoints USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (((tenant_id)::text = COALESCE(current_setting('app.tenant_id'::text, true), ''::text)) AND (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) <> ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: white_label_attachments qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.white_label_attachments USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (owner_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (owner_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: white_label_events qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.white_label_events USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR ((request_id IN ( SELECT white_label_requests.id
   FROM public.white_label_requests
  WHERE (white_label_requests.customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text)))) AND (author_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text)) AND (visibility = 'customer'::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR ((request_id IN ( SELECT white_label_requests.id
   FROM public.white_label_requests
  WHERE (white_label_requests.customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text)))) AND (author_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text)) AND (visibility = 'customer'::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: white_label_requests qx_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qx_write ON public.white_label_requests USING ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text))) WITH CHECK ((((COALESCE(current_setting('app.is_super_admin'::text, true), ''::text) = 'true'::text) OR (customer_user_id = COALESCE(current_setting('app.actor_id'::text, true), ''::text))) AND (COALESCE(current_setting('app.can_write'::text, true), ''::text) = 'true'::text)));


--
-- Name: tenant_addons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_addons ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_asset_networks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_asset_networks ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_branding; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_configuration; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_configuration ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_entitlement_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_entitlement_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_payment_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_product_configuration; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_product_configuration ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_telegram_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_telegram_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_usage_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_usage_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_configurations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_configurations ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_endpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: white_label_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.white_label_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: white_label_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.white_label_events ENABLE ROW LEVEL SECURITY;

--
-- Name: white_label_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.white_label_requests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



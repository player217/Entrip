--
-- PostgreSQL database dump
--

\restrict ePYhUryiRJgvtKfick9bedxfKiU2R51221MR8cmjlvKfSPoRGk3BbnAkU7CA55N

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: entrip
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO entrip;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: entrip
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AccountRole; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."AccountRole" AS ENUM (
    'admin',
    'approver',
    'staff',
    'viewer'
);


ALTER TYPE public."AccountRole" OWNER TO entrip;

--
-- Name: AccountStatus; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."AccountStatus" AS ENUM (
    'active',
    'suspended',
    'deleted'
);


ALTER TYPE public."AccountStatus" OWNER TO entrip;

--
-- Name: ApprovalAction; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."ApprovalAction" AS ENUM (
    'approve',
    'reject'
);


ALTER TYPE public."ApprovalAction" OWNER TO entrip;

--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
);


ALTER TYPE public."ApprovalStatus" OWNER TO entrip;

--
-- Name: ApprovalTargetType; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."ApprovalTargetType" AS ENUM (
    'finance',
    'custom'
);


ALTER TYPE public."ApprovalTargetType" OWNER TO entrip;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'pending',
    'confirmed',
    'done',
    'cancelled',
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED'
);


ALTER TYPE public."BookingStatus" OWNER TO entrip;

--
-- Name: BookingType; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."BookingType" AS ENUM (
    'incentive',
    'golf',
    'honeymoon',
    'airtel',
    'etc',
    'PACKAGE',
    'FIT',
    'GROUP',
    'BUSINESS'
);


ALTER TYPE public."BookingType" OWNER TO entrip;

--
-- Name: CalendarEventStatus; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."CalendarEventStatus" AS ENUM (
    'pending',
    'confirmed',
    'cancelled'
);


ALTER TYPE public."CalendarEventStatus" OWNER TO entrip;

--
-- Name: ConversationType; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."ConversationType" AS ENUM (
    'direct',
    'group',
    'channel'
);


ALTER TYPE public."ConversationType" OWNER TO entrip;

--
-- Name: FinanceStatus; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."FinanceStatus" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'deleted'
);


ALTER TYPE public."FinanceStatus" OWNER TO entrip;

--
-- Name: FinanceType; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."FinanceType" AS ENUM (
    'income',
    'expense'
);


ALTER TYPE public."FinanceType" OWNER TO entrip;

--
-- Name: MessageStatus; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."MessageStatus" AS ENUM (
    'sent',
    'delivered',
    'read',
    'deleted'
);


ALTER TYPE public."MessageStatus" OWNER TO entrip;

--
-- Name: MessageType; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."MessageType" AS ENUM (
    'text',
    'image',
    'file',
    'system'
);


ALTER TYPE public."MessageType" OWNER TO entrip;

--
-- Name: ParticipantRole; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."ParticipantRole" AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer'
);


ALTER TYPE public."ParticipantRole" OWNER TO entrip;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    role public."AccountRole" DEFAULT 'staff'::public."AccountRole" NOT NULL,
    status public."AccountStatus" DEFAULT 'active'::public."AccountStatus" NOT NULL,
    "passwordHash" text,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Account" OWNER TO entrip;

--
-- Name: Approval; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Approval" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "targetType" public."ApprovalTargetType" NOT NULL,
    "targetId" text,
    amount numeric(65,30),
    currency text DEFAULT 'KRW'::text NOT NULL,
    status public."ApprovalStatus" DEFAULT 'pending'::public."ApprovalStatus" NOT NULL,
    "currentStep" integer DEFAULT 0 NOT NULL,
    "requesterId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Approval" OWNER TO entrip;

--
-- Name: ApprovalStep; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."ApprovalStep" (
    id text NOT NULL,
    "approvalId" text NOT NULL,
    "approverId" text NOT NULL,
    "order" integer NOT NULL,
    action public."ApprovalAction",
    comment text,
    "actedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ApprovalStep" OWNER TO entrip;

--
-- Name: Booking; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Booking" (
    id text NOT NULL,
    "teamName" text NOT NULL,
    type public."BookingType" NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "totalPax" integer DEFAULT 1 NOT NULL,
    coordinator text NOT NULL,
    revenue numeric(65,30),
    notes text,
    status public."BookingStatus" DEFAULT 'pending'::public."BookingStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Booking" OWNER TO entrip;

--
-- Name: CalendarEvent; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."CalendarEvent" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    location text,
    start timestamp(3) without time zone NOT NULL,
    "end" timestamp(3) without time zone NOT NULL,
    "allDay" boolean DEFAULT false NOT NULL,
    color text,
    status public."CalendarEventStatus" DEFAULT 'confirmed'::public."CalendarEventStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdBy" text,
    "updatedBy" text
);


ALTER TABLE public."CalendarEvent" OWNER TO entrip;

--
-- Name: Conversation; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Conversation" (
    id text NOT NULL,
    name text,
    type public."ConversationType" DEFAULT 'direct'::public."ConversationType" NOT NULL,
    description text,
    "isPrivate" boolean DEFAULT true NOT NULL,
    "allowInvites" boolean DEFAULT true NOT NULL,
    "lastActivity" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdBy" text
);


ALTER TABLE public."Conversation" OWNER TO entrip;

--
-- Name: ConversationParticipant; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."ConversationParticipant" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "userId" text NOT NULL,
    role public."ParticipantRole" DEFAULT 'member'::public."ParticipantRole" NOT NULL,
    nickname text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastReadAt" timestamp(3) without time zone,
    "lastSeenAt" timestamp(3) without time zone,
    "canInvite" boolean DEFAULT false NOT NULL,
    "canManage" boolean DEFAULT false NOT NULL,
    "isMuted" boolean DEFAULT false NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leftAt" timestamp(3) without time zone,
    "invitedBy" text
);


ALTER TABLE public."ConversationParticipant" OWNER TO entrip;

--
-- Name: FinanceRecord; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."FinanceRecord" (
    id text NOT NULL,
    type public."FinanceType" NOT NULL,
    category text NOT NULL,
    amount numeric(65,30) NOT NULL,
    currency text DEFAULT 'KRW'::text NOT NULL,
    "exchangeRate" numeric(65,30) DEFAULT 1.0 NOT NULL,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    description text,
    remarks text,
    status public."FinanceStatus" DEFAULT 'pending'::public."FinanceStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdBy" text,
    "updatedBy" text
);


ALTER TABLE public."FinanceRecord" OWNER TO entrip;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "senderId" text NOT NULL,
    type public."MessageType" DEFAULT 'text'::public."MessageType" NOT NULL,
    content text NOT NULL,
    attachments jsonb,
    "replyToId" text,
    status public."MessageStatus" DEFAULT 'sent'::public."MessageStatus" NOT NULL,
    "isEdited" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."Message" OWNER TO entrip;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO entrip;

--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Account" (id, name, email, phone, role, status, "passwordHash", "lastLoginAt", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: Approval; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Approval" (id, title, content, "targetType", "targetId", amount, currency, status, "currentStep", "requesterId", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: ApprovalStep; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."ApprovalStep" (id, "approvalId", "approverId", "order", action, comment, "actedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Booking" (id, "teamName", type, origin, destination, "startDate", "endDate", "totalPax", coordinator, revenue, notes, status, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: CalendarEvent; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."CalendarEvent" (id, title, description, location, start, "end", "allDay", color, status, "createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: Conversation; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Conversation" (id, name, type, description, "isPrivate", "allowInvites", "lastActivity", "createdAt", "updatedAt", "deletedAt", "createdBy") FROM stdin;
\.


--
-- Data for Name: ConversationParticipant; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."ConversationParticipant" (id, "conversationId", "userId", role, nickname, "isActive", "lastReadAt", "lastSeenAt", "canInvite", "canManage", "isMuted", "joinedAt", "leftAt", "invitedBy") FROM stdin;
\.


--
-- Data for Name: FinanceRecord; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."FinanceRecord" (id, type, category, amount, currency, "exchangeRate", "occurredAt", description, remarks, status, "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy") FROM stdin;
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Message" (id, "conversationId", "senderId", type, content, attachments, "replyToId", status, "isEdited", "editedAt", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
88310657-e894-4388-8926-cba44e052cf5	ad675ad4083d25a0a381ee4a2d8d863eb43de544d34907bee40d5a64f8ee22a1	2025-09-14 23:28:04.218024+00	001_initial_setup	\N	\N	2025-09-14 23:28:03.910467+00	1
a3a98ed3-38e0-4d70-ac81-1032bb718f6a	b846a8c305b06fa43f844acb28e2581ce70fa50649a822165a20a249ac3ab356	2025-09-14 23:28:04.443298+00	20250913232453_add_messaging_system	\N	\N	2025-09-14 23:28:04.224053+00	1
da4bcba7-17af-4b1a-9915-2cc6f3b23598	3aae7e6217cd28e89ca9e35a8a4bd351120d173a3e42a9a36b2fc011b6aa3186	\N	20250914_add_user_tables	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250914_add_user_tables\n\nDatabase error code: 42703\n\nDatabase error:\nERROR: column "userId" referenced in foreign key constraint does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42703), message: "column \\"userId\\" referenced in foreign key constraint does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(11501), routine: Some("transformColumnNameList") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250914_add_user_tables"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20250914_add_user_tables"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	\N	2025-09-14 23:28:04.46144+00	0
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalStep ApprovalStep_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."ApprovalStep"
    ADD CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY (id);


--
-- Name: Approval Approval_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_pkey" PRIMARY KEY (id);


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: CalendarEvent CalendarEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."CalendarEvent"
    ADD CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY (id);


--
-- Name: ConversationParticipant ConversationParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY (id);


--
-- Name: Conversation Conversation_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_pkey" PRIMARY KEY (id);


--
-- Name: FinanceRecord FinanceRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."FinanceRecord"
    ADD CONSTRAINT "FinanceRecord_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Account_createdAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Account_createdAt_idx" ON public."Account" USING btree ("createdAt");


--
-- Name: Account_email_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Account_email_idx" ON public."Account" USING btree (email);


--
-- Name: Account_email_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "Account_email_key" ON public."Account" USING btree (email);


--
-- Name: Account_role_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Account_role_idx" ON public."Account" USING btree (role);


--
-- Name: Account_status_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Account_status_idx" ON public."Account" USING btree (status);


--
-- Name: ApprovalStep_approvalId_order_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "ApprovalStep_approvalId_order_idx" ON public."ApprovalStep" USING btree ("approvalId", "order");


--
-- Name: ApprovalStep_approvalId_order_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "ApprovalStep_approvalId_order_key" ON public."ApprovalStep" USING btree ("approvalId", "order");


--
-- Name: ApprovalStep_approverId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "ApprovalStep_approverId_idx" ON public."ApprovalStep" USING btree ("approverId");


--
-- Name: Approval_createdAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Approval_createdAt_idx" ON public."Approval" USING btree ("createdAt");


--
-- Name: Approval_requesterId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Approval_requesterId_idx" ON public."Approval" USING btree ("requesterId");


--
-- Name: Approval_status_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Approval_status_idx" ON public."Approval" USING btree (status);


--
-- Name: Approval_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Approval_targetType_targetId_idx" ON public."Approval" USING btree ("targetType", "targetId");


--
-- Name: Booking_createdAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Booking_createdAt_idx" ON public."Booking" USING btree ("createdAt");


--
-- Name: Booking_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Booking_startDate_endDate_idx" ON public."Booking" USING btree ("startDate", "endDate");


--
-- Name: Booking_status_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Booking_status_idx" ON public."Booking" USING btree (status);


--
-- Name: CalendarEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "CalendarEvent_createdAt_idx" ON public."CalendarEvent" USING btree ("createdAt");


--
-- Name: CalendarEvent_start_end_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "CalendarEvent_start_end_idx" ON public."CalendarEvent" USING btree (start, "end");


--
-- Name: CalendarEvent_status_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "CalendarEvent_status_idx" ON public."CalendarEvent" USING btree (status);


--
-- Name: ConversationParticipant_conversationId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "ConversationParticipant_conversationId_idx" ON public."ConversationParticipant" USING btree ("conversationId");


--
-- Name: ConversationParticipant_conversationId_userId_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON public."ConversationParticipant" USING btree ("conversationId", "userId");


--
-- Name: ConversationParticipant_lastReadAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "ConversationParticipant_lastReadAt_idx" ON public."ConversationParticipant" USING btree ("lastReadAt");


--
-- Name: ConversationParticipant_userId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "ConversationParticipant_userId_idx" ON public."ConversationParticipant" USING btree ("userId");


--
-- Name: Conversation_createdAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Conversation_createdAt_idx" ON public."Conversation" USING btree ("createdAt");


--
-- Name: Conversation_createdBy_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Conversation_createdBy_idx" ON public."Conversation" USING btree ("createdBy");


--
-- Name: Conversation_lastActivity_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Conversation_lastActivity_idx" ON public."Conversation" USING btree ("lastActivity");


--
-- Name: Conversation_type_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Conversation_type_idx" ON public."Conversation" USING btree (type);


--
-- Name: FinanceRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "FinanceRecord_createdAt_idx" ON public."FinanceRecord" USING btree ("createdAt");


--
-- Name: FinanceRecord_occurredAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "FinanceRecord_occurredAt_idx" ON public."FinanceRecord" USING btree ("occurredAt");


--
-- Name: FinanceRecord_status_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "FinanceRecord_status_idx" ON public."FinanceRecord" USING btree (status);


--
-- Name: FinanceRecord_type_status_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "FinanceRecord_type_status_idx" ON public."FinanceRecord" USING btree (type, status);


--
-- Name: Message_conversationId_createdAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Message_conversationId_createdAt_idx" ON public."Message" USING btree ("conversationId", "createdAt");


--
-- Name: Message_createdAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Message_createdAt_idx" ON public."Message" USING btree ("createdAt");


--
-- Name: Message_replyToId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Message_replyToId_idx" ON public."Message" USING btree ("replyToId");


--
-- Name: Message_senderId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Message_senderId_idx" ON public."Message" USING btree ("senderId");


--
-- Name: Message_status_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Message_status_idx" ON public."Message" USING btree (status);


--
-- Name: Message_type_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Message_type_idx" ON public."Message" USING btree (type);


--
-- Name: ApprovalStep ApprovalStep_approvalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."ApprovalStep"
    ADD CONSTRAINT "ApprovalStep_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES public."Approval"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ConversationParticipant ConversationParticipant_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."ConversationParticipant"
    ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_replyToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: entrip
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict ePYhUryiRJgvtKfick9bedxfKiU2R51221MR8cmjlvKfSPoRGk3BbnAkU7CA55N


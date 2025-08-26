--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

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
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE public."ApprovalStatus" OWNER TO entrip;

--
-- Name: ApprovalType; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."ApprovalType" AS ENUM (
    'BOOKING',
    'PAYMENT',
    'REFUND',
    'MISC'
);


ALTER TYPE public."ApprovalType" OWNER TO entrip;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED'
);


ALTER TYPE public."BookingStatus" OWNER TO entrip;

--
-- Name: BookingType; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."BookingType" AS ENUM (
    'PACKAGE',
    'FIT',
    'GROUP',
    'BUSINESS'
);


ALTER TYPE public."BookingType" OWNER TO entrip;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."TransactionType" AS ENUM (
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER_IN',
    'TRANSFER_OUT'
);


ALTER TYPE public."TransactionType" OWNER TO entrip;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: entrip
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'MANAGER',
    'USER'
);


ALTER TYPE public."UserRole" OWNER TO entrip;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    name text NOT NULL,
    "accountNumber" text NOT NULL,
    "bankName" text NOT NULL,
    currency text DEFAULT 'KRW'::text NOT NULL,
    balance numeric(65,30) DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "managerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Account" OWNER TO entrip;

--
-- Name: Approval; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Approval" (
    id text NOT NULL,
    "approvalNumber" text NOT NULL,
    type public."ApprovalType" NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    amount numeric(65,30),
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "requesterId" text NOT NULL,
    "approverId" text NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "rejectReason" text,
    "bookingId" text,
    "accountId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Approval" OWNER TO entrip;

--
-- Name: Booking; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Booking" (
    id text NOT NULL,
    "bookingNumber" text NOT NULL,
    "customerName" text NOT NULL,
    "teamName" text NOT NULL,
    "bookingType" public."BookingType" NOT NULL,
    destination text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "paxCount" integer NOT NULL,
    nights integer NOT NULL,
    days integer NOT NULL,
    status public."BookingStatus" DEFAULT 'PENDING'::public."BookingStatus" NOT NULL,
    "totalPrice" numeric(65,30) NOT NULL,
    "depositAmount" numeric(65,30),
    currency text DEFAULT 'KRW'::text NOT NULL,
    "flightInfo" jsonb,
    "hotelInfo" jsonb,
    "insuranceInfo" jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "updatedBy" text
);


ALTER TABLE public."Booking" OWNER TO entrip;

--
-- Name: BookingEvent; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."BookingEvent" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "typeCode" text NOT NULL,
    status public."BookingStatus" NOT NULL
);


ALTER TABLE public."BookingEvent" OWNER TO entrip;

--
-- Name: BookingHistory; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."BookingHistory" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    action text NOT NULL,
    "changedFields" jsonb NOT NULL,
    "previousValues" jsonb,
    "newValues" jsonb,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "changedBy" text NOT NULL
);


ALTER TABLE public."BookingHistory" OWNER TO entrip;

--
-- Name: Document; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Document" (
    id text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileType" text NOT NULL,
    "fileSize" integer NOT NULL,
    "bookingId" text NOT NULL,
    "uploadedBy" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Document" OWNER TO entrip;

--
-- Name: ExchangeRate; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."ExchangeRate" (
    id text NOT NULL,
    "fromCurrency" text NOT NULL,
    "toCurrency" text NOT NULL,
    rate numeric(65,30) NOT NULL,
    "validFrom" timestamp(3) without time zone NOT NULL,
    "validUntil" timestamp(3) without time zone NOT NULL,
    source text DEFAULT 'MANUAL'::text NOT NULL
);


ALTER TABLE public."ExchangeRate" OWNER TO entrip;

--
-- Name: Transaction; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."Transaction" (
    id text NOT NULL,
    "transactionNumber" text NOT NULL,
    type public."TransactionType" NOT NULL,
    amount numeric(65,30) NOT NULL,
    currency text NOT NULL,
    "exchangeRate" numeric(65,30),
    description text NOT NULL,
    "accountId" text NOT NULL,
    counterparty text,
    "bookingId" text,
    "userId" text NOT NULL,
    "transactionDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Transaction" OWNER TO entrip;

--
-- Name: User; Type: TABLE; Schema: public; Owner: entrip
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password text NOT NULL,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    department text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO entrip;

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

COPY public."Account" (id, name, "accountNumber", "bankName", currency, balance, "isActive", "managerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Approval; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Approval" (id, "approvalNumber", type, title, content, amount, status, "requesterId", "approverId", "approvedAt", "rejectReason", "bookingId", "accountId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Booking" (id, "bookingNumber", "customerName", "teamName", "bookingType", destination, "startDate", "endDate", "paxCount", nights, days, status, "totalPrice", "depositAmount", currency, "flightInfo", "hotelInfo", "insuranceInfo", notes, "createdAt", "updatedAt", "createdBy", "updatedBy") FROM stdin;
cmd3wsqmn0004v60thr68aeln	BK2507130001	김철수	Demo Incentive	BUSINESS	HND	2025-08-01 00:00:00	2025-08-05 00:00:00	25	4	5	CONFIRMED	50000000.000000000000000000000000000000	\N	KRW	\N	\N	\N	\N	2025-07-15 02:24:27.599	2025-07-15 02:24:27.599	cmd3wsqls0000v60toov9s4tv	\N
cmd3wsqn30006v60trgh8fbja	BK2507130002	이영희	Golf Tour Team	GROUP	CTS	2025-09-15 00:00:00	2025-09-18 00:00:00	16	3	4	PENDING	32000000.000000000000000000000000000000	\N	KRW	\N	\N	\N	\N	2025-07-15 02:24:27.615	2025-07-15 02:24:27.615	cmd3wsqma0001v60tiphttnz8	\N
cmd3wsqnd0008v60t39byx0gv	BK2507130003	박민수	Honeymoon Package	PACKAGE	CDG	2025-07-20 00:00:00	2025-07-27 00:00:00	2	7	8	CONFIRMED	8000000.000000000000000000000000000000	\N	KRW	\N	\N	\N	\N	2025-07-15 02:24:27.626	2025-07-15 02:24:27.626	cmd3wsqmh0002v60t8igoklal	\N
\.


--
-- Data for Name: BookingEvent; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."BookingEvent" (id, "bookingId", date, "typeCode", status) FROM stdin;
\.


--
-- Data for Name: BookingHistory; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."BookingHistory" (id, "bookingId", action, "changedFields", "previousValues", "newValues", "changedAt", "changedBy") FROM stdin;
\.


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Document" (id, "fileName", "fileUrl", "fileType", "fileSize", "bookingId", "uploadedBy", "uploadedAt") FROM stdin;
\.


--
-- Data for Name: ExchangeRate; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."ExchangeRate" (id, "fromCurrency", "toCurrency", rate, "validFrom", "validUntil", source) FROM stdin;
\.


--
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."Transaction" (id, "transactionNumber", type, amount, currency, "exchangeRate", description, "accountId", counterparty, "bookingId", "userId", "transactionDate", "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public."User" (id, email, name, password, role, department, "isActive", "createdAt", "updatedAt") FROM stdin;
cmd3wsqls0000v60toov9s4tv	admin@entrip.com	관리자	hashed_admin123	ADMIN	\N	t	2025-07-15 02:24:27.569	2025-07-15 02:24:27.569
cmd3wsqma0001v60tiphttnz8	manager@entrip.com	매니저	hashed_manager123	MANAGER	\N	t	2025-07-15 02:24:27.586	2025-07-15 02:24:27.586
cmd3wsqmh0002v60t8igoklal	user@entrip.com	일반사용자	hashed_user123	USER	\N	t	2025-07-15 02:24:27.593	2025-07-15 02:24:27.593
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: entrip
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c72f265a-65ef-4993-a22f-f612d92b58c5	445f413e3a519c29637147d8e822cc4c4a10ec70c00ab5f7c01cbcb6a64ad244	2025-07-15 02:24:16.096511+00	20250714044809_prod_init	\N	\N	2025-07-15 02:24:15.732033+00	1
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Approval Approval_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_pkey" PRIMARY KEY (id);


--
-- Name: BookingEvent BookingEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."BookingEvent"
    ADD CONSTRAINT "BookingEvent_pkey" PRIMARY KEY (id);


--
-- Name: BookingHistory BookingHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."BookingHistory"
    ADD CONSTRAINT "BookingHistory_pkey" PRIMARY KEY (id);


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: ExchangeRate ExchangeRate_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."ExchangeRate"
    ADD CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY (id);


--
-- Name: Transaction Transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Account_accountNumber_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "Account_accountNumber_key" ON public."Account" USING btree ("accountNumber");


--
-- Name: Account_managerId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Account_managerId_idx" ON public."Account" USING btree ("managerId");


--
-- Name: Approval_approvalNumber_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "Approval_approvalNumber_key" ON public."Approval" USING btree ("approvalNumber");


--
-- Name: Approval_status_approverId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Approval_status_approverId_idx" ON public."Approval" USING btree (status, "approverId");


--
-- Name: Approval_status_requesterId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Approval_status_requesterId_idx" ON public."Approval" USING btree (status, "requesterId");


--
-- Name: BookingEvent_bookingId_date_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "BookingEvent_bookingId_date_idx" ON public."BookingEvent" USING btree ("bookingId", date);


--
-- Name: BookingHistory_bookingId_changedAt_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "BookingHistory_bookingId_changedAt_idx" ON public."BookingHistory" USING btree ("bookingId", "changedAt");


--
-- Name: Booking_bookingNumber_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON public."Booking" USING btree ("bookingNumber");


--
-- Name: Booking_customerName_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Booking_customerName_idx" ON public."Booking" USING btree ("customerName");


--
-- Name: Booking_status_startDate_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Booking_status_startDate_idx" ON public."Booking" USING btree (status, "startDate");


--
-- Name: Booking_teamName_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Booking_teamName_idx" ON public."Booking" USING btree ("teamName");


--
-- Name: Document_bookingId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Document_bookingId_idx" ON public."Document" USING btree ("bookingId");


--
-- Name: ExchangeRate_fromCurrency_toCurrency_validFrom_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_validFrom_key" ON public."ExchangeRate" USING btree ("fromCurrency", "toCurrency", "validFrom");


--
-- Name: ExchangeRate_validFrom_validUntil_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "ExchangeRate_validFrom_validUntil_idx" ON public."ExchangeRate" USING btree ("validFrom", "validUntil");


--
-- Name: Transaction_accountId_transactionDate_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Transaction_accountId_transactionDate_idx" ON public."Transaction" USING btree ("accountId", "transactionDate");


--
-- Name: Transaction_bookingId_idx; Type: INDEX; Schema: public; Owner: entrip
--

CREATE INDEX "Transaction_bookingId_idx" ON public."Transaction" USING btree ("bookingId");


--
-- Name: Transaction_transactionNumber_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "Transaction_transactionNumber_key" ON public."Transaction" USING btree ("transactionNumber");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: entrip
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Account Account_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Approval Approval_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Approval Approval_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Approval Approval_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Approval Approval_requesterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Approval"
    ADD CONSTRAINT "Approval_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BookingEvent BookingEvent_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."BookingEvent"
    ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BookingHistory BookingHistory_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."BookingHistory"
    ADD CONSTRAINT "BookingHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BookingHistory BookingHistory_changedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."BookingHistory"
    ADD CONSTRAINT "BookingHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Booking Booking_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Document Document_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Transaction Transaction_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Transaction Transaction_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Transaction Transaction_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: entrip
--

ALTER TABLE ONLY public."Transaction"
    ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--


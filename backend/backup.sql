--
-- PostgreSQL database dump
--

\restrict WXthi5js0rQafLASydrPjqHGNqoV3EpNMUHVOvZuNy4Di5DH3PhjiMOjersPj0j

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

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
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: quantum
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO quantum;

--
-- Name: intents; Type: TABLE; Schema: public; Owner: quantum
--

CREATE TABLE public.intents (
    id integer NOT NULL,
    name public.citext NOT NULL,
    description text
);


ALTER TABLE public.intents OWNER TO quantum;

--
-- Name: intents_id_seq; Type: SEQUENCE; Schema: public; Owner: quantum
--

CREATE SEQUENCE public.intents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.intents_id_seq OWNER TO quantum;

--
-- Name: intents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: quantum
--

ALTER SEQUENCE public.intents_id_seq OWNED BY public.intents.id;


--
-- Name: intents id; Type: DEFAULT; Schema: public; Owner: quantum
--

ALTER TABLE ONLY public.intents ALTER COLUMN id SET DEFAULT nextval('public.intents_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: quantum
--

COPY public.alembic_version (version_num) FROM stdin;
20240101_0001
\.


--
-- Data for Name: intents; Type: TABLE DATA; Schema: public; Owner: quantum
--

COPY public.intents (id, name, description) FROM stdin;
1	capture.task	Create a task from captured snippet
2	plan.daily	Daily planning routine
3	review.weekly	Weekly review and prioritization
4	test.intent.pytest	updated
\.


--
-- Name: intents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: quantum
--

SELECT pg_catalog.setval('public.intents_id_seq', 4, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: quantum
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: intents intents_pkey; Type: CONSTRAINT; Schema: public; Owner: quantum
--

ALTER TABLE ONLY public.intents
    ADD CONSTRAINT intents_pkey PRIMARY KEY (id);


--
-- Name: intents uq_intents_name; Type: CONSTRAINT; Schema: public; Owner: quantum
--

ALTER TABLE ONLY public.intents
    ADD CONSTRAINT uq_intents_name UNIQUE (name);


--
-- Name: idx_intents_name; Type: INDEX; Schema: public; Owner: quantum
--

CREATE INDEX idx_intents_name ON public.intents USING btree (name);


--
-- PostgreSQL database dump complete
--

\unrestrict WXthi5js0rQafLASydrPjqHGNqoV3EpNMUHVOvZuNy4Di5DH3PhjiMOjersPj0j


--
-- PostgreSQL database dump
--

\restrict l5Tdr4wwNavdqs6swrBVKhv1vXou41CvezZTbc1gHqz6abf2DXH7mD7bSlZRKOs

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2026-02-07 22:13:32

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 24577)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5048 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 877 (class 1247 OID 24760)
-- Name: template_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.template_status AS ENUM (
    'FILLING',
    'COMPLETE',
    'DOWNLOADED',
    'PRINTED'
);


ALTER TYPE public.template_status OWNER TO postgres;

--
-- TOC entry 235 (class 1255 OID 24747)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 24606)
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_name text NOT NULL,
    original_file_name text,
    mime_type text NOT NULL,
    file_type text NOT NULL,
    storage_bucket text NOT NULL,
    storage_key text NOT NULL,
    size_bytes bigint NOT NULL,
    width_px integer,
    height_px integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.files OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24632)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_number text NOT NULL,
    student_name text NOT NULL,
    grade text NOT NULL,
    section text NOT NULL,
    package_type text NOT NULL,
    package_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'AWAITING_PHOTO'::text NOT NULL,
    created_by uuid NOT NULL,
    photo_file_id uuid,
    framed_file_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24789)
-- Name: template_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.template_slots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_id uuid NOT NULL,
    "position" integer NOT NULL,
    order_id uuid NOT NULL,
    framed_file_id uuid NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT template_slots_position_check CHECK ((("position" >= 1) AND ("position" <= 6)))
);


ALTER TABLE public.template_slots OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 24769)
-- Name: templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_number text NOT NULL,
    status public.template_status DEFAULT 'FILLING'::public.template_status NOT NULL,
    total_slots integer DEFAULT 6 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.templates OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 24588)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'CLIENT'::text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 4866 (class 2606 OID 24624)
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- TOC entry 4873 (class 2606 OID 24656)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 4875 (class 2606 OID 24654)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4881 (class 2606 OID 24806)
-- Name: template_slots template_slots_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_slots
    ADD CONSTRAINT template_slots_order_id_key UNIQUE (order_id);


--
-- TOC entry 4883 (class 2606 OID 24802)
-- Name: template_slots template_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_slots
    ADD CONSTRAINT template_slots_pkey PRIMARY KEY (id);


--
-- TOC entry 4885 (class 2606 OID 24804)
-- Name: template_slots template_slots_template_id_position_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_slots
    ADD CONSTRAINT template_slots_template_id_position_key UNIQUE (template_id, "position");


--
-- TOC entry 4877 (class 2606 OID 24786)
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- TOC entry 4879 (class 2606 OID 24788)
-- Name: templates templates_template_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_template_number_key UNIQUE (template_number);


--
-- TOC entry 4862 (class 2606 OID 24605)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4864 (class 2606 OID 24603)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4867 (class 1259 OID 24630)
-- Name: idx_files_storage_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_files_storage_key ON public.files USING btree (storage_key);


--
-- TOC entry 4868 (class 1259 OID 24631)
-- Name: idx_files_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_files_uploaded_by ON public.files USING btree (uploaded_by);


--
-- TOC entry 4869 (class 1259 OID 24674)
-- Name: idx_orders_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_by ON public.orders USING btree (created_by);


--
-- TOC entry 4870 (class 1259 OID 24673)
-- Name: idx_orders_grade_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_grade_section ON public.orders USING btree (grade, section);


--
-- TOC entry 4871 (class 1259 OID 24672)
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- TOC entry 4894 (class 2620 OID 24753)
-- Name: files trg_files_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_files_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4895 (class 2620 OID 24752)
-- Name: orders trg_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4893 (class 2620 OID 24754)
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4886 (class 2606 OID 24625)
-- Name: files files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 4887 (class 2606 OID 24657)
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4888 (class 2606 OID 24667)
-- Name: orders orders_framed_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_framed_file_id_fkey FOREIGN KEY (framed_file_id) REFERENCES public.files(id);


--
-- TOC entry 4889 (class 2606 OID 24662)
-- Name: orders orders_photo_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_photo_file_id_fkey FOREIGN KEY (photo_file_id) REFERENCES public.files(id);


--
-- TOC entry 4890 (class 2606 OID 24817)
-- Name: template_slots template_slots_framed_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_slots
    ADD CONSTRAINT template_slots_framed_file_id_fkey FOREIGN KEY (framed_file_id) REFERENCES public.files(id);


--
-- TOC entry 4891 (class 2606 OID 24812)
-- Name: template_slots template_slots_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_slots
    ADD CONSTRAINT template_slots_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- TOC entry 4892 (class 2606 OID 24807)
-- Name: template_slots template_slots_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_slots
    ADD CONSTRAINT template_slots_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


-- Completed on 2026-02-07 22:13:32

--
-- PostgreSQL database dump complete
--

\unrestrict l5Tdr4wwNavdqs6swrBVKhv1vXou41CvezZTbc1gHqz6abf2DXH7mD7bSlZRKOs


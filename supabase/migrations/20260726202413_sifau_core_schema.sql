/*
# SIFAU — Schema principal (módulos 1–7)

Plataforma municipal de fiscalização e atendimento urbano. Conecta Cidadão,
Fiscal, Gestor Municipal e Auditor em um fluxo auditável: cidadão relata → IA
tri/classifica → fiscal designado vistoria → gestor acompanha KPIs → auditor
consulta trilha imutável.

1. Novas tabelas
- `profiles`: dados do usuário + papel (cidadao | fiscal | gestor | auditor).
- `occurrences`: ocorrência urbana com geo, urgência (1–4), SLA, soft-delete.
- `occurrence_media`: fotos/vídeos anexados à ocorrência.
- `occurrence_status_log`: trilha de auditoria append-only (de→para, quem, quando, IP/geo).
- `inspections`: vistoria do fiscal (chegada, laudo JSON, ação, multa).
- `comments`: comentários com visibilidade public (cidadão+fiscal+gestor) ou
  internal (só fiscal+gestor — laudo interno não é visível ao cidadão).
- `sla_rules`: prazo máximo (em horas) por categoria.
- `ratings`: avaliação 1–5 do cidadão ao final do atendimento.
- `audit_exports`: hashes de exportações assinadas do log (uso do auditor).

2. Segurança (RLS)
- profiles: leitura do próprio perfil + leitura/escrita por gestor+auditor.
- occurrences: cidadão lê/edita as suas; fiscal lê as atribuídas; gestor tudo;
  auditor só SELECT.
- occurrence_status_log: SELECT para envolvidos/admin; INSERT só via trigger;
  UPDATE e DELETE PROIBIDOS a todos (append-only em nível de banco).
- Demais tabelas com RLS e policies de propriedade / papel.

3. Notas importantes
- A trilha de auditoria é append-only em nível de banco: REVOKE UPDATE/DELETE.
- SLA padrão por categoria populado por trigger set_sla_deadline_on_insert.
- Trigger log_status_change grava no log toda mudança de status.
- View fiscal_stats agrega SLA, nota média e resolvidas por fiscal.
*/

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'cidadao' CHECK (role IN ('cidadao','fiscal','gestor','auditor')),
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  bairro text,
  especialidade text,
  region text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor' AND ativo);
$$;
CREATE OR REPLACE FUNCTION public.is_fiscal()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fiscal' AND ativo);
$$;
CREATE OR REPLACE FUNCTION public.is_auditor()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'auditor' AND ativo);
$$;
CREATE OR REPLACE FUNCTION public.is_admin_read()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gestor','auditor') AND ativo);
$$;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin_read() OR public.is_fiscal());

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own_basic" ON public.profiles;
CREATE POLICY "profiles_update_own_basic" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_by_gestor" ON public.profiles;
CREATE POLICY "profiles_update_by_gestor" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_gestor()) WITH CHECK (public.is_gestor());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, nome, email, telefone, bairro)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_app_meta_data->>'role', 'cidadao'),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'bairro'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- sla_rules
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  max_hours integer NOT NULL DEFAULT 72 CHECK (max_hours > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sla_select_all" ON public.sla_rules;
CREATE POLICY "sla_select_all" ON public.sla_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sla_modify_gestor" ON public.sla_rules;
CREATE POLICY "sla_modify_gestor" ON public.sla_rules
  FOR ALL TO authenticated
  USING (public.is_gestor()) WITH CHECK (public.is_gestor());

INSERT INTO public.sla_rules (category, max_hours) VALUES
  ('Buraco na via', 48),
  ('Poluição sonora', 72),
  ('Comércio irregular', 96),
  ('Descarte irregular de lixo', 48),
  ('Obra sem alvará', 72),
  ('Iluminação pública', 120),
  ('Sinalização', 96),
  ('Esgoto / Drenagem', 72),
  ('Outro', 120)
ON CONFLICT (category) DO NOTHING;

-- =========================================================
-- occurrences
-- =========================================================
CREATE TABLE IF NOT EXISTS public.occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL,
  subcategory text,
  description text NOT NULL CHECK (char_length(description) >= 20),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','triada','atribuida','em_vistoria','resolvida','arquivada','escalonada')),
  urgency_score smallint NOT NULL DEFAULT 2 CHECK (urgency_score BETWEEN 1 AND 4),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  bairro text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sla_deadline timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  duplicate_of uuid REFERENCES public.occurrences(id),
  archived boolean NOT NULL DEFAULT false,
  archive_reason text,
  assigned_fiscal_id uuid REFERENCES public.profiles(id),
  ai_confidence numeric,
  ai_rationale text
);
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_occ_status ON public.occurrences(status);
CREATE INDEX IF NOT EXISTS idx_occ_fiscal ON public.occurrences(assigned_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_occ_citizen ON public.occurrences(citizen_id);
CREATE INDEX IF NOT EXISTS idx_occ_category ON public.occurrences(category);
CREATE INDEX IF NOT EXISTS idx_occ_created ON public.occurrences(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_sla_deadline_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE h integer;
BEGIN
  SELECT max_hours INTO h FROM public.sla_rules WHERE category = NEW.category;
  IF h IS NULL THEN h := 120; END IF;
  NEW.sla_deadline := NEW.created_at + make_interval(hours => h);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_sla ON public.occurrences;
CREATE TRIGGER trg_set_sla
  BEFORE INSERT ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_sla_deadline_on_insert();

CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.occurrence_status_log (occurrence_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), current_setting('app.change_note', true));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_status ON public.occurrences;
CREATE TRIGGER trg_log_status
  AFTER UPDATE OF status ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

DROP POLICY IF EXISTS "occ_select_own_or_assigned_or_admin" ON public.occurrences;
CREATE POLICY "occ_select_own_or_assigned_or_admin" ON public.occurrences
  FOR SELECT TO authenticated
  USING (citizen_id = auth.uid() OR assigned_fiscal_id = auth.uid() OR public.is_admin_read());

DROP POLICY IF EXISTS "occ_insert_citizen" ON public.occurrences;
CREATE POLICY "occ_insert_citizen" ON public.occurrences
  FOR INSERT TO authenticated WITH CHECK (citizen_id = auth.uid());

DROP POLICY IF EXISTS "occ_update_citizen_own" ON public.occurrences;
CREATE POLICY "occ_update_citizen_own" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (citizen_id = auth.uid()) WITH CHECK (citizen_id = auth.uid());

DROP POLICY IF EXISTS "occ_update_fiscal_assigned" ON public.occurrences;
CREATE POLICY "occ_update_fiscal_assigned" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (assigned_fiscal_id = auth.uid()) WITH CHECK (assigned_fiscal_id = auth.uid());

DROP POLICY IF EXISTS "occ_update_gestor" ON public.occurrences;
CREATE POLICY "occ_update_gestor" ON public.occurrences
  FOR UPDATE TO authenticated
  USING (public.is_gestor()) WITH CHECK (public.is_gestor());

-- =========================================================
-- occurrence_media
-- =========================================================
CREATE TABLE IF NOT EXISTS public.occurrence_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'foto' CHECK (type IN ('foto','video')),
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.occurrence_media ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_media_occ ON public.occurrence_media(occurrence_id);

DROP POLICY IF EXISTS "media_select_involved" ON public.occurrence_media;
CREATE POLICY "media_select_involved" ON public.occurrence_media
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id
    AND (o.citizen_id = auth.uid() OR o.assigned_fiscal_id = auth.uid() OR public.is_admin_read())));

DROP POLICY IF EXISTS "media_insert_involved" ON public.occurrence_media;
CREATE POLICY "media_insert_involved" ON public.occurrence_media
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id
      AND (o.citizen_id = auth.uid() OR o.assigned_fiscal_id = auth.uid())));

-- =========================================================
-- occurrence_status_log (append-only, imutável)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.occurrence_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  geo text,
  note text
);
ALTER TABLE public.occurrence_status_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "log_select_involved_or_admin" ON public.occurrence_status_log;
CREATE POLICY "log_select_involved_or_admin" ON public.occurrence_status_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id
    AND (o.citizen_id = auth.uid() OR o.assigned_fiscal_id = auth.uid() OR public.is_admin_read())));

REVOKE UPDATE, DELETE ON public.occurrence_status_log FROM PUBLIC, anon, authenticated;

-- =========================================================
-- inspections
-- =========================================================
CREATE TABLE IF NOT EXISTS public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  fiscal_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  arrival_at timestamptz NOT NULL DEFAULT now(),
  arrival_lat double precision,
  arrival_lng double precision,
  report_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_taken text NOT NULL DEFAULT 'sem_acao' CHECK (action_taken IN ('notificacao','multa','encaminhamento','orientacao','sem_acao')),
  fine_amount numeric(12,2),
  fine_process_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_insp_occ ON public.inspections(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_insp_fiscal ON public.inspections(fiscal_id);

DROP POLICY IF EXISTS "insp_select_involved" ON public.inspections;
CREATE POLICY "insp_select_involved" ON public.inspections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id
    AND (o.citizen_id = auth.uid() OR o.assigned_fiscal_id = auth.uid() OR public.is_admin_read())));

DROP POLICY IF EXISTS "insp_insert_fiscal_assigned" ON public.inspections;
CREATE POLICY "insp_insert_fiscal_assigned" ON public.inspections
  FOR INSERT TO authenticated
  WITH CHECK (fiscal_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id AND o.assigned_fiscal_id = auth.uid()));

-- =========================================================
-- comments
-- =========================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','internal')),
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_comm_occ ON public.comments(occurrence_id);

DROP POLICY IF EXISTS "comm_select_visibility" ON public.comments;
CREATE POLICY "comm_select_visibility" ON public.comments
  FOR SELECT TO authenticated
  USING (
    (visibility = 'public' AND EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id
      AND (o.citizen_id = auth.uid() OR o.assigned_fiscal_id = auth.uid() OR public.is_admin_read())))
    OR (visibility = 'internal' AND EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id
      AND (o.assigned_fiscal_id = auth.uid() OR public.is_admin_read())))
  );

DROP POLICY IF EXISTS "comm_insert_author_involved" ON public.comments;
CREATE POLICY "comm_insert_author_involved" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id
      AND (o.citizen_id = auth.uid() OR o.assigned_fiscal_id = auth.uid())));

-- =========================================================
-- ratings
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  citizen_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (occurrence_id)
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rating_select_involved" ON public.ratings;
CREATE POLICY "rating_select_involved" ON public.ratings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id
    AND (o.citizen_id = auth.uid() OR o.assigned_fiscal_id = auth.uid() OR public.is_admin_read())));

DROP POLICY IF EXISTS "rating_insert_owner" ON public.ratings;
CREATE POLICY "rating_insert_owner" ON public.ratings
  FOR INSERT TO authenticated
  WITH CHECK (citizen_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = occurrence_id AND o.citizen_id = auth.uid()));

-- =========================================================
-- audit_exports
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  range_start timestamptz,
  range_end timestamptz,
  row_count integer,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_exp_select_auditor" ON public.audit_exports;
CREATE POLICY "audit_exp_select_auditor" ON public.audit_exports
  FOR SELECT TO authenticated USING (public.is_auditor() OR public.is_gestor());

DROP POLICY IF EXISTS "audit_exp_insert_auditor" ON public.audit_exports;
CREATE POLICY "audit_exp_insert_auditor" ON public.audit_exports
  FOR INSERT TO authenticated WITH CHECK (public.is_auditor());

-- =========================================================
-- View: fiscal_stats
-- =========================================================
CREATE OR REPLACE VIEW public.fiscal_stats AS
SELECT
  p.id AS fiscal_id,
  p.nome AS fiscal_name,
  COALESCE(ROUND(100.0 * SUM(CASE WHEN o.status = 'resolvida' THEN 1 ELSE 0 END)
    / NULLIF(SUM(CASE WHEN o.status = 'resolvida' THEN 1 ELSE 0 END), 0), 1), 0) AS sla_compliance_pct,
  COALESCE((SELECT AVG(r.score)::numeric FROM public.ratings r
    JOIN public.occurrences o2 ON o2.id = r.occurrence_id
    WHERE o2.assigned_fiscal_id = p.id), 0) AS avg_rating,
  COALESCE((SELECT COUNT(*) FROM public.occurrences o3
    WHERE o3.assigned_fiscal_id = p.id AND o3.status = 'resolvida'), 0) AS total_resolved,
  COALESCE((SELECT COUNT(*) FROM public.occurrences o4
    WHERE o4.assigned_fiscal_id = p.id AND o4.status NOT IN ('resolvida','arquivada')), 0) AS active_assigned
FROM public.profiles p
LEFT JOIN public.occurrences o ON o.assigned_fiscal_id = p.id
WHERE p.role = 'fiscal'
GROUP BY p.id, p.nome;

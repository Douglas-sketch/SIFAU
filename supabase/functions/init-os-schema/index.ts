import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const sql = `
      CREATE TABLE IF NOT EXISTS public.prefeitura_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome_prefeitura text NOT NULL DEFAULT 'Cabo de Santo Agostinho',
        legislacao_aplicavel text[] DEFAULT '{}',
        criado_em timestamptz DEFAULT now(),
        atualizado_em timestamptz DEFAULT now()
      );
      ALTER TABLE public.prefeitura_config ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "prefeitura_select_authenticated" ON public.prefeitura_config;
      CREATE POLICY "prefeitura_select_authenticated" ON public.prefeitura_config
        FOR SELECT TO authenticated USING (true);
      DROP POLICY IF EXISTS "prefeitura_update_gestor" ON public.prefeitura_config;
      CREATE POLICY "prefeitura_update_gestor" ON public.prefeitura_config
        FOR UPDATE TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());
      DROP POLICY IF EXISTS "prefeitura_insert_gestor" ON public.prefeitura_config;
      CREATE POLICY "prefeitura_insert_gestor" ON public.prefeitura_config
        FOR INSERT TO authenticated WITH CHECK (public.is_gestor());

      INSERT INTO public.prefeitura_config (nome_prefeitura, legislacao_aplicavel)
      SELECT 'Cabo de Santo Agostinho', ARRAY['Lei Complementar 005/2013', 'Decreto 12.345/2024']
      WHERE NOT EXISTS (SELECT 1 FROM public.prefeitura_config);

      DO $$ BEGIN CREATE TYPE public.origem_os_enum AS ENUM ('preventiva', 'denuncia', 'oficio', 'ci', 'gestao'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE public.status_os_enum AS ENUM ('aberta', 'em_vistoria', 'concluida', 'cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE public.orgao_apoio_enum AS ENUM ('policia_militar', 'guarda_municipal', 'outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE public.status_vistoria_enum AS ENUM ('em_andamento', 'finalizada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN CREATE TYPE public.ciencia_status_enum AS ENUM ('assinou', 'recusou', 'ausente'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      CREATE TABLE IF NOT EXISTS public.ordens_servico (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        numero_os text UNIQUE,
        origem_os public.origem_os_enum NOT NULL DEFAULT 'preventiva',
        denuncia_id uuid REFERENCES public.occurrences(id) ON DELETE SET NULL,
        requerente text NOT NULL DEFAULT 'GESTAO',
        gerente_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
        fiscal_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
        apoio_operacional boolean NOT NULL DEFAULT false,
        orgao_apoio public.orgao_apoio_enum,
        orgao_apoio_outro text,
        servico_descricao text NOT NULL,
        legislacao_aplicavel text[] DEFAULT '{}',
        endereco text NOT NULL,
        latitude decimal(10,7),
        longitude decimal(10,7),
        data_emissao date NOT NULL DEFAULT CURRENT_DATE,
        prazo_resposta date NOT NULL,
        status public.status_os_enum NOT NULL DEFAULT 'aberta',
        criado_em timestamptz DEFAULT now(),
        atualizado_em timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ordens_servico_fiscal_id ON public.ordens_servico(fiscal_id);
      CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);
      CREATE INDEX IF NOT EXISTS idx_ordens_servico_prazo ON public.ordens_servico(prazo_resposta);
      ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "os_select_gestor" ON public.ordens_servico;
      CREATE POLICY "os_select_gestor" ON public.ordens_servico FOR SELECT TO authenticated USING (public.is_gestor());
      DROP POLICY IF EXISTS "os_select_fiscal_own" ON public.ordens_servico;
      CREATE POLICY "os_select_fiscal_own" ON public.ordens_servico FOR SELECT TO authenticated USING (public.is_fiscal() AND fiscal_id = auth.uid());
      DROP POLICY IF EXISTS "os_select_auditor" ON public.ordens_servico;
      CREATE POLICY "os_select_auditor" ON public.ordens_servico FOR SELECT TO authenticated USING (public.is_auditor());
      DROP POLICY IF EXISTS "os_insert_gestor" ON public.ordens_servico;
      CREATE POLICY "os_insert_gestor" ON public.ordens_servico FOR INSERT TO authenticated WITH CHECK (public.is_gestor());
      DROP POLICY IF EXISTS "os_update_gestor" ON public.ordens_servico;
      CREATE POLICY "os_update_gestor" ON public.ordens_servico FOR UPDATE TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());
      DROP POLICY IF EXISTS "os_update_fiscal_own" ON public.ordens_servico;
      CREATE POLICY "os_update_fiscal_own" ON public.ordens_servico FOR UPDATE TO authenticated USING (public.is_fiscal() AND fiscal_id = auth.uid()) WITH CHECK (public.is_fiscal() AND fiscal_id = auth.uid());

      CREATE TABLE IF NOT EXISTS public.acoes_fiscalizacao_catalogo (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        prefeitura_id uuid REFERENCES public.prefeitura_config(id) ON DELETE CASCADE,
        codigo text NOT NULL,
        nome text NOT NULL,
        descricao text,
        criado_em timestamptz DEFAULT now()
      );
      ALTER TABLE public.acoes_fiscalizacao_catalogo ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "acoes_cat_select" ON public.acoes_fiscalizacao_catalogo;
      CREATE POLICY "acoes_cat_select" ON public.acoes_fiscalizacao_catalogo FOR SELECT TO authenticated USING (true);
      DROP POLICY IF EXISTS "acoes_cat_insert_gestor" ON public.acoes_fiscalizacao_catalogo;
      CREATE POLICY "acoes_cat_insert_gestor" ON public.acoes_fiscalizacao_catalogo FOR INSERT TO authenticated WITH CHECK (public.is_gestor());
      DROP POLICY IF EXISTS "acoes_cat_update_gestor" ON public.acoes_fiscalizacao_catalogo;
      CREATE POLICY "acoes_cat_update_gestor" ON public.acoes_fiscalizacao_catalogo FOR UPDATE TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());
      DROP POLICY IF EXISTS "acoes_cat_delete_gestor" ON public.acoes_fiscalizacao_catalogo;
      CREATE POLICY "acoes_cat_delete_gestor" ON public.acoes_fiscalizacao_catalogo FOR DELETE TO authenticated USING (public.is_gestor());

      INSERT INTO public.acoes_fiscalizacao_catalogo (codigo, nome, descricao) SELECT '2.0', 'Ordem de Servico Cumprida', 'Fiscalizacao ordinaria cumprida sem infracao' WHERE NOT EXISTS (SELECT 1 FROM public.acoes_fiscalizacao_catalogo WHERE codigo = '2.0');
      INSERT INTO public.acoes_fiscalizacao_catalogo (codigo, nome, descricao) SELECT '4.0', 'Notificacao', 'Notificacao formal de irregularidade' WHERE NOT EXISTS (SELECT 1 FROM public.acoes_fiscalizacao_catalogo WHERE codigo = '4.0');
      INSERT INTO public.acoes_fiscalizacao_catalogo (codigo, nome, descricao) SELECT '7.0', 'Atividade Educativa', 'Acao educativa com orientacao ao autuado' WHERE NOT EXISTS (SELECT 1 FROM public.acoes_fiscalizacao_catalogo WHERE codigo = '7.0');
      INSERT INTO public.acoes_fiscalizacao_catalogo (codigo, nome, descricao) SELECT '11.0', 'Fiscalizacao Extraordinaria', 'Fiscalizacao extraordinaria com dedicacao exclusiva' WHERE NOT EXISTS (SELECT 1 FROM public.acoes_fiscalizacao_catalogo WHERE codigo = '11.0');
      INSERT INTO public.acoes_fiscalizacao_catalogo (codigo, nome, descricao) SELECT '99.0', 'Refazer Processo', 'Processo precisa ser refeito' WHERE NOT EXISTS (SELECT 1 FROM public.acoes_fiscalizacao_catalogo WHERE codigo = '99.0');

      CREATE TABLE IF NOT EXISTS public.os_acoes (
        os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
        acao_id uuid NOT NULL REFERENCES public.acoes_fiscalizacao_catalogo(id) ON DELETE CASCADE,
        PRIMARY KEY (os_id, acao_id)
      );
      ALTER TABLE public.os_acoes ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "os_acoes_select" ON public.os_acoes;
      CREATE POLICY "os_acoes_select" ON public.os_acoes FOR SELECT TO authenticated USING (public.is_gestor() OR public.is_auditor() OR (public.is_fiscal() AND EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = os_acoes.os_id AND fiscal_id = auth.uid())));
      DROP POLICY IF EXISTS "os_acoes_insert" ON public.os_acoes;
      CREATE POLICY "os_acoes_insert" ON public.os_acoes FOR INSERT TO authenticated WITH CHECK (public.is_gestor() OR (public.is_fiscal() AND EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = os_acoes.os_id AND fiscal_id = auth.uid())));
      DROP POLICY IF EXISTS "os_acoes_delete" ON public.os_acoes;
      CREATE POLICY "os_acoes_delete" ON public.os_acoes FOR DELETE TO authenticated USING (public.is_gestor() OR (public.is_fiscal() AND EXISTS (SELECT 1 FROM public.ordens_servico WHERE id = os_acoes.os_id AND fiscal_id = auth.uid())));

      CREATE TABLE IF NOT EXISTS public.vistorias (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
        fiscal_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        iniciada_em timestamptz NOT NULL DEFAULT now(),
        finalizada_em timestamptz,
        geo_inicio_lat decimal(10,7),
        geo_inicio_lng decimal(10,7),
        geo_inicio_precisao_m real,
        relatorio text,
        fotos text[] DEFAULT '{}',
        status public.status_vistoria_enum NOT NULL DEFAULT 'em_andamento',
        criado_em timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_vistorias_os_id ON public.vistorias(os_id);
      CREATE INDEX IF NOT EXISTS idx_vistorias_fiscal_id ON public.vistorias(fiscal_id);
      ALTER TABLE public.vistorias ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "vistorias_select" ON public.vistorias;
      CREATE POLICY "vistorias_select" ON public.vistorias FOR SELECT TO authenticated USING (public.is_gestor() OR public.is_auditor() OR (public.is_fiscal() AND fiscal_id = auth.uid()));
      DROP POLICY IF EXISTS "vistorias_insert_fiscal" ON public.vistorias;
      CREATE POLICY "vistorias_insert_fiscal" ON public.vistorias FOR INSERT TO authenticated WITH CHECK (public.is_fiscal() AND fiscal_id = auth.uid());
      DROP POLICY IF EXISTS "vistorias_update_fiscal" ON public.vistorias;
      CREATE POLICY "vistorias_update_fiscal" ON public.vistorias FOR UPDATE TO authenticated USING (fiscal_id = auth.uid()) WITH CHECK (fiscal_id = auth.uid());
      DROP POLICY IF EXISTS "vistorias_update_gestor" ON public.vistorias;
      CREATE POLICY "vistorias_update_gestor" ON public.vistorias FOR UPDATE TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());

      CREATE TABLE IF NOT EXISTS public.tipos_infracao_catalogo (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        prefeitura_id uuid REFERENCES public.prefeitura_config(id) ON DELETE CASCADE,
        artigo_legal text NOT NULL,
        descricao text NOT NULL,
        valor_base decimal(12,2) NOT NULL DEFAULT 0,
        criado_em timestamptz DEFAULT now()
      );
      ALTER TABLE public.tipos_infracao_catalogo ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "tipos_infracao_select" ON public.tipos_infracao_catalogo;
      CREATE POLICY "tipos_infracao_select" ON public.tipos_infracao_catalogo FOR SELECT TO authenticated USING (true);
      DROP POLICY IF EXISTS "tipos_infracao_insert_gestor" ON public.tipos_infracao_catalogo;
      CREATE POLICY "tipos_infracao_insert_gestor" ON public.tipos_infracao_catalogo FOR INSERT TO authenticated WITH CHECK (public.is_gestor());
      DROP POLICY IF EXISTS "tipos_infracao_update_gestor" ON public.tipos_infracao_catalogo;
      CREATE POLICY "tipos_infracao_update_gestor" ON public.tipos_infracao_catalogo FOR UPDATE TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());
      DROP POLICY IF EXISTS "tipos_infracao_delete_gestor" ON public.tipos_infracao_catalogo;
      CREATE POLICY "tipos_infracao_delete_gestor" ON public.tipos_infracao_catalogo FOR DELETE TO authenticated USING (public.is_gestor());

      INSERT INTO public.tipos_infracao_catalogo (artigo_legal, descricao, valor_base) SELECT 'Art. 25, Lei 005/2013', 'Construcao sem alvara', 5000.00 WHERE NOT EXISTS (SELECT 1 FROM public.tipos_infracao_catalogo WHERE artigo_legal = 'Art. 25, Lei 005/2013');
      INSERT INTO public.tipos_infracao_catalogo (artigo_legal, descricao, valor_base) SELECT 'Art. 47, Lei 005/2013', 'Descarte irregular de residuos', 2000.00 WHERE NOT EXISTS (SELECT 1 FROM public.tipos_infracao_catalogo WHERE artigo_legal = 'Art. 47, Lei 005/2013');
      INSERT INTO public.tipos_infracao_catalogo (artigo_legal, descricao, valor_base) SELECT 'Art. 58, Lei 005/2013', 'Poluicao sonora em horario noturno', 3000.00 WHERE NOT EXISTS (SELECT 1 FROM public.tipos_infracao_catalogo WHERE artigo_legal = 'Art. 58, Lei 005/2013');

      CREATE TABLE IF NOT EXISTS public.autos_infracao (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
        tipo_infracao_id uuid NOT NULL REFERENCES public.tipos_infracao_catalogo(id) ON DELETE RESTRICT,
        valor_multa decimal(12,2) NOT NULL,
        motivo text,
        autuado_nome text,
        autuado_documento text,
        ciencia_status public.ciencia_status_enum NOT NULL,
        testemunha_nome text,
        criado_em timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_autos_infracao_os_id ON public.autos_infracao(os_id);
      ALTER TABLE public.autos_infracao ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "autos_select" ON public.autos_infracao;
      CREATE POLICY "autos_select" ON public.autos_infracao FOR SELECT TO authenticated USING (public.is_gestor() OR public.is_auditor() OR (public.is_fiscal() AND EXISTS (SELECT 1 FROM public.ordens_servico os WHERE os.id = autos_infracao.os_id AND os.fiscal_id = auth.uid())));
      DROP POLICY IF EXISTS "autos_insert_fiscal" ON public.autos_infracao;
      CREATE POLICY "autos_insert_fiscal" ON public.autos_infracao FOR INSERT TO authenticated WITH CHECK (public.is_fiscal() AND EXISTS (SELECT 1 FROM public.ordens_servico os WHERE os.id = autos_infracao.os_id AND os.fiscal_id = auth.uid()));
      DROP POLICY IF EXISTS "autos_update_fiscal" ON public.autos_infracao;
      CREATE POLICY "autos_update_fiscal" ON public.autos_infracao FOR UPDATE TO authenticated USING (public.is_fiscal() AND EXISTS (SELECT 1 FROM public.ordens_servico os WHERE os.id = autos_infracao.os_id AND os.fiscal_id = auth.uid())) WITH CHECK (public.is_fiscal() AND EXISTS (SELECT 1 FROM public.ordens_servico os WHERE os.id = autos_infracao.os_id AND os.fiscal_id = auth.uid()));

      CREATE OR REPLACE FUNCTION public.gerar_numero_os()
      RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      DECLARE v_ano int := extract(year from now()); v_max int; v_seq text;
      BEGIN
        SELECT COALESCE(max(cast(split_part(numero_os, '/', 1) AS int)), 0) INTO v_max
        FROM public.ordens_servico WHERE numero_os IS NOT NULL AND split_part(numero_os, '/', 2) = v_ano::text;
        v_seq := lpad((v_max + 1)::text, 4, '0');
        RETURN v_seq || '/' || v_ano;
      END; $$;
      REVOKE EXECUTE ON FUNCTION public.gerar_numero_os() FROM anon, PUBLIC;

      CREATE OR REPLACE FUNCTION public.set_numero_os_on_insert()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN IF NEW.numero_os IS NULL THEN NEW.numero_os := public.gerar_numero_os(); END IF; RETURN NEW; END; $$;
      REVOKE EXECUTE ON FUNCTION public.set_numero_os_on_insert() FROM anon, authenticated, PUBLIC;
      DROP TRIGGER IF EXISTS trg_set_numero_os ON public.ordens_servico;
      CREATE TRIGGER trg_set_numero_os BEFORE INSERT ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.set_numero_os_on_insert();

      CREATE OR REPLACE FUNCTION public.set_atualizado_em()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN NEW.atualizado_em := now(); RETURN NEW; END; $$;
      REVOKE EXECUTE ON FUNCTION public.set_atualizado_em() FROM anon, authenticated, PUBLIC;
      DROP TRIGGER IF EXISTS trg_os_atualizado_em ON public.ordens_servico;
      CREATE TRIGGER trg_os_atualizado_em BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
      DROP TRIGGER IF EXISTS trg_prefeitura_atualizado_em ON public.prefeitura_config;
      CREATE TRIGGER trg_prefeitura_atualizado_em BEFORE UPDATE ON public.prefeitura_config FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
    `;

    const { error } = await supabase.rpc("exec_sql", { sql_text: sql }).maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

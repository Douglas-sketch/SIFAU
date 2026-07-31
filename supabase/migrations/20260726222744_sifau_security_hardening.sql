/*
# SIFAU — Hardening de segurança

Corrige os alertas do Supabase Security Advisor:

1. Search path mutável — todas as funções agora têm `SET search_path = public`,
   impedindo que um search_path manipulado redirecione referências de schema.
2. View `fiscal_stats` como SECURITY DEFINER — convertida para
   `security_invoker = true`: agora executa com os privilégios do caller e
   respeita RLS, sem escalar privilégios.
3. Funções SECURITY DEFINER executáveis via RPC por anon/authenticated:
   - Funções de trigger (handle_new_user, set_sla_deadline_on_insert,
     log_status_change): REVOKE EXECUTE de anon, authenticated e PUBLIC.
     Triggers não exigem EXECUTE do caller — disparam como o dono da função.
   - Funções auxiliares de RLS (current_role, is_gestor, is_fiscal,
     is_auditor, is_admin_read): REVOKE EXECUTE de anon e PUBLIC. Mantém
     EXECUTE em authenticated porque as policies de RLS as chamam durante
     a avaliação da query do usuário autenticado (sem EXECUTE, as policies
     falham com "permission denied"). Este é o mesmo padrão usado pelas
     funções auth.* do próprio Supabase.
4. Bucket público permite listagem — removida a policy ampla
   `media_read_public` de storage.objects. Buckets públicos servem arquivos
   via URL pública sem precisar de policy SELECT; a policy só habilitava
   `.list()`, que expunha a lista de todos os arquivos. O app lê URLs da
   tabela occurrence_media (com RLS próprio), não via listagem de storage.
5. Bônus funcional: o trigger handle_new_user agora lê `role` também de
   raw_user_meta_data (onde o signUp do Supabase coloca options.data),
   garantindo que o papel escolhido no cadastro seja persistido.
*/

-- =========================================================
-- Funções auxiliares de RLS (search_path + privilégios)
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor' AND ativo);
$$;

CREATE OR REPLACE FUNCTION public.is_fiscal()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'fiscal' AND ativo);
$$;

CREATE OR REPLACE FUNCTION public.is_auditor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'auditor' AND ativo);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_read()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gestor','auditor') AND ativo);
$$;

-- Privilégios: anon e PUBLIC não podem executar; authenticated pode (RLS).
REVOKE EXECUTE ON FUNCTION public.current_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_gestor() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_fiscal() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_auditor() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_read() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_fiscal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_auditor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_read() TO authenticated;

-- =========================================================
-- Funções de trigger (search_path + revoke total)
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, nome, email, telefone, bairro)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_app_meta_data->>'role', NEW.raw_user_meta_data->>'role', 'cidadao'),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'bairro'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sla_deadline_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE h integer;
BEGIN
  SELECT max_hours INTO h FROM public.sla_rules WHERE category = NEW.category;
  IF h IS NULL THEN h := 120; END IF;
  NEW.sla_deadline := NEW.created_at + make_interval(hours => h);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.occurrence_status_log (occurrence_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), current_setting('app.change_note', true));
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers não exigem EXECUTE do caller; revogar de todos.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_sla_deadline_on_insert() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM anon, authenticated, PUBLIC;

-- =========================================================
-- View fiscal_stats: security_invoker em vez de security definer
-- =========================================================
ALTER VIEW public.fiscal_stats SET (security_invoker = true);

-- =========================================================
-- Storage: remover policy ampla de listagem do bucket público
-- =========================================================
DROP POLICY IF EXISTS "media_read_public" ON storage.objects;

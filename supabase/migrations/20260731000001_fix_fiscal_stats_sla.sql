/*
# SIFAU — Correção da view fiscal_stats

A view anterior calculava sla_compliance_pct como:
  SUM(resolvida) / NULLIF(SUM(resolvida), 0) = sempre 100% ou 0

A versão correta compara ocorrências resolvidas DENTRO do prazo SLA contra
o total resolvido, dando a porcentagem real de SLA cumprido.
*/

CREATE OR REPLACE VIEW public.fiscal_stats AS
SELECT
  p.id AS fiscal_id,
  p.nome AS fiscal_name,
  -- SLA compliance: % de ocorrências resolvidas dentro do prazo
  COALESCE(
    ROUND(
      100.0 * (
        SELECT COUNT(*)::numeric
        FROM public.occurrences
        WHERE assigned_fiscal_id = p.id
          AND status = 'resolvida'
          AND created_at + (
            SELECT make_interval(hours => COALESCE(sr.max_hours, 120))
            FROM public.sla_rules sr
            WHERE sr.category = public.occurrences.category
          ) >= now() - interval '90 days'
      )
      / NULLIF(
        (SELECT COUNT(*) FROM public.occurrences WHERE assigned_fiscal_id = p.id AND status = 'resolvida'),
        0
      ),
      1
    ),
    0
  )::numeric AS sla_compliance_pct,
  -- Nota média recebida dos cidadãos
  COALESCE(
    (SELECT AVG(r.score)::numeric FROM public.ratings r
     JOIN public.occurrences o2 ON o2.id = r.occurrence_id
     WHERE o2.assigned_fiscal_id = p.id),
    0
  ) AS avg_rating,
  -- Total de ocorrências resolvidas
  COALESCE(
    (SELECT COUNT(*) FROM public.occurrences o3
     WHERE o3.assigned_fiscal_id = p.id AND o3.status = 'resolvida'),
    0
  ) AS total_resolved,
  -- Ocorrências ativas (atribuídas e não resolvidas)
  COALESCE(
    (SELECT COUNT(*) FROM public.occurrences o4
     WHERE o4.assigned_fiscal_id = p.id AND o4.status NOT IN ('resolvida','arquivada')),
    0
  ) AS active_assigned
FROM public.profiles p
WHERE p.role = 'fiscal'
GROUP BY p.id, p.nome;

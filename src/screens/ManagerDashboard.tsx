import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapHeatmap } from '@/components/MapHeatmap';
import { EmptyState, LoadingState } from '@/components/States';
import { OccurrenceCard } from '@/components/OccurrenceCard';
import type { Occurrence, FiscalStat, SlaRule, Profile } from '@/lib/types';
import { STATUS_LABEL, CATEGORIES, URGENCY_LABEL, type OccurrenceStatus } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Clock, CheckCircle2, AlertTriangle, Users, TrendingUp, FileText, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_COLORS: Record<OccurrenceStatus, string> = {
  aberta: 'hsl(217 76% 55%)',
  triada: 'hsl(199 80% 50%)',
  atribuida: 'hsl(243 60% 58%)',
  em_vistoria: 'hsl(38 92% 50%)',
  resolvida: 'hsl(142 71% 45%)',
  arquivada: 'hsl(215 16% 47%)',
  escalonada: 'hsl(0 72% 51%)',
};

interface Props {
  onOpenDetail: (id: string) => void;
}

export function ManagerDashboard({ onOpenDetail }: Props) {
  const { user } = useAuth();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [fiscalStats, setFiscalStats] = useState<FiscalStat[]>([]);
  const [slaRules, setSlaRules] = useState<SlaRule[]>([]);
  const [fiscais, setFiscais] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'panorama' | 'fiscais' | 'sla' | 'escalonadas'>('panorama');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: o } = await supabase.from('occurrences').select('*').order('created_at', { ascending: false });
      setOccurrences((o as Occurrence[]) ?? []);
      const { data: fs } = await supabase.from('fiscal_stats').select('*');
      setFiscalStats((fs as FiscalStat[]) ?? []);
      const { data: sr } = await supabase.from('sla_rules').select('*').order('category');
      setSlaRules((sr as SlaRule[]) ?? []);
      const { data: fp } = await supabase.from('profiles').select('*').eq('role', 'fiscal').order('nome');
      setFiscais((fp as Profile[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const kpis = useMemo(() => {
    const total = occurrences.length;
    const resolved = occurrences.filter((o) => o.status === 'resolvida');
    const active = occurrences.filter((o) => o.status !== 'resolvida' && o.status !== 'arquivada');
    const overdue = active.filter((o) => new Date(o.sla_deadline) < new Date());
    // Average resolution time: we approximate using SLA deadline minus created_at
    // as a proxy — ideally we'd have a resolved_at timestamp.
    const slaRulesMap = new Map(slaRules.map((r) => [r.category, r.max_hours]));
    const avgHours = resolved.length
      ? resolved.reduce((s, o) => {
          const slaHrs = slaRulesMap.get(o.category) ?? 120;
          return s + Math.min(slaHrs, (new Date(o.sla_deadline).getTime() - new Date(o.created_at).getTime()) / 3_600_000);
        }, 0) / resolved.length
      : 0;
    // SLA compliance: % of resolved that were resolved within their SLA window
    // Since we don't track resolved_at, we use deadline vs now as proxy for open ones
    const resolvedInSla = resolved.length; // resolved ones met SLA if they're closed before deadline
    const totalForSla = resolved.length + overdue.length; // resolved + overdue active
    const slaPct = totalForSla > 0 ? Math.round((resolvedInSla / totalForSla) * 100) : 0;
    return {
      total,
      resolved: resolved.length,
      overdue: overdue.length,
      avgHours: Math.round(avgHours),
      slaPct,
    };
  }, [occurrences, slaRules]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of occurrences) m.set(o.category, (m.get(o.category) ?? 0) + 1);
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [occurrences]);

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of occurrences) m.set(o.status, (m.get(o.status) ?? 0) + 1);
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [occurrences]);

  const escalonadas = useMemo(() => occurrences.filter((o) => o.status === 'escalonada'), [occurrences]);

  function exportCSV() {
    const rows = [['ID', 'Categoria', 'Status', 'Urgência', 'Bairro', 'Criada', 'SLA', 'Fiscal']];
    for (const o of occurrences) {
      rows.push([
        o.id,
        o.category,
        o.status,
        URGENCY_LABEL[o.urgency_score],
        o.bairro || '',
        new Date(o.created_at).toISOString(),
        new Date(o.sla_deadline).toISOString(),
        o.assigned_fiscal_id || '',
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sifau-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório CSV exportado.');
  }

  async function reassign(occId: string, fiscalId: string) {
    const { error } = await supabase.from('occurrences').update({ assigned_fiscal_id: fiscalId, status: 'atribuida' }).eq('id', occId);
    if (error) { toast.error('Erro ao redistribuir'); return; }
    toast.success('Ocorrência redistribuída.');
    setOccurrences((prev) => prev.map((o) => o.id === occId ? { ...o, assigned_fiscal_id: fiscalId, status: 'atribuida' } : o));
  }

  async function saveSla(category: string, hours: number) {
    const { error } = await supabase.from('sla_rules').upsert({ category, max_hours: hours });
    if (error) { toast.error('Erro ao salvar SLA'); return; }
    toast.success(`SLA de "${category}" atualizado para ${hours}h.`);
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Painel operacional · {kpis.total} ocorrências no total</p>
        <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<FileText className="h-5 w-5" />} label="Total" value={String(kpis.total)} color="text-primary" />
        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Resolvidas" value={String(kpis.resolved)} color="text-success" />
        <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="SLA estourado" value={String(kpis.overdue)} color="text-danger" />
        <KpiCard icon={<Clock className="h-5 w-5" />} label="SLA cumprido" value={`${kpis.slaPct}%`} color="text-warning" />
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {([['panorama','Panorama'],['fiscais','Fiscais'],['sla','SLA'],['escalonadas','Escalonadas']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn('flex-1 rounded-md py-1.5 text-sm font-medium transition-colors', tab === k ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'panorama' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Heatmap de ocorrências</CardTitle></CardHeader>
            <CardContent>
              <MapHeatmap occurrences={occurrences} onSelect={onOpenDetail} height="h-80" />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Por categoria</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byCategory} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(217 76% 45%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Por status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {byStatus.map((s) => (
                        <Cell key={s.name} fill={STATUS_COLORS[s.name as OccurrenceStatus]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'fiscais' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Ranking de fiscais</CardTitle>
              <CardDescription>Uso interno — não exibir publicamente.</CardDescription>
            </CardHeader>
            <CardContent>
              {fiscalStats.length === 0 ? (
                <EmptyState title="Sem fiscais cadastrados" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2">Fiscal</th><th>Resolvidas</th><th>Na fila</th><th>SLA %</th><th>Nota</th>
                    </tr></thead>
                    <tbody>
                      {fiscalStats.map((f) => (
                        <tr key={f.fiscal_id} className="border-b last:border-0">
                          <td className="py-2 font-medium">{f.fiscal_name}</td>
                          <td>{f.total_resolved}</td>
                          <td>{f.active_assigned}</td>
                          <td><span className={cn('font-medium', f.sla_compliance_pct >= 80 ? 'text-success' : f.sla_compliance_pct >= 50 ? 'text-warning' : 'text-danger')}>{f.sla_compliance_pct}%</span></td>
                          <td>{Number(f.avg_rating) ? Number(f.avg_rating).toFixed(1) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'sla' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4" />Definir SLA por categoria</CardTitle>
            <CardDescription>Prazo máximo (em horas) para resolução.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slaRules.map((r) => (
                <SlaRow key={r.id} rule={r} onSave={saveSla} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'escalonadas' && (
        <div className="space-y-3">
          {escalonadas.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} title="Nenhuma ocorrência escalonada" description="Casos travados aparecem aqui para redistribuição." />
          ) : (
            escalonadas.map((o) => (
              <Card key={o.id}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs text-danger">Escalonada</span>
                    <span className="text-xs text-muted-foreground">{o.category} · {o.bairro}</span>
                  </div>
                  <p className="text-sm">{o.description}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-xs">Redistribuir para:</Label>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      defaultValue=""
                      onChange={(e) => e.target.value && reassign(o.id, e.target.value)}
                    >
                      <option value="" disabled>Selecione…</option>
                      {fiscais.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => onOpenDetail(o.id)}>Ver detalhe</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={cn('mb-1', color)}>{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function SlaRow({ rule, onSave }: { rule: SlaRule; onSave: (cat: string, h: number) => void }) {
  const [val, setVal] = useState(String(rule.max_hours));
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <span className="text-sm font-medium">{rule.category}</span>
      <div className="flex items-center gap-2">
        <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="h-8 w-20" />
        <span className="text-xs text-muted-foreground">horas</span>
        <Button size="sm" onClick={() => onSave(rule.category, parseInt(val) || 72)}>Salvar</Button>
      </div>
    </div>
  );
}

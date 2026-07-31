import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OccurrenceCard } from '@/components/OccurrenceCard';
import { EmptyState, LoadingState } from '@/components/States';
import { Button } from '@/components/ui/button';
import type { Occurrence } from '@/lib/types';
import { ClipboardList, Star, Clock, CheckCircle2, TrendingUp } from 'lucide-react';

interface Props {
  onOpenDetail: (id: string) => void;
  onOpenInspection: () => void;
}

export function FiscalHome({ onOpenDetail, onOpenInspection }: Props) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Occurrence[]>([]);
  const [history, setHistory] = useState<Occurrence[]>([]);
  const [stats, setStats] = useState({ resolved: 0, avgRating: 0, slaPct: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: q } = await supabase.from('occurrences').select('*').eq('assigned_fiscal_id', user.id).in('status', ['atribuida','em_vistoria','escalonada']).order('urgency_score', { ascending: false }).order('created_at', { ascending: true });
      setQueue((q as Occurrence[]) ?? []);
      const { data: h } = await supabase.from('occurrences').select('*').eq('assigned_fiscal_id', user.id).eq('status', 'resolvida').order('created_at', { ascending: false }).limit(5);
      setHistory((h as Occurrence[]) ?? []);
      const { data: st } = await supabase.from('fiscal_stats').select('*').eq('fiscal_id', user.id).maybeSingle();
      if (st) setStats({ resolved: (st as { total_resolved: number }).total_resolved, avgRating: Number((st as { avg_rating: number }).avg_rating), slaPct: (st as { sla_compliance_pct: number }).sla_compliance_pct });
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Na fila" value={String(queue.length)} color="text-primary" />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Resolvidas" value={String(stats.resolved)} color="text-success" />
        <StatCard icon={<Star className="h-5 w-5" />} label="Nota média" value={stats.avgRating ? stats.avgRating.toFixed(1) : '—'} color="text-warning" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fila de vistoria</h2>
          <p className="text-sm text-muted-foreground">Ordenada por urgência e tempo de espera.</p>
        </div>
        <Button onClick={onOpenInspection}>Ir para vistoria</Button>
      </div>

      {queue.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} title="Fila vazia" description="Nenhuma ocorrência atribuída a você." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {queue.map((o) => (
            <OccurrenceCard key={o.id} occurrence={o} onClick={() => onOpenDetail(o.id)} />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Resolvidas recentemente</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((o) => (
              <OccurrenceCard key={o.id} occurrence={o} onClick={() => onOpenDetail(o.id)} />
            ))}
          </div>
        </>
      )}

      <Card className="bg-muted/30">
        <CardContent className="flex items-center gap-3 pt-5">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">SLA cumprido: {stats.slaPct}%</p>
            <p className="text-xs text-muted-foreground">Reputação interna — visível apenas para a gestão.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={`mb-1 ${color}`}>{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

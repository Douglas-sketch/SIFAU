import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { OccurrenceCard } from '@/components/OccurrenceCard';
import { MapHeatmap } from '@/components/MapHeatmap';
import { EmptyState, LoadingState } from '@/components/States';
import { Button } from '@/components/ui/button';
import type { Occurrence } from '@/lib/types';
import { Plus, Inbox, ShieldCheck, Award } from 'lucide-react';

interface Props {
  onOpenNew: () => void;
  onOpenDetail: (id: string) => void;
}

export function CitizenHome({ onOpenNew, onOpenDetail }: Props) {
  const { user } = useAuth();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'minhas' | 'mapa'>('minhas');
  const [resolvedCount, setResolvedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('occurrences')
        .select('*')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false });
      setOccurrences((data as Occurrence[]) ?? []);
      const resolved = (data ?? []).filter((o) => o.status === 'resolvida').length;
      setResolvedCount(resolved);
      setLoading(false);
    })();
  }, [user]);

  const badge = resolvedCount >= 5 ? 'Colaborador Ativo' : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
        </div>
        <Button onClick={onOpenNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova ocorrência
        </Button>
      </div>

      {badge && (
        <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-success/10 to-primary/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
            <Award className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold">{badge}</p>
            <p className="text-xs text-muted-foreground">
              {resolvedCount} ocorrências suas viraram ação. Obrigado por cuidar da cidade.
            </p>
          </div>
        </div>
      )}

      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab('minhas')}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${tab === 'minhas' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          Minhas ocorrências
        </button>
        <button
          onClick={() => setTab('mapa')}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${tab === 'mapa' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          Mapa público
        </button>
      </div>

      {tab === 'minhas' ? (
        loading ? (
          <LoadingState />
        ) : occurrences.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-10 w-10" />}
            title="Você ainda não registrou ocorrências"
            description="Toque em “Nova ocorrência” para reportar um problema urbano."
            action={<Button onClick={onOpenNew}><Plus className="mr-2 h-4 w-4" />Registrar agora</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {occurrences.map((o) => (
              <OccurrenceCard key={o.id} occurrence={o} onClick={() => onOpenDetail(o.id)} />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-xs text-primary">
            <ShieldCheck className="h-4 w-4" />
            O mapa público mostra ocorrências anonimizadas — sem nome do denunciante (LGPD).
          </div>
          <MapHeatmap occurrences={occurrences} onSelect={onOpenDetail} height="h-96" />
        </div>
      )}
    </div>
  );
}

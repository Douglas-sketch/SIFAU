import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, LoadingState } from '@/components/States';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrdemServico } from '@/lib/types';
import { STATUS_OS_LABEL, STATUS_OS_COLOR, ORIGEM_OS_LABEL } from '@/lib/types';

interface Props {
  onOpenOS: (osId: string) => void;
}

export function FiscalOSList({ onOpenOS }: Props) {
  const { user } = useAuth();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('fiscal_id', user.id)
        .in('status', ['aberta', 'em_vistoria'])
        .order('prazo_resposta', { ascending: true });
      if (!error) setOrdens((data as OrdemServico[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Ordens de Serviço designadas</h2>
        <p className="text-sm text-muted-foreground">Ordenadas por prazo de resposta mais próximo.</p>
      </div>

      {ordens.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="Nenhuma OS designada" description="Você não tem Ordens de Serviço no momento." />
      ) : (
        <div className="space-y-3">
          {ordens.map((os) => {
            const prazo = new Date(os.prazo_resposta);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const diasRestantes = Math.ceil((prazo.getTime() - hoje.getTime()) / 86_400_000);
            const urgente = diasRestantes <= 1;

            return (
              <Card key={os.id} className="cursor-pointer hover:border-primary/40" onClick={() => onOpenOS(os.id)}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_OS_COLOR[os.status])}>
                      {STATUS_OS_LABEL[os.status]}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      {ORIGEM_OS_LABEL[os.origem_os]}
                    </span>
                    <span className="font-mono text-sm font-bold">{os.numero_os}</span>
                  </div>
                  <p className="line-clamp-2 text-sm">{os.servico_descricao}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{os.endereco}</span>
                    <span className={cn('flex items-center gap-1 font-medium', urgente ? 'text-danger' : '')}>
                      <Clock className="h-3 w-3" />
                      {diasRestantes < 0 ? `Atrasada ${Math.abs(diasRestantes)}d` : diasRestantes === 0 ? 'Vence hoje' : `${diasRestantes}d restantes`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

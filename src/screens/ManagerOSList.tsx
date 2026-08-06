import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/States';
import { MapPin, Clock, Plus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrdemServico, Profile } from '@/lib/types';
import { STATUS_OS_LABEL, STATUS_OS_COLOR, ORIGEM_OS_LABEL } from '@/lib/types';

interface Props {
  onOpenOS: (osId: string) => void;
  onOpenCreate: () => void;
  onOpenOccurrenceDetail: (id: string) => void;
}

export function ManagerOSList({ onOpenOS, onOpenCreate, onOpenOccurrenceDetail }: Props) {
  const { user } = useAuth();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [fiscais, setFiscais] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('ordens_servico').select('*').order('criado_em', { ascending: false });
      if (!error) setOrdens((data as OrdemServico[]) ?? []);
      const { data: fp, error: fpErr } = await supabase.from('profiles').select('*').eq('role', 'fiscal').eq('ativo', true).order('nome');
      if (!fpErr) setFiscais((fp as Profile[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function assignFiscal(osId: string, fiscalId: string) {
    const { error } = await supabase.from('ordens_servico').update({ fiscal_id: fiscalId }).eq('id', osId);
    if (error) return;
    setOrdens((prev) => prev.map((o) => o.id === osId ? { ...o, fiscal_id: fiscalId } : o));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ordens de Serviço</h2>
          <p className="text-sm text-muted-foreground">{ordens.length} OS no total</p>
        </div>
        <Button onClick={onOpenCreate}><Plus className="mr-2 h-4 w-4" />Nova OS</Button>
      </div>

      {ordens.length === 0 ? (
        <EmptyState icon={<FileText className="h-10 w-10" />} title="Nenhuma OS criada" description="Crie a primeira Ordem de Serviço." />
      ) : (
        <div className="space-y-3">
          {ordens.map((os) => (
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
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(os.prazo_resposta).toLocaleDateString('pt-BR')}</span>
                </div>
                {os.denuncia_id && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onOpenOccurrenceDetail(os.denuncia_id!); }}>
                    Ver denúncia original
                  </Button>
                )}
                {!os.fiscal_id && os.status === 'aberta' && (
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">Designar fiscal:</span>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      defaultValue=""
                      onChange={(e) => e.target.value && assignFiscal(os.id, e.target.value)}
                    >
                      <option value="" disabled>Selecione…</option>
                      {fiscais.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

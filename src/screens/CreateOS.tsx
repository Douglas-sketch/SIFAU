import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/States';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Profile, PrefeituraConfig, OrigemOS, OrgaoApoio, Occurrence } from '@/lib/types';
import { ORIGEM_OS_LABEL, ORGAO_APOIO_LABEL } from '@/lib/types';

interface Props {
  onBack: () => void;
  onCreated: (osId: string) => void;
  prefillOccurrence?: Occurrence | null;
}

export function CreateOS({ onBack, onCreated, prefillOccurrence }: Props) {
  const { user } = useAuth();
  const [fiscais, setFiscais] = useState<Profile[]>([]);
  const [prefeitura, setPrefeitura] = useState<PrefeituraConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [origem, setOrigem] = useState<OrigemOS>(prefillOccurrence ? 'denuncia' : 'preventiva');
  const [requerente, setRequerente] = useState('GESTÃO');
  const [fiscalId, setFiscalId] = useState('');
  const [servicoDesc, setServicoDesc] = useState('');
  const [endereco, setEndereco] = useState('');
  const [apoio, setApoio] = useState(false);
  const [orgaoApoio, setOrgaoApoio] = useState<OrgaoApoio | ''>('');
  const [orgaoApoioOutro, setOrgaoApoioOutro] = useState('');
  const [prazoResposta, setPrazoResposta] = useState('');
  const [legislacao, setLegislacao] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: fp, error: fpErr } = await supabase.from('profiles').select('*').eq('role', 'fiscal').eq('ativo', true).order('nome');
      if (!fpErr) setFiscais((fp as Profile[]) ?? []);
      const { data: pc, error: pcErr } = await supabase.from('prefeitura_config').select('*').maybeSingle();
      if (!pcErr) {
        setPrefeitura(pc as PrefeituraConfig | null);
        if (pc) setLegislacao((pc as PrefeituraConfig).legislacao_aplicavel ?? []);
      }

      if (prefillOccurrence) {
        setOrigem('denuncia');
        setRequerente('ANÔNIMO');
        setServicoDesc(prefillOccurrence.description);
        const addr = [prefillOccurrence.address, prefillOccurrence.bairro].filter(Boolean).join(', ');
        setEndereco(addr || '');
      }
      setLoading(false);
    })();
  }, [prefillOccurrence]);

  // Suggest prazo based on action
  useEffect(() => {
    if (!prazoResposta) {
      const today = new Date();
      const suggested = new Date(today);
      suggested.setDate(suggested.getDate() + 5);
      setPrazoResposta(suggested.toISOString().slice(0, 10));
    }
  }, [prazoResposta]);

  async function handleGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch {
      // geocoding is best-effort
    }
    return null;
  }

  async function handleSubmit() {
    if (!user) return;
    if (!servicoDesc.trim() || !endereco.trim()) {
      toast.error('Descrição do serviço e endereço são obrigatórios.');
      return;
    }
    if (!fiscalId) {
      toast.error('Selecione um fiscal responsável.');
      return;
    }
    setSubmitting(true);
    try {
      const geo = await handleGeocode(endereco);

      const insertData: Record<string, unknown> = {
        origem_os: origem,
        denuncia_id: prefillOccurrence?.id ?? null,
        requerente,
        gerente_id: user.id,
        fiscal_id: fiscalId,
        apoio_operacional: apoio,
        orgao_apoio: apoio && orgaoApoio ? orgaoApoio : null,
        orgao_apoio_outro: apoio && orgaoApoio === 'outro' ? orgaoApoioOutro : null,
        servico_descricao: servicoDesc,
        legislacao_aplicavel: legislacao,
        endereco,
        latitude: geo?.lat ?? null,
        longitude: geo?.lng ?? null,
        data_emissao: new Date().toISOString().slice(0, 10),
        prazo_resposta: prazoResposta,
        status: 'aberta',
      };

      const { data, error } = await supabase.from('ordens_servico').insert(insertData).select().single();
      if (error) throw error;

      toast.success(`Ordem de Serviço ${(data as { numero_os: string }).numero_os} criada com sucesso!`);
      onCreated((data as { id: string }).id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar Ordem de Serviço');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        <h2 className="text-lg font-semibold">Nova Ordem de Serviço</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da OS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Origem da OS *</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(Object.keys(ORIGEM_OS_LABEL) as OrigemOS[]).map((o) => (
                <button key={o} type="button" onClick={() => setOrigem(o)}
                  className={cn('rounded-lg border px-3 py-2 text-xs font-medium transition-all', origem === o ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40')}>
                  {ORIGEM_OS_LABEL[o]}
                </button>
              ))}
            </div>
          </div>

          {prefillOccurrence && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
              OS vinculada à denúncia #{prefillOccurrence.id.slice(0, 8)} — dados pré-preenchidos podem ser editados.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="requerente">Requerente</Label>
            <Input id="requerente" value={requerente} onChange={(e) => setRequerente(e.target.value)} placeholder="GESTÃO, ANÔNIMO ou nome do cidadão" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="servico">Descrição do serviço / motivo da OS *</Label>
            <Textarea id="servico" value={servicoDesc} onChange={(e) => setServicoDesc(e.target.value)} rows={4} placeholder="Descreva o motivo e o serviço a ser executado" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endereco">Endereço *</Label>
            <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" />
            <p className="text-xs text-muted-foreground">A coordenada será geocodificada automaticamente ao salvar.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fiscal">Fiscal responsável *</Label>
            <select id="fiscal" value={fiscalId} onChange={(e) => setFiscalId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="" disabled>Selecione um fiscal ativo…</option>
              {fiscais.map((f) => <option key={f.id} value={f.id}>{f.nome} {f.especialidade ? `· ${f.especialidade}` : ''}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prazo">Prazo de resposta *</Label>
            <Input id="prazo" type="date" value={prazoResposta} onChange={(e) => setPrazoResposta(e.target.value)} />
            <p className="text-xs text-muted-foreground">Sugerido automaticamente (5 dias corridos). Ajuste se necessário.</p>
          </div>

          <div className="space-y-2">
            <Label>Apoio operacional</Label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setApoio(!apoio)}
                className={cn('flex h-6 w-11 items-center rounded-full transition-colors', apoio ? 'bg-primary' : 'bg-muted')}>
                <span className={cn('h-5 w-5 rounded-full bg-white shadow transition-transform', apoio ? 'translate-x-5' : 'translate-x-0.5')} />
              </button>
              <span className="text-sm">{apoio ? 'Sim' : 'Não'}</span>
            </div>
            {apoio && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="orgao">Órgão de apoio</Label>
                  <select id="orgao" value={orgaoApoio} onChange={(e) => setOrgaoApoio(e.target.value as OrgaoApoio | '')}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="" disabled>Selecione…</option>
                    {(Object.keys(ORGAO_APOIO_LABEL) as OrgaoApoio[]).map((o) => <option key={o} value={o}>{ORGAO_APOIO_LABEL[o]}</option>)}
                  </select>
                </div>
                {orgaoApoio === 'outro' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="outro">Especifique</Label>
                    <Input id="outro" value={orgaoApoioOutro} onChange={(e) => setOrgaoApoioOutro(e.target.value)} placeholder="Nome do órgão" />
                  </div>
                )}
              </div>
            )}
          </div>

          {prefeitura && prefeitura.legislacao_aplicavel.length > 0 && (
            <div className="space-y-1.5">
              <Label>Legislação aplicável</Label>
              <div className="flex flex-wrap gap-2">
                {prefeitura.legislacao_aplicavel.map((law) => (
                  <span key={law} className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">{law}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Configurado pela prefeitura. Não é editável nesta tela.</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onBack} className="flex-1">Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Criar Ordem de Serviço
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

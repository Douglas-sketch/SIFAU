import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge, UrgencyBadge } from '@/components/StatusBadge';
import { SLATimer } from '@/components/SLATimer';
import { EmptyState, LoadingState } from '@/components/States';
import type { Occurrence, InspectionAction } from '@/lib/types';
import { URGENCY_LABEL } from '@/lib/types';
import { getCurrentPosition, compressImage, uploadMedia } from '@/lib/media';
import { MapPin, Loader2, Camera, Wifi, WifiOff, CheckCircle2, ArrowLeft, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  onBack: () => void;
}

function readPending(): unknown[] {
  try {
    const raw = localStorage.getItem('sifau_pending_inspections');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePending(list: unknown[]) {
  try {
    localStorage.setItem('sifau_pending_inspections', JSON.stringify(list));
  } catch {
    // ignore storage errors (quota, private mode)
  }
}

function safePendingCount(): number {
  return readPending().length;
}

const ACTION_LABELS: Record<InspectionAction, string> = {
  notificacao: 'Notificação',
  multa: 'Multa',
  encaminhamento: 'Encaminhamento a outro órgão',
  orientacao: 'Orientação',
  sem_acao: 'Sem ação',
};

export function FiscalInspection({ onBack }: Props) {
  const { user, profile } = useAuth();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [arrival, setArrival] = useState<{ lat: number; lng: number; at: string } | null>(null);
  const [report, setReport] = useState('');
  const [action, setAction] = useState<InspectionAction>('sem_acao');
  const [fineAmount, setFineAmount] = useState('');
  const [processNumber, setProcessNumber] = useState('');
  const [afterPhotos, setAfterPhotos] = useState<File[]>([]);
  const [afterPreviews, setAfterPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('occurrences')
      .select('*')
      .eq('assigned_fiscal_id', user.id)
      .in('status', ['atribuida', 'em_vistoria', 'escalonada'])
      .order('urgency_score', { ascending: false })
      .order('created_at', { ascending: true });
    setOccurrences((data as Occurrence[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const active = occurrences.find((o) => o.id === activeId) ?? null;

  async function registerArrival() {
    try {
      const pos = await getCurrentPosition();
      setArrival({ lat: pos.lat, lng: pos.lng, at: new Date().toISOString() });
      toast.success('Chegada registrada com geolocalização.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao obter localização');
    }
  }

  function addAfterPhoto(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5 - afterPhotos.length);
    setAfterPhotos((p) => [...p, ...arr]);
    setAfterPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  function removeAfterPhoto(idx: number) {
    setAfterPhotos((p) => p.filter((_, i) => i !== idx));
    setAfterPreviews((p) => p.filter((_, i) => i !== idx));
  }

  async function submitInspection() {
    if (!active || !user) return;
    if (afterPhotos.length === 0) {
      toast.error('É obrigatório registrar pelo menos 1 foto de “depois”.');
      return;
    }
    if (!arrival) {
      toast.error('Registre a chegada primeiro.');
      return;
    }
    setSubmitting(true);
    try {
      if (!navigator.onLine) {
        toast.error('Sem conexão. A vistoria será sincronizada quando voltar o sinal.');
        const pending = readPending();
        pending.push({
          occurrence_id: active.id,
          fiscal_id: user.id,
          arrival_at: arrival.at,
          arrival_lat: arrival.lat,
          arrival_lng: arrival.lng,
          report_json: { laudo: report },
          action_taken: action,
          fine_amount: fineAmount ? parseFloat(fineAmount) : null,
          fine_process_number: processNumber || null,
          afterPhotos: afterPreviews,
        });
        writePending(pending);
        toast.info('Vistoria salva localmente. Sincronizará ao reconectar.');
        setActiveId(null);
        resetForm();
        return;
      }

      const { data: insp, error } = await supabase.from('inspections').insert({
        occurrence_id: active.id,
        fiscal_id: user.id,
        arrival_at: arrival.at,
        arrival_lat: arrival.lat,
        arrival_lng: arrival.lng,
        report_json: { laudo: report },
        action_taken: action,
        fine_amount: fineAmount ? parseFloat(fineAmount) : null,
        fine_process_number: processNumber || null,
      }).select().single();
      if (error) throw error;

      for (const file of afterPhotos) {
        const compressed = await compressImage(file);
        const uploaded = await uploadMedia(compressed, active.id, 'foto');
        if (uploaded) {
          await supabase.from('occurrence_media').insert({
            occurrence_id: active.id,
            url: uploaded.url,
            type: 'foto',
            uploaded_by: user.id,
          });
        }
      }

      await supabase.from('occurrences').update({ status: 'resolvida' }).eq('id', active.id);
      toast.success('Vistoria registrada e ocorrência resolvida!');
      setActiveId(null);
      resetForm();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar vistoria');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setArrival(null);
    setReport('');
    setAction('sem_acao');
    setFineAmount('');
    setProcessNumber('');
    setAfterPhotos([]);
    setAfterPreviews([]);
  }

  async function syncPending() {
    const pending = readPending() as Array<Record<string, unknown>>;
    if (pending.length === 0) {
      toast.info('Nenhuma vistoria pendente.');
      return;
    }
    toast.info(`Sincronizando ${pending.length} vistoria(s)…`);
    let ok = 0;
    for (const p of pending) {
      const { error } = await supabase.from('inspections').insert({
        occurrence_id: p.occurrence_id,
        fiscal_id: p.fiscal_id,
        arrival_at: p.arrival_at,
        arrival_lat: p.arrival_lat,
        arrival_lng: p.arrival_lng,
        report_json: p.report_json,
        action_taken: p.action_taken,
        fine_amount: p.fine_amount,
        fine_process_number: p.fine_process_number,
      });
      if (!error) {
        await supabase.from('occurrences').update({ status: 'resolvida' }).eq('id', p.occurrence_id as string);
        ok++;
      }
    }
    writePending([]);
    toast.success(`${ok} vistoria(s) sincronizada(s).`);
    load();
  }

  const pendingCount = safePendingCount();

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', online ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? 'Online' : 'Offline'}
          </span>
          {pendingCount > 0 && (
            <Button size="sm" variant="outline" onClick={syncPending}>
              <Loader2 className="mr-1 h-3 w-3" /> Sincronizar ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {!online && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
          <WifiOff className="h-4 w-4 shrink-0" />
          Modo offline ativo. Vistorias são salvas no aparelho e sincronizadas ao reconectar.
        </div>
      )}

      {!active ? (
        <>
          <div>
            <h2 className="text-lg font-semibold">Fila de vistoria</h2>
            <p className="text-sm text-muted-foreground">
              Ordenada por urgência e tempo de espera. Você não escolhe livremente — o sistema atribui para evitar cherry-picking.
            </p>
          </div>
          {occurrences.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} title="Fila vazia" description="Nenhuma ocorrência atribuída a você no momento." />
          ) : (
            <div className="space-y-3">
              {occurrences.map((o, i) => (
                <Card key={o.id} className="cursor-pointer hover:border-primary/40" onClick={() => { setActiveId(o.id); resetForm(); }}>
                  <CardContent className="flex items-start gap-3 pt-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={o.status} />
                        <UrgencyBadge urgency={o.urgency_score} />
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold">{o.category}</h3>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{o.description}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{o.bairro || '—'}</span>
                      </div>
                      <div className="mt-2"><SLATimer deadline={o.sla_deadline} createdAt={o.created_at} compact /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={active.status} />
                <UrgencyBadge urgency={active.urgency_score} />
              </div>
              <h2 className="text-lg font-bold">{active.category}</h2>
              <p className="text-sm">{active.description}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{active.bairro || '—'}</span>
                <span>{active.lat.toFixed(4)}, {active.lng.toFixed(4)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-4">
              <div>
                <Label>Registro de chegada</Label>
                {!arrival ? (
                  <Button variant="outline" onClick={registerArrival} className="mt-1">
                    <MapPin className="mr-2 h-4 w-4" /> Registrar chegada (geo + horário)
                  </Button>
                ) : (
                  <div className="mt-1 rounded-lg bg-success/10 p-3 text-sm text-success">
                    Chegada registrada: {new Date(arrival.at).toLocaleString('pt-BR')} · {arrival.lat.toFixed(4)}, {arrival.lng.toFixed(4)}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="report">Laudo estruturado</Label>
                <Textarea id="report" value={report} onChange={(e) => setReport(e.target.value)} rows={5} placeholder="Descreva a vistoria: condições encontradas, profundidade/risco se aplicável, etc." />
              </div>

              <div className="space-y-1.5">
                <Label>Ação tomada</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(ACTION_LABELS) as InspectionAction[]).map((a) => (
                    <button key={a} type="button" onClick={() => setAction(a)}
                      className={cn('rounded-lg border px-3 py-2 text-xs font-medium transition-all', action === a ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40')}>
                      {ACTION_LABELS[a]}
                    </button>
                  ))}
                </div>
              </div>

              {action === 'multa' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fine">Valor da multa (R$)</Label>
                    <input id="fine" type="number" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="0,00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="proc">Nº do processo</Label>
                    <input id="proc" value={processNumber} onChange={(e) => setProcessNumber(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="2025/0001" />
                  </div>
                </div>
              )}

              {action === 'encaminhamento' && (
                <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Encaminhamento a outro órgão — ponto de integração futura com sistemas municipais externos.
                </div>
              )}

              <div className="space-y-2">
                <Label>Fotos de “depois” * (obrigatório)</Label>
                <div className="flex flex-wrap gap-2">
                  {afterPreviews.map((p, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <img src={p} alt={`Depois ${i + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeAfterPhoto(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white">×</button>
                    </div>
                  ))}
                  {afterPhotos.length < 5 && (
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:border-primary/40 hover:text-primary">
                      <Camera className="h-5 w-5" /><span className="text-[10px]">Foto</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addAfterPhoto(e.target.files)} />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setActiveId(null); resetForm(); }} className="flex-1">Cancelar</Button>
                <Button onClick={submitInspection} disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Registrar vistoria
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

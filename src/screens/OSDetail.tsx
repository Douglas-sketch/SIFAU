import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState } from '@/components/States';
import { getCurrentPosition, haversineDistance, isWithinGeofence, GEOFENCE_RADIUS_M } from '@/services/geolocation';
import { compressImage, uploadMedia } from '@/lib/media';
import { generateVistoriaPDF } from '@/services/pdf';
import { ArrowLeft, MapPin, Loader2, Camera, Play, CheckCircle2, Clock, FileText, AlertTriangle, Navigation, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { OrdemServico, Vistoria, AcaoFiscalizacao, TipoInfracao, AutoInfracao, Profile, PrefeituraConfig, Occurrence, CienciaStatus } from '@/lib/types';
import { ORIGEM_OS_LABEL, STATUS_OS_LABEL, STATUS_OS_COLOR, ORGAO_APOIO_LABEL, CIENCIA_LABEL } from '@/lib/types';

interface Props {
  osId: string;
  onBack: () => void;
}

export function OSDetail({ osId, onBack }: Props) {
  const { user, profile } = useAuth();
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [denuncia, setDenuncia] = useState<Occurrence | null>(null);
  const [fiscal, setFiscal] = useState<Profile | null>(null);
  const [gerente, setGerente] = useState<Profile | null>(null);
  const [prefeitura, setPrefeitura] = useState<PrefeituraConfig | null>(null);
  const [vistoria, setVistoria] = useState<Vistoria | null>(null);
  const [acoes, setAcoes] = useState<AcaoFiscalizacao[]>([]);
  const [selectedAcoes, setSelectedAcoes] = useState<string[]>([]);
  const [tiposInfracao, setTiposInfracao] = useState<TipoInfracao[]>([]);
  const [autoInfracao, setAutoInfracao] = useState<AutoInfracao | null>(null);
  const [loading, setLoading] = useState(true);

  // Geolocation state
  const [distance, setDistance] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Vistoria form state
  const [relatorio, setRelatorio] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00');

  // Auto de Infração form
  const [showAutoForm, setShowAutoForm] = useState(false);
  const [autoTipoId, setAutoTipoId] = useState('');
  const [autoValor, setAutoValor] = useState(0);
  const [autoArtigo, setAutoArtigo] = useState('');
  const [autoMotivo, setAutoMotivo] = useState('');
  const [autuadoNome, setAutuadoNome] = useState('');
  const [autuadoDoc, setAutuadoDoc] = useState('');
  const [cienciaStatus, setCienciaStatus] = useState<CienciaStatus | ''>('');
  const [testemunhaNome, setTestemunhaNome] = useState('');

  const load = useCallback(async () => {
    if (!osId) return;
    setLoading(true);
    const { data: osData, error: osErr } = await supabase.from('ordens_servico').select('*').eq('id', osId).maybeSingle();
    if (osErr) { setLoading(false); return; }
    setOs(osData as OrdemServico | null);

    if (osData) {
      const osRec = osData as OrdemServico;
      if (osRec.denuncia_id) {
        const { data: den } = await supabase.from('occurrences').select('*').eq('id', osRec.denuncia_id).maybeSingle();
        setDenuncia(den as Occurrence | null);
      }
      if (osRec.fiscal_id) {
        const { data: fp } = await supabase.from('profiles').select('*').eq('id', osRec.fiscal_id).maybeSingle();
        setFiscal(fp as Profile | null);
      }
      if (osRec.gerente_id) {
        const { data: gm } = await supabase.from('profiles').select('*').eq('id', osRec.gerente_id).maybeSingle();
        setGerente(gm as Profile | null);
      }
      const { data: pc, error: pcErr } = await supabase.from('prefeitura_config').select('*').maybeSingle();
      if (!pcErr) setPrefeitura(pc as PrefeituraConfig | null);

      const { data: vis, error: visErr } = await supabase.from('vistorias').select('*').eq('os_id', osId).order('criado_em', { ascending: false }).limit(1).maybeSingle();
      if (!visErr) setVistoria(vis as Vistoria | null);

      const { data: ac, error: acErr } = await supabase.from('os_acoes').select('acao_id').eq('os_id', osId);
      if (!acErr) {
        const acaoIds = (ac ?? []).map((r: { acao_id: string }) => r.acao_id);
        if (acaoIds.length > 0) {
          const { data: acoesData } = await supabase.from('acoes_fiscalizacao_catalogo').select('*').in('id', acaoIds);
          setAcoes((acoesData as AcaoFiscalizacao[]) ?? []);
          setSelectedAcoes(acaoIds);
        }
      }

      const { data: ai, error: aiErr } = await supabase.from('autos_infracao').select('*').eq('os_id', osId).maybeSingle();
      if (!aiErr) setAutoInfracao(ai as AutoInfracao | null);
    }

    const { data: ti, error: tiErr } = await supabase.from('tipos_infracao_catalogo').select('*').order('artigo_legal');
    if (!tiErr) setTiposInfracao((ti as TipoInfracao[]) ?? []);

    setLoading(false);
  }, [osId]);

  useEffect(() => { load(); }, [load]);

  // Check geolocation on load
  useEffect(() => {
    if (!os || os.latitude == null || os.longitude == null) return;
    if (os.status !== 'aberta') return;

    let interval: ReturnType<typeof setInterval>;

    async function checkGeo() {
      if (!os || os.latitude == null || os.longitude == null) return;
      setGeoLoading(true);
      setGeoError(null);
      try {
        const pos = await getCurrentPosition();
        const dist = haversineDistance(pos.lat, pos.lng, os.latitude!, os.longitude!);
        setDistance(Math.round(dist));
      } catch (e) {
        setGeoError(e instanceof Error ? e.message : 'Falha ao obter localização');
        setDistance(null);
      } finally {
        setGeoLoading(false);
      }
    }

    checkGeo();
    interval = setInterval(checkGeo, 15_000);
    return () => clearInterval(interval);
  }, [os]);

  // Elapsed timer for active vistoria
  useEffect(() => {
    if (!vistoria || vistoria.status !== 'em_andamento') return;
    const interval = setInterval(() => {
      const start = new Date(vistoria.iniciada_em).getTime();
      const elapsed = Date.now() - start;
      const mins = Math.floor(elapsed / 60_000);
      const secs = Math.floor((elapsed % 60_000) / 1_000);
      setElapsedTime(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    }, 1_000);
    return () => clearInterval(interval);
  }, [vistoria]);

  const canStartVistoria = os?.status === 'aberta' && distance != null && distance <= GEOFENCE_RADIUS_M;

  async function handleStartVistoria() {
    if (!os || !user) return;
    if (!canStartVistoria) return;
    setSubmitting(true);
    try {
      const pos = await getCurrentPosition();
      const { data, error } = await supabase.from('vistorias').insert({
        os_id: os.id,
        fiscal_id: user.id,
        geo_inicio_lat: pos.lat,
        geo_inicio_lng: pos.lng,
        geo_inicio_precisao_m: pos.accuracy,
        status: 'em_andamento',
      }).select().single();
      if (error) throw error;

      await supabase.from('ordens_servico').update({ status: 'em_vistoria' }).eq('id', os.id);
      setVistoria(data as Vistoria);
      setOs({ ...os, status: 'em_vistoria' });
      toast.success('Vistoria iniciada. Geolocalização registrada como evidência.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao iniciar vistoria');
    } finally {
      setSubmitting(false);
    }
  }

  function addFoto(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 8 - fotos.length);
    setFotos((p) => [...p, ...arr]);
    setFotoPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  function removeFoto(idx: number) {
    setFotos((p) => p.filter((_, i) => i !== idx));
    setFotoPreviews((p) => p.filter((_, i) => i !== idx));
  }

  function toggleAcao(acaoId: string) {
    setSelectedAcoes((prev) => prev.includes(acaoId) ? prev.filter((a) => a !== acaoId) : [...prev, acaoId]);
  }

  function handleSelectTipoInfracao(id: string) {
    const tipo = tiposInfracao.find((t) => t.id === id);
    if (tipo) {
      setAutoTipoId(id);
      setAutoValor(tipo.valor_base);
      setAutoArtigo(tipo.artigo_legal);
    }
  }

  async function handleSaveAutoInfracao() {
    if (!os || !autoTipoId) {
      toast.error('Selecione o tipo de infração.');
      return;
    }
    if (cienciaStatus === 'recusou' && !testemunhaNome.trim()) {
      toast.error('Nome da testemunha é obrigatório quando o autuado recusa assinar.');
      return;
    }
    setSubmitting(true);
    try {
      const insertData = {
        os_id: os.id,
        tipo_infracao_id: autoTipoId,
        valor_multa: autoValor,
        motivo: autoMotivo,
        autuado_nome: autuadoNome,
        autuado_documento: autuadoDoc,
        ciencia_status: cienciaStatus,
        testemunha_nome: cienciaStatus === 'recusou' ? testemunhaNome : null,
      };
      const { data, error } = await supabase.from('autos_infracao').insert(insertData).select().single();
      if (error) throw error;
      setAutoInfracao(data as AutoInfracao);
      setShowAutoForm(false);
      toast.success('Auto de Infração registrado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao registrar auto de infração');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinishVistoria() {
    if (!os || !vistoria || !user) return;
    setSubmitting(true);
    try {
      // Upload fotos
      const uploadedUrls: string[] = [];
      for (const file of fotos) {
        const compressed = await compressImage(file);
        const uploaded = await uploadMedia(compressed, os.id, 'foto');
        if (uploaded) {
          uploadedUrls.push(uploaded.url);
          await supabase.from('occurrence_media').insert({
            occurrence_id: os.denuncia_id ?? os.id,
            url: uploaded.url,
            type: 'foto',
            uploaded_by: user.id,
          });
        }
      }

      const allFotos = [...(vistoria.fotos ?? []), ...uploadedUrls];

      const { error: vErr } = await supabase.from('vistorias').update({
        finalizada_em: new Date().toISOString(),
        relatorio: relatorio,
        fotos: allFotos,
        status: 'finalizada',
      }).eq('id', vistoria.id);
      if (vErr) throw vErr;

      // Sync os_acoes
      const currentAcaoIds = acoes.map((a) => a.id);
      const toAdd = selectedAcoes.filter((id) => !currentAcaoIds.includes(id));
      const toRemove = currentAcaoIds.filter((id) => !selectedAcoes.includes(id));

      for (const id of toAdd) {
        await supabase.from('os_acoes').insert({ os_id: os.id, acao_id: id });
      }
      for (const id of toRemove) {
        await supabase.from('os_acoes').delete().eq('os_id', os.id).eq('acao_id', id);
      }

      await supabase.from('ordens_servico').update({ status: 'concluida' }).eq('id', os.id);

      toast.success('Vistoria finalizada! OS marcada como concluída.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao finalizar vistoria');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPDF() {
    if (!os) return;
    const { data: allAcoes } = await supabase.from('os_acoes').select('acao_id').eq('os_id', os.id);
    const acaoIds = (allAcoes ?? []).map((r: { acao_id: string }) => r.acao_id);
    let acoesData: AcaoFiscalizacao[] = [];
    if (acaoIds.length > 0) {
      const { data: ad } = await supabase.from('acoes_fiscalizacao_catalogo').select('*').in('id', acaoIds);
      acoesData = (ad as AcaoFiscalizacao[]) ?? [];
    }
    const { data: ai } = await supabase.from('autos_infracao').select('*').eq('os_id', os.id).maybeSingle();
    generateVistoriaPDF({
      prefeitura,
      os,
      vistoria,
      fiscal,
      gerente,
      acoes: acoesData,
      autoInfracao: (ai as AutoInfracao) ?? null,
    });
  }

  if (loading) return <LoadingState />;
  if (!os) return <EmptyState title="Ordem de Serviço não encontrada" />;

  const isVistoriaActive = vistoria?.status === 'em_andamento';
  const isOSConcluida = os.status === 'concluida';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
        {isOSConcluida && (
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />Baixar relatório (PDF)
          </Button>
        )}
      </div>

      {/* OS Header */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_OS_COLOR[os.status])}>
              {STATUS_OS_LABEL[os.status]}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              {ORIGEM_OS_LABEL[os.origem_os]}
            </span>
            <span className="font-mono text-sm font-bold">{os.numero_os}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">Ordem de Serviço</h2>
            <p className="text-sm text-muted-foreground">{os.servico_descricao}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{os.endereco}</div>
            <div className="flex items-center gap-1"><Clock className="h-3 w-3" />Prazo: {new Date(os.prazo_resposta).toLocaleDateString('pt-BR')}</div>
            <div>Fiscal: {fiscal?.nome ?? '—'}</div>
            <div>Gerente: {gerente?.nome ?? '—'}</div>
            {os.apoio_operacional && (
              <div className="col-span-2">
                Apoio: {os.orgao_apoio ? ORGAO_APOIO_LABEL[os.orgao_apoio] : ''}
                {os.orgao_apoio === 'outro' && os.orgao_apoio_outro ? ` — ${os.orgao_apoio_outro}` : ''}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Denúncia original */}
      {denuncia && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Denúncia Original do Cidadão</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Categoria:</strong> {denuncia.category}</p>
            <p><strong>Descrição:</strong> {denuncia.description}</p>
            {denuncia.bairro && <p><strong>Bairro:</strong> {denuncia.bairro}</p>}
            <p className="text-xs text-muted-foreground">Registrada em {new Date(denuncia.created_at).toLocaleString('pt-BR')}</p>
          </CardContent>
        </Card>
      )}

      {/* Geofencing / Start Vistoria */}
      {os.status === 'aberta' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Navigation className="h-4 w-4" />Checagem de Geolocalização</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {geoLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Obtendo sua localização…
              </div>
            )}
            {geoError && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {geoError}
              </div>
            )}
            {distance != null && (
              <div className={cn('rounded-lg p-3 text-sm', distance <= GEOFENCE_RADIUS_M ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                {distance <= GEOFENCE_RADIUS_M ? (
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Você está a {distance}m do local. Pode iniciar a vistoria.</span>
                ) : (
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />Você está a {distance}m do local. Aproxime-se (raio mínimo: {GEOFENCE_RADIUS_M}m) para iniciar a vistoria.</span>
                )}
              </div>
            )}
            <Button onClick={handleStartVistoria} disabled={!canStartVistoria || submitting} className="w-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Iniciar Vistoria
            </Button>
            <p className="text-xs text-muted-foreground">O botão só é liberado quando você estiver a {GEOFENCE_RADIUS_M}m ou menos do endereço da OS.</p>
          </CardContent>
        </Card>
      )}

      {/* Vistoria em andamento */}
      {isVistoriaActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><Camera className="h-4 w-4" />Vistoria em Andamento</span>
              <span className="flex items-center gap-1 font-mono text-sm text-primary"><Clock className="h-3 w-3" />{elapsedTime}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-3 text-xs text-primary">
              Cronômetro de execução da vistoria — independente do prazo da OS.
            </div>

            {/* Relatório */}
            <div className="space-y-1.5">
              <Label htmlFor="relatorio">Relatório de vistoria</Label>
              <Textarea id="relatorio" value={relatorio} onChange={(e) => setRelatorio(e.target.value)} rows={5}
                placeholder="Descreva as condições encontradas, irregularidades verificadas, etc." />
            </div>

            {/* Ações multiselect */}
            <div className="space-y-2">
              <Label>Ações de fiscalização (marque todas que se aplicam)</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {acoes.length === 0 && (
                  <p className="text-xs text-muted-foreground">Carregando catálogo de ações…</p>
                )}
                {/* Load all acoes from catalog */}
              </div>
              <AcoesMultiselect osId={os.id} selected={selectedAcoes} onToggle={toggleAcao} />
            </div>

            {/* Auto de Infração */}
            {autoInfracao ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1 text-sm">
                <p className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Auto de Infração Registrado</p>
                <p>Valor: R$ {Number(autoInfracao.valor_multa).toFixed(2)}</p>
                <p>Autuado: {autoInfracao.autuado_nome ?? '—'}</p>
                <p>Ciência: {CIENCIA_LABEL[autoInfracao.ciencia_status]}</p>
              </div>
            ) : showAutoForm ? (
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Auto de Infração</p>
                <div className="space-y-1.5">
                  <Label htmlFor="tipo">Tipo de infração *</Label>
                  <select id="tipo" value={autoTipoId} onChange={(e) => handleSelectTipoInfracao(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="" disabled>Selecione…</option>
                    {tiposInfracao.map((t) => <option key={t.id} value={t.id}>{t.artigo_legal} — {t.descricao} — R$ {t.valor_base.toFixed(2)}</option>)}
                  </select>
                </div>
                {autoTipoId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Artigo legal</Label>
                      <p className="text-sm font-medium">{autoArtigo}</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Valor da multa</Label>
                      <p className="text-sm font-bold text-primary">R$ {autoValor.toFixed(2)}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="motivo">Motivo / detalhamento</Label>
                  <Textarea id="motivo" value={autoMotivo} onChange={(e) => setAutoMotivo(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="autuado">Nome do autuado</Label>
                    <Input id="autuado" value={autuadoNome} onChange={(e) => setAutuadoNome(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="doc">Documento</Label>
                    <Input id="doc" value={autuadoDoc} onChange={(e) => setAutuadoDoc(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Ciência do autuado *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(CIENCIA_LABEL) as CienciaStatus[]).map((c) => (
                      <button key={c} type="button" onClick={() => setCienciaStatus(c)}
                        className={cn('rounded-lg border px-3 py-2 text-xs font-medium transition-all', cienciaStatus === c ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40')}>
                        {CIENCIA_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>
                {cienciaStatus === 'recusou' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="testemunha">Nome da testemunha * (obrigatório quando recusa)</Label>
                    <Input id="testemunha" value={testemunhaNome} onChange={(e) => setTestemunhaNome(e.target.value)} placeholder="Nome completo da testemunha" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAutoForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveAutoInfracao} disabled={submitting || !autoTipoId || !cienciaStatus}>
                    {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Salvar Auto
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAutoForm(true)}>
                <FileText className="mr-2 h-4 w-4" />Abrir Auto de Infração
              </Button>
            )}

            {/* Fotos */}
            <div className="space-y-2">
              <Label>Fotos da vistoria</Label>
              <div className="flex flex-wrap gap-2">
                {fotoPreviews.map((p, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                    <img src={p} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeFoto(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white">×</button>
                  </div>
                ))}
                {fotos.length < 8 && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:border-primary/40 hover:text-primary">
                    <Camera className="h-5 w-5" /><span className="text-[10px]">Foto</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFoto(e.target.files)} />
                  </label>
                )}
              </div>
            </div>

            <Button onClick={handleFinishVistoria} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Finalizar Vistoria
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Vistoria finalizada */}
      {vistoria?.status === 'finalizada' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vistoria Finalizada</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Iniciada:</strong> {new Date(vistoria.iniciada_em).toLocaleString('pt-BR')}</p>
            <p><strong>Finalizada:</strong> {vistoria.finalizada_em ? new Date(vistoria.finalizada_em).toLocaleString('pt-BR') : '—'}</p>
            {vistoria.relatorio && <p><strong>Relatório:</strong> {vistoria.relatorio}</p>}
            {vistoria.geo_inicio_lat != null && (
              <p><strong>Geolocalização:</strong> {Number(vistoria.geo_inicio_lat).toFixed(6)}, {Number(vistoria.geo_inicio_lng).toFixed(6)} (±{vistoria.geo_inicio_precisao_m ?? '?'}m)</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AcoesMultiselect({ osId, selected, onToggle }: { osId: string; selected: string[]; onToggle: (id: string) => void }) {
  const [acoes, setAcoes] = useState<AcaoFiscalizacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('acoes_fiscalizacao_catalogo').select('*').order('codigo');
      setAcoes((data as AcaoFiscalizacao[]) ?? []);
      setLoading(false);
    })();
  }, [osId]);

  if (loading) return <p className="text-xs text-muted-foreground">Carregando ações…</p>;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {acoes.map((a) => (
        <button key={a.id} type="button" onClick={() => onToggle(a.id)}
          className={cn('flex items-start gap-2 rounded-lg border p-3 text-left transition-all', selected.includes(a.id) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40')}>
          <div className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border', selected.includes(a.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30')}>
            {selected.includes(a.id) && <CheckCircle2 className="h-3 w-3" />}
          </div>
          <div>
            <p className="text-sm font-medium">[{a.codigo}] {a.nome}</p>
            {a.descricao && <p className="text-xs text-muted-foreground">{a.descricao}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

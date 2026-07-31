import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge, UrgencyBadge } from '@/components/StatusBadge';
import { SLATimer } from '@/components/SLATimer';
import { EmptyState, LoadingState } from '@/components/States';
import { STATUS_LABEL, URGENCY_LABEL, type Occurrence, type OccurrenceMedia, type Comment, type StatusLog, type Inspection } from '@/lib/types';
import { ArrowLeft, MapPin, Clock, MessageSquare, Image as ImageIcon, History, Star, Send, ShieldAlert, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  occurrenceId: string;
  onBack: () => void;
}

export function OccurrenceDetail({ occurrenceId, onBack }: Props) {
  const { user, profile } = useAuth();
  const [occ, setOcc] = useState<Occurrence | null>(null);
  const [media, setMedia] = useState<OccurrenceMedia[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [existingRating, setExistingRating] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: o } = await supabase.from('occurrences').select('*').eq('id', occurrenceId).maybeSingle();
    setOcc(o as Occurrence | null);
    const { data: m } = await supabase.from('occurrence_media').select('*').eq('occurrence_id', occurrenceId).order('created_at');
    setMedia((m as OccurrenceMedia[]) ?? []);
    const { data: c } = await supabase.from('comments').select('*').eq('occurrence_id', occurrenceId).order('created_at');
    setComments((c as Comment[]) ?? []);
    const { data: l } = await supabase.from('occurrence_status_log').select('*').eq('occurrence_id', occurrenceId).order('changed_at');
    setLogs((l as StatusLog[]) ?? []);
    const { data: insp } = await supabase.from('inspections').select('*').eq('occurrence_id', occurrenceId).order('created_at');
    setInspections((insp as Inspection[]) ?? []);
    if (o && (o as Occurrence).citizen_id === user?.id) {
      const { data: r } = await supabase.from('ratings').select('score').eq('occurrence_id', occurrenceId).maybeSingle();
      if (r) setExistingRating((r as { score: number }).score);
    }
    setLoading(false);
  }, [occurrenceId, user]);

  useEffect(() => { load(); }, [load]);

  const isCitizen = profile?.role === 'cidadao';
  const isFiscal = profile?.role === 'fiscal' && occ?.assigned_fiscal_id === user?.id;
  const isGestor = profile?.role === 'gestor';
  const isAuditor = profile?.role === 'auditor';
  const canCommentInternal = isFiscal || isGestor;
  const canRate = isCitizen && occ?.citizen_id === user?.id && occ?.status === 'resolvida' && !existingRating;

  async function submitComment() {
    if (!comment.trim() || !user) return;
    const { error } = await supabase.from('comments').insert({
      occurrence_id: occurrenceId,
      author_id: user.id,
      visibility: internal ? 'internal' : 'public',
      text: comment.trim(),
    });
    if (error) {
      toast.error('Erro ao enviar comentário');
      return;
    }
    setComment('');
    setInternal(false);
    load();
    toast.success('Comentário enviado');
  }

  async function submitRating() {
    if (!rating || !user) return;
    const { error } = await supabase.from('ratings').insert({
      occurrence_id: occurrenceId,
      citizen_id: user.id,
      score: rating,
    });
    if (error) {
      toast.error('Erro ao registrar avaliação');
      return;
    }
    setExistingRating(rating);
    toast.success('Obrigado pela avaliação!');
  }

  async function changeStatus(newStatus: Occurrence['status'], note?: string) {
    const { error } = await supabase.from('occurrences').update({ status: newStatus }).eq('id', occurrenceId);
    if (error) {
      toast.error('Erro ao alterar status');
      return;
    }
    if (note) {
      await supabase.from('comments').insert({
        occurrence_id: occurrenceId,
        author_id: user!.id,
        visibility: 'internal',
        text: `[Status → ${STATUS_LABEL[newStatus]}] ${note}`,
      });
    }
    toast.success(`Status alterado para ${STATUS_LABEL[newStatus]}`);
    load();
  }

  if (loading) return <LoadingState />;
  if (!occ) return <EmptyState title="Ocorrência não encontrada" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={occ.status} />
            <UrgencyBadge urgency={occ.urgency_score} />
            {occ.duplicate_of && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">Duplicata</span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold">{occ.category}</h2>
          {occ.subcategory && <p className="text-sm text-muted-foreground">{occ.subcategory}</p>}
          <p className="mt-3 text-sm">{occ.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{occ.bairro || '—'}</div>
            <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(occ.created_at).toLocaleString('pt-BR')}</div>
            <div>Urgência: {URGENCY_LABEL[occ.urgency_score]}</div>
            <div>{Number(occ.lat)?.toFixed(4) ?? '—'}, {Number(occ.lng)?.toFixed(4) ?? '—'}</div>
          </div>
          <div className="mt-4">
            <SLATimer deadline={occ.sla_deadline} createdAt={occ.created_at} resolvedAt={occ.status === 'resolvida' ? occ.sla_deadline : null} />
          </div>
        </CardContent>
      </Card>

      {media.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-4 w-4" />Evidências ({media.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {media.map((m) => (
                <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border">
                  {m.type === 'foto' ? (
                    <img src={m.url} alt="Evidência" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-xs">Vídeo</div>
                  )}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canRate && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Star className="h-4 w-4" />Avalie o atendimento</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(n)}>
                  <Star className={cn('h-8 w-8 transition-colors', (hoverRating || rating) >= n ? 'fill-warning text-warning' : 'text-muted-foreground/40')} />
                </button>
              ))}
            </div>
            <Button onClick={submitRating} disabled={!rating} className="mt-3">Enviar avaliação</Button>
          </CardContent>
        </Card>
      )}
      {existingRating && (
        <div className="flex items-center gap-2 rounded-lg border bg-success/5 p-3 text-sm">
          <Star className="h-4 w-4 fill-warning text-warning" />
          Você avaliou este atendimento com nota {existingRating}/5.
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" />Comentários ({comments.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {comments.length === 0 && <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>}
          {comments.map((c) => (
            <div key={c.id} className={cn('rounded-lg p-3 text-sm', c.visibility === 'internal' ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/50')}>
              <div className="mb-1 flex items-center gap-2">
                {c.visibility === 'internal' && <Lock className="h-3 w-3 text-amber-600" />}
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <p>{c.text}</p>
            </div>
          ))}
          {!isAuditor && (
            <div className="space-y-2 border-t pt-3">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Escreva um comentário…" rows={2} />
              <div className="flex items-center justify-between gap-2">
                {canCommentInternal && (
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    Interno (não visível ao cidadão)
                  </label>
                )}
                <Button size="sm" onClick={submitComment} disabled={!comment.trim()}>
                  <Send className="mr-1 h-3.5 w-3.5" />Enviar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {inspections.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vistorias ({inspections.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {inspections.map((i) => (
              <div key={i.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Vistoria · {new Date(i.arrival_at).toLocaleString('pt-BR')}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{i.action_taken}</span>
                </div>
                {i.fine_amount != null && <p className="mt-1 text-xs text-muted-foreground">Multa: R$ {Number(i.fine_amount).toFixed(2)} {i.fine_process_number ? `· Processo ${i.fine_process_number}` : ''}</p>}
                {Object.keys(i.report_json).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded bg-muted/50 p-2 text-xs">{JSON.stringify(i.report_json, null, 2)}</pre>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Linha do tempo (auditoria)</CardTitle></CardHeader>
        <CardContent>
          <ol className="relative space-y-3 border-l-2 border-border pl-4">
            {logs.length === 0 && <p className="text-sm text-muted-foreground">Sem registros.</p>}
            {logs.map((l) => (
              <li key={l.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                <p className="text-sm font-medium">{l.from_status ? `${STATUS_LABEL[l.from_status as keyof typeof STATUS_LABEL]} → ` : ''}{STATUS_LABEL[l.to_status as keyof typeof STATUS_LABEL]}</p>
                <p className="text-xs text-muted-foreground">{new Date(l.changed_at).toLocaleString('pt-BR')}</p>
                {l.note && <p className="text-xs text-muted-foreground italic">"{l.note}"</p>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {isFiscal && occ.status !== 'resolvida' && occ.status !== 'arquivada' && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => changeStatus('em_vistoria')} variant="secondary">Iniciar vistoria</Button>
          <Button onClick={() => changeStatus('resolvida')} variant="default">Marcar resolvida</Button>
          <Button onClick={() => changeStatus('escalonada')} variant="outline">
            <ShieldAlert className="mr-2 h-4 w-4" />Escalar ao gestor
          </Button>
        </div>
      )}

      {isGestor && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => changeStatus('escalonada')} variant="outline">Escalonar</Button>
          <Button onClick={() => changeStatus('arquivada')} variant="ghost">Arquivar</Button>
        </div>
      )}

      {isAuditor && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
          Modo auditor: acesso somente-leitura. Nenhuma alteração pode ser feita.
        </div>
      )}
    </div>
  );
}

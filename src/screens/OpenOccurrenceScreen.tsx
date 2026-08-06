import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, SUBCATEGORIES, URGENCY_LABEL, type AIClassificationResult, type UrgencyLevel } from '@/lib/types';
import { compressImage, getCurrentPosition, uploadMedia } from '@/lib/media';
import { Camera, MapPin, Loader2, Sparkles, AlertTriangle, CheckCircle2, X, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  onCreated: (id: string) => void;
  onCancel: () => void;
}

const RECIFE_CENTER = { lat: -8.0476, lng: -34.877 };

export function OpenOccurrenceScreen({ onCreated, onCancel }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIClassificationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGeo() {
    setGeoLoading(true);
    try {
      const pos = await getCurrentPosition();
      setGeo(pos);
      toast.success('Localização capturada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao obter localização');
      setGeo({ ...RECIFE_CENTER, accuracy: 0 });
    } finally {
      setGeoLoading(false);
    }
  }

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const arr = Array.from(newFiles).slice(0, 5 - files.length);
    setFiles((prev) => [...prev, ...arr]);
    setPreviews((prev) => [...prev, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function runAI() {
    if (description.length < 20) {
      setError('A descrição precisa de pelo menos 20 caracteres para a IA analisar.');
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const { data: nearby } = await supabase
        .from('occurrences')
        .select('id, category, description, lat, lng')
        .neq('status', 'resolvida')
        .neq('status', 'arquivada')
        .limit(50);

      const nearbyWithDist = (nearby ?? [])
        .filter((o) => geo && o.lat && o.lng)
        .map((o) => {
          const d = haversine(geo!.lat, geo!.lng, o.lat, o.lng);
          return { ...o, distance_m: d };
        })
        .filter((o) => o.distance_m <= 200)
        .slice(0, 10);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-occurrence`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          description,
          category: category || undefined,
          lat: geo?.lat,
          lng: geo?.lng,
          nearbyOccurrences: nearbyWithDist,
        }),
      });
      if (!res.ok) throw new Error(`Falha na IA (${res.status})`);
      const result = (await res.json()) as AIClassificationResult;
      setAiResult(result);
      if (result.category && !category) setCategory(result.category);
      if (result.urgency) {
        toast.info(`IA sugeriu urgência ${URGENCY_LABEL[result.urgency as UrgencyLevel]}`);
      }
      if (result.duplicate_suspected) {
        toast.warning('Possível duplicata detectada pela IA.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na análise da IA');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!category) return setError('Selecione uma categoria.');
    if (description.length < 20) return setError('Descrição muito curta (mín. 20 caracteres).');
    if (!geo) return setError('Geolocalização é obrigatória. Toque em "Capturar localização".');

    setSubmitting(true);
    try {
      const { data: occ, error: occErr } = await supabase
        .from('occurrences')
        .insert({
          citizen_id: user!.id,
          category,
          subcategory: subcategory || null,
          description,
          lat: geo.lat,
          lng: geo.lng,
          urgency_score: aiResult?.urgency ?? 2,
          ai_confidence: aiResult?.confidence ?? null,
          ai_rationale: aiResult?.rationale ?? null,
        })
        .select()
        .single();

      if (occErr) throw occErr;

      for (const file of files) {
        const compressed = file.type.startsWith('image/') ? await compressImage(file) : file;
        const uploaded = await uploadMedia(compressed as Blob, occ.id, file.type.startsWith('image/') ? 'foto' : 'video');
        if (uploaded) {
          await supabase.from('occurrence_media').insert({
            occurrence_id: occ.id,
            url: uploaded.url,
            type: file.type.startsWith('image/') ? 'foto' : 'video',
            uploaded_by: user!.id,
          });
        }
      }

      toast.success('Ocorrência registrada com sucesso!');
      onCreated(occ.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar ocorrência');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Nova ocorrência
          </CardTitle>
          <CardDescription>Reporte um problema urbano. A IA ajuda a classificar e priorizar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCategory(c); setSubcategory(''); }}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs font-medium transition-all text-left',
                      category === c ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {category && SUBCATEGORIES[category] && SUBCATEGORIES[category].length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="sub">Subcategoria</Label>
                <select
                  id="sub"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione…</option>
                  {SUBCATEGORIES[category].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição * (mín. 20 caracteres)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o problema com detalhes: onde, desde quando, e os impactos…"
                rows={4}
                required
                minLength={20}
              />
              <p className="text-right text-xs text-muted-foreground">{description.length}/20 mín.</p>
            </div>

            <div className="space-y-2">
              <Label>Fotos (até 5)</Label>
              <div className="flex flex-wrap gap-2">
                {previews.map((p, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                    <img src={p} alt={`Pré-visualização ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {files.length < 5 && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:border-primary/40 hover:text-primary">
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px]">Adicionar</span>
                    <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Localização *</Label>
              <Button type="button" variant="outline" onClick={handleGeo} disabled={geoLoading}>
                {geoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                {geo ? 'Localização capturada' : 'Capturar localização'}
              </Button>
              {geo && (
                <p className="text-xs text-muted-foreground">
                  {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)} {geo.accuracy > 50 && '(baixa precisão — ajuste o pin se necessário)'}
                </p>
              )}
            </div>

            <Button type="button" variant="secondary" onClick={runAI} disabled={aiLoading || description.length < 20} className="w-full">
              {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analisar com IA
            </Button>

            {aiResult && (
              <div className="rounded-lg border bg-secondary/30 p-3 text-sm space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Análise da IA
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Categoria sugerida: <strong>{aiResult.category}</strong></div>
                  <div>Urgência: <strong>{URGENCY_LABEL[aiResult.urgency]}</strong></div>
                  <div>Confiança: <strong>{Math.round(aiResult.confidence * 100)}%</strong></div>
                  <div>Duplicata: <strong>{aiResult.duplicate_suspected ? 'Suspeita' : 'Não'}</strong></div>
                </div>
                {aiResult.rationale && <p className="text-xs text-muted-foreground">{aiResult.rationale}</p>}
                {aiResult.duplicate_suspected && (
                  <div className="flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Esta ocorrência pode ser duplicata. Você pode adicionar evidências à ocorrência existente em vez de criar uma nova.</span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Registrar ocorrência
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

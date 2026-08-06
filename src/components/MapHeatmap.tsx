import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, TrendingUp } from 'lucide-react';
import type { Occurrence, UrgencyLevel } from '@/lib/types';

interface MapHeatmapProps {
  occurrences: Occurrence[];
  onSelect?: (id: string) => void;
  className?: string;
  height?: string;
}

interface Point {
  id: string;
  x: number;
  y: number;
  urgency: UrgencyLevel;
  category: string;
  status: string;
}

const URGENCY_COLOR: Record<UrgencyLevel, string> = {
  1: 'hsl(217 76% 55%)',
  2: 'hsl(199 80% 50%)',
  3: 'hsl(38 92% 50%)',
  4: 'hsl(0 72% 51%)',
};

export function MapHeatmap({ occurrences, onSelect, className, height = 'h-80' }: MapHeatmapProps) {
  const [hover, setHover] = useState<Point | null>(null);

  const { points, bounds, byBairro } = useMemo(() => {
    if (occurrences.length === 0) {
      return { points: [] as Point[], bounds: null, byBairro: new Map<string, number>() };
    }
    const lats = occurrences.map((o) => o.lat);
    const lngs = occurrences.map((o) => o.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 0.08;
    const rangeLat = maxLat - minLat || 0.01;
    const rangeLng = maxLng - minLng || 0.01;

    const pts: Point[] = occurrences.map((o) => ({
      id: o.id,
      x: ((o.lng - minLng) / rangeLng) * (1 - 2 * pad) + pad,
      y: (1 - ((o.lat - minLat) / rangeLat)) * (1 - 2 * pad) + pad,
      urgency: o.urgency_score,
      category: o.category,
      status: o.status,
    }));

    const bb = { minLat, maxLat, minLng, maxLng };
    const counts = new Map<string, number>();
    for (const o of occurrences) {
      const b = o.bairro || 'Não informado';
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    return { points: pts, bounds: bb, byBairro: counts };
  }, [occurrences]);

  const topBairros = useMemo(
    () => Array.from(byBairro.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6),
    [byBairro]
  );

  return (
    <div className={cn('relative overflow-hidden rounded-xl border bg-card', className)}>
      <div className={cn('relative w-full bg-grid bg-secondary/30', height)}>
        {points.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="h-8 w-8 opacity-40" />
            <p className="text-sm">Sem ocorrências para exibir no mapa.</p>
          </div>
        ) : (
          <>
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1 1">
              {points.map((p) => (
                <g key={p.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={0.018}
                    fill={URGENCY_COLOR[p.urgency]}
                    opacity={0.25}
                  >
                    <animate attributeName="r" values="0.018;0.03;0.018" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={0.01}
                    fill={URGENCY_COLOR[p.urgency]}
                    stroke="white"
                    strokeWidth={0.003}
                    className="cursor-pointer"
                    onClick={() => onSelect?.(p.id)}
                    onMouseEnter={() => setHover(p)}
                    onMouseLeave={() => setHover(null)}
                  />
                </g>
              ))}
            </svg>
            {hover && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${hover.x * 100}%`,
                  top: `${hover.y * 100}%`,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <p className="font-medium">{hover.category}</p>
                <p className="text-muted-foreground">Urgência {hover.urgency} · {hover.status}</p>
              </div>
            )}
          </>
        )}
      </div>
      {topBairros.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t bg-muted/40 p-3">
          {topBairros.map(([bairro, count]) => (
            <span key={bairro} className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs">
              <TrendingUp className="h-3 w-3 text-primary" />
              {bairro}: <strong className="ml-0.5">{count}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

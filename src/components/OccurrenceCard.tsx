import { Card } from '@/components/ui/card';
import { StatusBadge, UrgencyBadge } from '@/components/StatusBadge';
import { SLATimer } from '@/components/SLATimer';
import { cn } from '@/lib/utils';
import { MapPin, Calendar } from 'lucide-react';
import type { Occurrence } from '@/lib/types';

interface OccurrenceCardProps {
  occurrence: Occurrence;
  onClick?: () => void;
  className?: string;
}

export function OccurrenceCard({ occurrence, onClick, className }: OccurrenceCardProps) {
  const created = new Date(occurrence.created_at);
  const resolvedAt =
    occurrence.status === 'resolvida'
      ? occurrence.sla_deadline
      : null;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer p-4 transition-all hover:shadow-md hover:border-primary/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={occurrence.status} />
            <UrgencyBadge urgency={occurrence.urgency_score} />
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold">{occurrence.category}</h3>
          {occurrence.subcategory && (
            <p className="text-xs text-muted-foreground">{occurrence.subcategory}</p>
          )}
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{occurrence.description}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {occurrence.bairro || 'Local não informado'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {created.toLocaleDateString('pt-BR')}
        </span>
      </div>
      <div className="mt-2">
        <SLATimer
          deadline={occurrence.sla_deadline}
          createdAt={occurrence.created_at}
          resolvedAt={resolvedAt}
          compact
        />
      </div>
    </Card>
  );
}

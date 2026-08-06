import { cn } from '@/lib/utils';
import { STATUS_LABEL, URGENCY_LABEL, type OccurrenceStatus, type UrgencyLevel } from '@/lib/types';

const STATUS_STYLE: Record<OccurrenceStatus, string> = {
  aberta: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  triada: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
  atribuida: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
  em_vistoria: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  resolvida: 'bg-success/10 text-success border-success/20',
  arquivada: 'bg-muted text-muted-foreground border-border',
  escalonada: 'bg-danger/10 text-danger border-danger/20',
};

const URGENCY_STYLE: Record<UrgencyLevel, string> = {
  1: 'bg-muted text-muted-foreground border-border',
  2: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  3: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  4: 'bg-danger/10 text-danger border-danger/20',
};

export function StatusBadge({ status, className }: { status: OccurrenceStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLE[status],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function UrgencyBadge({ urgency, className }: { urgency: UrgencyLevel; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        URGENCY_STYLE[urgency],
        className
      )}
      title={`Urgência ${URGENCY_LABEL[urgency]}`}
    >
      {URGENCY_LABEL[urgency]}
    </span>
  );
}

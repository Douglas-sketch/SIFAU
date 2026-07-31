import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

interface SLATimerProps {
  deadline: string;
  createdAt: string;
  resolvedAt?: string | null;
  className?: string;
  compact?: boolean;
}

function diffMs(target: string, now: number) {
  return new Date(target).getTime() - now;
}

function formatRemaining(ms: number) {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return `${h}h ${m}m`;
}

export function SLATimer({ deadline, createdAt, resolvedAt, className, compact }: SLATimerProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const resolved = !!resolvedAt;
  const ref = resolved ? (resolvedAt as string) : deadline;
  const remaining = diffMs(ref, now);
  const overdue = !resolved && remaining < 0;

  const total = diffMs(deadline, new Date(createdAt).getTime());
  const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));

  const color = resolved
    ? 'text-success'
    : overdue
      ? 'text-danger'
      : remaining < total * 0.25
        ? 'text-warning'
        : 'text-muted-foreground';

  const barColor = resolved
    ? 'bg-success'
    : overdue
      ? 'bg-danger'
      : remaining < total * 0.25
        ? 'bg-warning'
        : 'bg-primary';

  return (
    <div className={cn('space-y-1', className)}>
      <div className={cn('flex items-center gap-1.5 text-xs font-medium', color)}>
        {overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
        <span>
          {resolved
            ? `Resolvido em ${formatRemaining(diffMs(resolvedAt as string, new Date(createdAt).getTime()))}`
            : overdue
              ? `SLA estourado há ${formatRemaining(remaining)}`
              : `${formatRemaining(remaining)} restantes`}
        </span>
      </div>
      {!compact && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${resolved ? 100 : Math.min(100, pct)}%` }}
          />
        </div>
      )}
    </div>
  );
}

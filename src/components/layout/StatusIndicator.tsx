import { Badge } from '@/components/ui/badge';
import useJobStats from '@/hooks/use-job-stats';
import useScrapingRuns from '@/hooks/use-scraping-runs';
import { cn } from '@/lib/utils';

export default function StatusIndicator() {
  const { data: stats } = useJobStats();
  const { data: runs } = useScrapingRuns();
  const latestRun = runs?.[0] ?? null;

  function formatRelativeTime(iso: string | null): string {
    if (!iso) {
      return 'sin ejecuciones';
    }

    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        className={cn(
          'border px-2 py-1 text-[0.625rem] tracking-widest',
          latestRun?.status === 'failed' && 'border-danger/30 bg-danger/15 text-danger',
          latestRun?.status === 'partial' && 'border-warning/30 bg-warning/15 text-warning',
          latestRun?.status === 'success' && 'border-success/30 bg-success/15 text-success',
          !latestRun && 'border-border bg-muted text-muted-foreground',
        )}
      >
        Última ejecución: {formatRelativeTime(latestRun?.started_at ?? null)}
      </Badge>
      <Badge className="border border-border bg-primary px-2 py-1 text-[0.625rem] tracking-widest text-primary-foreground">
        {stats?.newCount ?? 0} nuevas
      </Badge>
      <Badge className="border border-border bg-muted px-2 py-1 text-[0.625rem] tracking-widest text-destructive">
        {stats?.errorCount ?? 0} errores
      </Badge>
    </div>
  );
}

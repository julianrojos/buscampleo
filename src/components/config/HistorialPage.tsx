import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScrapingRun } from '@/types/scraping';
import { cn } from '@/lib/utils';
import useScrapingRuns from '@/hooks/use-scraping-runs';

function RunStatusBadge({ status }: { readonly status: ScrapingRun['status'] }) {
  const labels = {
    success: 'Éxito',
    partial: 'Parcial',
    failed: 'Error',
    running: 'En curso',
  } as const;

  return (
    <Badge
      className={cn(
        'border px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase',
        status === 'success' && 'border-success/30 bg-success/15 text-success',
        status === 'partial' && 'border-warning/30 bg-warning/15 text-warning',
        status === 'failed' && 'border-danger/30 bg-danger/15 text-danger',
        status === 'running' && 'border-primary/30 bg-primary/15 text-primary',
      )}
    >
      {labels[status]}
    </Badge>
  );
}

export default function HistorialPage() {
  const { data: runs = [] } = useScrapingRuns();

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">Historial</h1>
          <p className="text-sm text-muted-foreground">
            Revisa el estado de las últimas ejecuciones del scraping.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>OK / Fallos</TableHead>
              <TableHead>Ofertas</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>{run.started_at}</TableCell>
                <TableCell>
                  <RunStatusBadge status={run.status} />
                </TableCell>
                <TableCell>
                  {run.successful_sources} / {run.failed_sources}
                </TableCell>
                <TableCell>{run.jobs_found}</TableCell>
                <TableCell>
                  {run.duration_ms ? `${Math.round(run.duration_ms / 1000)}s` : '—'}
                </TableCell>
                <TableCell>
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                      Ver detalle
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {run.error_summary ?? 'Sin errores registrados.'}
                    </p>
                  </details>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

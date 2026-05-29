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

const MOCK_RUNS = [
  {
    id: 'run-001',
    started_at: '2026-05-29T08:00:00.000Z',
    finished_at: '2026-05-29T08:04:00.000Z',
    status: 'success',
    total_sources: 9,
    successful_sources: 9,
    failed_sources: 0,
    jobs_found: 42,
    jobs_inserted: 8,
    jobs_updated: 11,
    error_summary: null,
    duration_ms: 240000,
    created_at: '2026-05-29T08:05:00.000Z',
  },
  {
    id: 'run-002',
    started_at: '2026-05-28T08:00:00.000Z',
    finished_at: '2026-05-28T08:05:00.000Z',
    status: 'partial',
    total_sources: 9,
    successful_sources: 8,
    failed_sources: 1,
    jobs_found: 35,
    jobs_inserted: 6,
    jobs_updated: 9,
    error_summary: 'Fallback HTML parser triggered for Lever Direct.',
    duration_ms: 300000,
    created_at: '2026-05-28T08:06:00.000Z',
  },
  {
    id: 'run-003',
    started_at: '2026-05-27T08:00:00.000Z',
    finished_at: '2026-05-27T08:08:00.000Z',
    status: 'failed',
    total_sources: 9,
    successful_sources: 6,
    failed_sources: 3,
    jobs_found: 11,
    jobs_inserted: 2,
    jobs_updated: 3,
    error_summary: 'Several sources returned 429 after rate limiting.',
    duration_ms: 480000,
    created_at: '2026-05-27T08:08:30.000Z',
  },
] satisfies readonly ScrapingRun[];

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
            {MOCK_RUNS.map((run) => (
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

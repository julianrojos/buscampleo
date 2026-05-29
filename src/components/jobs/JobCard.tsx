import type { KeyboardEvent } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';

import RedFlagList from '@/components/jobs/RedFlagList';
import ScoreBadge from '@/components/jobs/ScoreBadge';
import SignalChips from '@/components/jobs/SignalChips';
import StatusBadge from '@/components/jobs/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useJobActions from '@/hooks/use-job-actions';
import type { Job } from '@/types/job';
import { cn } from '@/lib/utils';

interface JobCardProps {
  readonly job: Job;
  readonly isActive: boolean;
}

function formatRelativeDate(value: string | null): string {
  if (!value) {
    return 'Fecha desconocida';
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) {
    return 'Hoy';
  }

  if (diffDays === 1) {
    return 'Hace 1 día';
  }

  return `Hace ${diffDays} días`;
}

export default function JobCard({ job, isActive }: JobCardProps) {
  const { save, unsave, hide, apply } = useJobActions();

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === ' ') {
      event.preventDefault();
      (event.currentTarget as HTMLAnchorElement).click();
    }
  };

  return (
    <article
      className={cn(
        'group flex flex-col gap-3 border border-border bg-background p-4 text-left transition-colors hover:bg-muted/30',
        isActive && 'border-primary/70 bg-muted/40',
        !job.is_read && 'border-l-4 border-l-primary',
      )}
    >
      <div className="flex items-start gap-3">
        <Link
          to={`/ofertas/${job.id}`}
          onKeyDown={handleKeyDown}
          className="flex min-w-0 flex-1 items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {!job.is_read ? <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" /> : null}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <ScoreBadge score={job.final_score} />
                  <h3 className="truncate text-sm font-semibold leading-tight">{job.title}</h3>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {job.company} · {job.source_name}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatRelativeDate(job.published_at)}</span>
              <span>·</span>
              <span>{job.location ?? 'Ubicación desconocida'}</span>
              <span>·</span>
              <StatusBadge status={job.status} />
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={job.is_saved ? 'Quitar de guardadas' : 'Guardar oferta'}
            onClick={() => (job.is_saved ? unsave(job.id) : save(job.id))}
          >
            {job.is_saved ? (
              <BookmarkCheck className="size-3.5" />
            ) : (
              <Bookmark className="size-3.5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Más acciones"
                className="inline-flex size-9 items-center justify-center rounded-none border border-transparent bg-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => hide(job.id)}>Ocultar</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => apply(job.id)}>
                Marcar como aplicada
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => window.open(job.url, '_blank', 'noopener,noreferrer')}
              >
                Abrir original
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SignalChips signals={job.positive_signals} max={3} />
      <RedFlagList flags={job.red_flags} max={1} />

      <Link
        to={`/ofertas/${job.id}`}
        className="flex items-center justify-between gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="truncate">{job.modality}</span>
        <span className="inline-flex items-center gap-1">
          Ver oferta
          <ExternalLink className="size-3.5" />
        </span>
      </Link>
    </article>
  );
}

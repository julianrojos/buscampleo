import { Outlet, useParams } from 'react-router-dom';

import EmptyState from '@/components/shared/EmptyState';
import FilterPanel from '@/components/filters/FilterPanel';
import JobList from '@/components/jobs/JobList';
import useMediaQuery from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

export default function OffersLayout() {
  const params = useParams();
  const id = params.id;
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const hasDetail = Boolean(id);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <FilterPanel />

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden',
          hasDetail && !isDesktop && 'hidden',
        )}
      >
        <JobList />
      </div>

      {(hasDetail || isDesktop) ? (
        <aside
          className={cn(
            'min-w-0 overflow-hidden border-l border-border bg-background',
            isDesktop ? 'w-[42%] shrink-0 flex-none' : 'flex-1 w-full',
          )}
        >
          {hasDetail ? (
            <Outlet />
          ) : (
            <div className="h-full overflow-y-auto p-4 lg:p-6">
              <EmptyState
                title="Selecciona una oferta"
                description="Abre una oferta para ver su detalle, señales y comparación con tu perfil."
              />
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}

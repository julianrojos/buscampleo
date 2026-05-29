import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';

import ActiveFilters from '@/components/filters/ActiveFilters';
import FilterSheet from '@/components/filters/FilterSheet';
import JobCard from '@/components/jobs/JobCard';
import ErrorState from '@/components/shared/ErrorState';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import useJobFilters from '@/hooks/use-job-filters';
import useJobs from '@/hooks/use-jobs';

export default function JobList() {
  const { filters, resetFilters } = useJobFilters();
  const { data: jobs = [], isLoading, isError, error, refetch } = useJobs(filters);
  const params = useParams();
  const activeId = params.id;
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 6,
  });

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-lg font-semibold tracking-wide uppercase">
                Ofertas
              </h1>
              <p className="text-xs text-muted-foreground">Cargando datos mock...</p>
            </div>
            <FilterSheet />
          </div>
        </div>
        <div className="flex-1 px-4 py-4 lg:px-6">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full min-h-0 flex-col px-4 py-4 lg:px-6">
        <ErrorState
          message={error instanceof Error ? error.message : 'No se pudieron cargar las ofertas.'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-wide uppercase">Ofertas</h1>
            <p className="text-xs text-muted-foreground">0 resultados con estos filtros</p>
          </div>
          <FilterSheet />
        </div>
        <div className="mt-4">
          <EmptyState
            title="No hay resultados"
            description="Prueba a relajar los filtros o limpiar la búsqueda."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center rounded-none border border-border px-4 py-2 text-xs font-semibold tracking-widest uppercase"
              >
                Limpiar filtros
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3 lg:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-wide uppercase">Ofertas</h1>
            <p className="text-xs text-muted-foreground">{jobs.length} resultados activos</p>
          </div>
          <FilterSheet />
        </div>
        <div className="mt-3">
          <ActiveFilters />
        </div>
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6">
        <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          {virtualItems.map((virtualItem) => {
            const job = jobs[virtualItem.index];

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <JobCard job={job} isActive={job.id === activeId} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

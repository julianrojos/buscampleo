import { X } from 'lucide-react';

import useCriteriaConfig from '@/hooks/use-criteria-config';
import useJobFilters from '@/hooks/use-job-filters';
import useSources from '@/hooks/use-sources';
import { findWeightedSignalById } from '@/lib/job-criteria';
import { JOB_STATUS_LABELS } from '@/lib/job-status';
import { cn } from '@/lib/utils';
import { getCriteriaConfigSnapshot } from '@/data/criteria-repository';

export default function ActiveFilters() {
  const { filters, toggleFilter, removeFilter, resetFilters } = useJobFilters();
  const { data: criteria } = useCriteriaConfig();
  const { data: sources = [] } = useSources();
  const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));
  const criteriaConfig = criteria ?? getCriteriaConfigSnapshot();

  const manualChips = [
    filters.query
      ? {
          key: 'query',
          label: `Buscar: ${filters.query}`,
          onRemove: () => removeFilter('query'),
        }
      : null,
    ...filters.source.map((sourceId) => ({
      key: `source-${sourceId}`,
      label: `Fuente: ${sourceNameById.get(sourceId) ?? sourceId}`,
      onRemove: () => toggleFilter('source', sourceId),
    })),
    ...filters.modality.map((modality) => ({
      key: `modality-${modality}`,
      label: `Modalidad: ${modality}`,
      onRemove: () => toggleFilter('modality', modality),
    })),
    ...filters.status.map((status) => ({
      key: `status-${status}`,
      label: `Estado: ${JOB_STATUS_LABELS[status]}`,
      onRemove: () => toggleFilter('status', status),
    })),
    filters.min_score !== null
      ? {
          key: 'min_score',
          label: `Score ≥ ${filters.min_score}`,
          onRemove: () => removeFilter('min_score'),
        }
      : null,
    ...filters.keywords.map((keyword) => ({
      key: `keyword-${keyword}`,
      label: `Keyword: ${keyword}`,
      onRemove: () => toggleFilter('keywords', keyword),
    })),
    filters.pending_analysis
      ? {
          key: 'pending_analysis',
          label: 'Análisis pendiente',
          onRemove: () => removeFilter('pending_analysis'),
        }
      : null,
    filters.show_hidden
      ? {
          key: 'show_hidden',
          label: 'Mostrar ocultas',
          onRemove: () => removeFilter('show_hidden'),
        }
      : null,
    filters.show_criteria_hidden
      ? {
          key: 'show_criteria_hidden',
          label: 'Mostrar excluidas por criterios',
          onRemove: () => removeFilter('show_criteria_hidden'),
        }
      : null,
  ].filter(Boolean) as Array<{
    readonly key: string;
    readonly label: string;
    readonly onRemove: () => void;
  }>;

  const criteriaChips = filters.criteria
    .map((criterionId) => findWeightedSignalById(criterionId, criteriaConfig))
    .filter((criterion): criterion is NonNullable<typeof criterion> => Boolean(criterion))
    .map((criterion) => ({
      key: `criterion-${criterion.id}`,
      label: `Criterios: ${criterion.pattern}`,
      onRemove: () => toggleFilter('criteria', criterion.id),
    }));

  const hasChips = manualChips.length > 0 || criteriaChips.length > 0;

  if (!hasChips) {
    return null;
  }

  return (
    <div className="space-y-3">
      {manualChips.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.625rem] font-semibold tracking-widest uppercase text-muted-foreground">
            Manual
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {manualChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className={cn(
                  'inline-flex items-center gap-1 border border-border bg-muted px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:bg-background hover:text-foreground',
                )}
              >
                <span>{chip.label}</span>
                <X className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {criteriaChips.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[0.625rem] font-semibold tracking-widest uppercase text-muted-foreground">
            Criterios
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {criteriaChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className={cn(
                  'inline-flex items-center gap-1 border border-success/30 bg-success/10 px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase text-success transition-colors hover:bg-success/15',
                )}
              >
                <span>{chip.label}</span>
                <X className="size-3.5" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={resetFilters}
        className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase text-foreground transition-colors hover:bg-muted"
      >
        Limpiar todo
      </button>
    </div>
  );
}

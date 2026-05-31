import { X } from 'lucide-react';

import useJobFilters from '@/hooks/use-job-filters';
import useSources from '@/hooks/use-sources';
import { cn } from '@/lib/utils';

export default function ActiveFilters() {
  const { filters, toggleFilter, removeFilter, resetFilters } = useJobFilters();
  const { data: sources = [] } = useSources();
  const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));

  const chips = [
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
    filters.unread_only
      ? {
          key: 'unread_only',
          label: 'No leídas',
          onRemove: () => removeFilter('unread_only'),
        }
      : null,
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
  ].filter(Boolean) as Array<{
    readonly key: string;
    readonly label: string;
    readonly onRemove: () => void;
  }>;

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
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

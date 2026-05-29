import ActiveFilters from '@/components/filters/ActiveFilters';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import useJobFilters from '@/hooks/use-job-filters';
import { MOCK_SOURCES } from '@/data/mock-sources';

const MODALITY_OPTIONS = [
  { value: 'remote', label: 'Remoto' },
  { value: 'hybrid', label: 'Híbrido' },
  { value: 'onsite', label: 'Presencial' },
  { value: 'unknown', label: 'Desconocida' },
] as const;

const SORT_OPTIONS = [
  { value: 'date', label: 'Fecha' },
  { value: 'score', label: 'Score' },
  { value: 'company', label: 'Empresa' },
  { value: 'source', label: 'Fuente' },
  { value: 'modality', label: 'Modalidad' },
] as const;

export function FilterFields() {
  const { filters, setFilter, toggleFilter, resetFilters } = useJobFilters();

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Buscar
        </label>
        <Input
          aria-label="Buscar ofertas"
          value={filters.query}
          onChange={(event) => setFilter('query', event.target.value)}
          placeholder="Título, empresa, descripción..."
        />
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Fuente
        </label>
        <div className="space-y-2">
          {MOCK_SOURCES.map((source) => (
            <label key={source.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.source.includes(source.id)}
                onCheckedChange={() => toggleFilter('source', source.id)}
              />
              <span>{source.name}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Modalidad
        </label>
        <div className="space-y-2">
          {MODALITY_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.modality.includes(option.value)}
                onCheckedChange={() => toggleFilter('modality', option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Score mínimo
        </label>
        <Input
          aria-label="Score mínimo"
          inputMode="numeric"
          type="number"
          min={0}
          max={100}
          value={filters.min_score ?? ''}
          onChange={(event) => {
            const nextValue = event.target.value;
            setFilter('min_score', nextValue === '' ? null : Number(nextValue));
          }}
          placeholder="70"
        />
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Filtros rápidos
        </label>
        <div className="space-y-2">
          {[
            { key: 'unread_only', label: 'Solo no leídas' },
            { key: 'pending_analysis', label: 'Análisis pendiente' },
            { key: 'show_hidden', label: 'Mostrar ocultas' },
          ].map((option) => (
            <label key={option.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters[option.key as keyof typeof filters] as boolean}
                onCheckedChange={(checked) =>
                  setFilter(option.key as keyof typeof filters, Boolean(checked))
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Orden
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={filters.sort}
            onValueChange={(value) => setFilter('sort', value as typeof filters.sort)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.sort_dir}
            onValueChange={(value) => setFilter('sort_dir', value as typeof filters.sort_dir)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Dirección" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Desc</SelectItem>
              <SelectItem value="asc">Asc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" type="button" onClick={resetFilters}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

export default function FilterPanel() {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-background px-4 py-4 lg:flex">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-sm font-semibold tracking-widest uppercase">
            Filtros
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ajusta fuentes, modalidad, score y estado de lectura.
          </p>
        </div>
        <Separator />
        <ScrollArea className="h-[calc(100vh-11rem)] pr-3">
          <FilterFields />
          <div className="mt-5">
            <ActiveFilters />
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}

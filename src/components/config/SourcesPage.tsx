import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import useSources from '@/hooks/use-sources';
import {
  createSource,
  deleteSource,
  setSourceActive,
  updateSourceRunInfo,
} from '@/data/source-repository';
import { cn } from '@/lib/utils';

function SourceHealthIndicator({ failures }: { readonly failures: number }) {
  const tone = failures >= 3 ? 'error' : failures > 0 ? 'warning' : 'ok';
  const labels = {
    ok: 'Saludable',
    warning: 'Aviso',
    error: 'Error',
  } as const;

  return (
    <Badge
      className={cn(
        'border px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase',
        tone === 'ok' && 'border-success/30 bg-success/15 text-success',
        tone === 'warning' && 'border-warning/30 bg-warning/15 text-warning',
        tone === 'error' && 'border-danger/30 bg-danger/15 text-danger',
      )}
    >
      {labels[tone]}
    </Badge>
  );
}

export default function SourcesPage() {
  const { data: sources = [], isLoading, refetch } = useSources();

  async function handleAddSource() {
    const name = window.prompt('Nombre de la fuente');
    const url = window.prompt('URL de la fuente');

    if (!name || !url) {
      return;
    }

    await createSource({
      name,
      url,
      type: 'manual',
      category: 'generalist',
      active: true,
      priority: 5,
      parser_key: null,
      last_success_at: null,
      last_error_at: null,
      consecutive_failures: 0,
      offers_found: 0,
      notes: null,
    });
    await refetch();
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">Fuentes</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona las fuentes desde las que Buscampleo rastrea ofertas.
            </p>
          </div>
          <Button type="button" onClick={() => void handleAddSource()}>
            Añadir fuente
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último éxito</TableHead>
              <TableHead>Ofertas</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading &&
              sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>{source.name}</TableCell>
                  <TableCell>{source.type}</TableCell>
                  <TableCell>{source.category}</TableCell>
                  <TableCell>
                    <SourceHealthIndicator failures={source.consecutive_failures} />
                  </TableCell>
                  <TableCell>{source.last_success_at ?? 'Sin éxito'}</TableCell>
                  <TableCell>{source.offers_found}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Toggle
                        pressed={source.active}
                        onPressedChange={async () => {
                          await setSourceActive(source.id, !source.active);
                          await refetch();
                        }}
                        size="sm"
                      >
                        {source.active ? 'Activa' : 'Inactiva'}
                      </Toggle>
                      <Button type="button" variant="outline" size="sm">
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await updateSourceRunInfo(source.id, {
                            last_success_at: new Date().toISOString(),
                            last_error_at: null,
                            consecutive_failures: 0,
                            offers_found: source.offers_found + 1,
                          });
                          await refetch();
                        }}
                      >
                        Probar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          await deleteSource(source.id);
                          await refetch();
                        }}
                      >
                        Borrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

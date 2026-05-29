import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import { MOCK_SOURCES } from '@/data/mock-sources';
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
  const [sources, setSources] = useState(() => MOCK_SOURCES);

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">
              Fuentes
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona las fuentes desde las que Buscampleo rastrea ofertas.
            </p>
          </div>
          <Button type="button">Añadir fuente</Button>
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
            {sources.map((source) => (
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
                      onPressedChange={() =>
                        setSources((current) =>
                          current.map((item) =>
                            item.id === source.id
                              ? { ...item, active: !item.active }
                              : item,
                          ),
                        )
                      }
                      size="sm"
                    >
                      {source.active ? 'Activa' : 'Inactiva'}
                    </Toggle>
                    <Button type="button" variant="outline" size="sm">
                      Editar
                    </Button>
                    <Button type="button" variant="outline" size="sm">
                      Probar
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

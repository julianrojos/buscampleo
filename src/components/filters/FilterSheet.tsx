import { Filter } from 'lucide-react';

import { FilterFields } from '@/components/filters/FilterPanel';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import ActiveFilters from '@/components/filters/ActiveFilters';

export default function FilterSheet() {
  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors hover:bg-muted lg:hidden">
        <Filter className="size-3.5" />
        Filtrar
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] w-full rounded-none">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Ajusta el listado sin salir de la pantalla.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
          <FilterFields />
          <ActiveFilters />
        </div>
      </SheetContent>
    </Sheet>
  );
}

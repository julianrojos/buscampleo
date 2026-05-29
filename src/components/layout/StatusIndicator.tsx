import { Badge } from '@/components/ui/badge';

export default function StatusIndicator() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="border border-border bg-muted px-2 py-1 text-[0.625rem] tracking-widest text-muted-foreground">
        Última ejecución: hace 2h
      </Badge>
      <Badge className="border border-border bg-primary px-2 py-1 text-[0.625rem] tracking-widest text-primary-foreground">
        5 nuevas
      </Badge>
      <Badge className="border border-border bg-muted px-2 py-1 text-[0.625rem] tracking-widest text-destructive">
        1 error
      </Badge>
    </div>
  );
}

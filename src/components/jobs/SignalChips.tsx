import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SignalChipsProps {
  readonly signals: string[];
  readonly max?: number;
  readonly className?: string;
}

export default function SignalChips({
  signals,
  max = 3,
  className,
}: SignalChipsProps) {
  if (signals.length === 0) {
    return null;
  }

  const visibleSignals = signals.slice(0, max);
  const hiddenCount = signals.length - visibleSignals.length;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleSignals.map((signal) => (
        <Badge
          key={signal}
          className="border border-border bg-muted px-2 py-1 text-[0.625rem] tracking-widest text-muted-foreground"
        >
          {signal}
        </Badge>
      ))}
      {hiddenCount > 0 ? (
        <Badge className="border border-border bg-background px-2 py-1 text-[0.625rem] tracking-widest text-muted-foreground">
          +{hiddenCount} más
        </Badge>
      ) : null}
    </div>
  );
}

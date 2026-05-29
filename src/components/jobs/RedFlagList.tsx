import { TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

interface RedFlagListProps {
  readonly flags: string[];
  readonly max?: number;
  readonly className?: string;
}

export default function RedFlagList({
  flags,
  max,
  className,
}: RedFlagListProps) {
  if (flags.length === 0) {
    return null;
  }

  const visibleFlags = typeof max === 'number' ? flags.slice(0, max) : flags;

  return (
    <ul className={cn('space-y-1', className)}>
      {visibleFlags.map((flag) => (
        <li key={flag} className="flex items-start gap-2 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <span>{flag}</span>
        </li>
      ))}
    </ul>
  );
}

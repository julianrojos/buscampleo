import { cva, type VariantProps } from 'class-variance-authority';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const scoreBadgeVariants = cva(
  'inline-flex min-w-10 items-center justify-center rounded-none border px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase',
  {
    variants: {
      tone: {
        high: 'border-success/30 bg-success/15 text-success',
        mid: 'border-warning/30 bg-warning/15 text-warning',
        low: 'border-danger/30 bg-danger/15 text-danger',
        unknown: 'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      tone: 'unknown',
    },
  },
);

type ScoreBadgeTone = VariantProps<typeof scoreBadgeVariants>['tone'];

function getTone(score: number | null): ScoreBadgeTone {
  if (score === null) {
    return 'unknown';
  }

  if (score >= 80) {
    return 'high';
  }

  if (score >= 60) {
    return 'mid';
  }

  return 'low';
}

interface ScoreBadgeProps {
  readonly score: number | null;
  readonly className?: string;
}

export default function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const tone = getTone(score);

  return (
    <Badge className={cn(scoreBadgeVariants({ tone }), className)}>
      {score === null ? '—' : score.toFixed(0)}
    </Badge>
  );
}

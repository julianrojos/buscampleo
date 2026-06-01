import { cva } from 'class-variance-authority';

import { Badge } from '@/components/ui/badge';
import { JOB_STATUS_LABELS } from '@/lib/job-status';
import type { JobStatus } from '@/types/job';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'border px-2 py-1 text-[0.625rem] font-semibold tracking-widest uppercase',
  {
    variants: {
      tone: {
        new: 'border-primary/30 bg-primary/15 text-primary',
        seen: 'border-border bg-muted text-muted-foreground',
        saved: 'border-warning/30 bg-warning/15 text-warning',
        hidden: 'border-border bg-background text-muted-foreground',
        applied: 'border-success/30 bg-success/15 text-success',
      },
    },
    defaultVariants: {
      tone: 'seen',
    },
  },
);

interface StatusBadgeProps {
  readonly status: JobStatus;
  readonly className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(statusBadgeVariants({ tone: status }), className)}>
      {JOB_STATUS_LABELS[status]}
    </Badge>
  );
}

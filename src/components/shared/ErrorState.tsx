import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  readonly message: string;
  readonly onRetry?: () => void;
  readonly action?: ReactNode;
}

export default function ErrorState({ message, onRetry, action }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-none border border-border bg-background px-6 py-10 text-center"
    >
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">
          Algo ha fallado
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
      {action ? (
        action
      ) : onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

interface LoadingStateProps {
  readonly count?: number;
}

export default function LoadingState({ count = 5 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-none border border-border bg-background p-4"
        >
          <div className="mb-3 h-4 w-2/3 rounded-none bg-muted" />
          <div className="mb-2 h-3 w-1/2 rounded-none bg-muted/80" />
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-none bg-muted/70" />
            <div className="h-5 w-16 rounded-none bg-muted/70" />
            <div className="h-5 w-24 rounded-none bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

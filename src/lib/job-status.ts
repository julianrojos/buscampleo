import type { JobStatus } from '@/types/job';

export const JOB_STATUS_VALUES = ['new', 'seen', 'saved', 'hidden', 'applied'] as const satisfies readonly JobStatus[];

export const JOB_STATUS_LABELS = {
  new: 'Nueva',
  seen: 'Leída',
  saved: 'Guardada',
  hidden: 'Oculta',
  applied: 'Aplicada',
} as const satisfies Record<JobStatus, string>;

export const JOB_STATUS_OPTIONS = JOB_STATUS_VALUES.map((value) => ({
  value,
  label: JOB_STATUS_LABELS[value],
})) as ReadonlyArray<{
  readonly value: JobStatus;
  readonly label: string;
}>;

import type { Database } from './database.types';

type JobRow = Database['public']['Tables']['jobs']['Row'];

export function resolveJobByIdRow(
  data: JobRow | null,
  error: { message: string } | null,
): JobRow | undefined {
  if (error) {
    throw new Error(`db.jobs.read_failed: ${error.message}`);
  }

  return data ?? undefined;
}

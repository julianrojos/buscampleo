import { z } from 'zod';

export const CompareJobProfileBodySchema = z.object({
  jobId: z.string().min(1),
});

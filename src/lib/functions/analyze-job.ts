import { z } from 'zod';

export const AnalyzeJobBodySchema = z.object({
  jobId: z.string().min(1),
});

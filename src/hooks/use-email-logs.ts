import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { listEmailLogs } from '@/data/email-log-repository';
import type { EmailLog } from '@/types/account';

export default function useEmailLogs(): UseQueryResult<EmailLog[]> {
  return useQuery({
    queryKey: ['email-logs'],
    queryFn: listEmailLogs,
    placeholderData: (previousData) => previousData,
  });
}

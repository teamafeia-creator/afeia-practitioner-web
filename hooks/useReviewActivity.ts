'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchReviewActivity } from '@/lib/morning-review/queries';

/** Actions de revue du jour (« Traités ce matin ») et reports par consultant. */
export function useReviewActivity() {
  return useQuery({
    queryKey: ['review-activity'],
    queryFn: fetchReviewActivity,
    staleTime: 60 * 1000,
  });
}

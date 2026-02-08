'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMorningReviewData } from '@/lib/morning-review/queries';

export function useMorningReview() {
  return useQuery({
    queryKey: ['morning-review'],
    queryFn: fetchMorningReviewData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  snoozeConsultant,
  unsnoozeConsultant,
  sendMessageFromReview,
  saveObservationNote,
} from '@/lib/morning-review/queries';

export function useSnoozeConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultantId, reason, until }: { consultantId: string; reason: string; until: string }) =>
      snoozeConsultant(consultantId, reason, until),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['morning-review'] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

export function useUnsnoozeConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultantId: string) => unsnoozeConsultant(consultantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['morning-review'] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

export function useSendMessageFromReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultantId, message }: { consultantId: string; message: string }) =>
      sendMessageFromReview(consultantId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['morning-review'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useSaveObservationNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ consultantId, content }: { consultantId: string; content: string }) =>
      saveObservationNote(consultantId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['morning-review'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { db } from '@/lib/db';
import { getLanguage, translate, type TranslationKey, type TranslationParams } from '@/lib/i18n';
import { betKeys } from '@/lib/keys';
import { useAddToast } from '@/store/use-ui-store';
import type { BetDraftParsed, BetSlip, LegResult } from '@/types';

function tx(key: TranslationKey, params?: TranslationParams): string {
  return translate(getLanguage(), key, params);
}

export function useBetsQuery() {
  return useQuery({ queryKey: betKeys.lists(), queryFn: () => db.listBets() });
}

export function useBetQuery(id: string | undefined) {
  return useQuery({
    queryKey: betKeys.detail(id ?? ''),
    queryFn: () => db.getBet(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateBetMutation() {
  const queryClient = useQueryClient();
  const toast = useAddToast();
  return useMutation({
    mutationFn: (draft: BetDraftParsed) => db.createBet(draft),
    onSuccess: (bet) => {
      void queryClient.invalidateQueries({ queryKey: betKeys.all });
      queryClient.setQueryData(betKeys.detail(bet.id), bet);
      toast({ kind: 'success', title: tx('toast.betSaved'), description: bet.title });
    },
  });
}

export function useUpdateBetMutation(id: string) {
  const queryClient = useQueryClient();
  const toast = useAddToast();
  return useMutation({
    mutationFn: (draft: BetDraftParsed) => db.updateBet(id, draft),
    onSuccess: (bet) => {
      queryClient.setQueryData(betKeys.detail(bet.id), bet);
      void queryClient.invalidateQueries({ queryKey: betKeys.lists() });
      toast({ kind: 'success', title: tx('toast.betUpdated'), description: bet.title });
    },
  });
}

export function useUpdateLegResultMutation(betId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { legId: string; result: LegResult }) =>
      db.updateLegResult(betId, variables.legId, variables.result),
    onSuccess: (bet) => {
      queryClient.setQueryData(betKeys.detail(betId), bet);
      void queryClient.invalidateQueries({ queryKey: betKeys.lists() });
    },
  });
}

export function useSettleBetMutation(betId: string) {
  const queryClient = useQueryClient();
  const toast = useAddToast();
  return useMutation({
    mutationFn: (status: BetSlip['status']) => db.setBetStatus(betId, status),
    onSuccess: (bet) => {
      queryClient.setQueryData(betKeys.detail(betId), bet);
      void queryClient.invalidateQueries({ queryKey: betKeys.lists() });
      toast({
        kind: 'success',
        title: tx('toast.betSettled'),
        description: tx('toast.betSettledDescription', {
          status: tx(`status.${bet.status}`),
        }),
      });
    },
  });
}

export function useDeleteBetMutation() {
  const queryClient = useQueryClient();
  const toast = useAddToast();
  return useMutation({
    mutationFn: (id: string) => db.deleteBet(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: betKeys.all });
      toast({ kind: 'success', title: tx('toast.betDeleted') });
    },
  });
}

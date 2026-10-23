import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { db } from '@/lib/db';
import { getLanguage, translate, type TranslationKey, type TranslationParams } from '@/lib/i18n';
import { analysisKeys } from '@/lib/keys';
import { useAddToast } from '@/store/use-ui-store';
import type { AnalysisDraftParsed } from '@/types';

function tx(key: TranslationKey, params?: TranslationParams): string {
  return translate(getLanguage(), key, params);
}

export function useAnalysesQuery() {
  return useQuery({ queryKey: analysisKeys.lists(), queryFn: () => db.listAnalyses() });
}

export function useAnalysisQuery(id: string | undefined) {
  return useQuery({
    queryKey: analysisKeys.detail(id ?? ''),
    queryFn: () => db.getAnalysis(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateAnalysisMutation() {
  const queryClient = useQueryClient();
  const toast = useAddToast();
  return useMutation({
    mutationFn: (draft: AnalysisDraftParsed) => db.createAnalysis(draft),
    onSuccess: (analysis) => {
      void queryClient.invalidateQueries({ queryKey: analysisKeys.all });
      queryClient.setQueryData(analysisKeys.detail(analysis.id), analysis);
      toast({ kind: 'success', title: tx('toast.analysisSaved'), description: analysis.title });
    },
  });
}

export function useUpdateAnalysisMutation(id: string) {
  const queryClient = useQueryClient();
  const toast = useAddToast();
  return useMutation({
    mutationFn: (draft: AnalysisDraftParsed) => db.updateAnalysis(id, draft),
    onSuccess: (analysis) => {
      queryClient.setQueryData(analysisKeys.detail(analysis.id), analysis);
      void queryClient.invalidateQueries({ queryKey: analysisKeys.lists() });
      toast({ kind: 'success', title: tx('toast.analysisUpdated'), description: analysis.title });
    },
  });
}

export function useDeleteAnalysisMutation() {
  const queryClient = useQueryClient();
  const toast = useAddToast();
  return useMutation({
    mutationFn: (id: string) => db.deleteAnalysis(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: analysisKeys.all });
      toast({ kind: 'success', title: tx('toast.analysisDeleted') });
    },
  });
}

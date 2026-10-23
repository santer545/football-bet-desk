import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { EmptyState, PageHeader, Skeleton } from '@/components/feedback/states';
import {
  useAnalysisQuery,
  useCreateAnalysisMutation,
  useUpdateAnalysisMutation,
} from '@/features/analyses/api/hooks';
import { AnalysisForm } from '@/features/analyses/components/analysis-form';
import { useBetsQuery } from '@/features/bets/api/hooks';
import { useTranslation } from '@/lib/i18n';
import { useAddToast } from '@/store/use-ui-store';
import type { AnalysisDraft } from '@/types';

export function AnalysisEditorPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useAddToast();
  const { t } = useTranslation();
  const isEdit = mode === 'edit';
  const analysisQuery = useAnalysisQuery(isEdit ? id : undefined);
  const betsQuery = useBetsQuery();
  const createMutation = useCreateAnalysisMutation();
  const updateMutation = useUpdateAnalysisMutation(id ?? '');

  if (isEdit && analysisQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[32rem]" />
      </div>
    );
  }

  if (isEdit && (analysisQuery.error || !analysisQuery.data)) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title={t('analyses.detail.notFoundTitle')}
        description={t('analyses.editor.notFoundDescription')}
        action={
          <Link to="/analyses" className="text-accent text-sm font-semibold hover:underline">
            {t('analyses.detail.back')}
          </Link>
        }
      />
    );
  }

  const initial = isEdit ? analysisQuery.data : undefined;

  const handleSubmit = async (draft: AnalysisDraft) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync(draft);
        void navigate(`/analyses/${id}`);
        return;
      }
      const created = await createMutation.mutateAsync(draft);
      void navigate(`/analyses/${created.id}`);
    } catch (error) {
      toast({
        kind: 'error',
        title: t('analyses.editor.saveError'),
        description: error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  };

  return (
    <div>
      <div className="mb-3">
        <Link
          to={isEdit && id ? `/analyses/${id}` : '/analyses'}
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {isEdit ? t('analyses.editor.back') : t('analyses.editor.all')}
        </Link>
      </div>
      <PageHeader
        eyebrow={t('analyses.editor.eyebrow')}
        title={isEdit ? t('analyses.editor.editTitle') : t('analyses.editor.newTitle')}
        description={
          isEdit ? t('analyses.editor.editDescription') : t('analyses.editor.newDescription')
        }
      />
      <AnalysisForm
        initial={initial}
        bets={betsQuery.data ?? []}
        submitLabel={isEdit ? t('analyses.form.saveChanges') : t('analyses.form.create')}
        submitting={isEdit ? updateMutation.isPending : createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => void navigate(isEdit && id ? `/analyses/${id}` : '/analyses')}
      />
    </div>
  );
}

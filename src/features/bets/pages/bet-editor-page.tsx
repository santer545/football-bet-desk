import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { EmptyState, PageHeader, Skeleton } from '@/components/feedback/states';
import { useTranslation } from '@/lib/i18n';
import { useAddToast } from '@/store/use-ui-store';
import type { BetDraft } from '@/types';
import { todayISO } from '@/utils/format';
import { useBetQuery, useCreateBetMutation, useUpdateBetMutation } from '@/features/bets/api/hooks';
import { BetForm } from '@/features/bets/components/bet-form';
import { toLocalInput } from '@/features/bets/lib/draft';

export function BetEditorPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useAddToast();
  const { t } = useTranslation();
  const betQuery = useBetQuery(mode === 'edit' ? id : undefined);
  const createMutation = useCreateBetMutation();
  const updateMutation = useUpdateBetMutation(id ?? '');
  const isEdit = mode === 'edit';
  const routedDraft = (location.state as { draft?: BetDraft } | null)?.draft;

  const defaultDraft = useMemo<BetDraft | undefined>(() => {
    if (isEdit) return undefined;
    if (routedDraft) return routedDraft;
    const home = searchParams.get('home');
    const away = searchParams.get('away');
    if (!home || !away) return undefined;
    const date = searchParams.get('date') ?? todayISO();
    const kickoff = searchParams.get('kickoff') ?? `${date}T20:00:00.000Z`;
    const market = searchParams.get('market') ?? 'Double Chance';
    const selection = searchParams.get('selection') ?? '';
    const competition = searchParams.get('competition') ?? '';
    const competitionLabel = searchParams.get('compLabel') ?? competition;
    const odds = searchParams.get('odds');
    const summary = searchParams.get('summary') ?? '';
    const fallbackCompetition = t('bets.defaultCompetition');
    return {
      date,
      title: searchParams.get('title') ?? `${home} vs ${away}`,
      competitionLabel: competitionLabel || fallbackCompetition,
      risk: 'medium',
      summary,
      notes: '',
      legs: [
        {
          kickoff: toLocalInput(kickoff),
          competition: competition || 'PL',
          competitionLabel: competitionLabel || fallbackCompetition,
          homeTeam: home,
          awayTeam: away,
          market,
          selection,
          odds: odds ? Number(odds) : undefined,
          result: 'pending',
          score: '',
          note: '',
        },
      ],
    };
  }, [isEdit, routedDraft, searchParams, t]);

  if (isEdit && betQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[32rem]" />
      </div>
    );
  }

  if (isEdit && (betQuery.error || !betQuery.data)) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title={t('bets.detail.notFoundTitle')}
        description={t('bets.editor.notFoundDescription')}
        action={
          <Link to="/bets" className="text-accent text-sm font-semibold hover:underline">
            {t('bets.detail.back')}
          </Link>
        }
      />
    );
  }

  const initial = isEdit ? betQuery.data : undefined;

  const handleSubmit = async (draft: BetDraft) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync(draft);
        void navigate(`/bets/${id}`);
        return;
      }
      const created = await createMutation.mutateAsync(draft);
      void navigate(`/bets/${created.id}`);
    } catch (error) {
      toast({
        kind: 'error',
        title: t('bets.editor.saveError'),
        description: error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  };

  return (
    <div>
      <div className="mb-3">
        <Link
          to={isEdit && id ? `/bets/${id}` : '/bets'}
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {isEdit ? t('bets.editor.backToSlip') : t('bets.editor.allBets')}
        </Link>
      </div>
      <PageHeader
        eyebrow={t('bets.editor.eyebrow')}
        title={isEdit ? t('bets.editor.editTitle') : t('bets.editor.buildTitle')}
        description={isEdit ? t('bets.editor.editDescription') : t('bets.editor.buildDescription')}
      />
      <BetForm
        initial={initial}
        defaultDraft={defaultDraft}
        submitLabel={isEdit ? t('bets.form.saveChanges') : t('bets.form.create')}
        submitting={isEdit ? updateMutation.isPending : createMutation.isPending}
        onSubmit={handleSubmit}
        onCancel={() => void navigate(isEdit && id ? `/bets/${id}` : '/bets')}
      />
    </div>
  );
}

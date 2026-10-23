import { ArrowLeft, CalendarDays, FileJson, FileText, Pencil, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { EmptyState, Skeleton } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { Modal } from '@/components/ui/modal';
import { useAnalysesQuery } from '@/features/analyses';
import { useBetQuery, useDeleteBetMutation } from '@/features/bets/api/hooks';
import { BetDocument } from '@/features/bets/components/bet-document';
import { BetResultPanel } from '@/features/bets/components/bet-legs';
import { BetStatusBadge, RiskBadge } from '@/features/bets/components/badges';
import { useTranslation } from '@/lib/i18n';
import type { AnalysisRecord } from '@/types';
import { betToMarkdown, downloadFile, exportBetJson, printPage } from '@/utils/export';
import { ANALYSIS_KIND_META, formatDate, formatDateLong } from '@/utils/format';

export function BetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: bet, isLoading, error } = useBetQuery(id);
  const { data: analyses } = useAnalysesQuery();
  const deleteMutation = useDeleteBetMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const related = useMemo<AnalysisRecord[]>(() => {
    if (!bet || !analyses) return [];
    const explicit = analyses.find((analysis) => analysis.id === bet.analysisId);
    const sameDate = analyses.filter(
      (analysis) => analysis.date === bet.date && analysis.id !== bet.analysisId,
    );
    return [explicit, ...sameDate].filter((analysis): analysis is AnalysisRecord =>
      Boolean(analysis),
    );
  }, [analyses, bet]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !bet) {
    return (
      <EmptyState
        icon={FileText}
        title={t('bets.detail.notFoundTitle')}
        description={error instanceof Error ? error.message : t('bets.detail.notFoundDescription')}
        action={
          <LinkButton to="/bets" variant="secondary" icon={<ArrowLeft className="size-4" />}>
            {t('bets.detail.back')}
          </LinkButton>
        }
      />
    );
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/bets"
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t('bets.title')}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText className="size-3.5" />}
            onClick={() =>
              downloadFile(
                `bet-${bet.date}-${bet.title.toLowerCase().replace(/\W+/g, '-')}.md`,
                betToMarkdown(bet),
                'text/markdown',
              )
            }
          >
            {t('common.markdown')}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('bets.detail.exportJson')}
            title={t('bets.detail.exportJson')}
            onClick={() => exportBetJson(bet)}
          >
            <FileJson className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('bets.detail.print')}
            title={t('bets.detail.print')}
            onClick={printPage}
          >
            <Printer className="size-3.5" />
          </Button>
          <LinkButton
            to={`/bets/${bet.id}/edit`}
            variant="secondary"
            size="sm"
            icon={<Pencil className="size-3.5" />}
          >
            {t('bets.detail.edit')}
          </LinkButton>
          <Button
            variant="danger"
            size="icon-sm"
            aria-label={t('bets.detail.delete')}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <BetStatusBadge status={bet.status} />
        <RiskBadge risk={bet.risk} />
        <span className="text-muted text-xs">{formatDateLong(bet.date)}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card padding="lg">
          <BetDocument bet={bet} showHeading={false} editable />
        </Card>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <BetResultPanel bet={bet} />

          <Card padding="md">
            <p className="eyebrow mb-3">{t('bets.detail.matchedAnalyses')}</p>
            {related.length === 0 ? (
              <p className="text-muted text-xs leading-relaxed">
                {t('bets.detail.noAnalysis')}{' '}
                <Link to="/analyses/new" className="text-accent hover:underline">
                  {t('bets.detail.writeOne')}
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {related.slice(0, 3).map((analysis) => (
                  <Link
                    key={analysis.id}
                    to={`/analyses/${analysis.id}`}
                    className="border-line bg-surface-2/60 hover:border-accent/40 block rounded-xl border p-3 transition-colors"
                  >
                    <p className="text-foreground line-clamp-2 text-xs font-semibold">
                      {analysis.title}
                    </p>
                    <p className="text-faint mt-1 text-[11px]">
                      {formatDate(analysis.date, 'd MMM yyyy')} ·{' '}
                      {t(ANALYSIS_KIND_META[analysis.kind].labelKey)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md">
            <p className="eyebrow mb-3">{t('bets.detail.provenance')}</p>
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-faint">{t('common.source')}</dt>
                <dd className="text-muted truncate">{bet.sourceFile ?? t('common.manualEntry')}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-faint">{t('common.created')}</dt>
                <dd className="numeric text-muted">
                  {formatDate(bet.createdAt, 'd MMM yyyy HH:mm')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-faint">{t('common.updated')}</dt>
                <dd className="numeric text-muted">
                  {formatDate(bet.updatedAt, 'd MMM yyyy HH:mm')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-faint">{t('bets.detail.id')}</dt>
                <dd className="text-muted truncate">{bet.id}</dd>
              </div>
            </dl>
            <div className="text-faint mt-3 flex items-center gap-1.5 text-[11px]">
              <CalendarDays className="size-3" />
              {t('bets.detail.legsMeta', {
                count: bet.legs.length,
                competition: bet.competitionLabel,
              })}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={confirmOpen} onOpenChange={setConfirmOpen} size="sm">
        <Modal.Header
          title={t('bets.detail.deleteTitle')}
          description={t('bets.detail.deleteDescription')}
        />
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => {
              deleteMutation.mutate(bet.id, {
                onSuccess: () => {
                  setConfirmOpen(false);
                  void navigate('/bets');
                },
              });
            }}
          >
            {t('bets.detail.deleteConfirm')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

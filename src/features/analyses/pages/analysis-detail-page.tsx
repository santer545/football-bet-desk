import { ArrowLeft, Download, FileJson, FileText, Pencil, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { EmptyState, Skeleton } from '@/components/feedback/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { MarkdownView } from '@/components/ui/markdown';
import { Modal } from '@/components/ui/modal';
import { useAnalysisQuery, useDeleteAnalysisMutation } from '@/features/analyses/api/hooks';
import { useBetsQuery } from '@/features/bets/api/hooks';
import { BetStatusBadge } from '@/features/bets/components/badges';
import { useTranslation } from '@/lib/i18n';
import type { BetSlip } from '@/types';
import { exportAnalysisJson, exportAnalysisMarkdown, printPage } from '@/utils/export';
import { ANALYSIS_KIND_META, formatDate, formatDateLong, formatOdds } from '@/utils/format';

export function AnalysisDetailPage() {
  const { t, plural } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: analysis, isLoading, error } = useAnalysisQuery(id);
  const { data: bets } = useBetsQuery();
  const deleteMutation = useDeleteAnalysisMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const relatedBets = useMemo<BetSlip[]>(() => {
    if (!analysis || !bets) return [];
    const ids = new Set(analysis.relatedBetIds);
    const direct = bets.filter((bet) => ids.has(bet.id) || bet.analysisId === analysis.id);
    const directIds = new Set(direct.map((bet) => bet.id));
    const sameDate = bets.filter((bet) => bet.date === analysis.date && !directIds.has(bet.id));
    return [...direct, ...sameDate];
  }, [analysis, bets]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[32rem]" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <EmptyState
        icon={FileText}
        title={t('analyses.detail.notFoundTitle')}
        description={
          error instanceof Error ? error.message : t('analyses.detail.notFoundDescription')
        }
        action={
          <LinkButton to="/analyses" variant="secondary" icon={<ArrowLeft className="size-4" />}>
            {t('analyses.detail.back')}
          </LinkButton>
        }
      />
    );
  }

  const meta = ANALYSIS_KIND_META[analysis.kind];
  const body = analysis.content.replace(/^#\s+.+(\r?\n)+/, '').trim();

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/analyses"
          className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          {t('nav.analyses')}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="size-3.5" />}
            onClick={() => exportAnalysisMarkdown(analysis)}
          >
            {t('common.markdown')}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('analyses.detail.exportJson')}
            title={t('analyses.detail.exportJson')}
            onClick={() => exportAnalysisJson(analysis)}
          >
            <FileJson className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('analyses.detail.print')}
            title={t('analyses.detail.print')}
            onClick={printPage}
          >
            <Printer className="size-3.5" />
          </Button>
          <LinkButton
            to={`/analyses/${analysis.id}/edit`}
            variant="secondary"
            size="sm"
            icon={<Pencil className="size-3.5" />}
          >
            {t('analyses.detail.edit')}
          </LinkButton>
          <Button
            variant="danger"
            size="icon-sm"
            aria-label={t('analyses.detail.delete')}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="print-area">
        <div className="mb-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={meta.className}>
              {t(meta.labelKey)}
            </Badge>
            <span className="text-muted text-xs">{formatDateLong(analysis.date)}</span>
          </div>
          <h1 className="font-display text-foreground text-2xl font-black tracking-tight sm:text-3xl">
            {analysis.title}
          </h1>
          {analysis.summary ? (
            <p className="text-muted mt-2 max-w-3xl text-sm leading-relaxed">{analysis.summary}</p>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card padding="lg">
            <MarkdownView content={body} />
          </Card>

          <div className="no-print space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card padding="md">
              <p className="eyebrow mb-3">{t('analyses.detail.linkedBets')}</p>
              {relatedBets.length === 0 ? (
                <p className="text-muted text-xs leading-relaxed">
                  {t('analyses.detail.noSlips')}{' '}
                  <Link to="/bets/new" className="text-accent hover:underline">
                    {t('analyses.detail.addOne')}
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-2">
                  {relatedBets.map((bet) => (
                    <Link
                      key={bet.id}
                      to={`/bets/${bet.id}`}
                      className="border-line bg-surface-2/60 hover:border-accent/40 block rounded-xl border p-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-foreground line-clamp-2 text-xs font-semibold">
                          {bet.title}
                        </p>
                        <BetStatusBadge status={bet.status} />
                      </div>
                      <p className="numeric text-faint mt-1 text-[11px]">
                        {bet.legs.length}{' '}
                        {plural(bet.legs.length, ['нога', 'ноги', 'ніг'], ['leg', 'legs'])} · @{' '}
                        {formatOdds(bet.combinedOdds)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card padding="md">
              <p className="eyebrow mb-3">{t('analyses.detail.metadata')}</p>
              <dl className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-faint">{t('common.source')}</dt>
                  <dd className="text-muted truncate">
                    {analysis.sourceFile ?? t('common.authoredInApp')}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-faint">{t('common.created')}</dt>
                  <dd className="numeric text-muted">
                    {formatDate(analysis.createdAt, 'd MMM yyyy HH:mm')}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-faint">{t('common.updated')}</dt>
                  <dd className="numeric text-muted">
                    {formatDate(analysis.updatedAt, 'd MMM yyyy HH:mm')}
                  </dd>
                </div>
              </dl>
              {analysis.tags.length > 0 ? (
                <div className="border-line mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                  {analysis.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-surface-2 text-faint rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onOpenChange={setConfirmOpen} size="sm">
        <Modal.Header
          title={t('analyses.detail.deleteTitle')}
          description={t('analyses.detail.deleteDescription')}
        />
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => {
              deleteMutation.mutate(analysis.id, {
                onSuccess: () => {
                  setConfirmOpen(false);
                  void navigate('/analyses');
                },
              });
            }}
          >
            {t('analyses.detail.deleteConfirm')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

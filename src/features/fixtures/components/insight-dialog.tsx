import { AlertTriangle, ArrowUpRight, BarChart3, Save, ShieldQuestion } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Skeleton } from '@/components/feedback/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCreateAnalysisMutation } from '@/features/analyses/api/hooks';
import { useTranslation } from '@/lib/i18n';
import { useAddToast } from '@/store/use-ui-store';
import { formatDate, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';

import { useHeadToHeadQuery, useTeamMatchesQuery } from '../api/hooks';
import {
  buildFixtureInsight,
  insightToBetSummary,
  type FixtureInsight,
  type InsightConfidence,
  type TeamFormStats,
} from '../lib/insights';
import type { FdMatch } from '../types';

const confidenceClass: Record<InsightConfidence, string> = {
  low: 'border-line-strong bg-surface-3 text-muted',
  medium: 'border-warn/30 bg-warn-soft text-warn',
  high: 'border-accent/30 bg-accent-soft text-accent',
};

export function FixtureInsightDialog({ match, onClose }: { match: FdMatch; onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useAddToast();
  const { t, formatMarket, formatSelection } = useTranslation();
  const homeQuery = useTeamMatchesQuery(match.homeTeam.id, true);
  const awayQuery = useTeamMatchesQuery(match.awayTeam.id, true);
  const h2hQuery = useHeadToHeadQuery(match.id, true);
  const createAnalysis = useCreateAnalysisMutation();

  const isLoading = homeQuery.isLoading || awayQuery.isLoading || h2hQuery.isLoading;
  const error = homeQuery.error ?? awayQuery.error ?? h2hQuery.error;

  const insight = useMemo<FixtureInsight | null>(() => {
    if (!homeQuery.data || !awayQuery.data) return null;
    return buildFixtureInsight(
      match,
      homeQuery.data.matches,
      awayQuery.data.matches,
      h2hQuery.data?.matches ?? [],
    );
  }, [awayQuery.data, h2hQuery.data, homeQuery.data, match]);

  const saveAnalysis = async () => {
    if (!insight) return;
    try {
      const created = await createAnalysis.mutateAsync({
        date: match.utcDate.slice(0, 10),
        title: t('model.markdownTitle', {
          home: match.homeTeam.name,
          away: match.awayTeam.name,
        }),
        summary: insightToBetSummary(insight),
        content: insight.markdown,
        kind: 'match',
        tagsText: `fixture, ${match.competition.code.toLowerCase()}, model`,
        relatedBetIds: [],
      });
      onClose();
      void navigate(`/analyses/${created.id}`);
    } catch (cause) {
      toast({
        kind: 'error',
        title: t('insight.saveError'),
        description: cause instanceof Error ? cause.message : t('common.unknownError'),
      });
    }
  };

  const buildBet = () => {
    if (!insight || insight.recommendation.market === 'Pass') return;
    const params = new URLSearchParams({
      date: match.utcDate.slice(0, 10),
      kickoff: match.utcDate,
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      competition: match.competition.code,
      compLabel: match.competition.name,
      market: insight.recommendation.market,
      selection: insight.recommendation.selection,
      odds: insight.recommendation.fairOdds.toFixed(2),
      summary: insightToBetSummary(insight),
    });
    onClose();
    void navigate(`/bets/new?${params.toString()}`);
  };

  return (
    <Modal open onOpenChange={(open) => !open && onClose()} size="lg">
      <Modal.Header
        title={`${match.homeTeam.shortName ?? match.homeTeam.name} vs ${match.awayTeam.shortName ?? match.awayTeam.name}`}
        description={t('insight.description', {
          competition: match.competition.name,
          date: formatDate(match.utcDate, 'd MMM yyyy'),
          time: formatTime(match.utcDate),
        })}
      />
      <Modal.Body className="space-y-5">
        {error ? (
          <div className="border-danger/30 bg-danger-soft text-danger rounded-xl border p-4 text-sm">
            {error instanceof Error ? error.message : t('insight.noData')}
          </div>
        ) : isLoading || !insight ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <>
            <div className="border-line bg-surface-2/60 rounded-2xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-accent size-4" />
                  <p className="eyebrow">{t('insight.modelLean')}</p>
                </div>
                <Badge
                  variant="outline"
                  className={confidenceClass[insight.recommendation.confidence]}
                >
                  {t('insight.confidence', {
                    confidence: t(`confidence.${insight.recommendation.confidence}`),
                  })}
                </Badge>
              </div>
              <p className="font-display text-foreground mt-2 text-lg font-black">
                {insight.recommendation.market === 'Pass'
                  ? t('insight.passTitle')
                  : `${formatMarket(insight.recommendation.market)}: ${formatSelection(
                      insight.recommendation.selection,
                    )}`}
              </p>
              <div className="text-muted mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                {insight.recommendation.probability > 0 ? (
                  <span>
                    {t('insight.modelProbability')}{' '}
                    <strong className="text-foreground">
                      {(insight.recommendation.probability * 100).toFixed(0)}%
                    </strong>
                  </span>
                ) : null}
                {insight.recommendation.fairOdds > 0 ? (
                  <span>
                    {t('insight.fairOdds')}{' '}
                    <strong className="numeric text-accent">
                      {insight.recommendation.fairOdds.toFixed(2)}
                    </strong>
                  </span>
                ) : null}
                <span>
                  {t('insight.expectedGoals')}{' '}
                  <strong className="numeric text-foreground">
                    {insight.expectedGoals.toFixed(2)}
                  </strong>
                </span>
              </div>
              <ul className="text-muted mt-3 space-y-1 text-xs leading-relaxed">
                {insight.recommendation.reasoning.slice(0, 4).map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="bg-accent/70 mt-1 size-1 shrink-0 rounded-full" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="eyebrow mb-2">{t('insight.splitForm')}</p>
              <div className="border-line overflow-x-auto rounded-2xl border">
                <table className="w-full min-w-[420px] text-xs">
                  <thead>
                    <tr className="border-line bg-surface-2/60 text-faint border-b text-left">
                      <th className="px-3 py-2 font-semibold">{t('insight.metric')}</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        {match.homeTeam.shortName ?? match.homeTeam.name}
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        {match.awayTeam.shortName ?? match.awayTeam.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-muted">
                    <SplitRow
                      label={t('insight.sample')}
                      home={insight.homeSplit.sample}
                      away={insight.awaySplit.sample}
                    />
                    <SplitRow
                      label={t('insight.record')}
                      home={`${insight.homeSplit.wins}-${insight.homeSplit.draws}-${insight.homeSplit.losses}`}
                      away={`${insight.awaySplit.wins}-${insight.awaySplit.draws}-${insight.awaySplit.losses}`}
                    />
                    <SplitRow
                      label={t('insight.scoredPerGame')}
                      home={insight.homeSplit.avgFor.toFixed(2)}
                      away={insight.awaySplit.avgFor.toFixed(2)}
                    />
                    <SplitRow
                      label={t('insight.concededPerGame')}
                      home={insight.homeSplit.avgAgainst.toFixed(2)}
                      away={insight.awaySplit.avgAgainst.toFixed(2)}
                    />
                    <SplitRow
                      label={t('insight.over25')}
                      home={`${(insight.homeSplit.over25Rate * 100).toFixed(0)}%`}
                      away={`${(insight.awaySplit.over25Rate * 100).toFixed(0)}%`}
                    />
                    <SplitRow
                      label={t('insight.btts')}
                      home={`${(insight.homeSplit.bttsRate * 100).toFixed(0)}%`}
                      away={`${(insight.awaySplit.bttsRate * 100).toFixed(0)}%`}
                    />
                    <tr>
                      <td className="px-3 py-2">{t('insight.recentForm')}</td>
                      <td className="px-3 py-2 text-right">
                        <FormChips stats={insight.homeSplit} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <FormChips stats={insight.awaySplit} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-line bg-surface-2/40 rounded-2xl border p-3">
                <p className="eyebrow mb-2">{t('insight.h2h')}</p>
                {insight.h2h.sample === 0 ? (
                  <p className="text-muted text-xs">{t('insight.noH2h')}</p>
                ) : (
                  <>
                    <p className="text-muted text-xs">
                      {t('insight.h2hSummary', {
                        sample: insight.h2h.sample,
                        homeWins: insight.h2h.homeWins,
                        draws: insight.h2h.draws,
                        awayWins: insight.h2h.awayWins,
                      })}
                    </p>
                    <p className="numeric text-faint mt-1 text-xs">
                      {t('insight.goalsPerGame', {
                        value: insight.h2h.avgGoals.toFixed(2),
                      })}
                    </p>
                    <div className="mt-2 space-y-1">
                      {insight.h2h.matches.slice(0, 3).map((item) => (
                        <p key={item.id} className="text-faint text-[11px]">
                          {item.utcDate.slice(0, 10)} ·{' '}
                          {item.homeTeam.shortName ?? item.homeTeam.name} {item.score.fullTime.home}
                          :{item.score.fullTime.away}{' '}
                          {item.awayTeam.shortName ?? item.awayTeam.name}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="border-warn/20 bg-warn-soft/30 rounded-2xl border p-3">
                <p className="eyebrow text-warn mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="size-3" />
                  {t('insight.preflight')}
                </p>
                <ul className="text-muted space-y-1 text-[11px] leading-relaxed">
                  {insight.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          variant="secondary"
          icon={<Save className="size-4" />}
          disabled={!insight}
          loading={createAnalysis.isPending}
          onClick={() => void saveAnalysis()}
        >
          {t('insight.saveAnalysis')}
        </Button>
        <Button
          variant="primary"
          icon={<ArrowUpRight className="size-4" />}
          disabled={!insight || insight.recommendation.market === 'Pass'}
          onClick={buildBet}
        >
          {t('insight.buildBet')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function SplitRow({
  label,
  home,
  away,
}: {
  label: string;
  home: string | number;
  away: string | number;
}) {
  return (
    <tr className="border-line/60 border-b last:border-0">
      <td className="px-3 py-2">{label}</td>
      <td className="numeric text-foreground px-3 py-2 text-right">{home}</td>
      <td className="numeric text-foreground px-3 py-2 text-right">{away}</td>
    </tr>
  );
}

const formChip: Record<string, string> = {
  W: 'bg-accent-soft text-accent border-accent/30',
  D: 'bg-warn-soft text-warn border-warn/30',
  L: 'bg-danger-soft text-danger border-danger/30',
};

function FormChips({ stats }: { stats: TeamFormStats }) {
  if (stats.form.length === 0) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex gap-1">
      {stats.form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={cn(
            'inline-flex size-5 items-center justify-center rounded border text-[10px] font-bold',
            formChip[result] ?? 'border-line bg-surface-3 text-muted',
          )}
        >
          {result}
        </span>
      ))}
    </span>
  );
}

export function InsightPlaceholder() {
  const { t } = useTranslation();
  return (
    <div className="text-muted flex items-center gap-2 text-xs">
      <ShieldQuestion className="size-4" />
      {t('insight.selectFixture')}
    </div>
  );
}

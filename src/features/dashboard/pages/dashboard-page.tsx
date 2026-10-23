import { eachDayOfInterval, format, subDays } from 'date-fns';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Plus,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, PageHeader, Skeleton, StatCard } from '@/components/feedback/states';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { useAnalysesQuery } from '@/features/analyses';
import { useBetsQuery } from '@/features/bets/api/hooks';
import { BetStatusBadge, RiskBadge } from '@/features/bets/components/badges';
import { DailySuggestions } from '@/features/fixtures';
import { useTranslation } from '@/lib/i18n';
import type { BetSlip } from '@/types';
import { cn } from '@/utils/cn';
import {
  ANALYSIS_KIND_META,
  formatDate,
  formatDateLong,
  formatDayLabel,
  formatOdds,
  formatPercent,
  formatUnits,
} from '@/utils/format';
import { sortBetsByDate, summarizeBets } from '@/utils/stats';

export function DashboardPage() {
  const { t, locale } = useTranslation();
  const betsQuery = useBetsQuery();
  const analysesQuery = useAnalysesQuery();
  const bets = useMemo(() => betsQuery.data ?? [], [betsQuery.data]);
  const summary = useMemo(() => summarizeBets(bets), [bets]);

  const latest = useMemo(() => sortBetsByDate(bets).slice(0, 4), [bets]);
  const upcoming = useMemo(
    () =>
      bets
        .filter((bet) => bet.status === 'pending')
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3),
    [bets],
  );

  const recentAnalyses = analysesQuery.data?.slice(0, 3) ?? [];

  const week = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    return days.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const slips = bets.filter((bet) => bet.date === key);
      const won = slips.filter((bet) => bet.status === 'won').length;
      const lost = slips.filter((bet) => bet.status === 'lost').length;
      return {
        key,
        label: format(day, 'EEEEE', { locale }),
        slips: slips.length,
        won,
        lost,
      };
    });
  }, [bets, locale]);
  const maxSlips = Math.max(1, ...week.map((day) => day.slips));

  return (
    <div>
      <PageHeader
        eyebrow={formatDateLong(new Date())}
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <>
            <LinkButton to="/fixtures" variant="secondary" icon={<Sparkles className="size-4" />}>
              {t('dashboard.syncFixtures')}
            </LinkButton>
            <LinkButton to="/bets/new" variant="primary" icon={<Plus className="size-4" />}>
              {t('dashboard.newBet')}
            </LinkButton>
          </>
        }
      />

      <DailySuggestions />

      {betsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t('dashboard.record')}
            value={t('dashboard.recordValue', { won: summary.won, lost: summary.lost })}
            hint={t('dashboard.recordHint', { total: summary.total, pending: summary.pending })}
            icon={Ticket}
            tone="accent"
          />
          <StatCard
            label={t('dashboard.hitRate')}
            value={formatPercent(summary.hitRate, 1)}
            hint={t('dashboard.hitRateHint', { won: summary.won, settled: summary.settled })}
            icon={TrendingUp}
            tone={summary.hitRate >= 0.5 ? 'accent' : 'warning'}
          />
          <StatCard
            label={t('dashboard.roi')}
            value={formatPercent(summary.roi, 1)}
            hint={t('dashboard.roiHint', {
              profit: formatUnits(summary.profit),
              priced: summary.pricedSlips,
            })}
            icon={Target}
            tone={summary.profit >= 0 ? 'accent' : 'danger'}
          />
          <StatCard
            label={t('dashboard.legHitRate')}
            value={formatPercent(summary.legs.hitRate, 1)}
            hint={t('dashboard.legHint', { won: summary.legs.won, lost: summary.legs.lost })}
            icon={CalendarDays}
          />
        </div>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section>
            <SectionHeader
              title={t('dashboard.latestSlips')}
              action={
                <Link
                  to="/bets"
                  className="text-accent inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  {t('dashboard.viewAll')}
                  <ArrowUpRight className="size-3" />
                </Link>
              }
            />
            {betsQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-28" />
                ))}
              </div>
            ) : latest.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title={t('dashboard.noSlips')}
                description={t('dashboard.noSlipsDescription')}
                action={
                  <LinkButton to="/bets/new" variant="primary" icon={<Plus className="size-4" />}>
                    {t('dashboard.newBet')}
                  </LinkButton>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {latest.map((bet) => (
                  <LatestSlip key={bet.id} bet={bet} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader
              title={t('dashboard.thisWeek')}
              action={<span className="text-faint text-[11px]">{t('dashboard.slipsPerDay')}</span>}
            />
            <Card padding="md">
              <div className="flex h-28 items-end justify-between gap-2">
                {week.map((day) => (
                  <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-20 w-full items-end justify-center gap-0.5">
                      {day.slips === 0 ? (
                        <div className="bg-surface-3 h-1 w-full rounded-full" />
                      ) : (
                        Array.from({ length: day.slips }).map((_, index) => (
                          <div
                            key={index}
                            className={cn(
                              'w-full rounded-t-md',
                              index < day.won ? 'bg-accent/80' : 'bg-danger/60',
                            )}
                            style={{
                              height: `${Math.max(18, (1 / maxSlips) * 80)}px`,
                            }}
                          />
                        ))
                      )}
                    </div>
                    <span className="text-faint text-[10px] font-semibold uppercase">
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section>
            <SectionHeader
              title={t('dashboard.recentAnalyses')}
              action={
                <Link
                  to="/analyses"
                  className="text-accent inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  {t('dashboard.library')}
                  <ArrowUpRight className="size-3" />
                </Link>
              }
            />
            {analysesQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : recentAnalyses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={t('dashboard.noResearch')}
                description={t('dashboard.noResearchDescription')}
                action={
                  <LinkButton to="/analyses/new" variant="primary">
                    {t('dashboard.newAnalysis')}
                  </LinkButton>
                }
              />
            ) : (
              <Card padding="none" className="divide-line divide-y overflow-hidden">
                {recentAnalyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    to={`/analyses/${analysis.id}`}
                    className="hover:bg-surface-2/60 flex items-center gap-3 px-4 py-3 transition-colors"
                  >
                    <BookOpen className="text-faint size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {analysis.title}
                      </p>
                      <p className="text-faint text-[11px]">
                        {formatDate(analysis.date, 'd MMM')} ·{' '}
                        {t(ANALYSIS_KIND_META[analysis.kind].labelKey)}
                      </p>
                    </div>
                    <ArrowUpRight className="text-faint size-4 shrink-0" />
                  </Link>
                ))}
              </Card>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <Card padding="md">
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">{t('dashboard.pendingSlips')}</p>
              <CalendarDays className="text-faint size-4" />
            </div>
            {upcoming.length === 0 ? (
              <p className="text-muted text-xs leading-relaxed">{t('dashboard.nothingPending')}</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((bet) => (
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
                    <p className="text-faint mt-1.5 flex items-center gap-2 text-[11px]">
                      <span className="numeric">{formatDayLabel(bet.date)}</span>
                      <span>·</span>
                      <span className="numeric">@ {formatOdds(bet.combinedOdds)}</span>
                      <span>·</span>
                      <RiskBadge risk={bet.risk} />
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md">
            <p className="eyebrow mb-3">{t('dashboard.seriesBook')}</p>
            <dl className="space-y-2.5 text-xs">
              <Row label={t('dashboard.slips')} value={String(summary.total)} />
              <Row label={t('dashboard.settled')} value={String(summary.settled)} />
              <Row label={t('dashboard.won')} value={String(summary.won)} tone="accent" />
              <Row label={t('dashboard.lost')} value={String(summary.lost)} tone="danger" />
              <Row
                label={t('dashboard.profit')}
                value={formatUnits(summary.profit)}
                tone={summary.profit >= 0 ? 'accent' : 'danger'}
              />
              <Row label={t('dashboard.turnover')} value={`${summary.staked.toFixed(2)}u`} />
            </dl>
          </Card>

          <Card padding="md" className="border-accent/20 bg-accent-soft/30">
            <p className="eyebrow text-accent mb-2 flex items-center gap-1.5">
              <Sparkles className="size-3" />
              {t('dashboard.preflight')}
            </p>
            <ul className="text-muted space-y-1.5 text-[11px] leading-relaxed">
              <li>• {t('dashboard.preflightAnchor')}</li>
              <li>• {t('dashboard.preflightSample')}</li>
              <li>• {t('dashboard.preflightH2h')}</li>
              <li>• {t('dashboard.preflightPrice')}</li>
              <li>• {t('dashboard.preflightLineups')}</li>
            </ul>
            <Link
              to="/fixtures"
              className="text-accent mt-3 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
            >
              {t('dashboard.runChecks')}
              <ArrowUpRight className="size-3" />
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-foreground text-sm font-bold">{title}</h2>
      {action}
    </div>
  );
}

function LatestSlip({ bet }: { bet: BetSlip }) {
  return (
    <Link to={`/bets/${bet.id}`} className="surface surface-hover flex flex-col rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="numeric text-faint text-[11px]">{formatDate(bet.date, 'd MMM')}</span>
        <BetStatusBadge status={bet.status} />
      </div>
      <p className="text-foreground mt-2 line-clamp-2 flex-1 text-sm font-semibold">{bet.title}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-faint truncate">{bet.competitionLabel}</span>
        <span className="numeric text-accent font-bold">@ {formatOdds(bet.combinedOdds)}</span>
      </div>
    </Link>
  );
}

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'danger';
}) {
  const toneClass = {
    default: 'text-muted',
    accent: 'text-accent',
    danger: 'text-danger',
  }[tone];
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-faint">{label}</dt>
      <dd className={cn('numeric font-semibold', toneClass)}>{value}</dd>
    </div>
  );
}

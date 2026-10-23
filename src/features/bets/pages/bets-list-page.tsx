import { Download, Plus, Search, Ticket, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EmptyState, PageHeader, Skeleton, StatCard } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/form';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { useBetsQuery } from '@/features/bets/api/hooks';
import { BetCard } from '@/features/bets/components/bet-card';
import type { BetSlip } from '@/types';
import { cn } from '@/utils/cn';
import { allBetsToMarkdown, downloadFile } from '@/utils/export';
import { formatPercent, formatUnits } from '@/utils/format';
import { sortBetsByDate, summarizeBets } from '@/utils/stats';

type StatusFilter = 'all' | 'upcoming' | 'settled' | 'won' | 'lost';

const tabs: { key: StatusFilter; labelKey: TranslationKey }[] = [
  { key: 'all', labelKey: 'bets.tabAll' },
  { key: 'upcoming', labelKey: 'bets.tabUpcoming' },
  { key: 'settled', labelKey: 'bets.tabSettled' },
  { key: 'won', labelKey: 'bets.tabWon' },
  { key: 'lost', labelKey: 'bets.tabLost' },
];

function matchesStatus(bet: BetSlip, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'upcoming') return bet.status === 'pending';
  if (filter === 'settled') return bet.status !== 'pending';
  return bet.status === filter;
}

export function BetsListPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useBetsQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get('status') as StatusFilter | null) ?? 'all';
  const query = searchParams.get('q') ?? '';

  const bets = useMemo(() => data ?? [], [data]);
  const summary = useMemo(() => summarizeBets(bets), [bets]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortBetsByDate(
      bets.filter((bet) => {
        if (!matchesStatus(bet, filter)) return false;
        if (!needle) return true;
        const haystack = [
          bet.title,
          bet.competitionLabel,
          bet.summary,
          ...bet.legs.flatMap((leg) => [
            leg.homeTeam,
            leg.awayTeam,
            leg.market,
            leg.selection,
            leg.competitionLabel,
          ]),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      }),
    );
  }, [bets, filter, query]);

  const setFilter = (next: StatusFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    setSearchParams(params, { replace: true });
  };

  const setQuery = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('q', value);
    else params.delete('q');
    setSearchParams(params, { replace: true });
  };

  return (
    <div>
      <PageHeader
        eyebrow={t('bets.eyebrow')}
        title={t('bets.title')}
        description={t('bets.description')}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Download className="size-4" />}
              disabled={filtered.length === 0}
              onClick={() =>
                downloadFile(
                  `football-bets-${new Date().toISOString().slice(0, 10)}.md`,
                  allBetsToMarkdown(filtered),
                  'text/markdown',
                )
              }
            >
              {t('common.export')}
            </Button>
            <LinkButton to="/bets/new" variant="primary" icon={<Plus className="size-4" />}>
              {t('bets.newBet')}
            </LinkButton>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('bets.record')}
          value={t('bets.recordValue', { won: summary.won, lost: summary.lost })}
          hint={t('bets.recordHint', { total: summary.total, pending: summary.pending })}
          icon={Ticket}
          tone="accent"
        />
        <StatCard
          label={t('bets.hitRate')}
          value={formatPercent(summary.hitRate, 1)}
          hint={t('bets.hitRateHint', { won: summary.won, settled: summary.settled })}
          icon={TrendingUp}
          tone={summary.hitRate >= 0.5 ? 'accent' : 'warning'}
        />
        <StatCard
          label={t('bets.legHitRate')}
          value={formatPercent(summary.legs.hitRate, 1)}
          hint={t('bets.legHitRateHint', {
            won: summary.legs.won,
            settled: summary.legs.won + summary.legs.lost,
          })}
        />
        <StatCard
          label={t('bets.roi')}
          value={formatPercent(summary.roi, 1)}
          hint={t('bets.roiHint', {
            profit: formatUnits(summary.profit),
            priced: summary.pricedSlips,
          })}
          tone={summary.profit >= 0 ? 'accent' : 'danger'}
        />
      </div>

      <Card padding="sm" className="mb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const count =
                tab.key === 'all'
                  ? bets.length
                  : bets.filter((bet) => matchesStatus(bet, tab.key)).length;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    filter === tab.key
                      ? 'bg-accent text-canvas'
                      : 'text-muted hover:bg-surface-3 hover:text-foreground',
                  )}
                >
                  {t(tab.labelKey)}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="relative lg:w-64">
            <Search className="text-faint pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('bets.searchPlaceholder')}
              className="h-9 pl-8 text-xs"
              aria-label={t('bets.searchLabel')}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Ticket}
          title={t('bets.loadError')}
          description={error instanceof Error ? error.message : t('common.unknownError')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={bets.length === 0 ? t('bets.noBets') : t('bets.nothingMatches')}
          description={
            bets.length === 0 ? t('bets.noBetsDescription') : t('bets.nothingMatchesDescription')
          }
          action={
            <LinkButton to="/bets/new" variant="primary" icon={<Plus className="size-4" />}>
              {t('bets.newBet')}
            </LinkButton>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      )}
    </div>
  );
}

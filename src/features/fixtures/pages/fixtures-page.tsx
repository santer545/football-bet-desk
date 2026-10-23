import { addDays } from 'date-fns';
import { AlertTriangle, CalendarRange, KeyRound, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState, PageHeader, Skeleton } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { useTranslation } from '@/lib/i18n';
import { useFavoriteCompetitions } from '@/store/use-settings-store';
import { cn } from '@/utils/cn';
import { COMPETITIONS, DEFAULT_COMPETITIONS, formatDateLong, todayISO } from '@/utils/format';

import { useFixtureFeed } from '../api/hooks';
import { FixtureInsightDialog } from '../components/insight-dialog';
import { MatchRow } from '../components/match-row';
import type { FdMatch } from '../types';

const ranges = [1, 7, 14] as const;
type Range = (typeof ranges)[number];

export function FixturesPage() {
  const { t } = useTranslation();
  const favorites = useFavoriteCompetitions();
  const [range, setRange] = useState<Range>(7);
  const [selected, setSelected] = useState<FdMatch | null>(null);
  const [competitions, setCompetitions] = useState<string[]>(() =>
    favorites.length > 0 ? favorites : DEFAULT_COMPETITIONS,
  );

  const dateFrom = todayISO();

  const computedDateTo = useMemo(() => {
    const date = addDays(new Date(), range - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, [range]);

  const feed = useFixtureFeed(dateFrom, computedDateTo, competitions);

  const groups = useMemo(() => {
    const map = new Map<string, FdMatch[]>();
    for (const match of feed.matches) {
      const day = match.utcDate.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(match);
      map.set(day, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [feed.matches]);

  const toggleCompetition = (code: string) => {
    setCompetitions((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow={t('fixtures.eyebrow')}
        title={t('fixtures.title')}
        description={t('fixtures.description')}
        actions={
          feed.hasToken ? (
            <Button
              variant="secondary"
              icon={<RefreshCw className={cn('size-4', feed.isFetching && 'animate-spin')} />}
              onClick={feed.refetch}
              disabled={feed.isFetching}
            >
              {t('common.refresh')}
            </Button>
          ) : (
            <LinkButton to="/settings" variant="primary" icon={<KeyRound className="size-4" />}>
              {t('fixtures.connectApi')}
            </LinkButton>
          )
        }
      />

      {!feed.hasToken ? (
        <EmptyState
          icon={KeyRound}
          title={t('fixtures.tokenTitle')}
          description={t('fixtures.tokenDescription')}
          action={
            <LinkButton to="/settings" variant="primary" icon={<KeyRound className="size-4" />}>
              {t('fixtures.openSettings')}
            </LinkButton>
          }
        />
      ) : (
        <>
          <Card padding="sm" className="mb-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  {ranges.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRange(value)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                        range === value
                          ? 'bg-accent text-canvas'
                          : 'text-muted hover:bg-surface-3 hover:text-foreground',
                      )}
                    >
                      {value === 1
                        ? t('fixtures.rangeToday')
                        : t('fixtures.rangeDays', { count: value })}
                    </button>
                  ))}
                </div>
                <p className="text-faint flex items-center gap-1.5 text-[11px]">
                  <CalendarRange className="size-3.5" />
                  {formatDateLong(dateFrom)} → {formatDateLong(computedDateTo)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMPETITIONS.filter((competition) =>
                  ['PL', 'PD', 'SA', 'BL1', 'CL', 'EL'].includes(competition.code),
                ).map((competition) => {
                  const active = competitions.includes(competition.code);
                  return (
                    <button
                      key={competition.code}
                      type="button"
                      onClick={() => toggleCompetition(competition.code)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
                        active
                          ? 'border-accent/40 bg-accent-soft text-accent'
                          : 'border-line text-faint hover:border-line-strong hover:text-muted',
                      )}
                    >
                      {competition.shortName}
                    </button>
                  );
                })}
                <span className="text-faint ml-auto self-center text-[10px]">
                  {t('fixtures.fixtureCount', { count: feed.matches.length })}
                </span>
              </div>
            </div>
          </Card>

          {feed.error ? (
            <Card padding="lg" className="border-danger/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-danger mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-danger font-semibold">{t('fixtures.errorTitle')}</p>
                  <p className="text-muted mt-1 text-sm leading-relaxed">{feed.error.message}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" size="sm" onClick={feed.refetch}>
                      {t('common.retry')}
                    </Button>
                    <LinkButton to="/settings" variant="ghost" size="sm">
                      {t('fixtures.checkToken')}
                    </LinkButton>
                  </div>
                </div>
              </div>
            </Card>
          ) : feed.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title={t('fixtures.noFixturesTitle')}
              description={t('fixtures.noFixturesDescription')}
            />
          ) : (
            <div className="space-y-5">
              {groups.map(([day, matches]) => (
                <section key={day}>
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="font-display text-foreground text-sm font-bold">
                      {formatDateLong(day)}
                    </h2>
                    <span className="bg-line h-px flex-1" />
                    <span className="text-faint text-[11px]">
                      {t('fixtures.matchCount', { count: matches.length })}
                    </span>
                  </div>
                  <Card padding="none" className="divide-line divide-y overflow-hidden">
                    {matches.map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        onAnalyze={setSelected}
                        showCompetition
                      />
                    ))}
                  </Card>
                </section>
              ))}
            </div>
          )}

          <p className="text-faint mt-6 text-[11px] leading-relaxed">{t('fixtures.disclaimer')}</p>
        </>
      )}

      {selected ? (
        <FixtureInsightDialog match={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, PageHeader, Skeleton, StatCard } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { useBetsQuery } from '@/features/bets/api/hooks';
import { BetStatusBadge, RiskBadge } from '@/features/bets/components/badges';
import { DailySuggestions } from '@/features/fixtures';
import { useTranslation } from '@/lib/i18n';
import type { BetSlip } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateLong, formatOdds, formatPercent, todayISO } from '@/utils/format';
import { sortBetsByDate, summarizeBets } from '@/utils/stats';

export function CalendarPage() {
  const { t, locale } = useTranslation();
  const { data, isLoading, error } = useBetsQuery();
  const bets = useMemo(() => data ?? [], [data]);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayISO());

  const monthKey = format(month, 'yyyy-MM');
  const monthBets = useMemo(
    () => bets.filter((bet) => bet.date.startsWith(monthKey)),
    [bets, monthKey],
  );
  const monthSummary = useMemo(() => summarizeBets(monthBets), [monthBets]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const weekdayLabels = useMemo(
    () => days.slice(0, 7).map((day) => format(day, 'EEE', { locale })),
    [days, locale],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, BetSlip[]>();
    for (const bet of bets) {
      const list = map.get(bet.date) ?? [];
      list.push(bet);
      map.set(bet.date, list);
    }
    return map;
  }, [bets]);

  const selectedBets = useMemo(
    () => sortBetsByDate(byDate.get(selected) ?? [], 'asc'),
    [byDate, selected],
  );

  const selectedDate = parseISO(selected);
  const isFutureOrToday = !isBefore(selectedDate, startOfToday());
  const isInCurrentWeek =
    isFutureOrToday && !isAfter(selectedDate, endOfWeek(new Date(), { weekStartsOn: 1 }));

  const goMonth = (delta: number) => {
    const next = delta > 0 ? addMonths(month, 1) : subMonths(month, 1);
    setMonth(startOfMonth(next));
    setSelected(format(startOfMonth(next), 'yyyy-MM-dd'));
  };

  const goToday = () => {
    const today = new Date();
    setMonth(startOfMonth(today));
    setSelected(todayISO());
  };

  return (
    <div>
      <PageHeader
        eyebrow={t('calendar.eyebrow')}
        title={t('calendar.title')}
        description={t('calendar.description')}
        actions={
          <LinkButton
            to={`/bets/new?date=${selected}`}
            variant="primary"
            icon={<Plus className="size-4" />}
          >
            {t('bets.newBet')}
          </LinkButton>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('calendar.monthSlips')}
          value={String(monthSummary.total)}
          hint={format(month, 'MMMM yyyy', { locale })}
          icon={CalendarDays}
        />
        <StatCard label={t('calendar.legendWon')} value={String(monthSummary.won)} tone="accent" />
        <StatCard
          label={t('calendar.legendLost')}
          value={String(monthSummary.lost)}
          tone="danger"
        />
        <StatCard
          label={t('calendar.monthHitRate')}
          value={formatPercent(monthSummary.hitRate, 1)}
          hint={t('calendar.settled', { count: monthSummary.settled })}
          tone={monthSummary.hitRate >= 0.5 ? 'accent' : 'warning'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('calendar.previousMonth')}
                onClick={() => goMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="font-display text-foreground text-base font-bold">
                {format(month, 'MMMM yyyy', { locale })}
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('calendar.nextMonth')}
                onClick={() => goMonth(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={goToday}>
              {t('common.today')}
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-[28rem]" />
          ) : error ? (
            <p className="text-danger py-10 text-center text-sm">
              {error instanceof Error ? error.message : t('calendar.loadError')}
            </p>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-7">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="text-faint py-2 text-center text-[10px] font-bold tracking-wider uppercase"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const slips = byDate.get(key) ?? [];
                  const won = slips.filter((bet) => bet.status === 'won').length;
                  const lost = slips.filter((bet) => bet.status === 'lost').length;
                  const pending = slips.filter((bet) => bet.status === 'pending').length;
                  const outside = !isSameMonth(day, month);
                  const isSelected = isSameDay(day, parseISO(selected));
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      className={cn(
                        'flex min-h-16 flex-col rounded-xl border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2',
                        isSelected
                          ? 'border-accent/60 bg-accent-soft/40'
                          : 'border-line/60 hover:border-line-strong hover:bg-surface-2/50',
                        outside && 'opacity-35',
                      )}
                    >
                      <span
                        className={cn(
                          'numeric flex size-5 items-center justify-center rounded-md text-[11px] font-semibold',
                          isToday(day)
                            ? 'bg-accent text-canvas'
                            : isSelected
                              ? 'text-accent'
                              : 'text-muted',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      <span className="mt-auto flex flex-wrap items-center gap-0.5 pt-1">
                        {won > 0 ? <Dot className="bg-accent" count={won} /> : null}
                        {lost > 0 ? <Dot className="bg-danger" count={lost} /> : null}
                        {pending > 0 ? <Dot className="bg-warn" count={pending} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border-line text-faint mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="bg-accent size-2 rounded-full" /> {t('calendar.legendWon')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-danger size-2 rounded-full" /> {t('calendar.legendLost')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-warn size-2 rounded-full" /> {t('calendar.legendPending')}
                </span>
                <span className="ml-auto">{t('calendar.numbersShow')}</span>
              </div>
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card padding="md">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow">{t('calendar.selectedDay')}</p>
                <p className="font-display text-foreground mt-1 text-sm font-bold">
                  {formatDateLong(selected)}
                </p>
              </div>
              <LinkButton
                to={`/bets/new?date=${selected}`}
                size="icon-sm"
                variant="secondary"
                aria-label={t('calendar.addBet')}
              >
                <Plus className="size-3.5" />
              </LinkButton>
            </div>

            {selectedBets.length === 0 ? (
              <p className="text-muted text-xs leading-relaxed">{t('calendar.noSlips')}</p>
            ) : (
              <div className="space-y-2">
                {selectedBets.map((bet) => (
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
                    <div className="text-faint mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="numeric">@ {formatOdds(bet.combinedOdds)}</span>
                      <span>·</span>
                      <span>{t('bets.legs.legCount', { count: bet.legs.length })}</span>
                      <RiskBadge risk={bet.risk} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md">
            <p className="eyebrow mb-2">{t('calendar.dayBreakdown')}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat
                label={t('calendar.legendWon')}
                value={selectedBets.filter((bet) => bet.status === 'won').length}
                tone="text-accent"
              />
              <MiniStat
                label={t('calendar.legendLost')}
                value={selectedBets.filter((bet) => bet.status === 'lost').length}
                tone="text-danger"
              />
              <MiniStat
                label={t('calendar.open')}
                value={selectedBets.filter((bet) => bet.status === 'pending').length}
                tone="text-warn"
              />
            </div>
          </Card>
        </div>
      </div>

      {isInCurrentWeek ? (
        <div className="mt-6">
          <DailySuggestions date={selected} />
        </div>
      ) : isFutureOrToday ? (
        <Card padding="md" className="mt-6">
          <p className="text-muted text-xs leading-relaxed">
            {t('calendar.limited', {
              date: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'EEEE d MMM', { locale }),
            })}
          </p>
        </Card>
      ) : null}

      {!isLoading && bets.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={CalendarDays}
            title={t('calendar.emptyTitle')}
            description={t('calendar.emptyDescription')}
            action={
              <LinkButton to="/bets/new" variant="primary" icon={<Plus className="size-4" />}>
                {t('bets.newBet')}
              </LinkButton>
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function Dot({ className, count }: { className: string; count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <span className={cn('size-1.5 rounded-full', className)} />
      <span className="numeric text-faint text-[9px]">{count}</span>
    </span>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="border-line bg-surface-2/50 rounded-xl border p-2">
      <p className={cn('numeric font-display text-lg font-black', tone)}>{value}</p>
      <p className="text-faint text-[10px]">{label}</p>
    </div>
  );
}

import { format, isToday, parseISO } from 'date-fns';
import {
  AlertTriangle,
  ArrowUpRight,
  KeyRound,
  RefreshCw,
  Sparkles,
  Target,
  Ticket,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { EmptyState, Skeleton } from '@/components/feedback/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { RiskBadge } from '@/features/bets';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/utils/cn';
import { formatDate, formatDayLabel, formatOdds, formatPercent, formatTime } from '@/utils/format';

import { useDailySuggestions } from '../api/suggestion-hooks';
import {
  suggestionCardToDraft,
  type SuggestionCard,
  type SuggestionCardLabel,
  type SuggestionLeg,
} from '../lib/daily-suggestions';

const labelVariant: Record<SuggestionCardLabel, 'accent' | 'info' | 'warning'> = {
  Anchor: 'accent',
  Balanced: 'info',
  Value: 'warning',
};

export interface DailySuggestionsProps {
  date?: string;
}

const labelKeys: Record<SuggestionCardLabel, TranslationKey> = {
  Anchor: 'daily.label.anchor',
  Balanced: 'daily.label.balanced',
  Value: 'daily.label.value',
};

export function DailySuggestions({ date }: DailySuggestionsProps) {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const feed = useDailySuggestions(date);
  const slate = feed.slate;
  const targetDate = date ? parseISO(date) : new Date();
  const isTargetToday = isToday(targetDate);
  const dayLabel = isTargetToday
    ? t('common.today').toLowerCase()
    : format(targetDate, 'EEEE', { locale });

  const buildBet = (card: SuggestionCard) => {
    void navigate('/bets/new', { state: { draft: suggestionCardToDraft(card) } });
  };

  return (
    <section className="mb-7" aria-labelledby="todays-expresses">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow text-accent flex items-center gap-1.5">
              <Sparkles className="size-3" />
              {isTargetToday
                ? t('daily.todayCardRoom')
                : t('daily.cardRoomDate', { date: format(targetDate, 'd MMM', { locale }) })}
            </span>
            {slate && slate.cards.length > 0 ? (
              <Badge variant="outline">{t('daily.ideas', { count: slate.cards.length })}</Badge>
            ) : null}
          </div>
          <h2
            id="todays-expresses"
            className="font-display text-foreground mt-1 text-xl font-black tracking-tight sm:text-2xl"
          >
            {isTargetToday ? t('daily.threeForToday') : t('daily.threeForDay', { day: dayLabel })}
          </h2>
          <p className="text-muted mt-1.5 max-w-2xl text-xs leading-relaxed">
            {t('daily.description')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {feed.lastUpdated > 0 ? (
            <span className="text-faint numeric text-[10px]">
              {t('daily.updated', { time: formatDate(new Date(feed.lastUpdated), 'HH:mm') })}
            </span>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="size-3.5" />}
            loading={feed.isFetching}
            disabled={!feed.hasToken}
            onClick={feed.refetch}
          >
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {!feed.hasToken ? (
        <ConnectCard />
      ) : feed.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[30rem]" />
          ))}
        </div>
      ) : feed.error ? (
        <Card padding="md" className="border-danger/30 bg-danger-soft/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-danger mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold">{t('daily.loadErrorTitle')}</p>
              <p className="text-muted mt-1 text-xs leading-relaxed">{feed.error.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={feed.refetch}>
                  {t('common.retry')}
                </Button>
                <Link
                  to="/settings"
                  className="text-accent inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  {t('daily.checkSettings')}
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </Card>
      ) : !slate || slate.cards.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t('daily.emptyTitle')}
          description={slate?.notes[0] ?? t('daily.emptyDescription')}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={feed.refetch}>
                {t('common.refresh')}
              </Button>
              <LinkButton
                to="/fixtures"
                variant="primary"
                size="sm"
                icon={<Sparkles className="size-3.5" />}
              >
                {t('daily.openFixtures')}
              </LinkButton>
            </div>
          }
        />
      ) : (
        <>
          {feed.partialErrorCount > 0 ? (
            <p className="text-warn mb-3 flex items-center gap-1.5 text-[11px]">
              <AlertTriangle className="size-3.5" />
              {t('daily.partialError', { count: feed.partialErrorCount })}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {slate.cards.map((card, index) => (
              <ExpressCard key={card.id} card={card} index={index} onBuild={() => buildBet(card)} />
            ))}
          </div>
          <div className="text-faint mt-3 space-y-1 text-[10px] leading-relaxed">
            <p>{t('daily.modelOddsNote')}</p>
            {slate.notes.length > 0 ? <p>{slate.notes.join(' ')}</p> : null}
          </div>
        </>
      )}
    </section>
  );
}

function ConnectCard() {
  const { t } = useTranslation();

  return (
    <Card padding="lg" className="border-accent/20 bg-accent-soft/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="border-accent/30 bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-xl border">
            <KeyRound className="size-4" />
          </div>
          <div>
            <h3 className="font-display text-foreground text-sm font-bold">
              {t('daily.connectTitle')}
            </h3>
            <p className="text-muted mt-1 max-w-xl text-xs leading-relaxed">
              {t('daily.connectDescription')}
            </p>
          </div>
        </div>
        <LinkButton to="/settings" variant="primary" icon={<KeyRound className="size-4" />}>
          {t('daily.addToken')}
        </LinkButton>
      </div>
    </Card>
  );
}

function ExpressCard({
  card,
  index,
  onBuild,
}: {
  card: SuggestionCard;
  index: number;
  onBuild: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card
      as="article"
      padding="none"
      className={cn(
        'flex flex-col overflow-hidden',
        index === 0 ? 'border-accent/35 shadow-[var(--shadow-glow)]' : '',
      )}
    >
      <div className="border-line/70 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={labelVariant[card.label]}>{t(labelKeys[card.label])}</Badge>
          <RiskBadge risk={card.risk} />
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <h3 className="font-display text-foreground text-lg font-black tracking-tight">
            {t('daily.express', { index: index + 1 })}
          </h3>
          <span className="numeric text-accent text-sm font-bold">
            @ {formatOdds(card.combinedFairOdds)}
          </span>
        </div>
        <p className="text-faint mt-0.5 text-[11px]">
          {t('daily.cardMeta', {
            count: card.legs.length,
            probability: formatPercent(card.jointProbability, 1),
          })}
        </p>
      </div>

      <div className="divide-line flex-1 divide-y">
        {card.legs.map((leg) => (
          <SuggestionLegBlock key={leg.matchId} leg={leg} />
        ))}
      </div>

      <div className="border-line/70 bg-surface-2/20 mt-auto border-t p-4">
        <p className="eyebrow">{t('daily.whyCard')}</p>
        <p className="text-muted mt-1.5 text-[11px] leading-relaxed">{card.summary}</p>
        {card.warnings.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {card.warnings.map((warning) => (
              <li key={warning} className="text-warn flex gap-1.5 text-[10px] leading-relaxed">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <Button
          variant={index === 0 ? 'primary' : 'secondary'}
          fullWidth
          className="mt-3"
          icon={<Ticket className="size-3.5" />}
          onClick={onBuild}
        >
          {t('daily.buildExpress')}
        </Button>
      </div>
    </Card>
  );
}

function SuggestionLegBlock({ leg }: { leg: SuggestionLeg }) {
  const { t, formatMarket, formatSelection } = useTranslation();
  const kickoffLabel = `${formatDayLabel(leg.date)} ${formatTime(leg.kickoff)}`;

  return (
    <div className="p-4">
      <div className="text-faint flex items-center justify-between gap-2 text-[10px] font-semibold tracking-wider uppercase">
        <span className="truncate">{leg.competitionLabel}</span>
        <span className="numeric shrink-0">{kickoffLabel}</span>
      </div>
      <p className="text-foreground mt-1.5 text-sm font-bold">
        {leg.homeTeam} <span className="text-faint font-normal">vs</span> {leg.awayTeam}
      </p>
      <div className="mt-2 flex items-start justify-between gap-2">
        <p className="text-accent text-xs font-semibold">
          {formatMarket(leg.market)}: {formatSelection(leg.selection)}
        </p>
        <span className="numeric text-foreground shrink-0 text-xs font-bold">
          @ {formatOdds(leg.fairOdds)}
        </span>
      </div>
      <p className="text-faint mt-1 text-[10px] uppercase">
        {t('daily.legMeta', {
          probability: formatPercent(leg.probability, 0),
          confidence: t(`confidence.${leg.confidence}` as TranslationKey),
        })}
      </p>
      <ul className="text-muted mt-3 space-y-1 text-[11px] leading-relaxed">
        {leg.reasoning.map((reason, reasonIndex) => (
          <li key={`${leg.matchId}-${reasonIndex}`} className="flex gap-1.5">
            <span className="text-accent/70">&#8226;</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

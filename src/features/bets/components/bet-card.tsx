import { ChevronRight, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useTranslation } from '@/lib/i18n';
import type { BetSlip } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate, formatOdds } from '@/utils/format';

import { BetStatusBadge, LegResultLabel, RiskBadge } from './badges';

export function BetCard({ bet }: { bet: BetSlip }) {
  const { t, formatSelection } = useTranslation();

  return (
    <Link
      to={`/bets/${bet.id}`}
      className="surface surface-hover group flex flex-col rounded-2xl p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-muted flex items-center gap-2 text-xs">
          <span className="numeric">{formatDate(bet.date, 'd MMM')}</span>
          <span className="text-faint">/</span>
          <span className="truncate">{bet.competitionLabel}</span>
        </div>
        <BetStatusBadge status={bet.status} />
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-foreground group-hover:text-accent text-base leading-snug font-bold">
          {bet.title}
        </h3>
        <ChevronRight className="text-faint group-hover:text-accent mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>

      {bet.summary ? (
        <p className="text-muted mt-2 line-clamp-2 text-xs leading-relaxed">{bet.summary}</p>
      ) : null}

      <div className="mt-4 space-y-2">
        {bet.legs.slice(0, 3).map((leg) => (
          <div key={leg.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-foreground/90 truncate">
              {leg.homeTeam} <span className="text-faint">vs</span> {leg.awayTeam}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-muted max-w-32 truncate">{formatSelection(leg.selection)}</span>
              <LegResultLabel result={leg.result} />
            </span>
          </div>
        ))}
      </div>

      <div className="border-line mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        {bet.combinedOdds ? (
          <span className="numeric bg-surface-2 text-accent rounded-lg px-2 py-1 text-xs font-bold">
            @ {formatOdds(bet.combinedOdds)}
          </span>
        ) : null}
        <span className="text-faint flex items-center gap-1 text-[11px]">
          <Layers className="size-3" />
          {t('bets.legs.legCount', { count: bet.legs.length })}
        </span>
        <span className={cn('ml-auto')}>
          <RiskBadge risk={bet.risk} />
        </span>
      </div>
    </Link>
  );
}

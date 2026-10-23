import { ChevronRight, Radio, Shield } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/utils/cn';
import { formatTime } from '@/utils/format';

import type { FdMatch } from '../types';

function statusLabel(
  match: FdMatch,
  t: ReturnType<typeof useTranslation>['t'],
): { text: string; className: string } {
  switch (match.status) {
    case 'FINISHED':
    case 'AWARDED':
      return {
        text: `${match.score.fullTime.home ?? 0} : ${match.score.fullTime.away ?? 0}`,
        className: 'text-foreground',
      };
    case 'IN_PLAY':
    case 'PAUSED':
      return {
        text: `${match.score.fullTime.home ?? 0} : ${match.score.fullTime.away ?? 0}`,
        className: 'text-danger',
      };
    case 'POSTPONED':
      return { text: t('fixtures.statusPostponed'), className: 'text-warn' };
    case 'CANCELLED':
    case 'SUSPENDED':
      return { text: match.status, className: 'text-faint' };
    default:
      return { text: formatTime(match.utcDate), className: 'text-muted' };
  }
}

export function MatchRow({
  match,
  onAnalyze,
  showCompetition = false,
}: {
  match: FdMatch;
  onAnalyze: (match: FdMatch) => void;
  showCompetition?: boolean;
}) {
  const { t } = useTranslation();
  const status = statusLabel(match, t);
  const live = match.status === 'IN_PLAY' || match.status === 'PAUSED';

  return (
    <button
      type="button"
      onClick={() => onAnalyze(match)}
      className="hover:bg-surface-2/60 flex w-full items-center gap-3 px-3 py-3 text-left transition-colors sm:px-4"
    >
      <div className="w-14 shrink-0 text-center">
        <p className={cn('numeric text-xs font-bold', status.className)}>{status.text}</p>
        <p className="text-faint text-[9px] font-semibold tracking-wider uppercase">
          {live ? (
            <span className="text-danger inline-flex items-center gap-0.5">
              <Radio className="size-2.5" />
              {t('fixtures.statusLive')}
            </span>
          ) : match.status === 'FINISHED' ? (
            t('fixtures.statusFinished')
          ) : (
            match.status.toLowerCase()
          )}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <TeamBadge team={match.homeTeam} />
          <span className="text-foreground truncate text-sm font-semibold">
            {match.homeTeam.name}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <TeamBadge team={match.awayTeam} />
          <span className="text-muted truncate text-sm">{match.awayTeam.name}</span>
        </div>
        {showCompetition ? (
          <p className="text-faint mt-1.5 pl-6 text-[10px] font-medium tracking-wider uppercase">
            {match.competition.name}
            {match.matchday ? ` · ${t('fixtures.matchday', { matchday: match.matchday })}` : ''}
          </p>
        ) : null}
      </div>

      <span className="text-faint flex shrink-0 items-center gap-1 text-[10px] font-semibold">
        {t('fixtures.analyse')}
        <ChevronRight className="size-3.5" />
      </span>
    </button>
  );
}

function TeamBadge({ team }: { team: FdMatch['homeTeam'] }) {
  if (team.crest) {
    return (
      <img
        src={team.crest}
        alt=""
        loading="lazy"
        className="size-4 shrink-0 object-contain"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  return <Shield className="text-faint size-4 shrink-0" />;
}

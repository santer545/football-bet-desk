import { useTranslation } from '@/lib/i18n';
import type { BetSlip } from '@/types';
import { formatDateLong, formatOdds, formatUnits } from '@/utils/format';
import { potentialReturn } from '@/utils/stats';

import { BetStatusBadge, RiskBadge } from './badges';
import { BetLegsTable } from './bet-legs';

export function BetDocument({
  bet,
  showHeading = true,
  editable = false,
}: {
  bet: BetSlip;
  showHeading?: boolean;
  editable?: boolean;
}) {
  const { t } = useTranslation();
  const potential = potentialReturn(bet);
  return (
    <div className="print-area space-y-5">
      {showHeading ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <BetStatusBadge status={bet.status} />
            <RiskBadge risk={bet.risk} />
            <span className="text-muted text-xs">{bet.competitionLabel}</span>
          </div>
          <h2 className="font-display text-foreground text-2xl font-black tracking-tight">
            {bet.title}
          </h2>
          <p className="text-muted mt-1 text-sm">{formatDateLong(bet.date)}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label={t('bets.document.combinedOdds')} value={formatOdds(bet.combinedOdds)} />
        <Metric label={t('bets.document.legs')} value={String(bet.legs.length)} />
        <Metric
          label={t('bets.document.stake')}
          value={bet.stake ? `${bet.stake.toFixed(2)}u` : '—'}
        />
        <Metric
          label={t('bets.document.potentialReturn')}
          value={potential ? `${potential.toFixed(2)}u` : '—'}
        />
      </div>

      {bet.summary ? (
        <div className="border-line bg-surface-2/50 rounded-2xl border p-4">
          <p className="eyebrow mb-2">{t('bets.document.thesis')}</p>
          <p className="text-muted text-sm leading-relaxed">{bet.summary}</p>
        </div>
      ) : null}

      <div className="surface rounded-2xl p-4 sm:p-5">
        <p className="eyebrow mb-2">{t('bets.document.legs')}</p>
        <BetLegsTable bet={bet} editable={editable} />
      </div>

      {bet.notes ? (
        <div className="border-warn/20 bg-warn-soft/30 rounded-2xl border p-4">
          <p className="eyebrow text-warn mb-2">{t('bets.document.notesWarnings')}</p>
          <p className="text-muted text-sm leading-relaxed whitespace-pre-line">{bet.notes}</p>
        </div>
      ) : null}

      {bet.status === 'won' && potential ? (
        <p className="text-accent text-sm font-semibold">
          {t('bets.document.settledWinner', {
            profit: formatUnits(potential - (bet.stake ?? 1)),
            stake: (bet.stake ?? 1).toFixed(2),
          })}
        </p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line bg-surface-2/60 rounded-xl border p-3">
      <p className="text-faint text-[10px] font-bold tracking-wider uppercase">{label}</p>
      <p className="numeric font-display text-foreground mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

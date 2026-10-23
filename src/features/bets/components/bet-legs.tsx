import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { useSettleBetMutation, useUpdateLegResultMutation } from '@/features/bets/api/hooks';
import { useTranslation } from '@/lib/i18n';
import type { BetSlip, LegResult } from '@/types';
import { formatOdds, formatTime, LEG_RESULT_META } from '@/utils/format';
import { cn } from '@/utils/cn';

export function BetLegsTable({ bet, editable = false }: { bet: BetSlip; editable?: boolean }) {
  const { t, formatMarket, formatSelection } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-line border-b text-left">
            <th className="text-faint px-2 py-2.5 text-[10px] font-bold tracking-wider uppercase">
              {t('bets.legs.match')}
            </th>
            <th className="text-faint px-2 py-2.5 text-[10px] font-bold tracking-wider uppercase">
              {t('bets.legs.kickoff')}
            </th>
            <th className="text-faint px-2 py-2.5 text-[10px] font-bold tracking-wider uppercase">
              {t('bets.legs.market')}
            </th>
            <th className="text-faint px-2 py-2.5 text-[10px] font-bold tracking-wider uppercase">
              {t('bets.legs.selection')}
            </th>
            <th className="text-faint px-2 py-2.5 text-right text-[10px] font-bold tracking-wider uppercase">
              {t('bets.legs.odds')}
            </th>
            <th className="text-faint px-2 py-2.5 text-center text-[10px] font-bold tracking-wider uppercase">
              {t('bets.legs.score')}
            </th>
            <th className="text-faint px-2 py-2.5 text-right text-[10px] font-bold tracking-wider uppercase">
              {t('bets.legs.result')}
            </th>
          </tr>
        </thead>
        <tbody>
          {bet.legs.map((leg, index) => (
            <tr key={leg.id} className="border-line/70 border-b last:border-0">
              <td className="px-2 py-3 align-top">
                <div className="flex items-start gap-2">
                  <span className="bg-surface-3 text-muted mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-foreground font-semibold">
                      {leg.homeTeam} <span className="text-faint">vs</span> {leg.awayTeam}
                    </p>
                    <p className="text-faint text-[11px]">{leg.competitionLabel}</p>
                    {leg.note ? (
                      <p className="text-muted mt-1 max-w-md text-[11px] leading-relaxed">
                        {leg.note}
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="numeric text-muted px-2 py-3 align-top text-xs">
                {formatTime(leg.kickoff)}
              </td>
              <td className="text-muted px-2 py-3 align-top text-xs">{formatMarket(leg.market)}</td>
              <td className="text-foreground px-2 py-3 align-top text-xs font-semibold">
                {formatSelection(leg.selection)}
              </td>
              <td className="numeric text-accent px-2 py-3 text-right align-top text-xs font-bold">
                {formatOdds(leg.odds)}
              </td>
              <td className="numeric text-muted px-2 py-3 text-center align-top text-xs">
                {leg.score ?? '—'}
              </td>
              <td className="px-2 py-3 text-right align-top">
                {editable ? (
                  <LegResultSelect bet={bet} legId={leg.id} result={leg.result} />
                ) : (
                  <span
                    className={cn('text-xs font-semibold', LEG_RESULT_META[leg.result].className)}
                  >
                    {t(LEG_RESULT_META[leg.result].labelKey)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegResultSelect({
  bet,
  legId,
  result,
}: {
  bet: BetSlip;
  legId: string;
  result: LegResult;
}) {
  const { t } = useTranslation();
  const mutation = useUpdateLegResultMutation(bet.id);
  const results: LegResult[] = ['pending', 'won', 'lost', 'void'];
  return (
    <Select
      aria-label={t('bets.legs.legResult')}
      className="h-8 w-28 text-xs"
      value={result}
      disabled={mutation.isPending}
      onChange={(event) => mutation.mutate({ legId, result: event.target.value as LegResult })}
    >
      {results.map((value) => (
        <option key={value} value={value}>
          {t(LEG_RESULT_META[value].labelKey)}
        </option>
      ))}
    </Select>
  );
}

export function BetResultPanel({ bet }: { bet: BetSlip }) {
  const { t } = useTranslation();
  const mutation = useSettleBetMutation(bet.id);
  return (
    <Card padding="md" className="no-print">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{t('bets.settle.title')}</p>
          <p className="text-muted mt-1 text-xs">{t('bets.settle.description')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={mutation.isPending && mutation.variables === 'won'}
            disabled={mutation.isPending}
            icon={<CheckCircle2 className="size-3.5" />}
            onClick={() => mutation.mutate('won')}
          >
            {t('bets.settle.allWon')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={mutation.isPending && mutation.variables === 'lost'}
            disabled={mutation.isPending}
            icon={<XCircle className="size-3.5" />}
            onClick={() => mutation.mutate('lost')}
          >
            {t('bets.settle.allLost')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={mutation.isPending && mutation.variables === 'pending'}
            disabled={mutation.isPending}
            icon={<RotateCcw className="size-3.5" />}
            onClick={() => mutation.mutate('pending')}
          >
            {t('bets.settle.reset')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

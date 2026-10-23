import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import type { BetStatus, LegResult, RiskLevel } from '@/types';
import { LEG_RESULT_META, RISK_META, STATUS_META } from '@/utils/format';
import { cn } from '@/utils/cn';

export function BetStatusBadge({ status, className }: { status: BetStatus; className?: string }) {
  const { t } = useTranslation();
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        meta.className,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dotClassName)} />
      {t(meta.labelKey)}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const { t } = useTranslation();
  const meta = RISK_META[risk];
  return (
    <Badge variant="outline" className={meta.className}>
      {t(meta.labelKey)}
    </Badge>
  );
}

export function LegResultLabel({ result }: { result: LegResult }) {
  const { t } = useTranslation();
  const meta = LEG_RESULT_META[result];
  return <span className={cn('text-xs font-semibold', meta.className)}>{t(meta.labelKey)}</span>;
}

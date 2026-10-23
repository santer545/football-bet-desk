import { format, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from 'date-fns';

import { getDateLocale, getLanguage, translate, type TranslationKey } from '@/lib/i18n';
import type { AnalysisKind, BetStatus, LegResult, RiskLevel } from '@/types';

export interface CompetitionMeta {
  code: string;
  name: string;
  shortName: string;
}

export const COMPETITIONS: CompetitionMeta[] = [
  { code: 'PL', name: 'Premier League', shortName: 'EPL' },
  { code: 'PD', name: 'La Liga', shortName: 'La Liga' },
  { code: 'SA', name: 'Serie A', shortName: 'Serie A' },
  { code: 'BL1', name: 'Bundesliga', shortName: 'Bundesliga' },
  { code: 'CL', name: 'UEFA Champions League', shortName: 'UCL' },
  { code: 'EL', name: 'UEFA Europa League', shortName: 'UEL' },
  { code: 'UECL', name: 'UEFA Conference League', shortName: 'UECL' },
  { code: 'FL1', name: 'Ligue 1', shortName: 'Ligue 1' },
  { code: 'DED', name: 'Eredivisie', shortName: 'ERE' },
  { code: 'PPL', name: 'Primeira Liga', shortName: 'PPL' },
  { code: 'ELC', name: 'EFL Championship', shortName: 'EFL' },
];

export const DEFAULT_COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'CL'];

export function competitionName(code: string): string {
  return COMPETITIONS.find((competition) => competition.code === code)?.name ?? code;
}

export function formatDate(date: string | Date, pattern = 'd MMM yyyy'): string {
  const value = typeof date === 'string' ? parseISO(date) : date;
  return format(value, pattern, { locale: getDateLocale() });
}

export function formatDateLong(date: string | Date): string {
  return formatDate(date, 'EEEE, d MMMM yyyy');
}

export function formatTime(date: string | Date): string {
  return formatDate(date, 'HH:mm');
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'd MMM yyyy · HH:mm');
}

export function formatRelative(date: string): string {
  try {
    return formatDistanceToNowStrict(parseISO(date), {
      addSuffix: true,
      locale: getDateLocale(),
    });
  } catch {
    return date;
  }
}

export function formatDayLabel(date: string): string {
  const parsed = parseISO(date);
  const language = getLanguage();
  if (isToday(parsed)) return translate(language, 'common.today');
  if (isTomorrow(parsed)) return translate(language, 'common.tomorrow');
  return formatDate(parsed, 'EEE, d MMM');
}

export function formatOdds(odds: number | undefined): string {
  if (!odds || Number.isNaN(odds)) return '—';
  return odds.toFixed(2);
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatUnits(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}u`;
}

export interface StatusMeta {
  labelKey: TranslationKey;
  className: string;
  dotClassName: string;
}

export const STATUS_META: Record<BetStatus, StatusMeta> = {
  pending: {
    labelKey: 'status.pending',
    className: 'border-warn/30 bg-warn-soft text-warn',
    dotClassName: 'bg-warn',
  },
  won: {
    labelKey: 'status.won',
    className: 'border-accent/30 bg-accent-soft text-accent',
    dotClassName: 'bg-accent',
  },
  lost: {
    labelKey: 'status.lost',
    className: 'border-danger/30 bg-danger-soft text-danger',
    dotClassName: 'bg-danger',
  },
  void: {
    labelKey: 'status.void',
    className: 'border-line-strong bg-surface-3 text-muted',
    dotClassName: 'bg-faint',
  },
};

export const RISK_META: Record<RiskLevel, { labelKey: TranslationKey; className: string }> = {
  low: { labelKey: 'risk.low', className: 'border-accent/30 bg-accent-soft text-accent' },
  medium: { labelKey: 'risk.medium', className: 'border-warn/30 bg-warn-soft text-warn' },
  high: { labelKey: 'risk.high', className: 'border-danger/30 bg-danger-soft text-danger' },
};

export const ANALYSIS_KIND_META: Record<
  AnalysisKind,
  { labelKey: TranslationKey; className: string }
> = {
  review: {
    labelKey: 'analysisKind.review',
    className: 'border-accent/30 bg-accent-soft text-accent',
  },
  daily: { labelKey: 'analysisKind.daily', className: 'border-info/30 bg-info-soft text-info' },
  match: { labelKey: 'analysisKind.match', className: 'border-warn/30 bg-warn-soft text-warn' },
  custom: {
    labelKey: 'analysisKind.custom',
    className: 'border-line-strong bg-surface-3 text-muted',
  },
};

export const LEG_RESULT_META: Record<LegResult, { labelKey: TranslationKey; className: string }> = {
  pending: { labelKey: 'result.pending', className: 'text-warn' },
  won: { labelKey: 'result.won', className: 'text-accent' },
  lost: { labelKey: 'result.lost', className: 'text-danger' },
  void: { labelKey: 'result.void', className: 'text-muted' },
};

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function timeAgo(date: string): string {
  return formatRelative(date);
}

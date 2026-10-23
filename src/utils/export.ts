import { getLanguage, marketLabel, selectionLabel, translate } from '@/lib/i18n';
import type { AnalysisRecord, BetSlip } from '@/types';
import {
  ANALYSIS_KIND_META,
  formatDate,
  formatOdds,
  LEG_RESULT_META,
  RISK_META,
  STATUS_META,
} from '@/utils/format';
import { summarizeBets } from '@/utils/stats';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
}

export function betToMarkdown(bet: BetSlip): string {
  const language = getLanguage();
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(language, key, params);
  const lines: string[] = [];
  lines.push(`# ${bet.title}`, '');
  lines.push(`- **${t('export.date')}:** ${formatDate(bet.date, 'EEEE, d MMMM yyyy')}`);
  lines.push(`- **${t('export.competition')}:** ${bet.competitionLabel}`);
  lines.push(`- **${t('export.risk')}:** ${t(RISK_META[bet.risk].labelKey)}`);
  lines.push(`- **${t('export.status')}:** ${t(STATUS_META[bet.status].labelKey)}`);
  if (bet.combinedOdds)
    lines.push(`- **${t('export.combinedOdds')}:** ${formatOdds(bet.combinedOdds)}`);
  if (bet.stake) lines.push(`- **${t('export.stake')}:** ${bet.stake.toFixed(2)}u`);
  lines.push('');
  if (bet.summary) {
    lines.push(`## ${t('export.summary')}`, '', bet.summary, '');
  }
  lines.push(`## ${t('export.legs')}`, '');
  lines.push(
    `| # | ${t('export.match')} | ${t('export.kickoff')} | ${t('export.market')} | ${t('export.selection')} | ${t('export.odds')} | ${t('export.score')} | ${t('export.result')} |`,
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  bet.legs.forEach((leg, index) => {
    lines.push(
      `| ${index + 1} | ${leg.homeTeam} vs ${leg.awayTeam} | ${leg.kickoff} | ${marketLabel(leg.market, language)} | ${selectionLabel(leg.selection, language)} | ${formatOdds(leg.odds)} | ${leg.score ?? '—'} | ${t(LEG_RESULT_META[leg.result].labelKey)} |`,
    );
  });
  lines.push('');
  const legNotes = bet.legs.filter((leg) => leg.note);
  if (legNotes.length > 0) {
    lines.push(`## ${t('export.legNotes')}`, '');
    for (const leg of legNotes) {
      lines.push(`- **${leg.homeTeam} vs ${leg.awayTeam}:** ${leg.note}`);
    }
    lines.push('');
  }
  if (bet.notes) {
    lines.push(`## ${t('export.notes')}`, '', bet.notes, '');
  }
  lines.push('---', '', `*${t('export.exportedFrom', { date: new Date().toISOString() })}*`);
  return lines.join('\n');
}

export function analysisToMarkdown(analysis: AnalysisRecord): string {
  const language = getLanguage();
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(language, key, params);
  const lines: string[] = [];
  lines.push(`# ${analysis.title}`, '');
  lines.push(`- **${t('export.date')}:** ${formatDate(analysis.date, 'EEEE, d MMMM yyyy')}`);
  lines.push(`- **${t('export.type')}:** ${t(ANALYSIS_KIND_META[analysis.kind].labelKey)}`);
  if (analysis.tags.length > 0)
    lines.push(`- **${t('export.tags')}:** ${analysis.tags.join(', ')}`);
  lines.push('');
  if (analysis.summary) {
    lines.push(`> ${analysis.summary}`, '');
  }
  lines.push('---', '');
  const content = analysis.content.trim();
  if (content.startsWith('# ')) {
    lines.push(content.replace(/^# .+(\r?\n)+/, ''), '');
  } else {
    lines.push(content, '');
  }
  lines.push('---', '', `*${t('export.exportedFrom', { date: new Date().toISOString() })}*`);
  return lines.join('\n');
}

export function allBetsToMarkdown(bets: BetSlip[]): string {
  const language = getLanguage();
  const summary = summarizeBets(bets);
  const lines: string[] = [];
  lines.push(`# ${translate(language, 'export.series')}`, '');
  lines.push(`- **${translate(language, 'export.slips')}:** ${summary.total}`);
  lines.push(
    `- **${translate(language, 'export.record')}:** ${summary.won}W – ${summary.lost}L (${(summary.hitRate * 100).toFixed(1)}%)`,
  );
  if (summary.pricedSlips > 0) {
    lines.push(
      `- **${translate(language, 'export.profitRoi')}:** ${summary.profit.toFixed(2)}u (${(summary.roi * 100).toFixed(1)}%) ${translate(language, 'export.pricedSlips', { count: summary.pricedSlips })}`,
    );
  }
  lines.push('', '---', '');
  for (const bet of bets) {
    lines.push(betToMarkdown(bet), '', '---', '');
  }
  return lines.join('\n');
}

export function allAnalysesToMarkdown(analyses: AnalysisRecord[]): string {
  const language = getLanguage();
  const lines: string[] = [];
  lines.push(`# ${translate(language, 'export.analyses')}`, '');
  lines.push(`- **${translate(language, 'export.documents')}:** ${analyses.length}`, '');
  lines.push('---', '');
  for (const analysis of analyses) {
    lines.push(analysisToMarkdown(analysis), '', '---', '');
  }
  return lines.join('\n');
}

export function exportBetMarkdown(bet: BetSlip): void {
  downloadFile(`bet-${bet.date}-${slugify(bet.title)}.md`, betToMarkdown(bet), 'text/markdown');
}

export function exportBetJson(bet: BetSlip): void {
  downloadFile(
    `bet-${bet.date}-${slugify(bet.title)}.json`,
    JSON.stringify(bet, null, 2),
    'application/json',
  );
}

export function exportAnalysisMarkdown(analysis: AnalysisRecord): void {
  downloadFile(
    `analysis-${analysis.date}-${slugify(analysis.title)}.md`,
    analysisToMarkdown(analysis),
    'text/markdown',
  );
}

export function exportAnalysisJson(analysis: AnalysisRecord): void {
  downloadFile(
    `analysis-${analysis.date}-${slugify(analysis.title)}.json`,
    JSON.stringify(analysis, null, 2),
    'application/json',
  );
}

export function printPage(): void {
  window.print();
}

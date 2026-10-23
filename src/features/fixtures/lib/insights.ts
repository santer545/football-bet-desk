import { differenceInCalendarYears, parseISO } from 'date-fns';

import {
  getLanguage,
  marketLabel,
  selectionLabel,
  translate,
  type TranslationKey,
  type TranslationParams,
} from '@/lib/i18n';
import type { Language } from '@/types';

import type { FdMatch, FdTeam } from '../types';

function tx(
  key: TranslationKey,
  params?: TranslationParams,
  language: Language = getLanguage(),
): string {
  return translate(language, key, params);
}

export interface TeamFormStats {
  teamId: number;
  sample: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgFor: number;
  avgAgainst: number;
  over25Rate: number;
  bttsRate: number;
  cleanSheetRate: number;
  form: string[];
  winRate: number;
  lossRate: number;
  drawRate: number;
}

export interface H2HSummary {
  sample: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  totalGoals: number;
  avgGoals: number;
  matches: FdMatch[];
  withinTwoSeasons: boolean;
}

export type InsightConfidence = 'low' | 'medium' | 'high';

export interface InsightRecommendation {
  market: string;
  selection: string;
  probability: number;
  fairOdds: number;
  confidence: InsightConfidence;
  reasoning: string[];
}

export interface OutcomeProbabilities {
  home: number;
  draw: number;
  away: number;
}

export interface FixtureInsight {
  match: FdMatch;
  homeForm: TeamFormStats;
  awayForm: TeamFormStats;
  homeSplit: TeamFormStats;
  awaySplit: TeamFormStats;
  h2h: H2HSummary;
  expectedGoals: number;
  recommendation: InsightRecommendation;
  alternatives: InsightRecommendation[];
  warnings: string[];
  markdown: string;
}

function finished(match: FdMatch): boolean {
  return match.status === 'FINISHED' && match.score.fullTime.home !== null;
}

function totalGoals(match: FdMatch): number {
  return (match.score.fullTime.home ?? 0) + (match.score.fullTime.away ?? 0);
}

function rate(part: number, total: number): number {
  return total === 0 ? 0 : part / total;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function buildTeamForm(
  teamId: number,
  matches: FdMatch[],
  scope: 'all' | 'home' | 'away',
  limit = 10,
): TeamFormStats {
  const relevant = matches
    .filter(finished)
    .filter((match) => {
      const isHome = match.homeTeam.id === teamId;
      const isAway = match.awayTeam.id === teamId;
      if (!isHome && !isAway) return false;
      if (scope === 'home') return isHome;
      if (scope === 'away') return isAway;
      return true;
    })
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, limit);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let over25 = 0;
  let btts = 0;
  let cleanSheets = 0;
  const form: string[] = [];

  for (const match of relevant) {
    const isHome = match.homeTeam.id === teamId;
    const scored = (isHome ? match.score.fullTime.home : match.score.fullTime.away) ?? 0;
    const conceded = (isHome ? match.score.fullTime.away : match.score.fullTime.home) ?? 0;
    goalsFor += scored;
    goalsAgainst += conceded;
    if (scored > conceded) {
      wins += 1;
      form.push('W');
    } else if (scored === conceded) {
      draws += 1;
      form.push('D');
    } else {
      losses += 1;
      form.push('L');
    }
    if (scored + conceded > 2.5) over25 += 1;
    if (scored > 0 && conceded > 0) btts += 1;
    if (conceded === 0) cleanSheets += 1;
  }

  const sample = relevant.length;
  return {
    teamId,
    sample,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    avgFor: sample === 0 ? 0 : goalsFor / sample,
    avgAgainst: sample === 0 ? 0 : goalsAgainst / sample,
    over25Rate: rate(over25, sample),
    bttsRate: rate(btts, sample),
    cleanSheetRate: rate(cleanSheets, sample),
    form: form.slice(0, 5),
    winRate: rate(wins, sample),
    lossRate: rate(losses, sample),
    drawRate: rate(draws, sample),
  };
}

export function buildH2H(homeTeamId: number, awayTeamId: number, matches: FdMatch[]): H2HSummary {
  const relevant = matches
    .filter(finished)
    .filter(
      (match) =>
        (match.homeTeam.id === homeTeamId && match.awayTeam.id === awayTeamId) ||
        (match.homeTeam.id === awayTeamId && match.awayTeam.id === homeTeamId),
    )
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, 6);

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let goals = 0;
  for (const match of relevant) {
    goals += totalGoals(match);
    const homeScore = match.score.fullTime.home ?? 0;
    const awayScore = match.score.fullTime.away ?? 0;
    if (homeScore === awayScore) {
      draws += 1;
    } else {
      const winnerId = homeScore > awayScore ? match.homeTeam.id : match.awayTeam.id;
      if (winnerId === homeTeamId) homeWins += 1;
      else awayWins += 1;
    }
  }

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const withinTwoSeasons =
    relevant.length > 0 &&
    relevant.every((match) => differenceInCalendarYears(parseISO(match.utcDate), twoYearsAgo) <= 0);

  const sample = relevant.length;
  return {
    sample,
    homeWins,
    draws,
    awayWins,
    totalGoals: goals,
    avgGoals: sample === 0 ? 0 : goals / sample,
    matches: relevant,
    withinTwoSeasons,
  };
}

function buildOutcomeProbabilities(
  homeSplit: TeamFormStats,
  awaySplit: TeamFormStats,
): OutcomeProbabilities {
  let home = 0.33 + (homeSplit.winRate - 0.42) * 0.5 + (awaySplit.lossRate - 0.48) * 0.3;
  let away = 0.33 + (awaySplit.winRate - 0.42) * 0.5 + (homeSplit.lossRate - 0.48) * 0.3;
  home = clamp(home, 0.08, 0.82);
  away = clamp(away, 0.08, 0.82);
  const draw = clamp(0.24 + (homeSplit.drawRate + awaySplit.drawRate - 0.48) * 0.2, 0.14, 0.36);
  const total = home + away + draw;
  return { home: home / total, draw: draw / total, away: away / total };
}

function buildBaseReasoning(
  homeSplit: TeamFormStats,
  awaySplit: TeamFormStats,
  expectedGoals: number,
  h2h: H2HSummary,
  probabilities: OutcomeProbabilities,
  language: Language,
): string[] {
  const t = (key: TranslationKey, params?: TranslationParams) => tx(key, params, language);
  const reasoning = [
    t('model.homeSplit', {
      wins: homeSplit.wins,
      draws: homeSplit.draws,
      losses: homeSplit.losses,
      sample: homeSplit.sample,
      scored: homeSplit.avgFor.toFixed(2),
      conceded: homeSplit.avgAgainst.toFixed(2),
    }),
    t('model.awaySplit', {
      wins: awaySplit.wins,
      draws: awaySplit.draws,
      losses: awaySplit.losses,
      sample: awaySplit.sample,
      scored: awaySplit.avgFor.toFixed(2),
      conceded: awaySplit.avgAgainst.toFixed(2),
    }),
    t('model.expectedGoals', { goals: expectedGoals.toFixed(2) }),
    t('model.outcomeSplit', {
      home: (probabilities.home * 100).toFixed(0),
      draw: (probabilities.draw * 100).toFixed(0),
      away: (probabilities.away * 100).toFixed(0),
    }),
  ];
  if (h2h.sample > 0) {
    reasoning.push(
      t('model.h2hSample', {
        sample: h2h.sample,
        homeWins: h2h.homeWins,
        draws: h2h.draws,
        awayWins: h2h.awayWins,
      }),
    );
  }
  return reasoning;
}

function buildRecommendation(
  homeSplit: TeamFormStats,
  awaySplit: TeamFormStats,
  expectedGoals: number,
  h2h: H2HSummary,
  probabilities: OutcomeProbabilities,
  language: Language,
): InsightRecommendation {
  const { home, away, draw } = probabilities;
  const t = (key: TranslationKey, params?: TranslationParams) => tx(key, params, language);
  const reasoning = buildBaseReasoning(
    homeSplit,
    awaySplit,
    expectedGoals,
    h2h,
    probabilities,
    language,
  );

  const sampleReady = homeSplit.sample >= 4 && awaySplit.sample >= 4;
  const overRate = (homeSplit.over25Rate + awaySplit.over25Rate) / 2;
  const strongOver =
    sampleReady &&
    homeSplit.avgFor >= 1.6 &&
    awaySplit.avgFor >= 1.6 &&
    homeSplit.over25Rate >= 0.55 &&
    awaySplit.over25Rate >= 0.55 &&
    expectedGoals >= 2.7;
  const strongUnder =
    sampleReady &&
    homeSplit.avgFor <= 1.4 &&
    awaySplit.avgFor <= 1.4 &&
    overRate <= 0.45 &&
    expectedGoals <= 2.3;

  if (home - away >= 0.1 && home >= 0.36) {
    const selection = home >= 0.52 ? '1X' : '1X';
    const probability = clamp(home + draw, 0.5, 0.88);
    return {
      market: 'Double Chance',
      selection: `${selection} (${homeSplit.sample > 0 ? 'home side' : 'home'})`,
      probability,
      fairOdds: probability > 0 ? 1 / probability : 0,
      confidence:
        sampleReady && probability >= 0.72 ? 'high' : probability >= 0.6 ? 'medium' : 'low',
      reasoning: [...reasoning, t('model.preferHome')],
    };
  }

  if (away - home >= 0.1 && away >= 0.36) {
    const probability = clamp(away + draw, 0.5, 0.88);
    return {
      market: 'Double Chance',
      selection: 'X2 (away side)',
      probability,
      fairOdds: probability > 0 ? 1 / probability : 0,
      confidence:
        sampleReady && probability >= 0.72 ? 'high' : probability >= 0.6 ? 'medium' : 'low',
      reasoning: [...reasoning, t('model.preferAway')],
    };
  }

  if (strongOver) {
    const probability = clamp(
      0.45 + (overRate - 0.5) * 0.5 + (expectedGoals - 2.7) * 0.08,
      0.55,
      0.78,
    );
    return {
      market: 'Total Goals',
      selection: 'Over 2.5',
      probability,
      fairOdds: 1 / probability,
      confidence: probability >= 0.68 ? 'medium' : 'low',
      reasoning: [...reasoning, t('model.overGate')],
    };
  }

  if (strongUnder) {
    const probability = clamp(
      0.55 + (0.45 - overRate) * 0.5 + (2.3 - expectedGoals) * 0.08,
      0.55,
      0.8,
    );
    return {
      market: 'Total Goals',
      selection: 'Under 3.5',
      probability,
      fairOdds: 1 / probability,
      confidence: 'medium',
      reasoning: [...reasoning, t('model.underGate')],
    };
  }

  return {
    market: 'Pass',
    selection: 'No clear edge',
    probability: 0,
    fairOdds: 0,
    confidence: 'low',
    reasoning: [...reasoning, t('model.passReason')],
  };
}

function buildAlternatives(
  homeSplit: TeamFormStats,
  awaySplit: TeamFormStats,
  expectedGoals: number,
  h2h: H2HSummary,
  probabilities: OutcomeProbabilities,
  primary: InsightRecommendation,
  language: Language,
): InsightRecommendation[] {
  const sampleReady = homeSplit.sample >= 3 && awaySplit.sample >= 3;
  if (!sampleReady) return [];

  const t = (key: TranslationKey, params?: TranslationParams) => tx(key, params, language);
  const reasoning = buildBaseReasoning(
    homeSplit,
    awaySplit,
    expectedGoals,
    h2h,
    probabilities,
    language,
  );
  const alternatives: InsightRecommendation[] = [];

  const add = (
    market: string,
    selection: string,
    probability: number,
    confidence: InsightConfidence,
    reason: string,
  ) => {
    if (primary.market === market && primary.selection === selection) return;
    if (probability <= 0) return;
    alternatives.push({
      market,
      selection,
      probability,
      fairOdds: 1 / probability,
      confidence,
      reasoning: [...reasoning, reason],
    });
  };

  if (probabilities.home >= 0.45 && probabilities.home > probabilities.away + 0.03) {
    add(
      'Match Winner',
      'Home win',
      probabilities.home,
      sampleReady && probabilities.home >= 0.6 ? 'medium' : 'low',
      t('model.altHomeWin', { probability: pct(probabilities.home) }),
    );
  }

  if (probabilities.away >= 0.45 && probabilities.away > probabilities.home + 0.03) {
    add(
      'Match Winner',
      'Away win',
      probabilities.away,
      sampleReady && probabilities.away >= 0.6 ? 'medium' : 'low',
      t('model.altAwayWin', { probability: pct(probabilities.away) }),
    );
  }

  const bttsRate = (homeSplit.bttsRate + awaySplit.bttsRate) / 2;
  if (bttsRate >= 0.5) {
    const probability = clamp(
      0.45 + (bttsRate - 0.5) * 0.8 + (expectedGoals - 2.5) * 0.04,
      0.5,
      0.78,
    );
    add(
      'Both Teams to Score',
      'Yes',
      probability,
      probability >= 0.62 ? 'medium' : 'low',
      t('model.altBttsYes', { rate: pct(bttsRate), goals: expectedGoals.toFixed(2) }),
    );
  }

  if (bttsRate <= 0.35) {
    const probability = clamp(0.6 + (0.35 - bttsRate) * 0.5, 0.55, 0.8);
    add(
      'Both Teams to Score',
      'No',
      probability,
      probability >= 0.62 ? 'medium' : 'low',
      t('model.altBttsNo', { rate: pct(bttsRate) }),
    );
  }

  const overRate = (homeSplit.over25Rate + awaySplit.over25Rate) / 2;
  if (expectedGoals >= 2.4 && overRate >= 0.45) {
    const probability = clamp(
      0.45 + (overRate - 0.5) * 0.5 + (expectedGoals - 2.7) * 0.08,
      0.5,
      0.76,
    );
    add(
      'Total Goals',
      'Over 2.5',
      probability,
      probability >= 0.62 ? 'medium' : 'low',
      t('model.altOver', { rate: pct(overRate), goals: expectedGoals.toFixed(2) }),
    );
  }

  if (expectedGoals <= 2.7 && overRate <= 0.6) {
    const probability = clamp(
      0.62 + (2.7 - expectedGoals) * 0.08 + (0.6 - overRate) * 0.3,
      0.55,
      0.8,
    );
    add(
      'Total Goals',
      'Under 3.5',
      probability,
      probability >= 0.62 ? 'medium' : 'low',
      t('model.altUnder', { goals: expectedGoals.toFixed(2), rate: pct(overRate) }),
    );
  }

  return alternatives.sort((a, b) => b.probability - a.probability);
}

function formatScore(match: FdMatch): string {
  if (match.score.fullTime.home === null) return '—';
  return `${match.score.fullTime.home}:${match.score.fullTime.away}`;
}

function teamLabel(team: FdTeam): string {
  return team.shortName ?? team.name;
}

function formLine(stats: TeamFormStats): string {
  return stats.form.length > 0 ? stats.form.join(' ') : '—';
}

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function buildFixtureInsight(
  match: FdMatch,
  homeMatches: FdMatch[],
  awayMatches: FdMatch[],
  h2hMatches: FdMatch[],
  language: Language = getLanguage(),
): FixtureInsight {
  const t = (key: TranslationKey, params?: TranslationParams) => tx(key, params, language);
  const homeForm = buildTeamForm(match.homeTeam.id, homeMatches, 'all', 5);
  const awayForm = buildTeamForm(match.awayTeam.id, awayMatches, 'all', 5);
  const homeSplit = buildTeamForm(match.homeTeam.id, homeMatches, 'home', 6);
  const awaySplit = buildTeamForm(match.awayTeam.id, awayMatches, 'away', 6);
  const h2h = buildH2H(match.homeTeam.id, match.awayTeam.id, h2hMatches);

  const expectedGoals =
    (homeSplit.avgFor + awaySplit.avgAgainst) / 2 + (awaySplit.avgFor + homeSplit.avgAgainst) / 2;

  const probabilities = buildOutcomeProbabilities(homeSplit, awaySplit);
  const recommendation = buildRecommendation(
    homeSplit,
    awaySplit,
    expectedGoals,
    h2h,
    probabilities,
    language,
  );
  const alternatives = buildAlternatives(
    homeSplit,
    awaySplit,
    expectedGoals,
    h2h,
    probabilities,
    recommendation,
    language,
  );
  const warnings: string[] = [];
  if (homeSplit.sample < 5) {
    warnings.push(t('model.warnHomeSample', { count: homeSplit.sample }));
  }
  if (awaySplit.sample < 5) {
    warnings.push(t('model.warnAwaySample', { count: awaySplit.sample }));
  }
  if (h2h.sample === 0) warnings.push(t('model.warnNoH2h'));
  if (h2h.sample > 0 && !h2h.withinTwoSeasons) {
    warnings.push(t('model.warnOldH2h'));
  }
  if (homeSplit.sample === 0 || awaySplit.sample === 0) {
    warnings.push(t('model.warnNoSplit'));
  }
  warnings.push(t('model.warnFormOnly'));

  const markdown = generateInsightMarkdown(
    {
      match,
      homeForm,
      awayForm,
      homeSplit,
      awaySplit,
      h2h,
      expectedGoals,
      recommendation,
      warnings,
    },
    // language,
  );

  return {
    match,
    homeForm,
    awayForm,
    homeSplit,
    awaySplit,
    h2h,
    expectedGoals,
    recommendation,
    alternatives,
    warnings,
    markdown,
  };
}

function generateInsightMarkdown(
  {
    match,
    homeForm,
    awayForm,
    homeSplit,
    awaySplit,
    h2h,
    expectedGoals,
    recommendation,
    warnings,
  }: Omit<FixtureInsight, 'markdown' | 'alternatives'>,
  // language: Language,
): string {
  // const t = (key: TranslationKey, params?: TranslationParams) => tx(key, params, language);
  const kickoff = new Date(match.utcDate).toISOString().replace('T', ' ').slice(0, 16);
  const lines: string[] = [];
  lines.push(
    `# ${tx('model.markdownTitle', {
      home: match.homeTeam.name,
      away: match.awayTeam.name,
    })}`,
    '',
  );
  lines.push(`> ${tx('model.markdownIntro')}`, '');
  lines.push(`## ${tx('model.match')}`, '');
  lines.push(`- **${tx('model.competition')}:** ${match.competition.name}`);
  lines.push(`- **${tx('model.kickoffUtc')}:** ${kickoff}`);
  if (match.matchday) {
    lines.push(`- **${tx('model.matchday')}:** ${match.matchday}`);
  }
  lines.push(`- **${tx('model.status')}:** ${match.status}`, '');

  lines.push(`## ${tx('model.modelLean')}`, '');
  lines.push(`- **${tx('model.market')}:** ${marketLabel(recommendation.market)}`);
  lines.push(`- **${tx('model.selection')}:** ${selectionLabel(recommendation.selection)}`);
  lines.push(
    `- **${tx('model.probability')}:** ${recommendation.probability > 0 ? pct(recommendation.probability) : '—'}`,
  );
  lines.push(
    `- **${tx('model.fairOdds')}:** ${recommendation.fairOdds > 0 ? recommendation.fairOdds.toFixed(2) : '—'}`,
  );
  lines.push(
    `- **${tx('model.confidenceLabel')}:** ${tx(`confidence.${recommendation.confidence}`)}`,
    '',
  );
  for (const reason of recommendation.reasoning) lines.push(`- ${reason}`);
  lines.push('');

  lines.push(`## ${tx('model.splitForm')}`, '');
  lines.push(
    `| ${tx('model.metric')} | ${teamLabel(match.homeTeam)} (${tx('model.home')}) | ${teamLabel(match.awayTeam)} (${tx('model.away')}) |`,
  );
  lines.push('| --- | --- | --- |');
  lines.push(`| ${tx('model.sample')} | ${homeSplit.sample} | ${awaySplit.sample} |`);
  lines.push(
    `| ${tx('model.record')} | ${homeSplit.wins}W-${homeSplit.draws}D-${homeSplit.losses}L | ${awaySplit.wins}W-${awaySplit.draws}D-${awaySplit.losses}L |`,
  );
  lines.push(
    `| ${tx('model.goalsPerGame')} | ${homeSplit.avgFor.toFixed(2)} | ${awaySplit.avgFor.toFixed(2)} |`,
  );
  lines.push(
    `| ${tx('model.concededPerGame')} | ${homeSplit.avgAgainst.toFixed(2)} | ${awaySplit.avgAgainst.toFixed(2)} |`,
  );
  lines.push(
    `| ${tx('model.over25Rate')} | ${pct(homeSplit.over25Rate)} | ${pct(awaySplit.over25Rate)} |`,
  );
  lines.push(
    `| ${tx('model.bttsRate')} | ${pct(homeSplit.bttsRate)} | ${pct(awaySplit.bttsRate)} |`,
  );
  lines.push(
    `| ${tx('model.cleanSheets')} | ${pct(homeSplit.cleanSheetRate)} | ${pct(awaySplit.cleanSheetRate)} |`,
  );
  lines.push('');

  lines.push(`## ${tx('model.lastFive')}`, '');
  lines.push(
    `- **${match.homeTeam.name}:** ${tx('model.formLine', {
      form: formLine(homeForm),
      scored: homeForm.avgFor.toFixed(2),
      conceded: homeForm.avgAgainst.toFixed(2),
    })}`,
  );
  lines.push(
    `- **${match.awayTeam.name}:** ${tx('model.formLine', {
      form: formLine(awayForm),
      scored: awayForm.avgFor.toFixed(2),
      conceded: awayForm.avgAgainst.toFixed(2),
    })}`,
    '',
  );
  lines.push(`**${tx('model.expectedTotal', { goals: expectedGoals.toFixed(2) })}**`, '');

  if (h2h.sample > 0) {
    lines.push(`## ${tx('model.headToHead')}`, '');
    lines.push(`| ${tx('model.date')} | ${tx('model.fixture')} | ${tx('model.score')} |`);
    lines.push('| --- | --- | --- |');
    for (const item of h2h.matches) {
      lines.push(
        `| ${item.utcDate.slice(0, 10)} | ${item.homeTeam.name} vs ${item.awayTeam.name} | ${formatScore(item)} |`,
      );
    }
    lines.push('');
    lines.push(
      `**${tx('model.summaryLabel')}:** ${tx('model.h2hSummary', {
        sample: h2h.sample,
        homeWins: h2h.homeWins,
        draws: h2h.draws,
        awayWins: h2h.awayWins,
        goals: h2h.avgGoals.toFixed(2),
      })}`,
      '',
    );
  }

  lines.push(`## ${tx('model.preflight')}`, '');
  if (warnings.length === 0) {
    lines.push(`- ${tx('model.allChecks')}`);
  } else {
    for (const warning of warnings) lines.push(`- ⚠️ ${warning}`);
  }
  lines.push('');
  lines.push('---', '');
  lines.push(`*${tx('model.generated', { date: new Date().toISOString() })}*`);
  return lines.join('\n');
}

export function insightToBetSummary(insight: FixtureInsight): string {
  const { recommendation } = insight;
  const language = getLanguage();
  return translate(language, 'model.summary', {
    market: marketLabel(recommendation.market, language),
    selection: selectionLabel(recommendation.selection, language),
    odds: recommendation.fairOdds > 0 ? recommendation.fairOdds.toFixed(2) : '—',
    probability: (recommendation.probability * 100).toFixed(0),
    confidence: translate(language, `confidence.${recommendation.confidence}`),
  });
}

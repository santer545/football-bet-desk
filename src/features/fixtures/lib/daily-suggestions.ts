import { format, parseISO } from 'date-fns';

import {
  getLanguage,
  marketLabel,
  pluralize,
  selectionLabel,
  translate,
  type TranslationKey,
  type TranslationParams,
} from '@/lib/i18n';
import type { BetDraft, RiskLevel } from '@/types';

import type { FdMatch } from '../types';
import { buildFixtureInsight, type FixtureInsight, type InsightConfidence } from './insights';

function tx(key: TranslationKey, params?: TranslationParams): string {
  return translate(getLanguage(), key, params);
}

const CARD_LABEL_KEYS: Record<SuggestionCardLabel, TranslationKey> = {
  Anchor: 'daily.label.anchor',
  Balanced: 'daily.label.balanced',
  Value: 'daily.label.value',
};

export type SuggestionCardLabel = 'Anchor' | 'Balanced' | 'Value';
export type SuggestionMarketFamily = 'result' | 'totals' | 'goals' | 'other';

export interface SuggestionLeg {
  matchId: number;
  kickoff: string;
  date: string;
  competition: string;
  competitionLabel: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  probability: number;
  fairOdds: number;
  confidence: InsightConfidence;
  reasoning: string[];
  warnings: string[];
  homeSample: number;
  awaySample: number;
  h2hSample: number;
  expectedGoals: number;
  quality: number;
}

export interface SuggestionCard {
  id: string;
  label: SuggestionCardLabel;
  risk: RiskLevel;
  legs: SuggestionLeg[];
  jointProbability: number;
  combinedFairOdds: number;
  summary: string;
  warnings: string[];
}

export interface DailySuggestionSlate {
  date: string;
  generatedAt: string;
  cards: SuggestionCard[];
  matchCount: number;
  candidateCount: number;
  notes: string[];
}

export interface BuildDailySuggestionOptions {
  today: string;
  now?: Date;
  maxCards?: number;
}

interface CandidateCombo {
  legs: SuggestionLeg[];
  jointProbability: number;
  combinedFairOdds: number;
  score: number;
}

const PLAYABLE_STATUSES = new Set<FdMatch['status']>(['SCHEDULED', 'TIMED']);
const CARD_LABELS: SuggestionCardLabel[] = ['Anchor', 'Balanced', 'Value'];
const CONFIDENCE_SCORE: Record<InsightConfidence, number> = {
  high: 1,
  medium: 0.78,
  low: 0.5,
};
const MIN_COMBINED_ODDS = 1.2;
const ANCHOR_MAX_ODDS = 2.5;
const TARGET_MIN_ODDS = 2.5;
const TARGET_MAX_ODDS = 4;
const MEDIUM_RISK_MAX_ODDS = TARGET_MAX_ODDS;
const LOW_RISK_THRESHOLD = 1 / ANCHOR_MAX_ODDS;
const MEDIUM_RISK_THRESHOLD = 1 / MEDIUM_RISK_MAX_ODDS;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function localDate(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

function teamName(team: FdMatch['homeTeam']): string {
  return team.shortName ?? team.name;
}

function marketFamily(market: string): SuggestionMarketFamily {
  if (/double chance|draw no bet|match winner|to win/i.test(market)) return 'result';
  if (/total goals|over|under/i.test(market)) return 'totals';
  if (/both teams|btts/i.test(market)) return 'goals';
  return 'other';
}

function candidateQuality(
  insight: FixtureInsight,
  recommendation: FixtureInsight['recommendation'],
): number {
  const { homeSplit, awaySplit } = insight;
  const sampleScore = Math.min(1, Math.min(homeSplit.sample, awaySplit.sample) / 5);
  const smallSamplePenalty = (homeSplit.sample < 5 ? 0.04 : 0) + (awaySplit.sample < 5 ? 0.04 : 0);
  return clamp(
    recommendation.probability * 0.5 +
      CONFIDENCE_SCORE[recommendation.confidence] * 0.3 +
      sampleScore * 0.2 -
      smallSamplePenalty,
    0,
    1,
  );
}

function buildCandidates(match: FdMatch, finishedMatches: FdMatch[]): SuggestionLeg[] {
  const insight = buildFixtureInsight(match, finishedMatches, finishedMatches, finishedMatches);
  const { homeSplit, awaySplit, h2h, expectedGoals } = insight;

  if (homeSplit.sample === 0 || awaySplit.sample === 0) return [];
  if (h2h.sample === 0 && homeSplit.sample < 3 && awaySplit.sample < 3) return [];

  const date = localDate(match.utcDate);
  return [insight.recommendation, ...insight.alternatives]
    .filter((recommendation) => recommendation.market !== 'Pass')
    .filter((recommendation) => recommendation.probability > 0)
    .map((recommendation) => ({
      matchId: match.id,
      kickoff: match.utcDate,
      date,
      competition: match.competition.code,
      competitionLabel: match.competition.name,
      homeTeam: teamName(match.homeTeam),
      awayTeam: teamName(match.awayTeam),
      market: recommendation.market,
      selection: recommendation.selection,
      probability: recommendation.probability,
      fairOdds: recommendation.fairOdds,
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning,
      warnings: insight.warnings,
      homeSample: homeSplit.sample,
      awaySample: awaySplit.sample,
      h2hSample: h2h.sample,
      expectedGoals,
      quality: candidateQuality(insight, recommendation),
    }));
}

function buildCombos(pool: SuggestionLeg[]): CandidateCombo[] {
  const combos: CandidateCombo[] = [];

  const addCombo = (legs: SuggestionLeg[]) => {
    const matchIds = new Set(legs.map((leg) => leg.matchId));
    if (matchIds.size !== legs.length) return;

    const totalsLegs = legs.filter((leg) => marketFamily(leg.market) === 'totals').length;
    if (totalsLegs > 1) return;

    const combinedFairOdds = legs.reduce((product, leg) => product * leg.fairOdds, 1);
    if (combinedFairOdds < MIN_COMBINED_ODDS || combinedFairOdds > TARGET_MAX_ODDS) return;

    const jointProbability = legs.reduce((product, leg) => product * leg.probability, 1);
    if (jointProbability < 1 / TARGET_MAX_ODDS) return;

    const families = new Set(legs.map((leg) => marketFamily(leg.market)));
    const averageQuality = legs.reduce((total, leg) => total + leg.quality, 0) / legs.length;
    const samplePenalty =
      legs.filter((leg) => leg.homeSample < 5 || leg.awaySample < 5).length * 0.015;
    const oddsScore = clamp(1 - Math.abs(combinedFairOdds - 3) / 2.5, 0, 1);
    const diversity = families.size / legs.length;
    const score =
      oddsScore * 0.4 +
      jointProbability * 0.25 +
      averageQuality * 0.2 +
      diversity * 0.1 -
      samplePenalty;

    combos.push({
      legs,
      jointProbability,
      combinedFairOdds,
      score: clamp(score, 0, 1.5),
    });
  };

  for (let i = 0; i < pool.length; i += 1) {
    const first = pool[i];
    if (!first) continue;
    for (let j = i + 1; j < pool.length; j += 1) {
      const second = pool[j];
      if (!second) continue;
      addCombo([first, second]);

      for (let k = j + 1; k < pool.length; k += 1) {
        const third = pool[k];
        if (!third) continue;
        addCombo([first, second, third]);
      }
    }
  }

  return combos.sort((a, b) => b.score - a.score);
}

function totalScore(combos: CandidateCombo[]): number {
  return combos.reduce((total, combo) => total + combo.score, 0);
}

function isBetterTargetSet(candidate: CandidateCombo[], current: CandidateCombo[]): boolean {
  if (candidate.length !== current.length) return candidate.length > current.length;
  return totalScore(candidate) > totalScore(current);
}

function pickTargetCards(
  targets: CandidateCombo[],
  usedMatches: Set<number>,
  limit: number,
): CandidateCombo[] {
  let best: CandidateCombo[] = [];
  const used = new Set(usedMatches);

  const search = (start: number, picked: CandidateCombo[]): void => {
    if (picked.length > 0 && isBetterTargetSet(picked, best)) best = [...picked];
    if (picked.length === limit) return;

    for (let index = start; index < targets.length; index += 1) {
      const combo = targets[index];
      if (!combo) continue;
      if (combo.legs.some((leg) => used.has(leg.matchId))) continue;

      for (const leg of combo.legs) used.add(leg.matchId);
      picked.push(combo);
      search(index + 1, picked);
      picked.pop();
      for (const leg of combo.legs) used.delete(leg.matchId);
    }
  };

  search(0, []);
  return best;
}

function isLowRisk(combo: CandidateCombo): boolean {
  return combo.jointProbability >= LOW_RISK_THRESHOLD && combo.combinedFairOdds < ANCHOR_MAX_ODDS;
}

function isBetterPlan(candidate: CandidateCombo[], current: CandidateCombo[]): boolean {
  if (candidate.length !== current.length) return candidate.length > current.length;

  const candidateAnchor = candidate[0];
  const currentAnchor = current[0];
  if (!candidateAnchor) return false;
  if (!currentAnchor) return true;

  const candidateLowRisk = isLowRisk(candidateAnchor);
  const currentLowRisk = isLowRisk(currentAnchor);
  if (candidateLowRisk !== currentLowRisk) return candidateLowRisk;

  if (candidateAnchor.jointProbability !== currentAnchor.jointProbability) {
    return candidateAnchor.jointProbability > currentAnchor.jointProbability;
  }

  return totalScore(candidate) > totalScore(current);
}

function pickStructuredCards(combos: CandidateCombo[], maxCards: number): CandidateCombo[] {
  if (combos.length === 0 || maxCards < 1) return [];

  const targetOptions = combos
    .filter(
      (combo) =>
        combo.combinedFairOdds >= TARGET_MIN_ODDS && combo.combinedFairOdds <= TARGET_MAX_ODDS,
    )
    .sort((a, b) => b.score - a.score);

  const anchorOptions = [...combos]
    .sort((a, b) => b.jointProbability - a.jointProbability || b.score - a.score)
    .slice(0, 40);

  let best: CandidateCombo[] = [];

  for (const anchor of anchorOptions) {
    const usedMatches = new Set(anchor.legs.map((leg) => leg.matchId));
    const targets = maxCards > 1 ? pickTargetCards(targetOptions, usedMatches, maxCards - 1) : [];
    const plan = [anchor, ...targets];
    if (isBetterPlan(plan, best)) best = plan;
  }

  return best;
}

function uniqueWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings));
}

function cardRisk(jointProbability: number): RiskLevel {
  if (jointProbability >= LOW_RISK_THRESHOLD) return 'low';
  if (jointProbability >= MEDIUM_RISK_THRESHOLD) return 'medium';
  return 'high';
}

function buildSummary(
  legs: SuggestionLeg[],
  jointProbability: number,
  combinedFairOdds: number,
): string {
  const strongest = [...legs].sort((a, b) => b.probability - a.probability)[0];
  const competitions = new Set(legs.map((leg) => leg.competitionLabel)).size;
  if (!strongest) return tx('slate.noQualifying');

  return tx('slate.summary', {
    legs: legs.length,
    competitions,
    match: `${strongest.homeTeam} vs ${strongest.awayTeam}`,
    selection: selectionLabel(strongest.selection),
    probability: (strongest.probability * 100).toFixed(0),
    joint: (jointProbability * 100).toFixed(1),
    odds: combinedFairOdds.toFixed(2),
  });
}

function buildCardWarnings(legs: SuggestionLeg[], combinedFairOdds: number): string[] {
  const warnings: string[] = [];

  for (const leg of legs) {
    if (leg.homeSample < 5 || leg.awaySample < 5) {
      warnings.push(
        tx('slate.warnSamples', {
          home: leg.homeTeam,
          away: leg.awayTeam,
          homeSample: leg.homeSample,
          awaySample: leg.awaySample,
        }),
      );
    }
    if (leg.h2hSample === 0) {
      warnings.push(tx('slate.warnNoH2h', { home: leg.homeTeam, away: leg.awayTeam }));
    }
  }

  const families = new Set(legs.map((leg) => marketFamily(leg.market)));
  if (families.size === 1 && legs.length > 1) {
    const family = [...families][0];
    if (family === 'result') {
      warnings.push(tx('slate.warnCorrelatedResults'));
    } else if (family === 'totals') {
      warnings.push(tx('slate.warnCorrelatedTotals'));
    }
  }

  if (combinedFairOdds < 2.5) {
    warnings.push(tx('slate.warnBelowBand', { odds: combinedFairOdds.toFixed(2) }));
  } else if (combinedFairOdds > 4) {
    warnings.push(tx('slate.warnAboveBand', { odds: combinedFairOdds.toFixed(2) }));
  }

  return uniqueWarnings(warnings);
}

export function buildDailySuggestions(
  matches: FdMatch[],
  options: BuildDailySuggestionOptions,
): DailySuggestionSlate {
  const { today, now = new Date(), maxCards = 3 } = options;
  const nowTime = now.getTime();

  const finishedMatches = matches.filter(
    (match) => match.status === 'FINISHED' && match.score.fullTime.home !== null,
  );

  const upcoming = matches
    .filter((match) => PLAYABLE_STATUSES.has(match.status))
    .filter((match) => parseISO(match.utcDate).getTime() > nowTime)
    .filter((match) => localDate(match.utcDate) === today)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  const candidates = upcoming
    .flatMap((match) => buildCandidates(match, finishedMatches))
    .sort((a, b) => b.quality - a.quality);

  const perMatchLimit = new Map<number, number>();
  const pool: SuggestionLeg[] = [];
  for (const candidate of candidates) {
    const used = perMatchLimit.get(candidate.matchId) ?? 0;
    if (used >= 3) continue;
    pool.push(candidate);
    perMatchLimit.set(candidate.matchId, used + 1);
    if (pool.length >= 24) break;
  }

  const combos = buildCombos(pool);
  const picked = pickStructuredCards(combos, maxCards);
  const [anchor, ...targets] = picked;
  const ordered = anchor
    ? [anchor, ...targets.sort((a, b) => a.combinedFairOdds - b.combinedFairOdds)]
    : [];

  const cards = ordered.slice(0, maxCards).map((combo, index) => ({
    id: `${today}-${index + 1}`,
    label: CARD_LABELS[index] ?? 'Value',
    risk: cardRisk(combo.jointProbability),
    legs: combo.legs,
    jointProbability: combo.jointProbability,
    combinedFairOdds: combo.combinedFairOdds,
    summary: buildSummary(combo.legs, combo.jointProbability, combo.combinedFairOdds),
    warnings: buildCardWarnings(combo.legs, combo.combinedFairOdds),
  })) satisfies SuggestionCard[];

  const notes: string[] = [];
  const language = getLanguage();
  if (upcoming.length === 0) {
    notes.push(tx('slate.noteNoFixtures', { date: format(parseISO(today), 'd MMM') }));
  }
  if (upcoming.length > 0 && cards.length < maxCards) {
    notes.push(
      tx('slate.noteOnlyCards', {
        count: cards.length,
        cards: pluralize(language, cards.length, ['картка', 'картки', 'карток'], ['card', 'cards']),
      }),
    );
  }

  return {
    date: today,
    generatedAt: now.toISOString(),
    cards,
    matchCount: upcoming.length,
    candidateCount: new Set(candidates.map((candidate) => candidate.matchId)).size,
    notes: uniqueWarnings(notes),
  };
}

export function suggestionCardToDraft(card: SuggestionCard): BetDraft {
  const firstLeg = card.legs[0];
  const date = firstLeg?.date ?? format(new Date(), 'yyyy-MM-dd');
  const label = card.legs
    .map((leg) => `${leg.homeTeam} vs ${leg.awayTeam}`)
    .slice(0, 2)
    .join(' + ');
  const competitions = Array.from(new Set(card.legs.map((leg) => leg.competitionLabel))).join(
    ' / ',
  );
  const notes = [
    tx('slate.draftReasoning'),
    ...card.legs.flatMap((leg) => [
      `${leg.homeTeam} vs ${leg.awayTeam} - ${marketLabel(leg.market)}: ${selectionLabel(leg.selection)}`,
      ...leg.reasoning.map((reason) => `- ${reason}`),
    ]),
    '',
    tx('slate.draftWarnings'),
    ...card.warnings.map((warning) => `- ${warning}`),
    `- ${tx('slate.draftSuggested')}`,
  ].join('\n');

  return {
    date,
    title: tx('slate.draftTitle', { label: tx(CARD_LABEL_KEYS[card.label]), teams: label }).slice(
      0,
      160,
    ),
    competitionLabel: (competitions || tx('slate.draftDailySlate')).slice(0, 120),
    risk: card.risk,
    combinedOdds: Number(card.combinedFairOdds.toFixed(2)),
    summary: card.summary.slice(0, 1200),
    notes: notes.slice(0, 4000),
    legs: card.legs.map((leg) => ({
      matchId: leg.matchId,
      kickoff: format(parseISO(leg.kickoff), "yyyy-MM-dd'T'HH:mm"),
      competition: leg.competition,
      competitionLabel: leg.competitionLabel,
      homeTeam: leg.homeTeam,
      awayTeam: leg.awayTeam,
      market: leg.market,
      selection: leg.selection,
      odds: Number(leg.fairOdds.toFixed(2)),
      result: 'pending',
      score: '',
      note: tx('slate.draftLegNote', {
        probability: (leg.probability * 100).toFixed(0),
        odds: leg.fairOdds.toFixed(2),
        confidence: tx(`confidence.${leg.confidence}`),
      }),
    })),
  };
}

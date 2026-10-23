import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from '@/store/use-settings-store';

import type { FdMatch, FdMatchStatus, FdTeam } from '../types';
import {
  buildDailySuggestions,
  suggestionCardToDraft,
  type SuggestionCard,
} from './daily-suggestions';

const TODAY = '2026-10-23';
const NOW = new Date('2026-10-23T08:00:00.000Z');
const COMPETITION = { id: 2021, code: 'PL', name: 'Premier League' };

function team(id: number): FdTeam {
  return { id, name: `Team ${id}`, shortName: `T${id}` };
}

function resultMatch(
  id: number,
  homeId: number,
  awayId: number,
  date: string,
  homeGoals: number,
  awayGoals: number,
  status: FdMatchStatus = 'FINISHED',
): FdMatch {
  return {
    id,
    utcDate: date,
    status,
    matchday: 1,
    stage: 'REGULAR_SEASON',
    group: null,
    competition: COMPETITION,
    homeTeam: team(homeId),
    awayTeam: team(awayId),
    score: {
      winner: homeGoals === awayGoals ? 'DRAW' : homeGoals > awayGoals ? 'HOME_TEAM' : 'AWAY_TEAM',
      duration: 'REGULAR',
      fullTime: { home: homeGoals, away: awayGoals },
      halfTime: { home: null, away: null },
    },
  };
}

function buildHistory(teamIds: number[]): FdMatch[] {
  const matches: FdMatch[] = [];
  let id = 1000;

  for (const teamId of teamIds) {
    for (let index = 0; index < 5; index += 1) {
      const opponent = 5000 + teamId * 10 + index;
      const date = `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`;
      const win = index < 3;
      matches.push(resultMatch(id++, teamId, opponent, date, win ? 2 : 0, win ? 0 : 1));

      const awayWin = index < 2;
      matches.push(
        resultMatch(id++, opponent + 500, teamId, date, awayWin ? 0 : 2, awayWin ? 1 : 0),
      );
    }
  }

  return matches;
}

function buildSlate(todayCount: number, tomorrowCount = 0) {
  const fixtures: FdMatch[] = [];
  const historyTeams: number[] = [];
  let id = 1;

  for (let index = 0; index < todayCount + tomorrowCount; index += 1) {
    const homeId = id++;
    const awayId = id++;
    historyTeams.push(homeId, awayId);
    const day = index < todayCount ? TODAY : '2026-10-24';
    fixtures.push(resultMatch(100 + index, homeId, awayId, `${day}T12:00:00.000Z`, 0, 0, 'TIMED'));
  }

  return buildDailySuggestions([...buildHistory(historyTeams), ...fixtures], {
    today: TODAY,
    now: NOW,
  });
}

function expectValidCard(card: SuggestionCard) {
  expect(card.legs.length).toBeGreaterThanOrEqual(2);
  expect(card.legs.length).toBeLessThanOrEqual(3);
  expect(new Set(card.legs.map((leg) => leg.matchId)).size).toBe(card.legs.length);
  expect(card.combinedFairOdds).toBeGreaterThan(1);
  expect(card.jointProbability).toBeGreaterThan(0);
  expect(card.summary.length).toBeGreaterThan(40);
  expect(card.legs.every((leg) => leg.reasoning.length >= 3)).toBe(true);
  expect(
    card.legs.every((leg) =>
      ['Double Chance', 'Match Winner', 'Total Goals', 'Both Teams to Score'].includes(leg.market),
    ),
  ).toBe(true);
}

describe('buildDailySuggestions', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
  });

  it('builds one low-risk anchor and two value cards with 2.50-4.00 odds', () => {
    const slate = buildSlate(8);

    expect(slate.cards).toHaveLength(3);
    expect(slate.cards.every((card) => card.legs.every((leg) => leg.date === TODAY))).toBe(true);

    const matchIds = slate.cards.flatMap((card) => card.legs.map((leg) => leg.matchId));
    expect(new Set(matchIds).size).toBe(matchIds.length);

    for (const card of slate.cards) expectValidCard(card);

    const [anchor, ...targets] = slate.cards;
    expect(anchor?.label).toBe('Anchor');
    expect(anchor?.risk).toBe('low');
    expect(anchor?.combinedFairOdds).toBeLessThan(2.5);
    expect(targets).toHaveLength(2);
    for (const card of targets) {
      expect(card.label).not.toBe('Anchor');
      expect(card.risk).toBe('medium');
      expect(card.combinedFairOdds).toBeGreaterThanOrEqual(2.5);
      expect(card.combinedFairOdds).toBeLessThanOrEqual(4);
    }
    expect(anchor?.warnings.some((warning) => warning.includes('2.50-4.00'))).toBe(true);
  });

  it('ignores tomorrow fixtures when today cannot fill three cards', () => {
    const slate = buildSlate(2, 4);

    expect(slate.matchCount).toBe(2);
    expect(slate.candidateCount).toBe(2);
    expect(slate.cards).toHaveLength(1);
    expect(slate.cards.every((card) => card.legs.every((leg) => leg.date === TODAY))).toBe(true);
    expect(slate.notes.some((note) => note.includes('cleared the filters'))).toBe(true);
  });

  it('returns an empty slate when only tomorrow fixtures are available', () => {
    const slate = buildSlate(0, 4);

    expect(slate.matchCount).toBe(0);
    expect(slate.cards).toHaveLength(0);
    expect(slate.notes[0]).toContain('No scheduled fixtures');
  });

  it('returns an empty slate when there are no upcoming fixtures', () => {
    const slate = buildDailySuggestions(buildHistory([1, 2]), {
      today: TODAY,
      now: NOW,
    });

    expect(slate.cards).toHaveLength(0);
    expect(slate.matchCount).toBe(0);
    expect(slate.notes[0]).toContain('No scheduled fixtures');
  });

  it('converts a suggested card into a prefilled bet draft', () => {
    const card = buildSlate(8).cards[0];
    expect(card).toBeDefined();

    const draft = suggestionCardToDraft(card as SuggestionCard);

    expect(draft.date).toBe(TODAY);
    expect(draft.legs).toHaveLength(card?.legs.length ?? 0);
    expect(draft.risk).toBe(card?.risk);
    expect(draft.combinedOdds).toBeCloseTo(card?.combinedFairOdds ?? 0, 2);
    expect(draft.title).toContain('express:');
    expect(draft.notes).toContain('Card reasoning:');
    expect(draft.notes).toContain(card?.legs[0]?.reasoning[0] ?? 'missing reasoning');
    expect(draft.notes).toContain('Suggested by the fixture form model');
    expect(draft.legs[0]?.kickoff).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(draft.legs[0]?.result).toBe('pending');
  });
});

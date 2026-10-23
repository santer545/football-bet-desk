import { describe, expect, it } from 'vitest';

import type { BetLeg, BetSlip, LegResult, BetStatus } from '@/types';
import { deriveBetStatus, potentialReturn, productOdds, summarizeBets } from '@/utils/stats';

function createLeg(result: LegResult, odds?: number, id = Math.random().toString(36)): BetLeg {
  return {
    id,
    kickoff: '2026-10-20T18:00:00.000Z',
    competition: 'PL',
    competitionLabel: 'Premier League',
    homeTeam: 'Chelsea',
    awayTeam: 'Fulham',
    market: 'Double Chance',
    selection: '1X',
    odds,
    result,
  };
}

function createBet(overrides: Partial<BetSlip> = {}): BetSlip {
  return {
    id: 'bet-1',
    date: '2026-10-20',
    title: 'Test express',
    competitionLabel: 'Premier League',
    risk: 'medium',
    status: 'pending' satisfies BetStatus,
    stake: 1,
    legs: [createLeg('won', 2)],
    summary: '',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('deriveBetStatus', () => {
  it('returns pending when any leg is pending', () => {
    expect(deriveBetStatus([{ result: 'won' }, { result: 'pending' }])).toBe('pending');
  });

  it('returns lost when any leg is lost, regardless of pending legs', () => {
    expect(deriveBetStatus([{ result: 'won' }, { result: 'lost' }, { result: 'pending' }])).toBe(
      'lost',
    );
  });

  it('returns won only when every leg is won', () => {
    expect(deriveBetStatus([{ result: 'won' }, { result: 'won' }])).toBe('won');
  });

  it('returns void when all legs are void', () => {
    expect(deriveBetStatus([{ result: 'void' }, { result: 'void' }])).toBe('void');
  });

  it('treats an empty slip as pending', () => {
    expect(deriveBetStatus([])).toBe('pending');
  });
});

describe('productOdds', () => {
  it('multiplies the leg odds', () => {
    expect(productOdds([{ odds: 1.5 }, { odds: 2 }])).toBe(3);
  });

  it('returns undefined when any leg has no price', () => {
    expect(productOdds([{ odds: 1.5 }, { odds: undefined }])).toBeUndefined();
  });
});

describe('potentialReturn', () => {
  it('uses a one unit stake by default', () => {
    expect(potentialReturn({ combinedOdds: 3.2 })).toBe(3.2);
  });

  it('returns undefined without a combined price', () => {
    expect(potentialReturn({ stake: 2 })).toBeUndefined();
  });
});

describe('summarizeBets', () => {
  it('computes record, hit rate, profit and leg counts', () => {
    const bets: BetSlip[] = [
      createBet({
        id: 'a',
        status: 'won',
        combinedOdds: 3,
        legs: [createLeg('won', 1.5), createLeg('won', 2)],
      }),
      createBet({
        id: 'b',
        status: 'lost',
        combinedOdds: 2.5,
        legs: [createLeg('won', 1.4), createLeg('lost', 1.8)],
      }),
      createBet({
        id: 'c',
        status: 'pending',
        combinedOdds: 3.1,
        legs: [createLeg('pending', 1.5)],
      }),
      createBet({ id: 'd', status: 'void', combinedOdds: 2, legs: [createLeg('void', 2)] }),
    ];

    const summary = summarizeBets(bets);

    expect(summary.total).toBe(4);
    expect(summary.settled).toBe(2);
    expect(summary.won).toBe(1);
    expect(summary.lost).toBe(1);
    expect(summary.pending).toBe(1);
    expect(summary.hitRate).toBe(0.5);
    expect(summary.pricedSlips).toBe(2);
    expect(summary.profit).toBeCloseTo(1, 5);
    expect(summary.roi).toBeCloseTo(0.5, 5);
    expect(summary.legs.won).toBe(3);
    expect(summary.legs.lost).toBe(1);
    expect(summary.legs.hitRate).toBe(0.75);
  });
});

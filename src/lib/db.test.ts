import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import type { BetDraftParsed } from '@/types';

const draft: BetDraftParsed = {
  date: '2026-10-24',
  title: 'Test slip',
  competitionLabel: 'Premier League',
  risk: 'medium',
  summary: 'A test card.',
  notes: '',
  legs: [
    {
      kickoff: '2026-10-24T14:00',
      competition: 'PL',
      competitionLabel: 'Premier League',
      homeTeam: 'Arsenal',
      awayTeam: 'Brighton',
      market: 'Double Chance',
      selection: '1X',
      odds: 1.4,
      result: 'pending',
      score: '',
      note: '',
    },
    {
      kickoff: '2026-10-24T16:30',
      competition: 'PD',
      competitionLabel: 'La Liga',
      homeTeam: 'Real Madrid',
      awayTeam: 'Sevilla',
      market: 'Total Goals',
      selection: 'Over 2.5',
      odds: 1.9,
      result: 'pending',
      score: '',
      note: '',
    },
  ],
};

describe('local database', () => {
  beforeEach(() => {
    localStorage.clear();
    db.resetToSeed();
  });

  it('seeds the 22 historical slips and 14 analyses', async () => {
    const bets = await db.listBets();
    const analyses = await db.listAnalyses();
    expect(bets).toHaveLength(22);
    expect(analyses).toHaveLength(14);
  });

  it('creates a slip and derives its status from the legs', async () => {
    const created = await db.createBet(draft);
    expect(created.status).toBe('pending');
    expect(created.combinedOdds).toBeCloseTo(2.66, 2);

    const settled = await db.setBetStatus(created.id, 'lost');
    expect(settled.status).toBe('lost');
    expect(settled.legs.every((leg) => leg.result === 'lost')).toBe(true);

    const restored = await db.setBetStatus(created.id, 'pending');
    expect(restored.status).toBe('pending');
    expect(restored.legs.every((leg) => leg.result === 'pending')).toBe(true);
  });

  it('updates a single leg result and recalculates the slip', async () => {
    const created = await db.createBet(draft);
    const firstLeg = created.legs[0];
    expect(firstLeg).toBeDefined();
    if (!firstLeg) return;

    const updated = await db.updateLegResult(created.id, firstLeg.id, 'won');
    expect(updated.legs[0]?.result).toBe('won');
    expect(updated.status).toBe('pending');

    const secondLeg = updated.legs[1];
    if (!secondLeg) return;
    const completed = await db.updateLegResult(created.id, secondLeg.id, 'lost');
    expect(completed.status).toBe('lost');
  });

  it('round-trips a backup through export and import', () => {
    const snapshot = JSON.stringify(db.exportDatabase());
    db.clearAll();
    expect(db.exportDatabase().bets).toHaveLength(0);

    const counts = db.importDatabase(snapshot, 'replace');
    expect(counts.bets).toBe(22);
    expect(counts.analyses).toBe(14);
    expect(db.exportDatabase().bets).toHaveLength(22);
  });

  it('merges imported records without duplicating ids', async () => {
    const snapshot = JSON.stringify(db.exportDatabase());
    const created = await db.createBet(draft);
    const counts = db.importDatabase(snapshot, 'merge');
    expect(counts.bets).toBe(22);
    expect((await db.listBets()).some((bet) => bet.id === created.id)).toBe(true);
    expect((await db.listBets()).filter((bet) => bet.id === created.id)).toHaveLength(1);
  });

  it('deletes bets and analyses by id', async () => {
    const bets = await db.listBets();
    const first = bets[0];
    expect(first).toBeDefined();
    if (!first) return;
    await db.deleteBet(first.id);
    expect((await db.listBets()).some((bet) => bet.id === first.id)).toBe(false);

    const analyses = await db.listAnalyses();
    const analysis = analyses[0];
    expect(analysis).toBeDefined();
    if (!analysis) return;
    await db.deleteAnalysis(analysis.id);
    expect((await db.listAnalyses()).some((item) => item.id === analysis.id)).toBe(false);
  });
});

import type { BetLeg, BetSlip, BetStatus } from '@/types';

export interface BetSummary {
  total: number;
  pending: number;
  settled: number;
  won: number;
  lost: number;
  voided: number;
  hitRate: number;
  staked: number;
  profit: number;
  roi: number;
  pricedSlips: number;
  legs: {
    total: number;
    won: number;
    lost: number;
    pending: number;
    hitRate: number;
  };
}

export interface DayPerformance {
  date: string;
  won: number;
  lost: number;
  pending: number;
  slips: number;
}

export function deriveBetStatus(legs: Pick<BetLeg, 'result'>[]): BetStatus {
  const results = legs.map((leg) => leg.result);
  if (results.length === 0) return 'pending';
  if (results.some((result) => result === 'lost')) return 'lost';
  if (results.some((result) => result === 'pending')) return 'pending';
  if (results.some((result) => result === 'won')) return 'won';
  return 'void';
}

export function productOdds(legs: Pick<BetLeg, 'odds'>[]): number | undefined {
  const odds = legs.map((leg) => leg.odds).filter((value): value is number => Boolean(value));
  if (odds.length === 0 || odds.length !== legs.length) return undefined;
  return odds.reduce((total, value) => total * value, 1);
}

export function potentialReturn(bet: Pick<BetSlip, 'combinedOdds' | 'stake'>): number | undefined {
  if (!bet.combinedOdds) return undefined;
  return bet.combinedOdds * (bet.stake ?? 1);
}

export function summarizeBets(bets: BetSlip[]): BetSummary {
  const total = bets.length;
  const pending = bets.filter((bet) => bet.status === 'pending').length;
  const won = bets.filter((bet) => bet.status === 'won').length;
  const lost = bets.filter((bet) => bet.status === 'lost').length;
  const voided = bets.filter((bet) => bet.status === 'void').length;
  const settled = won + lost;
  const hitRate = settled === 0 ? 0 : won / settled;

  let staked = 0;
  let profit = 0;
  let pricedSlips = 0;

  for (const bet of bets) {
    if (!bet.combinedOdds || bet.status === 'pending' || bet.status === 'void') continue;
    const stake = bet.stake ?? 1;
    staked += stake;
    pricedSlips += 1;
    profit += bet.status === 'won' ? stake * (bet.combinedOdds - 1) : -stake;
  }

  const allLegs = bets.flatMap((bet) => bet.legs);
  const legsWon = allLegs.filter((leg) => leg.result === 'won').length;
  const legsLost = allLegs.filter((leg) => leg.result === 'lost').length;
  const legsPending = allLegs.filter((leg) => leg.result === 'pending').length;
  const legSettled = legsWon + legsLost;

  return {
    total,
    pending,
    settled,
    won,
    lost,
    voided,
    hitRate,
    staked,
    profit,
    roi: staked === 0 ? 0 : profit / staked,
    pricedSlips,
    legs: {
      total: allLegs.length,
      won: legsWon,
      lost: legsLost,
      pending: legsPending,
      hitRate: legSettled === 0 ? 0 : legsWon / legSettled,
    },
  };
}

export function dailyPerformance(bets: BetSlip[]): DayPerformance[] {
  const map = new Map<string, DayPerformance>();
  for (const bet of bets) {
    const day = map.get(bet.date) ?? {
      date: bet.date,
      won: 0,
      lost: 0,
      pending: 0,
      slips: 0,
    };
    day.slips += 1;
    if (bet.status === 'won') day.won += 1;
    if (bet.status === 'lost') day.lost += 1;
    if (bet.status === 'pending') day.pending += 1;
    map.set(bet.date, day);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function sortBetsByDate(bets: BetSlip[], direction: 'desc' | 'asc' = 'desc'): BetSlip[] {
  return [...bets].sort((a, b) => {
    const comparison = a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
    return direction === 'desc' ? -comparison : comparison;
  });
}

export function winRate(played: number, won: number): number {
  return played === 0 ? 0 : won / played;
}

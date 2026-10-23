import { format, parseISO } from 'date-fns';

import type { BetDraft, BetSlip } from '@/types';
import { todayISO } from '@/utils/format';

export function emptyLeg(date = todayISO()): BetDraft['legs'][number] {
  return {
    kickoff: `${date}T20:00`,
    competition: '',
    competitionLabel: '',
    homeTeam: '',
    awayTeam: '',
    market: 'Double Chance',
    selection: '',
    odds: undefined,
    result: 'pending',
    score: '',
    note: '',
  };
}

export function toLocalInput(iso: string): string {
  try {
    return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return iso.slice(0, 16);
  }
}

export function suggestedCompetitionLabel(code: string): string {
  const labels: Record<string, string> = {
    PL: 'Premier League',
    PD: 'La Liga',
    SA: 'Serie A',
    BL1: 'Bundesliga',
    CL: 'UEFA Champions League',
    EL: 'UEFA Europa League',
    UECL: 'UEFA Conference League',
    FL1: 'Ligue 1',
    DED: 'Eredivisie',
    PPL: 'Primeira Liga',
    ELC: 'EFL Championship',
  };
  return labels[code] ?? code;
}

export function betToDraft(bet: BetSlip): BetDraft {
  return {
    date: bet.date,
    title: bet.title,
    competitionLabel: bet.competitionLabel,
    risk: bet.risk,
    combinedOdds: bet.combinedOdds,
    stake: bet.stake,
    summary: bet.summary,
    notes: bet.notes ?? '',
    analysisId: bet.analysisId,
    legs: bet.legs.map((leg) => ({
      matchId: leg.matchId,
      kickoff: toLocalInput(leg.kickoff),
      competition: leg.competition,
      competitionLabel: leg.competitionLabel,
      homeTeam: leg.homeTeam,
      awayTeam: leg.awayTeam,
      market: leg.market,
      selection: leg.selection,
      odds: leg.odds,
      result: leg.result,
      score: leg.score ?? '',
      note: leg.note ?? '',
    })),
  };
}

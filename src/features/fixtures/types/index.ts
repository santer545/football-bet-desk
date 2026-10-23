export interface FdTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

export interface FdCompetition {
  id: number;
  code: string;
  name: string;
  emblem?: string;
  type?: string;
}

export interface FdScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export type FdMatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'AWARDED';

export interface FdMatch {
  id: number;
  utcDate: string;
  status: FdMatchStatus;
  matchday: number | null;
  stage: string;
  group: string | null;
  competition: FdCompetition;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: FdScore;
  referees?: { id: number; name: string; type: string; nationality?: string }[];
}

export interface FdMatchesResponse {
  count: number;
  filters?: Record<string, string>;
  competition?: FdCompetition;
  matches: FdMatch[];
}

export interface FdStandingRow {
  position: number;
  team: FdTeam;
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FdStandingsResponse {
  competition?: FdCompetition;
  season?: { id: number; startDate: string; endDate: string; currentMatchday: number | null };
  standings: {
    stage: string;
    type: 'TOTAL' | 'HOME' | 'AWAY';
    group: string | null;
    table: FdStandingRow[];
  }[];
}

export interface FdScorer {
  player: { id: number; name: string; position?: string; nationality?: string };
  team: FdTeam;
  playedMatches: number;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

export interface FdScorersResponse {
  count: number;
  scorers: FdScorer[];
}

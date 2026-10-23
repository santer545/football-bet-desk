export const fixtureKeys = {
  all: ['fixtures'] as const,
  competition: (code: string, dateFrom: string, dateTo: string) =>
    [...fixtureKeys.all, 'competition', code, dateFrom, dateTo] as const,
  teamMatches: (teamId: number) => [...fixtureKeys.all, 'team', teamId, 'matches'] as const,
  standings: (competition: string) => [...fixtureKeys.all, 'standings', competition] as const,
  headToHead: (matchId: number) => [...fixtureKeys.all, 'h2h', matchId] as const,
  scorers: (competition: string) => [...fixtureKeys.all, 'scorers', competition] as const,
};

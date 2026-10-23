import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useApiBaseUrl, useApiToken } from '@/store/use-settings-store';

import {
  fetchCompetitionMatches,
  fetchHeadToHead,
  fetchScorers,
  fetchStandings,
  fetchTeamMatches,
} from './client';
import { fixtureKeys } from './keys';
import type { FdMatch, FdMatchStatus } from '../types';

export interface FixtureFeed {
  matches: FdMatch[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
  hasToken: boolean;
}

export function useFixtureFeed(
  dateFrom: string,
  dateTo: string,
  competitions: string[],
  status?: FdMatchStatus,
): FixtureFeed {
  const token = useApiToken();
  const baseUrl = useApiBaseUrl();
  const hasToken = token.trim().length > 0;

  const queries = useQueries({
    queries: competitions.map((code) => ({
      queryKey: fixtureKeys.competition(code, dateFrom, dateTo),
      queryFn: () =>
        fetchCompetitionMatches(code, { dateFrom, dateTo, status }, { token, baseUrl }),
      enabled: hasToken,
      staleTime: 5 * 60_000,
      retry: 1,
    })),
  });

  const matches = useMemo(() => {
    const seen = new Set<number>();
    const all = queries.flatMap((query) => query.data?.matches ?? []);
    return all
      .filter((match) => {
        if (seen.has(match.id)) return false;
        seen.add(match.id);
        return true;
      })
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  }, [queries]);

  const error = queries.find((query) => query.error)?.error ?? null;

  return {
    matches,
    isLoading: hasToken && queries.some((query) => query.isLoading),
    isFetching: queries.some((query) => query.isFetching),
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    refetch: () => {
      for (const query of queries) void query.refetch();
    },
    hasToken,
  };
}

export function useTeamMatchesQuery(teamId: number | undefined, enabled: boolean) {
  const token = useApiToken();
  const baseUrl = useApiBaseUrl();
  return useQuery({
    queryKey: fixtureKeys.teamMatches(teamId ?? 0),
    queryFn: () =>
      fetchTeamMatches(teamId ?? 0, { status: 'FINISHED', limit: 12 }, { token, baseUrl }),
    enabled: enabled && Boolean(teamId) && token.trim().length > 0,
    staleTime: 10 * 60_000,
  });
}

export function useStandingsQuery(competition: string | undefined, enabled: boolean) {
  const token = useApiToken();
  const baseUrl = useApiBaseUrl();
  return useQuery({
    queryKey: fixtureKeys.standings(competition ?? ''),
    queryFn: () => fetchStandings(competition ?? 'PL', { token, baseUrl }),
    enabled: enabled && Boolean(competition) && token.trim().length > 0,
    staleTime: 10 * 60_000,
  });
}

export function useHeadToHeadQuery(matchId: number | undefined, enabled: boolean) {
  const token = useApiToken();
  const baseUrl = useApiBaseUrl();
  return useQuery({
    queryKey: fixtureKeys.headToHead(matchId ?? 0),
    queryFn: () => fetchHeadToHead(matchId ?? 0, 10, { token, baseUrl }),
    enabled: enabled && Boolean(matchId) && token.trim().length > 0,
    staleTime: 15 * 60_000,
  });
}

export function useScorersQuery(competition: string | undefined, enabled: boolean) {
  const token = useApiToken();
  const baseUrl = useApiBaseUrl();
  return useQuery({
    queryKey: fixtureKeys.scorers(competition ?? ''),
    queryFn: () => fetchScorers(competition ?? 'PL', 5, { token, baseUrl }),
    enabled: enabled && Boolean(competition) && token.trim().length > 0,
    staleTime: 15 * 60_000,
  });
}

import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { endOfWeek, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { useMemo } from 'react';

import { useApiBaseUrl, useApiToken, useFavoriteCompetitions } from '@/store/use-settings-store';
import { todayISO } from '@/utils/format';

import { fetchCompetitionMatches } from './client';
import { fixtureKeys } from './keys';
import { buildDailySuggestions, type DailySuggestionSlate } from '../lib/daily-suggestions';
import type { FdMatchesResponse } from '../types';

const WATCHLIST = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'DED', 'PPL', 'CL'] as const;
const MAX_COMPETITIONS = 10;
const HISTORY_DAYS = 450;

export interface DailySuggestionsFeed {
  slate: DailySuggestionSlate | null;
  isLoading: boolean;
  isFetching: boolean;
  hasToken: boolean;
  error: Error | null;
  partialErrorCount: number;
  lastUpdated: number;
  competitions: string[];
  refetch: () => void;
}

interface CombinedFixtures {
  matches: FdMatchesResponse['matches'];
  errors: Error[];
  isLoading: boolean;
  isFetching: boolean;
  lastUpdated: number;
  refetch: () => void;
}

function combineFixtures(results: UseQueryResult<FdMatchesResponse>[]): CombinedFixtures {
  const seen = new Set<number>();
  const matches = results
    .flatMap((result) => result.data?.matches ?? [])
    .filter((match) => {
      if (seen.has(match.id)) return false;
      seen.add(match.id);
      return true;
    })
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  return {
    matches,
    errors: results
      .map((result) => result.error)
      .filter((error): error is Error => error instanceof Error),
    isLoading: results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    lastUpdated: Math.max(0, ...results.map((result) => result.dataUpdatedAt)),
    refetch: () => {
      for (const result of results) void result.refetch();
    },
  };
}

export function useDailySuggestions(date?: string): DailySuggestionsFeed {
  const token = useApiToken();
  const baseUrl = useApiBaseUrl();
  const favorites = useFavoriteCompetitions();
  const hasToken = token.trim().length > 0;

  const competitions = useMemo(() => {
    const merged = [...WATCHLIST, ...favorites];
    return Array.from(new Set(merged)).slice(0, MAX_COMPETITIONS);
  }, [favorites]);

  const today = date ?? todayISO();
  const targetDate = parseISO(today);
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
  const dateFrom = format(subDays(weekStart, HISTORY_DAYS), 'yyyy-MM-dd');
  const dateTo = format(weekEnd, 'yyyy-MM-dd');

  const combined = useQueries({
    queries: competitions.map((code) => ({
      queryKey: fixtureKeys.competition(code, dateFrom, dateTo),
      queryFn: () => fetchCompetitionMatches(code, { dateFrom, dateTo }, { token, baseUrl }),
      enabled: hasToken,
      staleTime: 30 * 60_000,
      gcTime: 60 * 60_000,
      retry: 1,
    })),
    combine: combineFixtures,
  });

  const slate = useMemo<DailySuggestionSlate | null>(() => {
    if (!hasToken) return null;
    return buildDailySuggestions(combined.matches, { today });
  }, [hasToken, combined.matches, today]);

  return {
    slate,
    isLoading: hasToken && combined.matches.length === 0 && combined.isLoading,
    isFetching: combined.isFetching,
    hasToken,
    error: combined.matches.length === 0 ? (combined.errors[0] ?? null) : null,
    partialErrorCount: combined.matches.length > 0 ? combined.errors.length : 0,
    lastUpdated: combined.lastUpdated,
    competitions,
    refetch: combined.refetch,
  };
}

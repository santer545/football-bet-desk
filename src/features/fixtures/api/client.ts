import { getLanguage, translate } from '@/lib/i18n';

import type { FdMatchesResponse, FdScorersResponse, FdStandingsResponse } from '../types';

function tx(
  key: Parameters<typeof translate>[1],
  params?: Parameters<typeof translate>[2],
): string {
  return translate(getLanguage(), key, params);
}

export interface FootballApiConfig {
  token: string;
  baseUrl: string;
}

export class FootballApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FootballApiError';
    this.status = status;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return (baseUrl || '/api/football').replace(/\/+$/, '');
}

function resolveApiUrl(baseUrl: string, path: string): URL {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return new URL(`${normalizeBaseUrl(baseUrl)}${path}`, origin);
}

async function request<T>(
  path: string,
  config: FootballApiConfig,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  if (!config.token) {
    throw new FootballApiError(tx('api.noToken'), 401);
  }
  const url = resolveApiUrl(config.baseUrl, path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { 'X-Auth-Token': config.token },
      mode: 'cors',
    });
  } catch {
    throw new FootballApiError(tx('api.network'), 0);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      detail = body.message ?? body.error ?? detail;
    } catch {
      // Keep the status text when the body is not JSON.
    }
    if (response.status === 403) {
      detail = `${detail}. ${tx('api.forbiddenSuffix')}`;
    }
    if (response.status === 429) {
      detail = tx('api.rateLimit');
    }
    throw new FootballApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export function fetchCompetitionMatches(
  competition: string,
  range: { dateFrom?: string; dateTo?: string; matchday?: number; status?: string },
  config: FootballApiConfig,
): Promise<FdMatchesResponse> {
  return request<FdMatchesResponse>(`/competitions/${competition}/matches`, config, range);
}

export function fetchTeamMatches(
  teamId: number,
  options: { status?: string; limit?: number; dateFrom?: string; dateTo?: string },
  config: FootballApiConfig,
): Promise<FdMatchesResponse> {
  return request<FdMatchesResponse>(`/teams/${teamId}/matches`, config, options);
}

export function fetchStandings(
  competition: string,
  config: FootballApiConfig,
): Promise<FdStandingsResponse> {
  return request<FdStandingsResponse>(`/competitions/${competition}/standings`, config);
}

export function fetchHeadToHead(
  matchId: number,
  limit: number,
  config: FootballApiConfig,
): Promise<FdMatchesResponse> {
  return request<FdMatchesResponse>(`/matches/${matchId}/head2head`, config, { limit });
}

export function fetchScorers(
  competition: string,
  limit: number,
  config: FootballApiConfig,
): Promise<FdScorersResponse> {
  return request<FdScorersResponse>(`/competitions/${competition}/scorers`, config, { limit });
}

export async function testConnection(config: FootballApiConfig): Promise<string> {
  const response = await fetchCompetitionMatches(
    'PL',
    {
      dateFrom: new Date().toISOString().slice(0, 10),
      dateTo: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
    },
    config,
  );
  return tx('api.connected', { count: response.count });
}

export const languages = ['uk', 'en'] as const;
export type Language = (typeof languages)[number];

export interface AppSettings {
  apiToken: string;
  favoriteCompetitions: string[];
  baseUrl: string;
  language: Language;
}

export const DEFAULT_API_BASE_URL = '/api/football';
export const LEGACY_API_BASE_URL = 'https://api.football-data.org/v4';

export const DEFAULT_SETTINGS: AppSettings = {
  apiToken: (import.meta.env.VITE_FOOTBALL_API_KEY as string | undefined) ?? '',
  favoriteCompetitions: ['PL', 'PD', 'SA', 'BL1', 'CL'],
  baseUrl: DEFAULT_API_BASE_URL,
  language: 'uk',
};

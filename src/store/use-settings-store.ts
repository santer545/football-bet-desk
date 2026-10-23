import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_SETTINGS, LEGACY_API_BASE_URL, type AppSettings, type Language } from '@/types';

interface SettingsState extends AppSettings {
  setApiToken: (apiToken: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setLanguage: (language: Language) => void;
  toggleCompetition: (code: string) => void;
  setFavoriteCompetitions: (codes: string[]) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setApiToken: (apiToken) => set({ apiToken: apiToken.trim() }),
      setBaseUrl: (baseUrl) =>
        set({ baseUrl: baseUrl.trim().replace(/\/+$/, '') || DEFAULT_SETTINGS.baseUrl }),
      setLanguage: (language) => set({ language }),
      toggleCompetition: (code) =>
        set((state) => ({
          favoriteCompetitions: state.favoriteCompetitions.includes(code)
            ? state.favoriteCompetitions.filter((item) => item !== code)
            : [...state.favoriteCompetitions, code],
        })),
      setFavoriteCompetitions: (favoriteCompetitions) => set({ favoriteCompetitions }),
      resetSettings: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'fbd:settings',
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<AppSettings>;
        const next: AppSettings = { ...DEFAULT_SETTINGS, ...state };
        if (version < 2 && (!state.baseUrl || state.baseUrl === LEGACY_API_BASE_URL)) {
          next.baseUrl = DEFAULT_SETTINGS.baseUrl;
        }
        if (version < 3 || (next.language !== 'uk' && next.language !== 'en')) {
          next.language = DEFAULT_SETTINGS.language;
        }
        return {
          apiToken: next.apiToken,
          favoriteCompetitions: next.favoriteCompetitions,
          baseUrl: next.baseUrl,
          language: next.language,
        };
      },
      partialize: (state) => ({
        apiToken: state.apiToken,
        favoriteCompetitions: state.favoriteCompetitions,
        baseUrl: state.baseUrl,
        language: state.language,
      }),
    },
  ),
);

export const useApiToken = (): string => useSettingsStore((state) => state.apiToken);
export const useLanguage = (): Language => useSettingsStore((state) => state.language);
export const useFavoriteCompetitions = (): string[] =>
  useSettingsStore((state) => state.favoriteCompetitions);
export const useApiBaseUrl = (): string => useSettingsStore((state) => state.baseUrl);

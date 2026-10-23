import { fireEvent, render, screen } from '@testing-library/react';
import { addDays, format } from 'date-fns';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettingsStore } from '@/store/use-settings-store';
import type { BetDraft } from '@/types';

import type { DailySuggestionsFeed } from '../api/suggestion-hooks';
import type { DailySuggestionSlate, SuggestionCard, SuggestionLeg } from '../lib/daily-suggestions';
import { DailySuggestions } from './daily-suggestions';

vi.mock('../api/suggestion-hooks', () => ({
  useDailySuggestions: vi.fn(),
}));

import { useDailySuggestions } from '../api/suggestion-hooks';

const mockedFeed = vi.mocked(useDailySuggestions);

function leg(overrides: Partial<SuggestionLeg> = {}): SuggestionLeg {
  return {
    matchId: 1,
    kickoff: '2026-10-23T12:00:00.000Z',
    date: '2026-10-23',
    competition: 'PL',
    competitionLabel: 'Premier League',
    homeTeam: 'Home FC',
    awayTeam: 'Away FC',
    market: 'Double Chance',
    selection: '1X (home side)',
    probability: 0.7,
    fairOdds: 1.43,
    confidence: 'high',
    reasoning: [
      'Home split: 4W-1D-1L across 6 home matches.',
      'Away split: 0W-2D-4L across 6 away matches.',
      'The model prefers the home side.',
    ],
    warnings: ['Form model only.'],
    homeSample: 6,
    awaySample: 6,
    h2hSample: 2,
    expectedGoals: 2.8,
    quality: 0.7,
    ...overrides,
  };
}

function card(overrides: Partial<SuggestionCard> = {}): SuggestionCard {
  const legs = overrides.legs ?? [
    leg({ matchId: 1, homeTeam: 'Arsenal', awayTeam: 'Everton' }),
    leg({ matchId: 2, homeTeam: 'Chelsea', awayTeam: 'Fulham' }),
  ];
  return {
    id: '2026-10-23-1',
    label: 'Anchor',
    risk: 'low',
    jointProbability: legs.reduce((total, item) => total * item.probability, 1),
    combinedFairOdds: legs.reduce((total, item) => total * item.fairOdds, 1),
    summary: 'Two home-side leans from split samples, with a low joint break-even price.',
    warnings: ['Home FC: split samples are below the 5-match gate.'],
    ...overrides,
    legs,
  };
}

function slate(): DailySuggestionSlate {
  return {
    date: '2026-10-23',
    generatedAt: '2026-10-23T08:00:00.000Z',
    cards: [
      card(),
      card({
        id: '2026-10-23-2',
        label: 'Balanced',
        combinedFairOdds: 2.4,
        jointProbability: 0.42,
        risk: 'medium',
      }),
      card({
        id: '2026-10-23-3',
        label: 'Value',
        combinedFairOdds: 3.6,
        jointProbability: 0.28,
        risk: 'high',
      }),
    ],
    matchCount: 16,
    candidateCount: 12,
    notes: [],
  };
}

function feed(overrides: Partial<DailySuggestionsFeed> = {}): DailySuggestionsFeed {
  return {
    slate: slate(),
    isLoading: false,
    isFetching: false,
    hasToken: true,
    error: null,
    partialErrorCount: 0,
    lastUpdated: Date.parse('2026-10-23T08:05:00.000Z'),
    competitions: ['PL'],
    refetch: vi.fn(),
    ...overrides,
  };
}

function DraftProbe() {
  const location = useLocation();
  const draft = (location.state as { draft?: BetDraft } | null)?.draft;
  return <p>{draft?.title ?? 'no draft'}</p>;
}

function renderSection(date?: string) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DailySuggestions date={date} />} />
        <Route path="/bets/new" element={<DraftProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useSettingsStore.setState({ language: 'en' });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('DailySuggestions', () => {
  it('renders three explained express cards', () => {
    mockedFeed.mockReturnValue(feed());
    renderSection();

    expect(screen.getByText('Three expresses for today')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Build this express/i })).toHaveLength(3);
    expect(screen.getByText('Anchor')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getAllByText('Double Chance: 1X (home side)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('The model prefers the home side.').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/below the 5-match gate/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Model odds are fair prices/)).toBeInTheDocument();
  });

  it('requests the slate for a selected future day', () => {
    mockedFeed.mockReturnValue(feed());
    const selected = format(addDays(new Date(), 2), 'yyyy-MM-dd');

    renderSection(selected);

    expect(mockedFeed).toHaveBeenCalledWith(selected);
    expect(
      screen.getByText(`Three expresses for ${format(addDays(new Date(), 2), 'EEEE')}`),
    ).toBeInTheDocument();
  });

  it('sends the card draft to the bet editor', async () => {
    mockedFeed.mockReturnValue(feed());
    renderSection();

    fireEvent.click(screen.getAllByRole('button', { name: /Build this express/i })[0]!);

    expect(
      await screen.findByText('Anchor express: Arsenal vs Everton + Chelsea vs Fulham'),
    ).toBeInTheDocument();
  });

  it('shows the token setup state when no API token is saved', () => {
    mockedFeed.mockReturnValue(feed({ hasToken: false, slate: null }));
    renderSection();

    expect(
      screen.getByText(/Connect football-data.org to build the daily card/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add API token/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Build this express/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when the model has no qualifying cards', () => {
    mockedFeed.mockReturnValue(
      feed({
        slate: {
          ...slate(),
          cards: [],
          notes: ['Only 0 statistically usable cards cleared the filters.'],
        },
      }),
    );
    renderSection();

    expect(screen.getByText('No three-card slate yet')).toBeInTheDocument();
    expect(screen.getByText(/cleared the filters/i)).toBeInTheDocument();
  });
});

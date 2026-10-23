import { z } from 'zod';

import { ANALYSES_SEED } from '@/content/analysis-seed';
import { BETS_SEED } from '@/content/bets-seed';
import type {
  AnalysisDraftParsed,
  AnalysisRecord,
  BetDraftParsed,
  BetLeg,
  BetSlip,
  LegResult,
} from '@/types';
import { analysisSchema, betSlipSchema } from '@/types';
import { createId, nowIso } from '@/utils/id';
import { deriveBetStatus, productOdds } from '@/utils/stats';

const DB_KEY = 'fbd:db:v1';

export interface AppDatabase {
  version: 1;
  bets: BetSlip[];
  analyses: AnalysisRecord[];
}

const databaseSchema = z.object({
  version: z.literal(1),
  bets: z.array(betSlipSchema),
  analyses: z.array(analysisSchema),
});

function cloneSeed(): AppDatabase {
  return {
    version: 1,
    bets: structuredClone(BETS_SEED),
    analyses: structuredClone(ANALYSES_SEED),
  };
}

let cache: AppDatabase | null = null;

function persist(database: AppDatabase): void {
  localStorage.setItem(DB_KEY, JSON.stringify(database));
}

function read(): AppDatabase {
  if (cache) return cache;
  if (typeof window === 'undefined') {
    cache = cloneSeed();
    return cache;
  }
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      const parsed = databaseSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        cache = parsed.data;
        return cache;
      }
    } catch {
      localStorage.removeItem(DB_KEY);
    }
  }
  cache = cloneSeed();
  persist(cache);
  return cache;
}

function write(database: AppDatabase): void {
  cache = database;
  persist(database);
}

function toStoredLegs(legs: BetDraftParsed['legs']): BetLeg[] {
  return legs.map((leg) => ({ ...leg, id: createId('leg') }));
}

function normalizeBet(draft: BetDraftParsed, base?: BetSlip): BetSlip {
  const now = nowIso();
  const legs = base
    ? draft.legs.map((leg, index) => ({
        ...leg,
        id: base.legs[index]?.id ?? createId('leg'),
      }))
    : toStoredLegs(draft.legs);
  const combinedOdds = draft.combinedOdds ?? productOdds(legs);
  return {
    id: base?.id ?? createId('bet'),
    date: draft.date,
    title: draft.title.trim(),
    competitionLabel: draft.competitionLabel.trim(),
    risk: draft.risk,
    status: deriveBetStatus(legs),
    combinedOdds,
    stake: draft.stake,
    legs,
    summary: draft.summary.trim(),
    notes: draft.notes?.trim() || undefined,
    analysisId: draft.analysisId,
    sourceFile: base?.sourceFile,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };
}

export const db = {
  listBets(): Promise<BetSlip[]> {
    return Promise.resolve(read().bets);
  },

  getBet(id: string): Promise<BetSlip | undefined> {
    return Promise.resolve(read().bets.find((bet) => bet.id === id));
  },

  createBet(draft: BetDraftParsed): Promise<BetSlip> {
    const database = read();
    const bet = normalizeBet(draft);
    write({ ...database, bets: [bet, ...database.bets] });
    return Promise.resolve(bet);
  },

  updateBet(id: string, draft: BetDraftParsed): Promise<BetSlip> {
    const database = read();
    const base = database.bets.find((bet) => bet.id === id);
    if (!base) throw new Error('Bet not found');
    const bet = normalizeBet(draft, base);
    write({
      ...database,
      bets: database.bets.map((item) => (item.id === id ? bet : item)),
    });
    return Promise.resolve(bet);
  },

  updateLegResult(betId: string, legId: string, result: LegResult): Promise<BetSlip> {
    const database = read();
    const base = database.bets.find((bet) => bet.id === betId);
    if (!base) throw new Error('Bet not found');
    const legs = base.legs.map((leg) => (leg.id === legId ? { ...leg, result } : leg));
    const bet: BetSlip = {
      ...base,
      legs,
      status: deriveBetStatus(legs),
      updatedAt: nowIso(),
    };
    write({
      ...database,
      bets: database.bets.map((item) => (item.id === betId ? bet : item)),
    });
    return Promise.resolve(bet);
  },

  setBetStatus(betId: string, status: BetSlip['status']): Promise<BetSlip> {
    const database = read();
    const base = database.bets.find((bet) => bet.id === betId);
    if (!base) throw new Error('Bet not found');
    const legResult: LegResult =
      status === 'won'
        ? 'won'
        : status === 'lost'
          ? 'lost'
          : status === 'void'
            ? 'void'
            : 'pending';
    const legs = base.legs.map((leg) => ({ ...leg, result: legResult }));
    const bet: BetSlip = {
      ...base,
      legs,
      status: deriveBetStatus(legs),
      updatedAt: nowIso(),
    };
    write({
      ...database,
      bets: database.bets.map((item) => (item.id === betId ? bet : item)),
    });
    return Promise.resolve(bet);
  },

  deleteBet(id: string): Promise<void> {
    const database = read();
    write({ ...database, bets: database.bets.filter((bet) => bet.id !== id) });
    return Promise.resolve();
  },

  listAnalyses(): Promise<AnalysisRecord[]> {
    return Promise.resolve(read().analyses);
  },

  getAnalysis(id: string): Promise<AnalysisRecord | undefined> {
    return Promise.resolve(read().analyses.find((analysis) => analysis.id === id));
  },

  createAnalysis(draft: AnalysisDraftParsed): Promise<AnalysisRecord> {
    const database = read();
    const now = nowIso();
    const analysis: AnalysisRecord = {
      id: createId('analysis'),
      date: draft.date,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      content: draft.content.trim(),
      kind: draft.kind,
      tags: draft.tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      relatedBetIds: draft.relatedBetIds,
      createdAt: now,
      updatedAt: now,
    };
    write({ ...database, analyses: [analysis, ...database.analyses] });
    return Promise.resolve(analysis);
  },

  updateAnalysis(id: string, draft: AnalysisDraftParsed): Promise<AnalysisRecord> {
    const database = read();
    const base = database.analyses.find((analysis) => analysis.id === id);
    if (!base) throw new Error('Analysis not found');
    const analysis: AnalysisRecord = {
      ...base,
      date: draft.date,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      content: draft.content.trim(),
      kind: draft.kind,
      tags: draft.tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      relatedBetIds: draft.relatedBetIds,
      updatedAt: nowIso(),
    };
    write({
      ...database,
      analyses: database.analyses.map((item) => (item.id === id ? analysis : item)),
    });
    return Promise.resolve(analysis);
  },

  deleteAnalysis(id: string): Promise<void> {
    const database = read();
    write({
      ...database,
      analyses: database.analyses.filter((analysis) => analysis.id !== id),
    });
    return Promise.resolve();
  },

  exportDatabase(): AppDatabase {
    return structuredClone(read());
  },

  importDatabase(
    json: string,
    mode: 'merge' | 'replace' = 'replace',
  ): {
    bets: number;
    analyses: number;
  } {
    const parsed: AppDatabase = databaseSchema.parse(JSON.parse(json));
    const current = read();
    if (mode === 'replace') {
      write(parsed);
    } else {
      const betIds = new Set(current.bets.map((bet) => bet.id));
      const analysisIds = new Set(current.analyses.map((analysis) => analysis.id));
      write({
        version: 1,
        bets: [...current.bets, ...parsed.bets.filter((bet) => !betIds.has(bet.id))],
        analyses: [
          ...current.analyses,
          ...parsed.analyses.filter((analysis) => !analysisIds.has(analysis.id)),
        ],
      });
    }
    return { bets: parsed.bets.length, analyses: parsed.analyses.length };
  },

  resetToSeed(): void {
    const seed = cloneSeed();
    write(seed);
  },

  clearAll(): void {
    write({ version: 1, bets: [], analyses: [] });
  },
};

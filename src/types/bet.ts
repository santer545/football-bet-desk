import { z } from 'zod';

export const betStatuses = ['pending', 'won', 'lost', 'void'] as const;
export const riskLevels = ['low', 'medium', 'high'] as const;
export const legResults = ['pending', 'won', 'lost', 'void'] as const;

export const betLegSchema = z.object({
  id: z.string().min(1),
  matchId: z.number().int().optional(),
  kickoff: z.string().min(1),
  competition: z.string().min(1),
  competitionLabel: z.string().min(1),
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1),
  market: z.string().min(1),
  selection: z.string().min(1),
  odds: z.number().positive().optional(),
  result: z.enum(legResults).default('pending'),
  score: z.string().optional(),
  note: z.string().optional(),
});

export const betSlipSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(160),
  competitionLabel: z.string().min(1).max(120),
  risk: z.enum(riskLevels).default('medium'),
  status: z.enum(betStatuses).default('pending'),
  combinedOdds: z.number().positive().optional(),
  stake: z.number().positive().optional(),
  legs: z.array(betLegSchema).min(1).max(6),
  summary: z.string().max(1200).default(''),
  notes: z.string().max(4000).optional(),
  analysisId: z.string().optional(),
  sourceFile: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type BetStatus = (typeof betStatuses)[number];
export type RiskLevel = (typeof riskLevels)[number];
export type LegResult = (typeof legResults)[number];
export type BetLeg = z.infer<typeof betLegSchema>;
export type BetSlip = z.infer<typeof betSlipSchema>;

export const betLegDraftSchema = z.object({
  matchId: z.number().int().optional(),
  kickoff: z.string().min(1, 'validation.kickoffRequired'),
  competition: z.string().min(1, 'validation.competitionCodeRequired'),
  competitionLabel: z.string().min(1, 'validation.competitionNameRequired'),
  homeTeam: z.string().min(1, 'validation.homeRequired'),
  awayTeam: z.string().min(1, 'validation.awayRequired'),
  market: z.string().min(1, 'validation.marketRequired'),
  selection: z.string().min(1, 'validation.selectionRequired'),
  odds: z.number().positive('validation.oddsPositive').optional(),
  result: z.enum(legResults),
  score: z.string().optional(),
  note: z.string().optional(),
});

export const betDraftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.dateRequired'),
  title: z.string().min(3, 'validation.title').max(160),
  competitionLabel: z.string().min(2, 'validation.competitionRequired').max(120),
  risk: z.enum(riskLevels),
  combinedOdds: z.number().positive('validation.combinedOddsPositive').optional(),
  stake: z.number().positive('validation.stakePositive').optional(),
  summary: z.string().max(1200),
  notes: z.string().max(4000).optional(),
  analysisId: z.string().optional(),
  legs: z.array(betLegDraftSchema).min(1, 'validation.addLeg').max(3, 'validation.maxLegs'),
});

export type BetDraft = z.infer<typeof betDraftSchema>;
export type BetDraftParsed = BetDraft;

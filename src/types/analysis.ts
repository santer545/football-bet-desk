import { z } from 'zod';

export const analysisKinds = ['review', 'match', 'daily', 'custom'] as const;

export const analysisSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(200),
  summary: z.string().max(1500).default(''),
  content: z.string().min(1),
  kind: z.enum(analysisKinds).default('daily'),
  tags: z.array(z.string()).default([]),
  relatedBetIds: z.array(z.string()).default([]),
  sourceFile: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type AnalysisKind = (typeof analysisKinds)[number];
export type AnalysisRecord = z.infer<typeof analysisSchema>;

export const analysisDraftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.dateRequired'),
  title: z.string().min(3, 'validation.title').max(200),
  summary: z.string().max(1500),
  content: z.string().min(10, 'validation.analysisTooShort'),
  kind: z.enum(analysisKinds),
  tagsText: z.string(),
  relatedBetIds: z.array(z.string()),
});

export type AnalysisDraft = z.infer<typeof analysisDraftSchema>;
export type AnalysisDraftParsed = AnalysisDraft;

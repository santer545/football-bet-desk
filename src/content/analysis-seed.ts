import type { AnalysisRecord } from '@/types';

import { BETS_SEED } from './bets-seed';

const docModules = import.meta.glob<string>('../assets/docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function extractTitle(content: string, fallback: string): string {
  const line = content
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.startsWith('# '));
  return line ? line.replace(/^#\s+/, '').trim() : fallback;
}

function extractSummary(content: string): string {
  const lines = content.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => line.trim().startsWith('# '));
  const paragraph: string[] = [];
  for (let index = titleIndex + 1; index < lines.length; index += 1) {
    const line = (lines[index] ?? '').trim();
    if (!line) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (line.startsWith('>') || line.startsWith('#') || line.startsWith('|')) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^[-*]\s/.test(line) || line === '---') {
      if (paragraph.length > 0) break;
      continue;
    }
    paragraph.push(line);
  }
  const text = paragraph.join(' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > 260 ? `${text.slice(0, 257)}...` : text;
}

function filenameFromPath(path: string): string {
  return path.split('/').pop() ?? path;
}

export const ANALYSES_SEED: AnalysisRecord[] = Object.entries(docModules)
  .map(([path, content]): AnalysisRecord | null => {
    const filename = filenameFromPath(path);
    const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(filename);
    if (!dateMatch?.[1]) return null;
    const date = dateMatch[1];
    const kind = filename.startsWith('analyze') ? 'review' : 'daily';
    const title = extractTitle(content, filename.replace(/\.md$/, ''));
    const relatedBetIds = BETS_SEED.filter((bet) => bet.date === date).map((bet) => bet.id);
    const slug = filename.replace(/\.md$/, '');

    return {
      id: `doc_${slug}`,
      date,
      title,
      summary: extractSummary(content),
      content: content.trim(),
      kind,
      tags: [
        kind === 'review' ? 'review' : 'bet-sheet',
        'series',
        ...(filename.includes('uefa') ? ['uefa'] : []),
      ],
      relatedBetIds,
      sourceFile: filename,
      createdAt: `${date}T23:30:00.000Z`,
      updatedAt: `${date}T23:30:00.000Z`,
    };
  })
  .filter((item): item is AnalysisRecord => item !== null)
  .sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind));

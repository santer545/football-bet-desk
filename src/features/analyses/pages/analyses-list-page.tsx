import { Download, FileText, Plus, Search } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EmptyState, PageHeader, Skeleton } from '@/components/feedback/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/form';
import { LinkButton } from '@/components/ui/link-button';
import { useAnalysesQuery } from '../api/hooks';
import { AnalysisCard } from '@/features/analyses/components/analysis-card';
import { useTranslation } from '@/lib/i18n';
import type { AnalysisKind, AnalysisRecord } from '@/types';
import { analysisKinds } from '@/types';
import { cn } from '@/utils/cn';
import { allAnalysesToMarkdown, downloadFile } from '@/utils/export';
import { ANALYSIS_KIND_META, formatDateLong } from '@/utils/format';

type KindFilter = 'all' | AnalysisKind;

export function AnalysesListPage() {
  const { t, plural } = useTranslation();
  const { data, isLoading, error } = useAnalysesQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = (searchParams.get('kind') as KindFilter | null) ?? 'all';
  const query = searchParams.get('q') ?? '';

  const analyses = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return analyses.filter((analysis) => {
      if (kind !== 'all' && analysis.kind !== kind) return false;
      if (!needle) return true;
      return [analysis.title, analysis.summary, analysis.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [analyses, kind, query]);

  const groups = useMemo(() => {
    const map = new Map<string, AnalysisRecord[]>();
    for (const analysis of filtered) {
      const list = map.get(analysis.date) ?? [];
      list.push(analysis);
      map.set(analysis.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const setKind = (next: KindFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('kind');
    else params.set('kind', next);
    setSearchParams(params, { replace: true });
  };

  const setQuery = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('q', value);
    else params.delete('q');
    setSearchParams(params, { replace: true });
  };

  const linkedBets = new Set(analyses.flatMap((analysis) => analysis.relatedBetIds)).size;

  return (
    <div>
      <PageHeader
        eyebrow={t('analyses.eyebrow')}
        title={t('analyses.title')}
        description={t('analyses.description')}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Download className="size-4" />}
              disabled={filtered.length === 0}
              onClick={() =>
                downloadFile(
                  `football-analyses-${new Date().toISOString().slice(0, 10)}.md`,
                  allAnalysesToMarkdown(filtered),
                  'text/markdown',
                )
              }
            >
              {t('common.export')}
            </Button>
            <LinkButton to="/analyses/new" variant="primary" icon={<Plus className="size-4" />}>
              {t('analyses.new')}
            </LinkButton>
          </>
        }
      />

      <p className="text-muted mb-5 text-xs">
        {t('analyses.counts', { documents: analyses.length, bets: linkedBets })}
      </p>

      <Card padding="sm" className="mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {(['all', ...analysisKinds] as const).map((key) => {
              const count =
                key === 'all'
                  ? analyses.length
                  : analyses.filter((analysis) => analysis.kind === key).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setKind(key)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    kind === key
                      ? 'bg-accent text-canvas'
                      : 'text-muted hover:bg-surface-3 hover:text-foreground',
                  )}
                >
                  {key === 'all' ? t('common.all') : t(ANALYSIS_KIND_META[key].labelKey)}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="relative lg:w-64">
            <Search className="text-faint pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('analyses.searchPlaceholder')}
              className="h-9 pl-8 text-xs"
              aria-label={t('analyses.searchLabel')}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={FileText}
          title={t('analyses.loadError')}
          description={error instanceof Error ? error.message : t('common.unknownError')}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={analyses.length === 0 ? t('analyses.noAnalyses') : t('analyses.noMatch')}
          description={
            analyses.length === 0
              ? t('analyses.noAnalysesDescription')
              : t('analyses.noMatchDescription')
          }
          action={
            <LinkButton to="/analyses/new" variant="primary" icon={<Plus className="size-4" />}>
              {t('analyses.new')}
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map(([date, items]) => (
            <section key={date}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-display text-foreground text-sm font-bold">
                  {formatDateLong(date)}
                </h2>
                <span className="bg-line h-px flex-1" />
                <span className="text-faint text-[11px]">
                  {items.length}{' '}
                  {plural(
                    items.length,
                    ['документ', 'документи', 'документів'],
                    ['document', 'documents'],
                  )}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((analysis) => (
                  <AnalysisCard key={analysis.id} analysis={analysis} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

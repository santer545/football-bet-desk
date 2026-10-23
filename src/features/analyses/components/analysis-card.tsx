import { ChevronRight, FileText, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import type { AnalysisRecord } from '@/types';
import { cn } from '@/utils/cn';
import { ANALYSIS_KIND_META, formatDate } from '@/utils/format';

export function AnalysisCard({ analysis }: { analysis: AnalysisRecord }) {
  const { t } = useTranslation();
  const meta = ANALYSIS_KIND_META[analysis.kind];
  return (
    <Link
      to={`/analyses/${analysis.id}`}
      className="surface surface-hover group flex h-full flex-col rounded-2xl p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className={meta.className}>
          {t(meta.labelKey)}
        </Badge>
        <span className="numeric text-faint text-xs">
          {formatDate(analysis.date, 'd MMM yyyy')}
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-foreground group-hover:text-accent text-base leading-snug font-bold">
          {analysis.title}
        </h3>
        <ChevronRight className="text-faint group-hover:text-accent mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>

      {analysis.summary ? (
        <p className="text-muted mt-2 line-clamp-3 flex-1 text-xs leading-relaxed">
          {analysis.summary}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <div className="border-line mt-4 flex flex-wrap items-center gap-1.5 border-t pt-3">
        {analysis.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="bg-surface-2 text-faint rounded-md px-1.5 py-0.5 text-[10px] font-medium"
          >
            {tag}
          </span>
        ))}
        <span className={cn('text-faint ml-auto flex items-center gap-1 text-[10px]')}>
          {analysis.relatedBetIds.length > 0 ? (
            <>
              <Link2 className="size-3" />
              {t('analyses.card.bets', { count: analysis.relatedBetIds.length })}
            </>
          ) : (
            <>
              <FileText className="size-3" />
              {t('analyses.card.doc')}
            </>
          )}
        </span>
      </div>
    </Link>
  );
}

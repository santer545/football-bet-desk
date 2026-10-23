import { zodResolver } from '@hookform/resolvers/zod';
import { FilePlus2, Save, Wand2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldError, FieldHint, Input, Label, Select, Textarea } from '@/components/ui/form';
import { useTranslation, type TranslationKey } from '@/lib/i18n';
import type { AnalysisDraft, AnalysisRecord, BetSlip } from '@/types';
import { analysisDraftSchema, analysisKinds } from '@/types';
import { STATUS_META, formatDate, todayISO } from '@/utils/format';

interface AnalysisFormProps {
  initial?: AnalysisRecord;
  bets: BetSlip[];
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (draft: AnalysisDraft) => Promise<void> | void;
  onCancel: () => void;
}

function analysisToDraft(analysis: AnalysisRecord): AnalysisDraft {
  return {
    date: analysis.date,
    title: analysis.title,
    summary: analysis.summary,
    content: analysis.content,
    kind: analysis.kind,
    tagsText: analysis.tags.join(', '),
    relatedBetIds: analysis.relatedBetIds,
  };
}

const TEMPLATE_KEYS: Record<AnalysisDraft['kind'], TranslationKey> = {
  review: 'analyses.template.review',
  daily: 'analyses.template.daily',
  match: 'analyses.template.match',
  custom: 'analyses.template.custom',
};

const TYPE_KEYS: Record<AnalysisDraft['kind'], TranslationKey> = {
  review: 'analyses.form.typeReview',
  daily: 'analyses.form.typeDaily',
  match: 'analyses.form.typeMatch',
  custom: 'analyses.form.typeCustom',
};

export function AnalysisForm({
  initial,
  bets,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: AnalysisFormProps) {
  const { t } = useTranslation();
  const form = useForm<AnalysisDraft>({
    resolver: zodResolver(analysisDraftSchema),
    defaultValues: initial
      ? analysisToDraft(initial)
      : {
          date: todayISO(),
          title: '',
          summary: '',
          content: '',
          kind: 'review',
          tagsText: 'series',
          relatedBetIds: [],
        },
    mode: 'onBlur',
  });

  const date = useWatch({ control: form.control, name: 'date' });
  const kind = useWatch({ control: form.control, name: 'kind' });
  const sameDayBets = bets.filter((bet) => bet.date === date);

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      <Card padding="lg">
        <div className="mb-5 flex items-center gap-2">
          <FilePlus2 className="text-accent size-4" />
          <h2 className="font-display text-muted text-sm font-bold tracking-wider uppercase">
            {t('analyses.form.documentDetails')}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="analysis-title" required>
              {t('analyses.form.title')}
            </Label>
            <Input
              id="analysis-title"
              placeholder={t('analyses.form.titlePlaceholder')}
              {...form.register('title')}
            />
            <FieldError message={form.formState.errors.title?.message} />
          </div>
          <div>
            <Label htmlFor="analysis-date" required>
              {t('analyses.form.date')}
            </Label>
            <Input id="analysis-date" type="date" {...form.register('date')} />
            <FieldError message={form.formState.errors.date?.message} />
          </div>
          <div>
            <Label htmlFor="analysis-kind">{t('analyses.form.type')}</Label>
            <Select id="analysis-kind" {...form.register('kind')}>
              {analysisKinds.map((analysisKind) => (
                <option key={analysisKind} value={analysisKind}>
                  {t(TYPE_KEYS[analysisKind])}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="analysis-tags">{t('analyses.form.tags')}</Label>
            <Input
              id="analysis-tags"
              placeholder={t('analyses.form.tagsPlaceholder')}
              {...form.register('tagsText')}
            />
            <FieldHint>{t('analyses.form.tagsHint')}</FieldHint>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="analysis-summary">{t('analyses.form.summary')}</Label>
            <Textarea
              id="analysis-summary"
              rows={3}
              placeholder={t('analyses.form.summaryPlaceholder')}
              {...form.register('summary')}
            />
            <FieldError message={form.formState.errors.summary?.message} />
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="analysis-content" required className="mb-0">
            {t('analyses.form.content')}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Wand2 className="size-3.5" />}
            onClick={() => {
              const template = t(TEMPLATE_KEYS[kind]);
              const current = form.getValues('content');
              form.setValue('content', current ? `${current.trimEnd()}\n\n${template}` : template, {
                shouldValidate: true,
              });
            }}
          >
            {t('analyses.form.insertTemplate', { kind: t(TYPE_KEYS[kind]) })}
          </Button>
        </div>
        <Textarea
          id="analysis-content"
          rows={18}
          className="font-mono text-[13px] leading-relaxed"
          placeholder={t('analyses.form.contentPlaceholder')}
          {...form.register('content')}
        />
        <FieldError message={form.formState.errors.content?.message} />
        <FieldHint>{t('analyses.form.contentHint')}</FieldHint>
      </Card>

      <Card padding="lg">
        <Label>{t('analyses.form.linkedBets')}</Label>
        {sameDayBets.length === 0 ? (
          <p className="text-muted text-xs leading-relaxed">
            {t('analyses.form.noSlips', { date: formatDate(date, 'd MMM yyyy') })}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {sameDayBets.map((bet) => (
              <label
                key={bet.id}
                className="border-line bg-surface-2/50 hover:border-accent/40 flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors"
              >
                <input
                  type="checkbox"
                  value={bet.id}
                  className="mt-0.5 size-4 accent-[#3dff8b]"
                  {...form.register('relatedBetIds')}
                />
                <span className="min-w-0">
                  <span className="text-foreground block truncate text-xs font-semibold">
                    {bet.title}
                  </span>
                  <span className="text-faint block text-[11px]">
                    {bet.competitionLabel} · {t(STATUS_META[bet.status].labelKey)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={submitting || form.formState.isSubmitting}
          icon={<Save className="size-4" />}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

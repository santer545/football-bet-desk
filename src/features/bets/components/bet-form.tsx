import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, Layers, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/form';
import { useTranslation } from '@/lib/i18n';
import type { BetDraft, BetSlip } from '@/types';
import { betDraftSchema, legResults, riskLevels } from '@/types';
import { LEG_RESULT_META, RISK_META, todayISO } from '@/utils/format';
import { productOdds } from '@/utils/stats';

import { betToDraft, emptyLeg } from '../lib/draft';

interface BetFormProps {
  initial?: BetSlip;
  defaultDraft?: BetDraft;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (draft: BetDraft) => Promise<void> | void;
  onCancel: () => void;
}

const optionalNumber = {
  setValueAs: (value: string) => (value === '' || value === undefined ? undefined : Number(value)),
};

export function BetForm({
  initial,
  defaultDraft,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: BetFormProps) {
  const { t } = useTranslation();
  const form = useForm<BetDraft>({
    resolver: zodResolver(betDraftSchema),
    defaultValues: initial
      ? betToDraft(initial)
      : (defaultDraft ?? {
          date: todayISO(),
          title: '',
          competitionLabel: '',
          risk: 'medium',
          combinedOdds: undefined,
          stake: undefined,
          summary: '',
          notes: '',
          legs: [emptyLeg(todayISO())],
        }),
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'legs' });
  const legs = useWatch({ control: form.control, name: 'legs' });
  const product = productOdds(legs ?? []);

  const submit = form.handleSubmit(async (values) => {
    const normalized: BetDraft = {
      ...values,
      legs: values.legs.map((leg) => ({
        ...leg,
        kickoff: new Date(leg.kickoff).toISOString(),
        score: leg.score?.trim() || undefined,
        note: leg.note?.trim() || undefined,
      })),
    };
    await onSubmit(normalized);
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      <Card padding="lg">
        <div className="mb-5 flex items-center gap-2">
          <CalendarClock className="text-accent size-4" />
          <h2 className="font-display text-muted text-sm font-bold tracking-wider uppercase">
            {t('bets.form.slipDetails')}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="bet-title" required>
              {t('bets.form.title')}
            </Label>
            <Input
              id="bet-title"
              placeholder={t('bets.form.titlePlaceholder')}
              {...form.register('title')}
            />
            <FieldError message={form.formState.errors.title?.message} />
          </div>
          <div>
            <Label htmlFor="bet-date" required>
              {t('bets.form.date')}
            </Label>
            <Input id="bet-date" type="date" {...form.register('date')} />
            <FieldError message={form.formState.errors.date?.message} />
          </div>
          <div>
            <Label htmlFor="bet-competition" required>
              {t('bets.form.competition')}
            </Label>
            <Input
              id="bet-competition"
              placeholder={t('bets.form.competitionPlaceholder')}
              {...form.register('competitionLabel')}
            />
            <FieldError message={form.formState.errors.competitionLabel?.message} />
          </div>
          <div>
            <Label htmlFor="bet-risk">{t('bets.form.riskLabel')}</Label>
            <Select id="bet-risk" {...form.register('risk')}>
              {riskLevels.map((risk) => (
                <option key={risk} value={risk}>
                  {t(RISK_META[risk].labelKey)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bet-odds">{t('bets.form.combinedOdds')}</Label>
              <Input
                id="bet-odds"
                type="number"
                step="0.01"
                min="1"
                placeholder="3.40"
                {...form.register('combinedOdds', optionalNumber)}
              />
              <FieldError message={form.formState.errors.combinedOdds?.message} />
            </div>
            <div>
              <Label htmlFor="bet-stake">{t('bets.form.stake')}</Label>
              <Input
                id="bet-stake"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="1"
                {...form.register('stake', optionalNumber)}
              />
              <FieldError message={form.formState.errors.stake?.message} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bet-summary">{t('bets.form.summary')}</Label>
            <Textarea
              id="bet-summary"
              rows={3}
              placeholder={t('bets.form.summaryPlaceholder')}
              {...form.register('summary')}
            />
            <FieldError message={form.formState.errors.summary?.message} />
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="text-accent size-4" />
            <h2 className="font-display text-muted text-sm font-bold tracking-wider uppercase">
              {t('bets.form.legs', { count: fields.length })}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {product ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Wand2 className="size-3.5" />}
                onClick={() =>
                  form.setValue('combinedOdds', Number(product.toFixed(2)), {
                    shouldValidate: true,
                  })
                }
              >
                {t('bets.form.useProduct', { product: product.toFixed(2) })}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={<Plus className="size-3.5" />}
              disabled={fields.length >= 3}
              onClick={() => append(emptyLeg(form.getValues('date')))}
            >
              {t('bets.form.addLeg')}
            </Button>
          </div>
        </div>

        {form.formState.errors.legs?.root?.message ? (
          <p className="text-danger mb-3 text-xs font-medium">
            {form.formState.errors.legs.root.message}
          </p>
        ) : null}

        <div className="space-y-4">
          {fields.map((field, index) => {
            const errors = form.formState.errors.legs?.[index];
            return (
              <div key={field.id} className="border-line bg-surface-2/50 rounded-2xl border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="eyebrow">{t('bets.form.leg', { index: index + 1 })}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('bets.form.removeLeg', { index: index + 1 })}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="text-danger size-3.5" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label required>{t('bets.form.homeTeam')}</Label>
                    <Input
                      placeholder={t('bets.form.homePlaceholder')}
                      {...form.register(`legs.${index}.homeTeam`)}
                    />
                    <FieldError message={errors?.homeTeam?.message} />
                  </div>
                  <div>
                    <Label required>{t('bets.form.awayTeam')}</Label>
                    <Input
                      placeholder={t('bets.form.awayPlaceholder')}
                      {...form.register(`legs.${index}.awayTeam`)}
                    />
                    <FieldError message={errors?.awayTeam?.message} />
                  </div>
                  <div>
                    <Label required>{t('bets.form.kickoff')}</Label>
                    <Input type="datetime-local" {...form.register(`legs.${index}.kickoff`)} />
                    <FieldError message={errors?.kickoff?.message} />
                  </div>
                  <div>
                    <Label required>{t('bets.form.market')}</Label>
                    <Input
                      list="market-options"
                      placeholder={t('bets.form.marketPlaceholder')}
                      {...form.register(`legs.${index}.market`)}
                    />
                    <FieldError message={errors?.market?.message} />
                  </div>
                  <div>
                    <Label required>{t('bets.form.selection')}</Label>
                    <Input
                      placeholder={t('bets.form.selectionPlaceholder')}
                      {...form.register(`legs.${index}.selection`)}
                    />
                    <FieldError message={errors?.selection?.message} />
                  </div>
                  <div>
                    <Label required>{t('bets.form.odds')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="2.25"
                      {...form.register(`legs.${index}.odds`, optionalNumber)}
                    />
                    <FieldError message={errors?.odds?.message} />
                  </div>
                  <div>
                    <Label required>{t('bets.form.competitionCode')}</Label>
                    <Input
                      list="competition-options"
                      placeholder="EL"
                      {...form.register(`legs.${index}.competition`)}
                    />
                    <FieldError message={errors?.competition?.message} />
                  </div>
                  <div>
                    <Label required>{t('bets.form.competitionName')}</Label>
                    <Input
                      placeholder="UEFA Europa League"
                      {...form.register(`legs.${index}.competitionLabel`)}
                    />
                    <FieldError message={errors?.competitionLabel?.message} />
                  </div>
                  <div>
                    <Label>{t('bets.form.result')}</Label>
                    <Select {...form.register(`legs.${index}.result`)}>
                      {legResults.map((result) => (
                        <option key={result} value={result}>
                          {t(LEG_RESULT_META[result].labelKey)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>{t('bets.form.score')}</Label>
                    <Input
                      placeholder={t('bets.form.scorePlaceholder')}
                      {...form.register(`legs.${index}.score`)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{t('bets.form.legNote')}</Label>
                    <Input
                      placeholder={t('bets.form.legNotePlaceholder')}
                      {...form.register(`legs.${index}.note`)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <datalist id="market-options">
          <option value="Double Chance" />
          <option value="Total Goals" />
          <option value="Match Winner" />
          <option value="Draw No Bet" />
          <option value="Both Teams To Score" />
          <option value="Win + Total" />
        </datalist>
        <datalist id="competition-options">
          {['PL', 'PD', 'SA', 'BL1', 'CL', 'EL', 'UECL', 'FL1', 'DED', 'PPL', 'ELC'].map((code) => (
            <option key={code} value={code} />
          ))}
        </datalist>
      </Card>

      <Card padding="lg">
        <Label htmlFor="bet-notes">{t('bets.form.notes')}</Label>
        <Textarea
          id="bet-notes"
          rows={4}
          placeholder={t('bets.form.notesPlaceholder')}
          {...form.register('notes')}
        />
        <FieldError message={form.formState.errors.notes?.message} />
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

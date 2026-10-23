import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  HardDriveDownload,
  KeyRound,
  Link2,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldHint, Input, Label, Select } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { testConnection } from '@/features/fixtures/api/client';
import { useTranslation } from '@/lib/i18n';
import {
  useApiBaseUrl,
  useApiToken,
  useFavoriteCompetitions,
  useSettingsStore,
} from '@/store/use-settings-store';
import { useAddToast } from '@/store/use-ui-store';
import { db } from '@/lib/db';
import { betKeys, analysisKeys } from '@/lib/keys';
import { cn } from '@/utils/cn';
import { downloadFile } from '@/utils/export';
import { COMPETITIONS, formatDate } from '@/utils/format';

type ConfirmKind = 'reset' | 'clear' | null;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const toast = useAddToast();
  const { t } = useTranslation();
  const apiToken = useApiToken();
  const apiBaseUrl = useApiBaseUrl();
  const favorites = useFavoriteCompetitions();
  const setApiToken = useSettingsStore((state) => state.setApiToken);
  const setBaseUrl = useSettingsStore((state) => state.setBaseUrl);
  const setFavoriteCompetitions = useSettingsStore((state) => state.setFavoriteCompetitions);

  const [token, setToken] = useState(apiToken);
  const [baseUrl, setBaseUrlValue] = useState(apiBaseUrl);
  const [selectedCompetitions, setSelectedCompetitions] = useState<string[]>(favorites);
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const testMutation = useMutation({
    mutationFn: () => testConnection({ token: token.trim(), baseUrl }),
    onSuccess: (message) => setTestResult({ ok: true, message }),
    onError: (error) =>
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : t('settings.unknownConnectionError'),
      }),
  });

  const saveConnection = () => {
    setApiToken(token);
    setBaseUrl(baseUrl);
    setFavoriteCompetitions(selectedCompetitions);
    toast({ kind: 'success', title: t('settings.saved') });
  };

  const toggleCompetition = (code: string) => {
    setSelectedCompetitions((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  const refreshData = () => {
    void queryClient.invalidateQueries({ queryKey: betKeys.all });
    void queryClient.invalidateQueries({ queryKey: analysisKeys.all });
  };

  const exportBackup = () => {
    downloadFile(
      `football-bet-desk-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(db.exportDatabase(), null, 2),
      'application/json',
    );
    toast({ kind: 'success', title: t('settings.data.exported') });
  };

  const importBackup = async (file: File) => {
    try {
      const text = await file.text();
      const counts = db.importDatabase(text, importMode);
      refreshData();
      toast({
        kind: 'success',
        title: t('settings.data.imported'),
        description: t('settings.data.importDescription', {
          bets: counts.bets,
          analyses: counts.analyses,
        }),
      });
    } catch (error) {
      toast({
        kind: 'error',
        title: t('settings.data.importFailed'),
        description: error instanceof Error ? error.message : t('settings.data.invalidBackup'),
      });
    }
  };

  const confirmAction = () => {
    if (confirm === 'reset') {
      db.resetToSeed();
      toast({ kind: 'success', title: t('settings.data.seedRestored') });
    } else if (confirm === 'clear') {
      db.clearAll();
      toast({ kind: 'success', title: t('settings.data.cleared') });
    }
    refreshData();
    setConfirm(null);
  };

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow mb-1.5">{t('settings.eyebrow')}</p>
        <h1 className="font-display text-foreground text-2xl font-black tracking-tight sm:text-3xl">
          {t('settings.title')}
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-relaxed">
          {t('settings.description')}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card padding="lg">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="text-accent size-4" />
              <h2 className="font-display text-muted text-sm font-bold tracking-wider uppercase">
                football-data.org
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="api-token">{t('settings.token.label')}</Label>
                <div className="relative">
                  <Input
                    id="api-token"
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={t('settings.token.placeholder')}
                    className="pr-10 font-mono text-xs"
                    onChange={(event) => {
                      setToken(event.target.value);
                      setTestResult(null);
                    }}
                  />
                  <button
                    type="button"
                    className="text-faint hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1"
                    aria-label={showToken ? t('settings.token.hide') : t('settings.token.show')}
                    onClick={() => setShowToken((value) => !value)}
                  >
                    {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FieldHint>
                  {t('settings.token.hintPrefix')}
                  <a
                    href="https://www.football-data.org/client/register"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    football-data.org
                  </a>
                  {t('settings.token.hintSuffix')}
                </FieldHint>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="api-base">{t('settings.base.label')}</Label>
                <Input
                  id="api-base"
                  value={baseUrl}
                  spellCheck={false}
                  className="font-mono text-xs"
                  onChange={(event) => {
                    setBaseUrlValue(event.target.value);
                  }}
                />
                <FieldHint>{t('settings.base.hint')}</FieldHint>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="primary" icon={<Save className="size-4" />} onClick={saveConnection}>
                {t('settings.save')}
              </Button>
              <Button
                variant="secondary"
                icon={<Link2 className="size-4" />}
                loading={testMutation.isPending}
                disabled={!token.trim()}
                onClick={() => testMutation.mutate()}
              >
                {t('settings.test')}
              </Button>
            </div>

            {testResult ? (
              <div
                className={cn(
                  'mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed',
                  testResult.ok
                    ? 'border-accent/30 bg-accent-soft text-accent'
                    : 'border-danger/30 bg-danger-soft text-danger',
                )}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                )}
                {testResult.message}
              </div>
            ) : null}
          </Card>

          <Card padding="lg">
            <div className="mb-1 flex items-center gap-2">
              <Database className="text-accent size-4" />
              <h2 className="font-display text-muted text-sm font-bold tracking-wider uppercase">
                {t('settings.competitions.title')}
              </h2>
            </div>
            <p className="text-muted mb-4 text-xs">{t('settings.competitions.description')}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {COMPETITIONS.map((competition) => {
                const active = selectedCompetitions.includes(competition.code);
                return (
                  <label
                    key={competition.code}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-colors',
                      active
                        ? 'border-accent/40 bg-accent-soft/40'
                        : 'border-line bg-surface-2/40 hover:border-line-strong',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleCompetition(competition.code)}
                      className="size-4 accent-[#3dff8b]"
                    />
                    <span className="min-w-0">
                      <span className="text-foreground block truncate text-xs font-semibold">
                        {competition.name}
                      </span>
                      <span className="text-faint block text-[10px]">{competition.code}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              icon={<Save className="size-3.5" />}
              onClick={saveConnection}
            >
              {t('settings.competitions.save')}
            </Button>
          </Card>

          <Card padding="lg">
            <div className="mb-4 flex items-center gap-2">
              <HardDriveDownload className="text-accent size-4" />
              <h2 className="font-display text-muted text-sm font-bold tracking-wider uppercase">
                {t('settings.data.title')}
              </h2>
            </div>
            <p className="text-muted text-xs leading-relaxed">{t('settings.data.description')}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="border-line bg-surface-2/40 rounded-xl border p-3">
                <p className="text-foreground text-xs font-semibold">
                  {t('settings.data.exportTitle')}
                </p>
                <p className="text-faint mt-1 text-[11px] leading-relaxed">
                  {t('settings.data.exportDescription')}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  icon={<Download className="size-3.5" />}
                  onClick={exportBackup}
                >
                  {t('settings.data.download')}
                </Button>
              </div>

              <div className="border-line bg-surface-2/40 rounded-xl border p-3">
                <p className="text-foreground text-xs font-semibold">
                  {t('settings.data.importTitle')}
                </p>
                <Select
                  aria-label={t('settings.data.importMode')}
                  className="mt-2 h-8 text-xs"
                  value={importMode}
                  onChange={(event) => setImportMode(event.target.value as 'merge' | 'replace')}
                >
                  <option value="merge">{t('settings.data.merge')}</option>
                  <option value="replace">{t('settings.data.replace')}</option>
                </Select>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importBackup(file);
                    event.target.value = '';
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  icon={<Upload className="size-3.5" />}
                  onClick={() => fileRef.current?.click()}
                >
                  {t('settings.data.chooseFile')}
                </Button>
              </div>
            </div>

            <div className="border-line mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
              <Button
                variant="secondary"
                size="sm"
                icon={<RotateCcw className="size-3.5" />}
                onClick={() => setConfirm('reset')}
              >
                {t('settings.data.restoreSeed')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="size-3.5" />}
                onClick={() => setConfirm('clear')}
              >
                {t('settings.data.clearAll')}
              </Button>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card padding="md">
            <p className="eyebrow mb-2">{t('settings.about.title')}</p>
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-faint">{t('common.version')}</dt>
                <dd className="text-muted">1.0.0</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-faint">{t('common.storage')}</dt>
                <dd className="text-muted">{t('common.localBrowser')}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-faint">{t('settings.about.today')}</dt>
                <dd className="numeric text-muted">{formatDate(new Date(), 'd MMM yyyy')}</dd>
              </div>
            </dl>
          </Card>

          <Card padding="md" className="border-warn/20 bg-warn-soft/20">
            <p className="eyebrow text-warn mb-2">{t('settings.security.title')}</p>
            <p className="text-muted text-[11px] leading-relaxed">{t('settings.security.text')}</p>
          </Card>

          <Card padding="md">
            <p className="eyebrow mb-2">{t('settings.rules.title')}</p>
            <ul className="text-muted space-y-1.5 text-[11px] leading-relaxed">
              <li>• {t('settings.rules.merge')}</li>
              <li>• {t('settings.rules.replace')}</li>
              <li>• {t('settings.rules.invalid')}</li>
            </ul>
          </Card>
        </aside>
      </div>

      <Modal open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)} size="sm">
        <Modal.Header
          title={
            confirm === 'clear' ? t('settings.modal.clearTitle') : t('settings.modal.restoreTitle')
          }
          description={
            confirm === 'clear'
              ? t('settings.modal.clearDescription')
              : t('settings.modal.restoreDescription')
          }
        />
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={confirm === 'clear' ? 'danger' : 'primary'}
            icon={
              confirm === 'clear' ? <Trash2 className="size-4" /> : <RotateCcw className="size-4" />
            }
            onClick={confirmAction}
          >
            {confirm === 'clear' ? t('settings.modal.deleteAll') : t('settings.modal.restore')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

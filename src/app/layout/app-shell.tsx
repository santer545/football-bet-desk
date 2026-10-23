import {
  Activity,
  CalendarDays,
  ChevronRight,
  FileText,
  Goal,
  Languages,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Ticket,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Suspense, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { Skeleton } from '@/components/feedback/states';
import { LinkButton } from '@/components/ui/link-button';
import { Toaster } from '@/components/feedback/states';
import { LANGUAGE_OPTIONS, useTranslation, type TranslationKey } from '@/lib/i18n';
import { useApiToken } from '@/store/use-settings-store';
import { useSidebarCollapsed, useUIStore } from '@/store/use-ui-store';
import type { Language } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  end?: boolean;
}

const navGroups: { labelKey: TranslationKey; items: NavItem[] }[] = [
  {
    labelKey: 'nav.desk',
    items: [
      { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
      { to: '/fixtures', labelKey: 'nav.fixtures', icon: Activity },
      { to: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
    ],
  },
  {
    labelKey: 'nav.ledger',
    items: [
      { to: '/bets', labelKey: 'nav.bets', icon: Ticket },
      { to: '/analyses', labelKey: 'nav.analyses', icon: FileText },
    ],
  },
  {
    labelKey: 'nav.system',
    items: [{ to: '/settings', labelKey: 'nav.settings', icon: Settings }],
  },
];

const pageTitles: { match: (path: string) => boolean; titleKey: TranslationKey }[] = [
  { match: (path) => path === '/', titleKey: 'nav.dashboard' },
  { match: (path) => path.startsWith('/fixtures'), titleKey: 'nav.fixtures' },
  { match: (path) => path.startsWith('/calendar'), titleKey: 'nav.calendar' },
  { match: (path) => path === '/bets/new', titleKey: 'titles.newBet' },
  {
    match: (path) => path.endsWith('/edit') && path.startsWith('/bets'),
    titleKey: 'titles.editBet',
  },
  { match: (path) => path === '/bets', titleKey: 'nav.bets' },
  { match: (path) => path.startsWith('/bets'), titleKey: 'titles.slipDetail' },
  { match: (path) => path === '/analyses/new', titleKey: 'titles.newAnalysis' },
  {
    match: (path) => path.endsWith('/edit') && path.startsWith('/analyses'),
    titleKey: 'titles.editAnalysis',
  },
  { match: (path) => path === '/analyses', titleKey: 'nav.analyses' },
  { match: (path) => path.startsWith('/analyses'), titleKey: 'titles.analysis' },
  { match: (path) => path.startsWith('/settings'), titleKey: 'nav.settings' },
];

function titleFor(pathname: string): TranslationKey {
  return pageTitles.find((entry) => entry.match(pathname))?.titleKey ?? 'titles.notFound';
}

export function AppShell() {
  const collapsed = useSidebarCollapsed();
  const mobileOpen = useUIStore((state) => state.mobileNavOpen);
  const setMobileOpen = useUIStore((state) => state.setMobileNavOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const hasToken = useApiToken().trim().length > 0;
  const location = useLocation();
  const { t, language } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <div className="bg-canvas min-h-dvh">
      <aside
        className={cn(
          'border-line bg-surface/60 fixed inset-y-0 left-0 z-40 hidden flex-col border-r backdrop-blur-xl transition-[width] duration-200 lg:flex',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          hasToken={hasToken}
          onNavigate={() => undefined}
          onToggle={() => toggleSidebar()}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t('shell.closeNavigation')}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="surface border-line relative z-10 flex h-full w-72 flex-col rounded-none border-r">
            <SidebarContent
              collapsed={false}
              hasToken={hasToken}
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-16' : 'lg:pl-64',
        )}
      >
        <header className="no-print border-line bg-canvas/85 sticky top-0 z-30 border-b backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="text-muted hover:bg-surface-2 hover:text-foreground rounded-lg p-1.5 lg:hidden"
              aria-label={t('shell.openNavigation')}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </button>

            <div className="flex min-w-0 items-center gap-1.5 text-xs">
              <span className="text-faint hidden sm:inline">{t('nav.desk')}</span>
              <ChevronRight className="text-faint hidden size-3 sm:inline" />
              <span className="text-foreground truncate font-semibold">
                {t(titleFor(location.pathname))}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <LanguageSwitcher />
              <span className="text-faint hidden items-center gap-1.5 text-[11px] md:flex">
                <span className={cn('size-1.5 rounded-full', hasToken ? 'bg-accent' : 'bg-warn')} />
                {hasToken ? t('shell.apiLinked') : t('shell.apiOff')}
              </span>
              <span className="text-faint hidden text-[11px] lg:inline">
                {formatDate(new Date(), 'EEE d MMM')}
              </span>
              <LinkButton
                to="/bets/new"
                variant="primary"
                size="sm"
                icon={<Plus className="size-3.5" />}
              >
                <span className="hidden sm:inline">{t('shell.newBet')}</span>
              </LinkButton>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-24" />
                <Skeleton className="h-64" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        <footer className="no-print border-line/60 text-faint border-t px-4 py-5 text-center text-[11px] leading-relaxed sm:px-6">
          {t('shell.footer')}
        </footer>
      </div>

      <Toaster />
    </div>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <label className="border-line bg-surface-2/60 text-muted hover:border-accent/30 focus-within:border-accent/50 flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors">
      <Languages className="text-faint size-3.5" aria-hidden="true" />
      <span className="sr-only">{t('shell.language')}</span>
      <select
        value={language}
        aria-label={t('shell.language')}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="text-foreground cursor-pointer appearance-none bg-transparent pr-1 font-semibold outline-none"
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface text-foreground">
            {option.short}
          </option>
        ))}
      </select>
    </label>
  );
}

function SidebarContent({
  collapsed,
  hasToken,
  onNavigate,
  onToggle,
  onClose,
}: {
  collapsed: boolean;
  hasToken: boolean;
  onNavigate: () => void;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div
        className={cn(
          'border-line flex h-14 items-center gap-2.5 border-b px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="bg-accent text-canvas flex size-8 shrink-0 items-center justify-center rounded-xl">
          <Goal className="size-4" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="font-display text-foreground text-sm font-black tracking-tight">
              BET DESK
            </p>
            <p className="text-faint text-[10px] tracking-widest uppercase">
              {t('brand.subtitle')}
            </p>
          </div>
        ) : null}
        {onClose ? (
          <button
            type="button"
            className="text-muted hover:bg-surface-2 hover:text-foreground ml-auto rounded-lg p-1.5"
            aria-label={t('shell.closeNavigation')}
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-5">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            {!collapsed ? (
              <p className="text-faint mb-1.5 px-3 text-[10px] font-bold tracking-widest uppercase">
                {t(group.labelKey)}
              </p>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={collapsed ? t(item.labelKey) : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:bg-surface-2 hover:text-foreground',
                      collapsed && 'justify-center px-0',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed ? <span>{t(item.labelKey)}</span> : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('border-line space-y-2 border-t p-3', collapsed && 'px-2')}>
        {!collapsed ? (
          <NavLink
            to="/settings"
            onClick={onNavigate}
            className="border-line bg-surface-2/60 text-muted hover:border-accent/30 hover:text-foreground flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] transition-colors"
          >
            {hasToken ? (
              <Wifi className="text-accent size-3.5" />
            ) : (
              <WifiOff className="text-warn size-3.5" />
            )}
            <span className="flex-1">
              {hasToken ? t('shell.apiConnected') : t('shell.connectApi')}
            </span>
            <ChevronRight className="text-faint size-3" />
          </NavLink>
        ) : null}

        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              'text-faint hover:bg-surface-2 hover:text-muted flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <>
                <PanelLeftClose className="size-4" />
                {t('shell.collapse')}
              </>
            )}
          </button>
        ) : null}
      </div>
    </>
  );
}

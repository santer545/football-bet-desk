import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { useTranslation } from '@/lib/i18n';
import { useUIStore, type ToastKind } from '@/store/use-ui-store';
import { cn } from '@/utils/cn';

const toastStyles: Record<ToastKind, { border: string; icon: LucideIcon; iconClass: string }> = {
  success: { border: 'border-accent/30', icon: CheckCircle2, iconClass: 'text-accent' },
  error: { border: 'border-danger/40', icon: AlertTriangle, iconClass: 'text-danger' },
  info: { border: 'border-info/30', icon: Info, iconClass: 'text-info' },
};

export function Toaster() {
  const { t } = useTranslation();
  const toasts = useUIStore((state) => state.toasts);
  const dismiss = useUIStore((state) => state.dismissToast);

  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((toast) => {
        const style = toastStyles[toast.kind];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'surface pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3.5 shadow-2xl',
              style.border,
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', style.iconClass)} />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="text-muted mt-0.5 text-xs leading-relaxed">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="text-faint hover:text-foreground transition-colors"
              onClick={() => dismiss(toast.id)}
              aria-label={t('common.dismiss')}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-line flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <div className="border-line bg-surface-2 text-muted mb-4 flex size-12 items-center justify-center rounded-2xl border">
        <Icon className="size-5" />
      </div>
      <h3 className="font-display text-foreground text-base font-bold">{title}</h3>
      {description ? (
        <p className="text-muted mt-1.5 max-w-md text-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h1 className="font-display text-foreground text-2xl font-black tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-muted mt-2 max-w-2xl text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'accent' | 'danger' | 'warning';
}) {
  const toneClass = {
    default: 'text-foreground',
    accent: 'text-accent',
    danger: 'text-danger',
    warning: 'text-warn',
  }[tone];

  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {Icon ? <Icon className={cn('size-4', toneClass)} /> : null}
      </div>
      <p className={cn('numeric font-display mt-2 text-2xl font-black', toneClass)}>{value}</p>
      {hint ? <p className="text-faint mt-0.5 truncate text-xs">{hint}</p> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-surface-3 animate-pulse rounded-xl', className)} aria-hidden />;
}

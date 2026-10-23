import { Compass, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/states';
import { LinkButton } from '@/components/ui/link-button';
import { useTranslation } from '@/lib/i18n';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="py-12">
      <EmptyState
        icon={Compass}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton to="/" variant="primary" icon={<Home className="size-4" />}>
              {t('notFound.dashboard')}
            </LinkButton>
            <Link
              to="/bets"
              className="border-line-strong text-foreground hover:bg-surface-2 inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold"
            >
              {t('notFound.bets')}
            </Link>
          </div>
        }
      />
    </div>
  );
}

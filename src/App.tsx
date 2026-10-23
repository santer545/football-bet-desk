import { BrowserRouter } from 'react-router-dom';

import { AppRoutes } from '@/app/routes';
import { AppProviders } from '@/app/providers';
import { AppErrorBoundary } from '@/components/feedback/error-boundary';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppErrorBoundary>
          <AppRoutes />
        </AppErrorBoundary>
      </BrowserRouter>
    </AppProviders>
  );
}

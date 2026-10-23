import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { getLanguage, translate } from '@/lib/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const language = getLanguage();
    return (
      <div className="bg-canvas flex min-h-dvh items-center justify-center px-6">
        <div className="surface w-full max-w-lg rounded-3xl p-8 text-center">
          <div className="border-danger/30 bg-danger-soft text-danger mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border">
            <AlertTriangle className="size-5" />
          </div>
          <h1 className="font-display text-foreground text-xl font-black">
            {translate(language, 'error.title')}
          </h1>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            {translate(language, 'error.description')}
          </p>
          <p className="bg-surface-2 text-danger mt-3 rounded-xl p-3 text-left font-mono text-[11px]">
            {this.state.error.message}
          </p>
          <Button
            variant="primary"
            className="mt-5"
            onClick={() => {
              window.location.reload();
            }}
          >
            {translate(language, 'error.reload')}
          </Button>
        </div>
      </div>
    );
  }
}

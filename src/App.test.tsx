import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '@/App';

describe('app shell', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders the dashboard from a cold start', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /беттинг-стіл/i })).toBeInTheDocument();
    expect(await screen.findByText(/останні експреси/i)).toBeInTheDocument();
  });

  it('renders the not-found page for unknown routes', async () => {
    window.history.pushState({}, '', '/missing-route');
    render(<App />);
    expect(await screen.findByText(/сторінку не знайдено/i)).toBeInTheDocument();
  });
});

import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppShell } from '@/app/layout/app-shell';
import { NotFoundPage } from '@/app/pages/not-found-page';

const DashboardPage = lazy(() =>
  import('@/features/dashboard').then((module) => ({ default: module.DashboardPage })),
);
const FixturesPage = lazy(() =>
  import('@/features/fixtures').then((module) => ({ default: module.FixturesPage })),
);
const CalendarPage = lazy(() =>
  import('@/features/calendar').then((module) => ({ default: module.CalendarPage })),
);
const BetsListPage = lazy(() =>
  import('@/features/bets').then((module) => ({ default: module.BetsListPage })),
);
const BetDetailPage = lazy(() =>
  import('@/features/bets').then((module) => ({ default: module.BetDetailPage })),
);
const BetEditorPage = lazy(() =>
  import('@/features/bets').then((module) => ({ default: module.BetEditorPage })),
);
const AnalysesListPage = lazy(() =>
  import('@/features/analyses').then((module) => ({ default: module.AnalysesListPage })),
);
const AnalysisDetailPage = lazy(() =>
  import('@/features/analyses').then((module) => ({ default: module.AnalysisDetailPage })),
);
const AnalysisEditorPage = lazy(() =>
  import('@/features/analyses').then((module) => ({ default: module.AnalysisEditorPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings').then((module) => ({ default: module.SettingsPage })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="fixtures" element={<FixturesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="bets" element={<BetsListPage />} />
        <Route path="bets/new" element={<BetEditorPage mode="create" />} />
        <Route path="bets/:id" element={<BetDetailPage />} />
        <Route path="bets/:id/edit" element={<BetEditorPage mode="edit" />} />
        <Route path="analyses" element={<AnalysesListPage />} />
        <Route path="analyses/new" element={<AnalysisEditorPage mode="create" />} />
        <Route path="analyses/:id" element={<AnalysisDetailPage />} />
        <Route path="analyses/:id/edit" element={<AnalysisEditorPage mode="edit" />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

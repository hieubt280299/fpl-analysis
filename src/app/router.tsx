import { createBrowserRouter, Navigate } from 'react-router';
import { FdrPage } from '@/features/fdr';
import { LeaguePage } from '@/features/league';
import { SettingsPage } from '@/features/settings';
import { AppLayout } from './AppLayout';
import { NotFoundPage, RouteError } from './RouteError';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/league" replace /> },
      { path: 'league/:monthKey?', element: <LeaguePage /> },
      { path: 'fdr', element: <FdrPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

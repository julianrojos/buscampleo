import { createBrowserRouter, Navigate } from 'react-router-dom';

import RequireAuth from '@/components/auth/RequireAuth';
import SignInPage from '@/components/auth/SignInPage';
import AppShell from '@/components/layout/AppShell';
import CriteriaPage from '@/components/config/CriteriaPage';
import EmailsPage from '@/components/config/EmailsPage';
import HistorialPage from '@/components/config/HistorialPage';
import ProfilePage from '@/components/config/ProfilePage';
import SettingsHub from '@/components/config/SettingsHub';
import SourcesPage from '@/components/config/SourcesPage';
import JobDetailPage from '@/components/jobs/JobDetailPage';
import OffersLayout from '@/pages/OffersLayout';

const basename =
  import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '');

export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: <SignInPage />,
    },
    {
      path: '/',
      element: (
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      ),
      children: [
        {
          index: true,
          element: <Navigate to="/ofertas" replace />,
        },
        {
          path: 'ofertas',
          element: <OffersLayout />,
          children: [
            {
              index: true,
              element: <div />,
            },
            {
              path: ':id',
              element: <JobDetailPage />,
            },
          ],
        },
        {
          path: 'fuentes',
          element: <SourcesPage />,
        },
        {
          path: 'criterios',
          element: <CriteriaPage />,
        },
        {
          path: 'perfil',
          element: <ProfilePage />,
        },
        {
          path: 'emails',
          element: <EmailsPage />,
        },
        {
          path: 'historial',
          element: <HistorialPage />,
        },
        {
          path: 'ajustes',
          element: <SettingsHub />,
        },
        {
          path: '*',
          element: <Navigate to="/ofertas" replace />,
        },
      ],
    },
  ],
  { basename },
);

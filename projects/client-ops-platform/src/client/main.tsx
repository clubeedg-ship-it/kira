import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth-context';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { BrandingPage } from './pages/BrandingPage';
import { ContentBlocksPage } from './pages/ContentBlocksPage';
import { ServicesPage } from './pages/ServicesPage';
import { ActivityPage } from './pages/ActivityPage';
import { SupportPage } from './pages/SupportPage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { BackupsPage } from './pages/BackupsPage';
import { AuditPage } from './pages/AuditPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/branding" element={<BrandingPage />} />
        <Route path="/content" element={<ContentBlocksPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/deployments" element={<DeploymentsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/backups" element={<BackupsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/" element={<Navigate to="/overview" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

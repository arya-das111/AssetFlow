import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Menu } from 'lucide-react';

// Pages
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { OrganizationSetup } from './pages/OrganizationSetup';
import { Assets } from './pages/Assets';
import { AssetAllocation } from './pages/AssetAllocation';
import { ResourceBooking } from './pages/ResourceBooking';
import { Maintenance } from './pages/Maintenance';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Audit } from './pages/Audit';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col lg:flex-row gap-4 lg:gap-6 text-foreground relative">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between p-4 card-surface rounded-2xl border border-border w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary flex items-center justify-center text-sm font-extrabold text-primary">
            AF
          </div>
          <span className="font-bold text-foreground text-sm">AssetFlow ERP</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl bg-muted/40 border border-border text-foreground hover:bg-muted/80 cursor-pointer"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Sidebar (Responsive drawer) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content pane */}
      <main className="flex-1 overflow-y-auto max-h-[calc(100vh-2rem)] pr-2">
        {children}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Pre-auth Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Role-Based Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/organization"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <Layout>
                    <OrganizationSetup />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Assets />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/allocations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AssetAllocation />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ResourceBooking />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Maintenance />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Audit />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'AssetManager', 'DepartmentHead']}>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Redirect all unmatched routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

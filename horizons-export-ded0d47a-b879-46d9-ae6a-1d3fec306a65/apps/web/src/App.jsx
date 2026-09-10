import React from 'react';
import { Route, Routes, Navigate, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import PasswordResetPage from './pages/PasswordResetPage.jsx';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import BillingHistoryPage from './pages/BillingHistoryPage.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* No standalone home page — vouza.ai itself is the marketing
              site; this app's entry point is straight into the funnel. */}
          <Route path="/" element={<Navigate to="/pricing" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          {/* Target of the link in the reset email — see the users collection's
              resetPasswordTemplate in PocketBase, which points here rather than
              at PocketBase's own admin UI. */}
          <Route path="/reset-password/confirm/:token" element={<PasswordResetConfirmPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingHistoryPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import BookingPage from './pages/BookingPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function PrivateRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  if (role && profile?.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/book/:serviceId" element={<PrivateRoute><BookingPage /></PrivateRoute>} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardRedirect />
            </PrivateRoute>
          } />
          <Route path="/admin/*" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/provider/*" element={<PrivateRoute role="provider"><ProviderDashboard /></PrivateRoute>} />
          <Route path="/user/*" element={<PrivateRoute role="user"><UserDashboard /></PrivateRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function DashboardRedirect() {
  const { profile } = useAuth();
  if (profile?.role === 'admin') return <Navigate to="/admin" />;
  if (profile?.role === 'provider') return <Navigate to="/provider" />;
  return <Navigate to="/user" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

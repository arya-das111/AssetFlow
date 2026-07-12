import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-canvas text-white">
        <div className="w-12 h-12 border-4 border-accent-green border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-sketch text-lg text-muted text-center tracking-wide">Drawing AssetFlow workspace...</p>
      </div>
    );
  }

  if (!token || !user) {
    // Redirect to login page and save current location for redirection after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home dashboard if not authorized
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

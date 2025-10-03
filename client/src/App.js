// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    try {
      const user = JSON.parse(userStr);
      if (user.role !== requiredRole && !['admin'].includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
      }
    } catch (error) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Layout Wrapper cho các trang không cần Header/Navbar/Footer
const AuthLayout = ({ children }) => {
  return <div className="auth-layout">{children}</div>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Pages - Không có Header/Navbar/Footer */}
        <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
        <Route path="/verify-email" element={<AuthLayout><VerifyEmailPage /></AuthLayout>} />
        
        {/* Public Pages - Có Header/Navbar/Footer */}
        <Route 
          path="/" 
          element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          } 
        />
        
        {/* Protected Routes - Có Header/Navbar/Footer */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Only Routes */}
        <Route 
          path="/users" 
          element={
            <ProtectedRoute requiredRole="admin">
              <UsersPage />
            </ProtectedRoute>
          } 
        />
        
        {/* 404 - Not Found */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
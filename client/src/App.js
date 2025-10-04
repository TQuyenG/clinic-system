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
import AboutPage from './pages/AboutPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import SpecialtyManagementPage from './pages/SpecialtyManagementPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import ArticleManagementPage from './pages/ArticleManagementPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import ArticlesListPage from './pages/ArticlesListPage';
import './App.css';

// Protected Route Component - SỬA ĐỂ CHẤP NHẬN MẢNG ROLES
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    try {
      const user = JSON.parse(userStr);
      
      // Chấp nhận mảng hoặc string
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      // Kiểm tra role của user có trong danh sách cho phép không
      if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
      }
    } catch (error) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

const AuthLayout = ({ children }) => {
  return <div className="auth-layout">{children}</div>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Pages */}
        <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
        <Route path="/verify-email" element={<AuthLayout><VerifyEmailPage /></AuthLayout>} />
        
        {/* Public Pages */}
        <Route 
          path="/" 
          element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          } 
        />
        <Route 
          path="/about" 
          element={
            <MainLayout>
              <AboutPage />
            </MainLayout>
          } 
        />
        {/* Public - Xem bài viết */}
        <Route 
          path="/articles/all" 
          element={
            <MainLayout>
              <ArticlesListPage />
            </MainLayout>
          } 
        />

        <Route 
          path="/articles/:slug" 
          element={
            <MainLayout>
              <ArticleDetailPage />
            </MainLayout>
          } 
        />
        
        {/* Protected Routes */}
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
        
        <Route 
          path="/specialties" 
          element={
            <ProtectedRoute requiredRole="admin">
              <SpecialtyManagementPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/categories" 
          element={
            <ProtectedRoute requiredRole="admin">
              <CategoryManagementPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Articles - ADMIN VÀ STAFF ĐỀU VÀO ĐƯỢC */}
        <Route 
          path="/articles" 
          element={
            <ProtectedRoute requiredRole={['admin', 'staff', 'doctor']}>
              <ArticleManagementPage />
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
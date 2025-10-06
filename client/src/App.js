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
import NotificationPage from './pages/NotificationsPage';
import ArticleOrCategoryPage from './pages/ArticleOrCategoryPage';
import SavedArticlesPage from './pages/SavedArticlesPage';
import CategoryArticlesPage from './pages/CategoryArticlesPage';
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
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
      }
    } catch (error) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          {/* Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          
          {/* Public Pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Public - Bài viết */}
          <Route path="/bai-viet" element={<ArticlesListPage />} />
          
          <Route 
            path="/bai-viet-da-luu" 
            element={
              <ProtectedRoute>
                <SavedArticlesPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Danh mục chính - Lọc theo category_type */}
          <Route path="/tin-tuc" element={<ArticlesListPage type="tin_tuc" />} />
          <Route path="/thuoc" element={<ArticlesListPage type="thuoc" />} />
          <Route path="/benh-ly" element={<ArticlesListPage type="benh_ly" />} />
          
          {/* Route động 2 cấp: categoryType/slug */}
          <Route path="/tin-tuc/:slug" element={<ArticleOrCategoryPage type="tin-tuc" />} />
          <Route path="/thuoc/:slug" element={<ArticleOrCategoryPage type="thuoc" />} />
          <Route path="/benh-ly/:slug" element={<ArticleOrCategoryPage type="benh-ly" />} />
          
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
                <ProfilePage />
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
          
          {/* Articles Management - Admin, Staff, Doctor */}
          <Route 
            path="/articles" 
            element={
              <ProtectedRoute requiredRole={['admin', 'staff', 'doctor']}>
                <ArticleManagementPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <NotificationPage />
              </ProtectedRoute>
            } 
          />
          
          {/* 404 - Not Found */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
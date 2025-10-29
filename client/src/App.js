// client/src/App.js - CẬP NHẬT HOÀN CHỈNH
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import FacilitiesPage from './pages/FacilitiesPage';
import EquipmentPage from './pages/EquipmentPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
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
import SpecialtiesListPage from './pages/SpecialtiesListPage';
import SpecialtyDetailPage from './pages/SpecialtyDetailPage';
import DoctorsListPage from './pages/DoctorsListPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import HealthForumPage from './pages/HealthForumPage';
import ArticleReviewPage from './pages/ArticleReviewPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import ForumManagementPage from './pages/ForumManagementPage';
import ReportManagementPage from './pages/ReportManagementPage';
import ForumPage from './pages/ForumPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import TestPage from './pages/TestPage';
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
      <AuthProvider>
        <MainLayout>
          <Routes>
          {/* ========== AUTH PAGES ========== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dang-nhap" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dang-ky" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/xac-thuc-email" element={<VerifyEmailPage />} />
          
          {/* ========== PUBLIC PAGES ========== */}
          <Route path="/test" element={<TestPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/trang-chu" element={<HomePage />} />

          {/* Diễn đàn sức khỏe */}
          <Route path="/dien-dan-suc-khoe" element={<ForumPage />} />
          <Route path="/dien-dan-suc-khoe/cau-hoi/:id" element={<QuestionDetailPage />} />
          <Route path="/health-forum" element={<HealthForumPage />} />
          
          {/* Đường dẫn cũ - chuyển hướng */}
          <Route path="/forum" element={<Navigate to="/dien-dan-suc-khoe" replace />} />
          <Route path="/dien-dan" element={<Navigate to="/dien-dan-suc-khoe" replace />} />
          <Route path="/forum/questions/:id" element={<Navigate to="/dien-dan-suc-khoe/cau-hoi/:id" replace />} />
          <Route path="/dien-dan/cau-hoi/:id" element={<Navigate to="/dien-dan-suc-khoe/cau-hoi/:id" replace />} />

          {/* Giới thiệu */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/gioi-thieu" element={<AboutPage />} />
          <Route path="/ve-chung-toi" element={<AboutPage />} />
          
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/dich-vu" element={<ServicesPage />} />
          
          <Route path="/co-so-vat-chat" element={<FacilitiesPage />} />
          
          <Route path="/trang-thiet-bi" element={<EquipmentPage />} />
          
          {/* Điều khoản & Chính sách */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/dieu-khoan" element={<TermsPage />} />
          <Route path="/dieu-khoan-su-dung" element={<TermsPage />} />
          
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
          <Route path="/bao-mat" element={<PrivacyPolicyPage />} />

          {/* ========== BÀI VIẾT ========== */}
          <Route path="/bai-viet" element={<ArticlesListPage />} />
          <Route path="/articles" element={<ArticlesListPage />} />
          
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
          <Route path="/news" element={<ArticlesListPage type="tin_tuc" />} />
          
          <Route path="/thuoc" element={<ArticlesListPage type="thuoc" />} />
          <Route path="/medicine" element={<ArticlesListPage type="thuoc" />} />
          
          <Route path="/benh-ly" element={<ArticlesListPage type="benh_ly" />} />
          <Route path="/disease" element={<ArticlesListPage type="benh_ly" />} />
          
          {/* Route động 2 cấp: categoryType/slug */}
          <Route path="/tin-tuc/:slug" element={<ArticleOrCategoryPage type="tin-tuc" />} />
          <Route path="/news/:slug" element={<ArticleOrCategoryPage type="tin-tuc" />} />
          
          <Route path="/thuoc/:slug" element={<ArticleOrCategoryPage type="thuoc" />} />
          <Route path="/medicine/:slug" element={<ArticleOrCategoryPage type="thuoc" />} />
          
          <Route path="/benh-ly/:slug" element={<ArticleOrCategoryPage type="benh-ly" />} />
          <Route path="/disease/:slug" element={<ArticleOrCategoryPage type="benh-ly" />} />

          {/* ========== CHUYÊN KHOA & BÁC SĨ ========== */}
          <Route path="/chuyen-khoa" element={<SpecialtiesListPage />} />
          <Route path="/specialties" element={<SpecialtiesListPage />} />
          
          <Route path="/chuyen-khoa/:slug" element={<SpecialtyDetailPage />} />
          <Route path="/specialties/:slug" element={<SpecialtyDetailPage />} />
          
          <Route path="/bac-si" element={<DoctorsListPage />} />
          <Route path="/doctors" element={<DoctorsListPage />} />
          
          <Route path="/bac-si/:code" element={<DoctorProfilePage />} />
          <Route path="/doctors/:code" element={<DoctorProfilePage />} />
          
          {/* ========== PROTECTED ROUTES ========== */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ho-so-nguoi-dung" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/thong-bao" 
            element={
              <ProtectedRoute>
                <NotificationPage />
              </ProtectedRoute>
            } 
          />
          
          {/* ========== ADMIN ONLY ROUTES ========== */}
          <Route 
            path="/quan-ly-nguoi-dung" 
            element={
              <ProtectedRoute requiredRole="admin">
                <UsersPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quan-ly-chuyen-khoa" 
            element={
              <ProtectedRoute requiredRole="admin">
                <SpecialtyManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quan-ly-danh-muc" 
            element={
              <ProtectedRoute requiredRole="admin">
                <CategoryManagementPage />
              </ProtectedRoute>
            } 
          />
          
          {/* QUẢN LÝ BÀI VIẾT - Admin, Staff, Doctor */}
          <Route 
            path="/quan-ly-bai-viet" 
            element={
              <ProtectedRoute requiredRole={['admin', 'staff', 'doctor']}>
                <ArticleManagementPage />
              </ProtectedRoute>
            } 
          />
          
          {/* QUẢN LÝ DIỄN ĐÀN - Admin only */}
          <Route 
            path="/quan-ly-dien-dan" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ForumManagementPage />
              </ProtectedRoute>
            } 
          />
          
          {/* QUẢN LÝ BÁO CÁO - Admin only */}
          <Route 
            path="/quan-ly-bao-cao" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ReportManagementPage />
              </ProtectedRoute>
            } 
          />
          
          {/* PHÊ DUYỆT BÀI VIẾT - Route mới với /articles/review/:id */}
          <Route 
            path="/articles/review/:id" 
            element={
              <ProtectedRoute requiredRole={['admin', 'staff', 'doctor']}>
                <ArticleReviewPage />
              </ProtectedRoute>
            } 
          />
          
          {/* PHÊ DUYỆT BÀI VIẾT - Alias tiếng Việt */}
          <Route 
            path="/phe-duyet-bai-viet/:id" 
            element={
              <ProtectedRoute requiredRole={['admin', 'staff', 'doctor']}>
                <ArticleReviewPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/quan-ly-he-thong" 
            element={
              <ProtectedRoute requiredRole="admin">
                <SystemSettingsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Chi tiết bài viết theo slug (không phải /articles/:id) */}
          <Route path="/bai-viet/:slug" element={<ArticleDetailPage />} />
          <Route path="/articles/:slug" element={<ArticleDetailPage />} />

          {/* Danh mục theo slug */}
          <Route path="/danh-muc/:slug" element={<CategoryArticlesPage />} />
          <Route path="/category/:slug" element={<CategoryArticlesPage />} />
          
          {/* ========== 404 - NOT FOUND ========== */}
          <Route path="/404" element={
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h1>404 - Không tìm thấy trang</h1>
              <p>Trang bạn đang tìm kiếm không tồn tại</p>
              <a href="/">Về trang chủ</a>
            </div>
          } />
          
          <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </MainLayout>
      </AuthProvider>
    </Router>
  );
}

export default App;

// client/src/App.js
// PHIÊN BẢN GỘP CHÍNH XÁC (Code 1 + Code 2)
// Không tự ý thêm ServiceForm hay đổi tên Controller

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DepartmentColorProvider } from './contexts/DepartmentColorContext'; 
import PermissionRoute from './components/common/PermissionRoute';

// --- Import Pages ---

// Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OAuthCallback from './pages/OAuthCallback';

// Public & General
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FacilitiesPage from './pages/FacilitiesPage';
import EquipmentPage from './pages/EquipmentPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LookupResultPage from './pages/LookupResultPage'; 
// [TỪ CODE 2] Thêm SearchResultPage
import SearchResultPage from './pages/SearchResultPage'; 

// Articles & Forum
import ArticlesListPage from './pages/ArticlesListPage';
import ArticleManagementPage from './pages/ArticleManagementPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import ArticleOrCategoryPage from './pages/ArticleOrCategoryPage';
import SavedArticlesPage from './pages/SavedArticlesPage';
import CategoryArticlesPage from './pages/CategoryArticlesPage';
import ArticleReviewPage from './pages/ArticleReviewPage';

import ForumPage from './pages/ForumPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import MyForumPage from './pages/MyForumPage'; // ✅ Thêm MyForumPage

// [TỪ CODE 2] New: Public Medicine & Disease (Entity Pages)
import EntityListPage from './pages/EntityListPage';
import EntityDetailPage from './pages/EntityDetailPage';
import EntityManagementPage from './pages/EntityManagementPage';

// Services, Specialties & Doctors
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import ServiceCategoryDetailPage from './pages/ServiceCategoryDetailPage';
import SpecialtiesListPage from './pages/SpecialtiesListPage';
import SpecialtyDetailPage from './pages/SpecialtyDetailPage';
import DoctorsListPage from './pages/DoctorsListPage';
import DoctorProfilePage from './pages/DoctorProfilePage';

// Common Protected
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import PermissionDebugPage from './pages/PermissionDebugPage'; 

// Appointments & Medical Records
import AppointmentBookingPage from './pages/AppointmentBookingPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import DoctorAppointmentsPage from './pages/DoctorAppointmentsPage';
import AppointmentDetailPage from './pages/AppointmentDetailPage';
import MedicalRecordFormPage from './pages/MedicalRecordFormPage';
import MedicalRecordViewPage from './pages/MedicalRecordViewPage';
import DoctorMedicalRecordsPage from './pages/DoctorMedicalRecordsPage';
import MyMedicalRecordsPage from './pages/MyMedicalRecordsPage';

// Payment (Từ Code 1)
import PaymentPage from './pages/PaymentPage';
// (Code 1 có PaymentManagementPage, PaymentSettingsPage nhưng Code 2 không import, 
// tôi giữ lại từ Code 1 để đảm bảo không mất chức năng cũ)
import PaymentManagementPage from './pages/PaymentManagementPage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import FrontDeskPage from './pages/FrontDeskPage';
import PharmacyStockPage from './pages/PharmacyStockPage';

// --- THÊM 2 DÒNG NÀY VÀO ---
import RefundRequestPage from './pages/RefundRequestPage';
import RefundPolicyConfigPage from './pages/RefundPolicyConfigPage';
// ---------------------------

// Consultation (Tư vấn)
import ChatRoomPage from './pages/ChatRoomPage';
import ConsultationDetailPage from './pages/ConsultationDetailPage';
import ConsultationBookingPage from './pages/ConsultationBookingPage';
import VideoCallRoomPage from './pages/VideoCallRoomPage';
import ConsultationHistoryPage from './pages/ConsultationHistoryPage';

// Staff & Doctor
import MySchedulePage from './pages/MySchedulePage';

// Admin
import UsersPage from './pages/UsersPage';
import SpecialtyManagementPage from './pages/SpecialtyManagementPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import ScheduleManagementPage from './pages/ScheduleManagementPage';
import StatisticsPage from './pages/StatisticsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import StaffManagementPage from './pages/StaffManagementPage';
import ContactManagementPage from './pages/ContactManagementPage';
import ServiceManagementPage from './pages/ServiceManagementPage';
import ServiceCategoryManagementPage from './pages/ServiceCategoryManagementPage';
import AppointmentManagementPage from './pages/AppointmentManagementPage';
import ConsultationRealtimeManagementPage from './pages/ConsultationRealtimeManagementPage';
// [TỪ CODE 2] Thêm Package Management & Forum Management & Report Management
import ConsultationPackageManagementPage from './pages/ConsultationPackageManagementPage';
import ForumManagementPage from './pages/ForumManagementPage';
import CommunityHomePage from './pages/CommunityHomePage';
import CommunityGroupPage from './pages/CommunityGroupPage';
import CommunityGroupManagePage from './pages/CommunityGroupManagePage';
import ReportManagementPage from './pages/ReportManagementPage';

// Toast & CSS
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './utils/css/toast.css'; 
import './App.css';
import './services/ws'; // Initialize WebSocket

import MarketingManagementPage from './pages/MarketingManagementPage'; // Trang quản lý 2 tab: Sự kiện / Khuyến mãi
import EventListPage from './pages/EventListPage'; // Trang danh sách sự kiện cho user
import EventDetailPage from './pages/EventDetailPage'; // Trang chi tiết sự kiện
import EventManagementPage from './pages/EventManagementPage';
import UserPromotionPage from './pages/UserPromotionPage'; // Trang ví voucher & game

// --- Protected Route Component ---
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth(); 

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Đang tải dữ liệu người dùng...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize role (some responses use object or nested role fields)
  const rawRole = user?.role || user?.role_info || user?.roleData || user?.roleData?.role;
  const roleStr = typeof rawRole === 'string'
    ? rawRole.toLowerCase()
    : (typeof rawRole === 'object' && rawRole?.name) ? String(rawRole.name).toLowerCase() : '';

  if (requiredRole) {
    const allowedRoles = (Array.isArray(requiredRole) ? requiredRole : [requiredRole]).map(r => String(r).toLowerCase());
    if (!allowedRoles.includes(roleStr)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
};

// --- THÊM MỚI: Component điều hướng trang lịch hẹn ---
const AppointmentPageDispatcher = () => {
  const { user } = useAuth();
  // Nếu là bác sĩ -> Hiển thị trang quản lý lịch hẹn (Giao diện Admin đẹp)
  if (user && user.role === 'doctor') {
    return <DoctorAppointmentsPage />;
  }
  // Nếu là bệnh nhân -> Hiển thị trang lịch hẹn cá nhân
  return <MyAppointmentsPage />;
};
// ----------------------------------------------------

// --- App Component ---
function App() {
  // Override native alert to use toast for consistent UX across the app
  useEffect(() => {
    // keep a reference to original in case needed
    const _origAlert = window.alert;
    window.alert = (msg) => {
      try {
        // convert non-string messages
        toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } catch (err) {
        toast.error('Thông báo');
      }
    };
    return () => { window.alert = _origAlert; };
  }, []);
  return (
    <Router>
      <DepartmentColorProvider>
        <AuthProvider>
          <MainLayout>
            <Routes>
            {/* ========== 1. AUTH ========== */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dang-ky" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/xac-thuc-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/dat-lai-mat-khau" element={<ForgotPasswordPage />} />
            <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
            <Route path="/reset-password-verify" element={<ResetPasswordPage />} />
            <Route path="/xac-thuc-dat-lai-mat-khau" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            {/* Code 2 có thêm route này, giữ lại cho tương thích */}
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* ========== 2. PUBLIC & GENERAL ========== */}
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/trang-chu" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/gioi-thieu" element={<AboutPage />} />
            <Route path="/ve-chung-toi" element={<AboutPage />} />
            <Route path="/lien-he" element={<ContactPage />} /> {/* <-- THÊM DÒNG NÀY */}
            <Route path="/co-so-vat-chat" element={<FacilitiesPage />} />
            <Route path="/trang-thiet-bi" element={<EquipmentPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/dieu-khoan" element={<TermsPage />} />
            <Route path="/dieu-khoan-su-dung" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
            <Route path="/bao-mat" element={<PrivacyPolicyPage />} />
            {/* Đã xóa route /health-forum ở đây để mang xuống gộp bên dưới */}
            <Route path="/tra-cuu-ket-qua" element={<LookupResultPage />} />
            
            {/* [TỪ CODE 2] ROUTE TÌM KIẾM */}
            <Route path="/tim-kiem" element={<SearchResultPage />} />
            <Route path="/search" element={<SearchResultPage />} />

            <Route path="/quan-ly-su-kien" element={<ProtectedRoute requiredRole={['admin', 'staff']}><EventManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-khuyen-mai" element={<ProtectedRoute requiredRole={['admin', 'staff']}><MarketingManagementPage /></ProtectedRoute>} />
            <Route path="/su-kien" element={<EventListPage />} />
            <Route path="/su-kien/:slug" element={<EventDetailPage />} />
            <Route path="/khuyen-mai" element={<ProtectedRoute requiredRole="patient"><UserPromotionPage tab="vouchers" /></ProtectedRoute>} />
            <Route path="/san-qua" element={<ProtectedRoute requiredRole="patient"><UserPromotionPage tab="game" /></ProtectedRoute>} />
            {/* -------------------------------------------------- */}
            
            {/* ========== 3. ARTICLES & FORUM ========== */}
            <Route path="/bai-viet" element={<ArticlesListPage />} />
            <Route path="/articles" element={<ArticlesListPage />} />
            <Route path="/tin-tuc" element={<ArticlesListPage type="tin_tuc" />} />
            <Route path="/thuoc" element={<ArticlesListPage type="thuoc" />} />
            <Route path="/benh-ly" element={<ArticlesListPage type="benh_ly" />} />
            <Route path="/tin-tuc/:slug" element={<ArticleOrCategoryPage type="tin-tuc" />} />
            <Route path="/thuoc/:slug" element={<ArticleOrCategoryPage type="thuoc" />} />
            <Route path="/benh-ly/:slug" element={<ArticleOrCategoryPage type="benh_ly" />} />
            <Route path="/bai-viet/:slug" element={<ArticleDetailPage />} />
            <Route path="/danh-muc/:slug" element={<CategoryArticlesPage />} />
            
            {/* ĐÃ THAY FORUM PAGE CŨ BẰNG HEALTH FORUM PAGE MỚI */}
            
            <Route path="/dien-dan-suc-khoe" element={<ForumPage />} />
<Route path="/dien-dan-suc-khoe/cau-hoi/:id" element={<QuestionDetailPage />} />
<Route path="/dien-dan" element={<ForumPage />} />
<Route path="/health-forum" element={<Navigate to="/dien-dan-suc-khoe" replace />} />
            
            {/* ✅ COMMUNITY GROUPS */}
            <Route path="/quan-ly-nhom-cong-dong" element={<ProtectedRoute requiredRole={['admin','staff','doctor']}><CommunityGroupManagePage mode="manage" /></ProtectedRoute>} />
            
            {/* ✅ MY FORUM PAGE - Câu hỏi của tôi / Đã lưu / import CommunityGroupManagePage from './pages/CommunityGroupManagePage'; thích */}
            <Route 
              path="/dien-dan-cua-toi" 
              element={
                <ProtectedRoute>
                  <MyForumPage />
                </ProtectedRoute>
              } 
            />

            {/* [TỪ CODE 2] PUBLIC MEDICINE & DISEASE */}
            <Route path="/tra-cuu-thuoc" element={<EntityListPage entityType="medicine" />} />
            <Route path="/tra-cuu-thuoc/:slug" element={<EntityDetailPage entityType="medicine" />} />
            <Route path="/tra-cuu-benh-ly" element={<EntityListPage entityType="disease" />} />
            <Route path="/tra-cuu-benh-ly/:slug" element={<EntityDetailPage entityType="disease" />} />

            {/* ========== 4. SERVICES, SPECIALTIES & DOCTORS (Public) ========== */}
            <Route path="/dich-vu" element={<ServicesPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/dich-vu/:id" element={<ServiceDetailPage />} />
            <Route path="/danh-muc-dich-vu/:slug" element={<ServiceCategoryDetailPage />} />
            <Route path="/chuyen-khoa" element={<SpecialtiesListPage />} />
            <Route path="/specialties" element={<SpecialtiesListPage />} />
            <Route path="/chuyen-khoa/:slug" element={<SpecialtyDetailPage />} />
            <Route path="/bac-si" element={<DoctorsListPage />} />
            <Route path="/doctors" element={<DoctorsListPage />} />
            <Route path="/bac-si/:code" element={<DoctorProfilePage />} />
            
            {/* ========== 5. COMMON PROTECTED (All roles) ========== */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/debug-permissions" element={<ProtectedRoute><PermissionDebugPage /></ProtectedRoute>} />
            <Route path="/ho-so-nguoi-dung" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/thong-bao" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/bai-viet-da-luu" element={<ProtectedRoute><SavedArticlesPage /></ProtectedRoute>} />
            <Route path="/quay-tiep-don" element={<ProtectedRoute requiredRole={['admin', 'staff']}><FrontDeskPage /></ProtectedRoute>} />

            {/* ========== 6. APPOINTMENTS & MEDICAL RECORDS ========== */}
            <Route path="/dat-lich-hen" element={<ProtectedRoute requiredRole="patient"><AppointmentBookingPage /></ProtectedRoute>} />
            <Route path="/thanh-toan/:appointmentId" element={<ProtectedRoute requiredRole="patient"><PaymentPage /></ProtectedRoute>} />
            <Route path="/ho-so-y-te" element={<ProtectedRoute requiredRole="patient"><MedicalRecordViewPage /></ProtectedRoute>} />
            <Route path="/danh-sach-ho-so" element={
              <ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}>
                <MyMedicalRecordsPage />
              </ProtectedRoute>
            } />
            
            <Route path="/lich-hen-cua-toi" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><AppointmentPageDispatcher /></ProtectedRoute>} />
            <Route path="/my-appointments" element={<Navigate to="/lich-hen-cua-toi" replace />} /> 
            
            {/* Cập nhật theo Code 2 (Code 2 dùng :code tốt hơn :appointmentId cho route chi tiết) */}
            <Route path="/lich-hen/:code" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'staff', 'admin']}><AppointmentDetailPage /></ProtectedRoute>} />
            <Route path="/guest/appointment/:token" element={<AppointmentDetailPage />} />
            
            <Route path="/nhap-ket-qua/:code" element={<ProtectedRoute requiredRole={['doctor', 'admin']}><MedicalRecordFormPage /></ProtectedRoute>} />
            <Route path="/ket-qua-kham/:record_id" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><MedicalRecordViewPage /></ProtectedRoute>} />

            {/* ========== 7. CONSULTATION (Tư vấn) ========== */}
            {/* Redirect legacy standalone consultation page to Services page consultation tab */}
            <Route path="/tu-van" element={<Navigate to="/dich-vu?tab=consultation" replace />} />
            <Route path="/dat-lich-tu-van" element={<ProtectedRoute requiredRole={['patient','admin','doctor', 'staff']}><ConsultationBookingPage /></ProtectedRoute>} />
            <Route path="/lich-tu-van-cua-toi" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><ConsultationHistoryPage /></ProtectedRoute>} />
            
            {/* Video & Chat routes - Đặt trước route động */}
            <Route path="/tu-van/video/:id" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><VideoCallRoomPage /></ProtectedRoute>} />
            <Route path="/tu-van/:id/video" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><VideoCallRoomPage /></ProtectedRoute>} />
            <Route path="/tu-van/:id/chat" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><ChatRoomPage /></ProtectedRoute>} />
            
            {/* Consultation detail - Route động đặt cuối cùng */}
            <Route path="/tu-van/:id" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><ConsultationDetailPage /></ProtectedRoute>} />

            {/* STAFF: Realtime consultation monitoring - Bỏ route cũ */}
            {/* <Route path="/staff/tu-van/realtime" element={<ProtectedRoute requiredRole="staff"><ConsultationRealtimeManagementPage /></ProtectedRoute>} /> */}
            {/* <Route path="/staff/tu-van/video" element={<ProtectedRoute requiredRole="staff"><ConsultationRealtimeManagementPage /></ProtectedRoute>} /> */}
            
            {/* ========== 8. STAFF & DOCTOR ========== */}
            <Route path="/lich-cua-toi" element={<ProtectedRoute requiredRole={['doctor', 'staff']}><MySchedulePage /></ProtectedRoute>} />

            <Route path="/quan-ly-benh-nhan" element={<ProtectedRoute requiredRole={['admin', 'staff']}><UsersPage defaultRole="patient" /></ProtectedRoute>} />
            <Route path="/quan-ly-bac-si" element={<ProtectedRoute requiredRole={['admin', 'staff']}><UsersPage defaultRole="doctor" /></ProtectedRoute>} />
            <Route path="/ho-so-benh-an" element={
              <ProtectedRoute requiredRole={['admin', 'staff', 'doctor']}>
                <DoctorMedicalRecordsPage />
              </ProtectedRoute>
            } />

            {/* ========== 9. ADMIN ========== */}
            <Route path="/quan-ly-nguoi-dung" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/phan-cong-nhan-su" element={<ProtectedRoute requiredRole="admin"><StaffManagementPage openAssignment={true} /></ProtectedRoute>} />
            {/* CẬP NHẬT: Cho phép cả admin và staff (manager) truy cập */}
            <Route path="/quan-ly-nhan-vien" element={<ProtectedRoute requiredRole={['admin', 'staff']}><StaffManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-lien-he" element={<ProtectedRoute><ContactManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-chuyen-khoa" element={<ProtectedRoute requiredRole="admin"><SpecialtyManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-danh-muc" element={<ProtectedRoute requiredRole="admin"><CategoryManagementPage /></ProtectedRoute>} />
            
            {/* 🔐 QUẢN LÝ BÀI VIẾT - Yêu cầu quyền articles module */}
            <Route path="/quan-ly-bai-viet" element={
              <PermissionRoute requiredRole={['admin', 'staff', 'doctor']}>
                <ArticleManagementPage />
              </PermissionRoute>
            } />
            <Route path="/phe-duyet-bai-viet/:id" element={
              <PermissionRoute requiredRole={['admin', 'staff']}>
                <ArticleReviewPage />
              </PermissionRoute>
            } />
            
            <Route path="/quan-ly-he-thong" element={
              <PermissionRoute requiredRole={['admin', 'staff']}>
                <SystemSettingsPage />
              </PermissionRoute>
            } />
            
            
            {/* 🔐 QUẢN LÝ DỊCH VỤ - Admin & Staff (UI check permissions) */}
            <Route path="/quan-ly-danh-muc-dich-vu" element={
              <PermissionRoute requiredRole={['admin', 'staff']}>
                <ServiceCategoryManagementPage />
              </PermissionRoute>
            } />
            <Route path="/quan-ly-dich-vu" element={
              <PermissionRoute requiredRole={['admin', 'staff']}>
                <ServiceManagementPage />
              </PermissionRoute>
            } />
            
            {/* Entity Management (Quản lý Thuốc/Bệnh lý) */}
            {/* THUỐC & BỆNH LÝ */}
            <Route path="/quan-ly-thuoc" element={<PermissionRoute requiredRole={['admin', 'staff', 'doctor']}><EntityManagementPage entityType="medicine" /></PermissionRoute>} />
            <Route path="/quan-ly-benh-ly" element={<PermissionRoute requiredRole={['admin', 'staff', 'doctor']}><EntityManagementPage entityType="disease" /></PermissionRoute>} />
            <Route path="/quan-ly-kho-thuoc" element={<ProtectedRoute requiredRole={['admin', 'staff']}><PharmacyStockPage /></ProtectedRoute>} />

            <Route path="/quan-ly-lich-lam-viec" element={<ProtectedRoute requiredRole={['admin', 'staff']}><ScheduleManagementPage /></ProtectedRoute>} />
            <Route 
              path="/quan-ly-lich-hen" 
              element={
                <PermissionRoute requiredRole={['admin', 'staff']} module="appointments">
                  <AppointmentManagementPage />
                </PermissionRoute>
              } 
            />
            
            {/* Forum & Report Management */}
            <Route path="/quan-ly-dien-dan" element={<ForumManagementPage />} />
            
            {/* BỎ TRANG COMMUNITY CŨ - CHUYỂN HƯỚNG SANG DIỄN ĐÀN VÀ MỞ SẴN TAB CỘNG ĐỒNG */}
            <Route path="/cong-dong" element={<Navigate to="/dien-dan-suc-khoe" replace />} />
            
            <Route path="/cong-dong/nhom/:slug" element={<CommunityGroupPage />} />
            <Route path="/quan-ly-nhom-cong-dong" element={<CommunityGroupManagePage />} />
            <Route path="/quan-ly-bao-cao" element={<ProtectedRoute requiredRole="admin"><ReportManagementPage /></ProtectedRoute>} />
            
            <Route path="/thong-ke" element={<ProtectedRoute requiredRole={['admin', 'staff']}><StatisticsPage /></ProtectedRoute>} />
            
            {/* 🔐 QUẢN LÝ TƯ VẤN - Admin & Staff (UI check permissions) */}
            <Route path="/quan-ly-tu-van/realtime" element={
              <PermissionRoute requiredRole={['admin', 'staff','doctor']}>
                <ConsultationRealtimeManagementPage />
              </PermissionRoute>
            } />
            <Route path="/quan-ly-tu-van/goi-dich-vu" element={
              <PermissionRoute requiredRole={['admin', 'staff']}>
                <ConsultationPackageManagementPage />
              </PermissionRoute>
            } />
            
            {/* Legacy routes - Redirect để tương thích ngược */}
            <Route path="/admin/tu-van/realtime" element={<Navigate to="/quan-ly-tu-van/realtime" replace />} />
            <Route path="/admin/tu-van/packages" element={<Navigate to="/quan-ly-tu-van/goi-dich-vu" replace />} />

            

            {/* ========== 10. QUẢN LÝ TÀI CHÍNH (Giữ lại từ Code 1) ========== */}
            <Route path="/quan-ly-thanh-toan/giao-dich" element={<ProtectedRoute requiredRole={['admin', 'staff']}><PaymentManagementPage /></ProtectedRoute>} />
            {/* --- THÊM MỚI 2 ROUTE NÀY --- */}
            {/* Trang danh sách duyệt đơn hoàn tiền */}
            <Route path="/quan-ly-thanh-toan/hoan-tien" element={<ProtectedRoute requiredRole={['admin', 'staff']}><RefundRequestPage /></ProtectedRoute>} />
            
            {/* Trang cấu hình chính sách hoàn tiền */}
            <Route path="/quan-ly-thanh-toan/chinh-sach" element={<ProtectedRoute requiredRole={['admin', 'staff']}><RefundPolicyConfigPage /></ProtectedRoute>} />
            {/* --------------------------- */}
            <Route path="/quan-ly-thanh-toan/thong-ke" element={<ProtectedRoute requiredRole={['admin', 'staff']}><StatisticsPage /></ProtectedRoute>} />
            <Route path="/quan-ly-thanh-toan/cau-hinh" element={<ProtectedRoute requiredRole={['admin', 'staff']}><PaymentSettingsPage /></ProtectedRoute>} />

            {/* ========== 404 - NOT FOUND ========== */}
            <Route path="/404" element={<div style={{ textAlign: 'center', padding: '50px' }}><h1>404 - Không tìm thấy trang</h1><p>Trang bạn đang tìm kiếm không tồn tại</p><a href="/">Về trang chủ</a></div>} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </MainLayout>
        
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          style={{ zIndex: 20000 }}
        />
        </AuthProvider>
      </DepartmentColorProvider>
    </Router>
  );
}

export default App;
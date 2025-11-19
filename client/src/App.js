// client/src/App.js
// ĐÃ SẮP XẾP LẠI GỌN GÀNG VÀ GỘP ROUTE LỊCH HẸN
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext'; 

// --- Import Pages ---

// Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Public & General
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import FacilitiesPage from './pages/FacilitiesPage';
import EquipmentPage from './pages/EquipmentPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LookupResultPage from './pages/LookupResultPage'; 

// Articles & Forum
import ArticlesListPage from './pages/ArticlesListPage';
import ArticleManagementPage from './pages/ArticleManagementPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import ArticleOrCategoryPage from './pages/ArticleOrCategoryPage';
import SavedArticlesPage from './pages/SavedArticlesPage';
import CategoryArticlesPage from './pages/CategoryArticlesPage';
import ArticleReviewPage from './pages/ArticleReviewPage';
import HealthForumPage from './pages/HealthForumPage';
import ForumPage from './pages/ForumPage';
import QuestionDetailPage from './pages/QuestionDetailPage';

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

// Appointments & Medical Records
import AppointmentBookingPage from './pages/AppointmentBookingPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import AppointmentDetailPage from './pages/AppointmentDetailPage';
import MedicalRecordFormPage from './pages/MedicalRecordFormPage';
import MedicalRecordViewPage from './pages/MedicalRecordViewPage';
import MyMedicalRecordsPage from './pages/MyMedicalRecordsPage';

// Payment
import PaymentPage from './pages/PaymentPage';

// Consultation (Tư vấn)
import ConsultationHomePage from './pages/ConsultationHomePage';
import ChatRoomPage from './pages/ChatRoomPage';
import ConsultationHistoryPage from './pages/ConsultationHistoryPage';
import ConsultationDetailPage from './pages/ConsultationDetailPage';
import ConsultationBookingPage from './pages/ConsultationBookingPage';
import VideoCallRoomPage from './pages/VideoCallRoomPage';

// Staff & Doctor
import MySchedulePage from './pages/MySchedulePage';
import DoctorConsultationManagementPage from './pages/DoctorConsultationManagementPage';

// Admin
import UsersPage from './pages/UsersPage';
import SpecialtyManagementPage from './pages/SpecialtyManagementPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import ScheduleManagementPage from './pages/ScheduleManagementPage';
import StatisticsPage from './pages/StatisticsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import StaffManagementPage from './pages/StaffManagementPage';
import ServiceManagementPage from './pages/ServiceManagementPage';
import ServiceCategoryManagementPage from './pages/ServiceCategoryManagementPage';
import AppointmentManagementPage from './pages/AppointmentManagementPage';
import ConsultationSystemManagementPage from './pages/ConsultationSystemManagementPage';
import ConsultationRealtimeManagementPage from './pages/ConsultationRealtimeManagementPage';
import ConsultationPackageManagementPage from './pages/ConsultationPackageManagementPage';
import ForumManagementPage from './pages/ForumManagementPage';
import ReportManagementPage from './pages/ReportManagementPage';


// Toast
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './utils/css/toast.css'; // Custom toast styles

// CSS
import './App.css';
import './services/ws'; // Initialize WebSocket

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

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
};

// --- App Component ---
function App() {
  return (
    <Router>
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

            {/* ========== 2. PUBLIC & GENERAL ========== */}
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/trang-chu" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/gioi-thieu" element={<AboutPage />} />
            <Route path="/ve-chung-toi" element={<AboutPage />} />
            <Route path="/co-so-vat-chat" element={<FacilitiesPage />} />
            <Route path="/trang-thiet-bi" element={<EquipmentPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/dieu-khoan" element={<TermsPage />} />
            <Route path="/dieu-khoan-su-dung" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
            <Route path="/bao-mat" element={<PrivacyPolicyPage />} />
            <Route path="/health-forum" element={<HealthForumPage />} /> {/* (Trang giới thiệu forum) */}

            {/* ✅ SỬA: Thêm route tra cứu public */}
            <Route path="/tra-cuu-ket-qua" element={<LookupResultPage />} />
            
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
            <Route path="/dien-dan-suc-khoe" element={<ForumPage />} />
            <Route path="/dien-dan-suc-khoe/cau-hoi/:id" element={<QuestionDetailPage />} />
            
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
            <Route path="/ho-so-nguoi-dung" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/thong-bao" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            
            <Route path="/bai-viet-da-luu" element={<ProtectedRoute><SavedArticlesPage /></ProtectedRoute>} />

            {/* ========== 6. APPOINTMENTS & MEDICAL RECORDS ========== */}
            <Route path="/dat-lich-hen" element={<ProtectedRoute requiredRole="patient"><AppointmentBookingPage /></ProtectedRoute>} />
            <Route path="/thanh-toan/:appointmentId" element={<ProtectedRoute requiredRole="patient"><PaymentPage /></ProtectedRoute>} />
            <Route path="/ho-so-y-te" element={<ProtectedRoute requiredRole="patient"><MyMedicalRecordsPage /></ProtectedRoute>} />
            
            <Route path="/lich-hen-cua-toi" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><MyAppointmentsPage /></ProtectedRoute>} />
            <Route path="/my-appointments" element={<Navigate to="/lich-hen-cua-toi" replace />} /> 
            
            <Route path="/lich-hen/:code" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'staff', 'admin']}><AppointmentDetailPage /></ProtectedRoute>} />
            <Route path="/guest/appointment/:token" element={<AppointmentDetailPage />} />
            
            {/* ✅ SỬA: Đổi param :appointmentId -> :code và sửa quyền (Thêm 'admin') */}
            <Route path="/nhap-ket-qua/:code" element={<ProtectedRoute requiredRole={['doctor', 'admin']}><MedicalRecordFormPage /></ProtectedRoute>} />
            {/* ✅ SỬA: Đổi param :id -> :record_id (để rõ ràng) */}
            <Route path="/ket-qua-kham/:record_id" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><MedicalRecordViewPage /></ProtectedRoute>} />

            {/* ========== 7. CONSULTATION (Tư vấn) ========== */}
            <Route path="/tu-van" element={<ProtectedRoute requiredRole={['patient','admin','doctor']}><ConsultationHomePage /></ProtectedRoute>} />
            <Route path="/tu-van/dat-lich" element={<ProtectedRoute requiredRole={['patient','admin','doctor']}><ConsultationBookingPage /></ProtectedRoute>} />
            <Route path="/tu-van/lich-su" element={<ProtectedRoute requiredRole="patient"><ConsultationHistoryPage /></ProtectedRoute>} />

            {/* ✅ QUAN TRỌNG: Route cụ thể phải đặt TRƯỚC route động */}
            <Route path="/tu-van/video/:id" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><VideoCallRoomPage /></ProtectedRoute>} />
            <Route path="/tu-van/:id/video" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><VideoCallRoomPage /></ProtectedRoute>} />
            <Route path="/tu-van/:id/chat" element={<ProtectedRoute requiredRole={['patient', 'doctor']}><ChatRoomPage /></ProtectedRoute>} />

            {/* ✅ Route động phải đặt CUỐI CÙNG */}
            <Route path="/tu-van/:id" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin', 'staff']}><ConsultationDetailPage /></ProtectedRoute>} />

            <Route path="/bac-si/tu-van" element={<ProtectedRoute requiredRole="doctor"><DoctorConsultationManagementPage /></ProtectedRoute>} />
            {/* ✅ THÊM ROUTE NÀY ĐỂ SỬA LỖI 404 */}
            <Route 
              path="/bac-si/tu-van/video" 
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorConsultationManagementPage initialFilterType="video" />
                </ProtectedRoute>
              } 
            />
            {/* ========== 8. STAFF & DOCTOR ========== */}
            <Route path="/lich-cua-toi" element={<ProtectedRoute requiredRole={['doctor', 'staff']}><MySchedulePage /></ProtectedRoute>} />

            {/* ========== 9. ADMIN ========== */}
            <Route path="/quan-ly-nguoi-dung" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
            <Route path="/quan-ly-nhan-vien" element={<ProtectedRoute requiredRole="admin"><StaffManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-chuyen-khoa" element={<ProtectedRoute requiredRole="admin"><SpecialtyManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-danh-muc" element={<ProtectedRoute requiredRole="admin"><CategoryManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-bai-viet" element={<ProtectedRoute requiredRole={['admin', 'staff', 'doctor']}><ArticleManagementPage /></ProtectedRoute>} />
            <Route path="/phe-duyet-bai-viet/:id" element={<ProtectedRoute requiredRole={['admin', 'staff', 'doctor']}><ArticleReviewPage /></ProtectedRoute>} />
            <Route path="/quan-ly-he-thong" element={<ProtectedRoute requiredRole="admin"><SystemSettingsPage /></ProtectedRoute>} />
            <Route path="/quan-ly-danh-muc-dich-vu" element={<ProtectedRoute requiredRole="admin"><ServiceCategoryManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-dich-vu" element={<ProtectedRoute requiredRole="admin"><ServiceManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-lich-lam-viec" element={<ProtectedRoute requiredRole={['admin', 'staff']}><ScheduleManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-lich-hen" element={<ProtectedRoute requiredRole={['admin', 'staff']}><AppointmentManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-dien-dan" element={<ProtectedRoute requiredRole="admin"><ForumManagementPage /></ProtectedRoute>} />
            <Route path="/quan-ly-bao-cao" element={<ProtectedRoute requiredRole="admin"><ReportManagementPage /></ProtectedRoute>} />
            <Route path="/thong-ke" element={<ProtectedRoute requiredRole="admin"><StatisticsPage /></ProtectedRoute>} />
            <Route path="/admin/tu-van" element={<ProtectedRoute requiredRole="admin"><DoctorConsultationManagementPage isAdminView={true} /></ProtectedRoute>} />
            <Route path="/admin/tu-van/realtime" element={<ProtectedRoute requiredRole="admin"><ConsultationRealtimeManagementPage /></ProtectedRoute>} />
            <Route path="/admin/tu-van/cau-hinh" element={<ProtectedRoute requiredRole="admin"><ConsultationSystemManagementPage /></ProtectedRoute>} />
            {/* THÊM: Route cho Quản lý gói dịch vụ */}
            <Route path="/admin/tu-van/packages" element={<ProtectedRoute requiredRole="admin"><ConsultationPackageManagementPage /></ProtectedRoute>} />
            <Route path="/tu-van/chatbot" element={<ProtectedRoute requiredRole={['patient', 'doctor', 'admin']}><ConsultationSystemManagementPage /></ProtectedRoute>} />

            {/* ========== 404 - NOT FOUND ========== */}
            <Route path="/404" element={<div style={{ textAlign: 'center', padding: '50px' }}><h1>404 - Không tìm thấy trang</h1><p>Trang bạn đang tìm kiếm không tồn tại</p><a href="/">Về trang chủ</a></div>} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </MainLayout>
        
        {/* Toast Container - Hiển thị thông báo góc dưới bên phải */}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </Router>
  );
}

export default App;
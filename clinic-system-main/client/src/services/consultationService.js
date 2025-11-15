// client/src/services/consultationService.js
// ✅ CẬP NHẬT: Thêm methods cho Admin Realtime Management

import api from './api';

const consultationService = {
  
  // ==================== PATIENT APIs ====================
  
  createConsultation: async (data) => {
    return await api.post('/consultations', data);
  },
  
  getMyConsultations: async (params = {}) => {
    return await api.get('/consultations/my-consultations', { params });
  },
  
  rateConsultation: async (id, data) => {
    // SỬA: Gọi hàm mới submitConsultationFeedback
    return await consultationService.submitConsultationFeedback({
      consultation_id: id,
      rating: data.rating,
      review: data.review
    });
  },

  // THÊM MỚI: Hàm gọi API lưu vào bảng Feedback
  submitConsultationFeedback: async (data) => {
    // data = { consultation_id, rating, review }
    return await api.post('/consultations/feedback', data);
  },


  
  getPatientStats: async () => {
    return await api.get('/consultations/patient/stats');
  },
  
  // ==================== DOCTOR APIs ====================
  
  getDoctorConsultations: async (params = {}) => {
    return await api.get('/consultations/doctor/my-consultations', { params });
  },
  
  confirmConsultation: async (id) => {
    return await api.put(`/consultations/${id}/confirm`);
  },
  
  completeConsultation: async (id, data) => {
    return await api.put(`/consultations/${id}/complete`, data);
  },
  
  getDoctorStats: async () => {
    return await api.get('/consultations/doctor/stats');
  },
  
  getDoctorRevenue: async (params = {}) => {
    return await api.get('/consultations/doctor/revenue', { params });
  },
  
  // ==================== COMMON APIs ====================
  
  getConsultationById: async (id) => {
    return await api.get(`/consultations/${id}`);
  },
  
  startConsultation: async (id) => {
    return await api.put(`/consultations/${id}/start`);
  },
  
  cancelConsultation: async (id, data) => {
    return await api.put(`/consultations/${id}/cancel`, data);
  },

  // === THÊM MỚI API VERIFY OTP ===
  verifyChatOTP: async (consultationId, data) => {
    return await api.post(`/chat/${consultationId}/verify-otp`, data);
  },
  
  // ✅ THÊM API BÁO CÁO VẤN ĐỀ
  reportIssue: async (consultationId, data) => {
    return await api.post(`/consultations/${consultationId}/report`, data);
  },

  // === THÊM MỚI API GỬI LẠI OTP ===
  resendChatOTP: async (consultationId) => {
    return await api.post(`/consultations/${consultationId}/resend-otp`);
  },


  getPendingIncidents: async () => {
    return await api.get('/consultations/admin/realtime/incidents');
  },

  resolveIncident: async (reportId, data) => {
    return await api.put(`/consultations/admin/realtime/incidents/${reportId}/resolve`, data);
  },

  // ==================== ADMIN APIs (OLD) ====================
  
  getAllConsultations: async (params = {}) => {
    return await api.get('/consultations/admin/all', { params });
  },
  
  processRefund: async (id, data) => {
    return await api.put(`/consultations/${id}/refund`, data);
  },
  
  getSystemStats: async () => {
    return await api.get('/consultations/admin/stats');
  },
  
  updateDoctorPricing: async (doctorId, data) => {
    return await api.put(`/consultations/pricing/${doctorId}`, data);
  },
  
  // ==================== ✅ ADMIN REALTIME MANAGEMENT APIs ====================
  
  /**
   * 1. DANH SÁCH TƯ VẤN REALTIME
   */
  getAllConsultationsRealtime: async (params = {}) => {
    return await api.get('/consultations/admin/realtime/all', { params });
  },
  
  /**
   * 2. GIÁM SÁT PHIÊN REALTIME
   */
  getActiveConsultations: async () => {
    return await api.get('/consultations/admin/realtime/active');
  },
  
  getConsultationMessages: async (consultationId, params = {}) => {
    return await api.get(`/consultations/admin/realtime/${consultationId}/messages`, { params });
  },
  
  sendSystemMessage: async (consultationId, data) => {
    return await api.post(`/consultations/admin/realtime/${consultationId}/system-message`, data);
  },
  
  forceEndConsultation: async (consultationId, data) => {
    return await api.put(`/consultations/admin/realtime/${consultationId}/force-end`, data);
  },

  adminApproveConsultation: async (consultationId) => {
    return await api.put(`/consultations/admin/realtime/${consultationId}/approve`);
  },
  
  adminRejectConsultation: async (consultationId, data) => {
    return await api.put(`/consultations/admin/realtime/${consultationId}/reject`, data);
  },

  adminCancelConfirmedConsultation: async (consultationId, data) => {
    return await api.put(`/consultations/admin/realtime/${consultationId}/cancel-confirmed`, data);
  },
  
  /**
   * 3. QUẢN LÝ GÓI DỊCH VỤ
   */
  getAllPackages: async (params = {}) => {
    return await api.get('/consultations/admin/packages', { params });
  },

  createPackage: async (data) => {
    return await api.post('/consultations/admin/packages', data);
  },

  updatePackage: async (id, data) => {
    return await api.put(`/consultations/admin/packages/${id}`, data);
  },


  deletePackage: async (id) => {
    return await api.delete(`/consultations/admin/packages/${id}`);
  },

  updateDoctorPackage: async (doctorId, data) => {
    return await api.put(`/consultations/admin/packages/${doctorId}`, data);
  },
  
  /**
   * 4. QUẢN LÝ HOÀN TIỀN
   */
  getRefundList: async (params = {}) => {
    return await api.get('/consultations/admin/refunds', { params });
  },
  
  processRefundAdmin: async (consultationId, data) => {
    return await api.post(`/consultations/admin/refunds/${consultationId}/process`, data);
  },
  
  /**
   * 5. QUẢN LÝ PHẢN HỒI & ĐÁNH GIÁ
   */
  getAllFeedbacks: async (params = {}) => {
    return await api.get('/consultations/admin/feedbacks', { params });
  },
  
  
  /**
   * 6. BÁO CÁO & THỐNG KÊ
   */
  getSystemStatisticsOverview: async (params = {}) => {
    return await api.get('/consultations/admin/statistics/overview', { params });
  },
  
  getDoctorStatistics: async (params = {}) => {
    return await api.get('/consultations/admin/statistics/by-doctor', { params });
  },
  
  getPatientStatistics: async (params = {}) => {
    return await api.get('/consultations/admin/statistics/by-patient', { params });
  },
  
  getAdminRealtimeStatisticsOverview: async (params = {}) => {
    return await api.get('/consultations/admin/statistics/overview', { params });
  },
  
  /**
   * 7. EXPORT
   */
  exportConsultations: async (params = {}) => {
    return await api.get('/consultations/admin/export', { params });
  },
  
  // ==================== PRICING APIs ====================
  
  getDoctorPricing: async (doctorId) => {
    return await api.get(`/consultations/pricing/${doctorId}`);
  },
  
  getAvailableDoctors: async (params = {}) => {
    return await api.get('/consultations/chon-bac-si', { params });
  },

  getAvailableSlots: async (doctorId, date, consultationPricingId) => {
      return await api.get('/consultations/available-slots', {
        params: {
          doctor_id: doctorId,
          date: date,
          consultation_pricing_id: consultationPricingId
        }
      });
    },
  
  calculateFee: async (data) => {
    return await api.post('/consultations/calculate-fee', data);
  },
  
  // ==================== HELPER METHODS ====================
  
  formatStatus: (consultation) => {
    // SỬA: Nhận cả object 'consultation'
    const status = consultation.status;
    
    const statusMap = {
      'pending': { text: 'Chờ xác nhận', color: 'warning', icon: '⏳' },
      'confirmed': { text: 'Đã xác nhận', color: 'info', icon: '✅' },
      'in_progress': { text: 'Đang diễn ra', color: 'success', icon: '💬' },
      'completed': { text: 'Hoàn thành', color: 'success', icon: '✔️' },
      'cancelled': { text: 'Đã hủy', color: 'danger', icon: '❌' },
      'rejected': { text: 'Bị từ chối', color: 'danger', icon: '🚫' }
    };
    
    const statusInfo = statusMap[status] || { text: status, color: 'secondary', icon: '❓' };

    // SỬA: Chuyển logic động từ Doctor page vào đây
    if (status === 'confirmed') {
      const now = new Date();
      const appointmentTime = new Date(consultation.appointment_time);
      const diffMinutes = (appointmentTime - now) / 60000;

      // Đã tới giờ (trong khoảng 10 phút sau giờ hẹn)
      if (diffMinutes <= 0 && diffMinutes > -10) {
        return { text: 'Đã tới giờ', color: 'success', icon: '⏰' };
      }
      // Sắp tới (trong khoảng 15 phút trước giờ hẹn)
      if (diffMinutes > 0 && diffMinutes <= 15) {
        return { text: 'Sắp tới', color: 'info', icon: '⏳' };
      }
    }
    
    return statusInfo; // Trả về trạng thái mặc định
  },
  
  formatConsultationType: (type) => {
    const typeMap = {
      'chat': { text: 'Chat', color: 'primary', icon: '💬' },
      'video': { text: 'Video Call', color: 'info', icon: '📹' },
      'offline': { text: 'Tại bệnh viện', color: 'secondary', icon: '🏥' }
    };
    return typeMap[type] || { text: type, color: 'secondary', icon: '❓' };
  },
  
  formatDateTime: (datetime) => {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  formatCurrency: (amount) => {
    if (!amount) return '0₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  },
  
  canStartConsultation: (appointmentTime) => {
    const now = new Date();
    const appointmentDate = new Date(appointmentTime);
    const diffMinutes = (now - appointmentDate) / 60000;
    return diffMinutes >= -15 && diffMinutes <= 10;
  },
  
  canCancel: (status) => {
    return ['pending', 'confirmed'].includes(status);
  },
  
  calculateRefundPercent: (appointmentTime, role) => {
    if (role === 'doctor') return 100;
    
    const now = new Date();
    const appointmentDate = new Date(appointmentTime);
    const hoursBeforeAppointment = (appointmentDate - now) / 3600000;
    
    if (hoursBeforeAppointment >= 24) return 100;
    if (hoursBeforeAppointment >= 6) return 50;
    return 0;
  },


/**
   * ✅ MỚI: Tạo báo cáo sự cố cho consultation
   * POST /api/consultations/:id/report
   */
  createConsultationReport: (consultationId, data) => {
    return api.post(`/consultations/${consultationId}/report`, data);
  },

  /**
   * ✅ MỚI: Gửi lại OTP cho phòng chat
   * POST /api/consultations/:id/resend-otp
   */
  resendChatOTP: (consultationId) => {
    return api.post(`/consultations/${consultationId}/resend-otp`);
  },

  // THÊM MỚI: API xác thực OTP cho Video
  verifyVideoOtp: async (id, otp) => {
    return await api.post(`/consultations/${id}/verify-video-otp`, { otp });
  },

  // THÊM MỚI: API gửi lại OTP cho Video
  resendVideoOtp: async (id) => {
    return await api.post(`/consultations/${id}/resend-video-otp`);
  },

};

export default consultationService;
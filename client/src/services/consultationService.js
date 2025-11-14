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
    return await api.put(`/consultations/${id}/rate`, data);
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
  
  /**
   * 3. QUẢN LÝ GÓI DỊCH VỤ
   */
  getAllPackages: async (params = {}) => {
    return await api.get('/consultations/admin/packages', { params });
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
  
  toggleFeedbackStatus: async (feedbackId, data) => {
    return await api.put(`/consultations/admin/feedbacks/${feedbackId}/toggle-status`, data);
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
  
  getAdminRealtimeStatisticsOverview: async () => {
    return await api.get('/consultations/admin/statistics/overview');
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
  
  calculateFee: async (data) => {
    return await api.post('/consultations/calculate-fee', data);
  },
  
  // ==================== HELPER METHODS ====================
  
  formatStatus: (status) => {
    const statusMap = {
      'pending': { text: 'Chờ xác nhận', color: 'warning', icon: '⏳' },
      'confirmed': { text: 'Đã xác nhận', color: 'info', icon: '✅' },
      'in_progress': { text: 'Đang diễn ra', color: 'success', icon: '💬' },
      'completed': { text: 'Hoàn thành', color: 'success', icon: '✔️' },
      'cancelled': { text: 'Đã hủy', color: 'danger', icon: '❌' },
      'rejected': { text: 'Bị từ chối', color: 'danger', icon: '🚫' }
    };
    return statusMap[status] || { text: status, color: 'secondary', icon: '❓' };
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
  }
};

export default consultationService;
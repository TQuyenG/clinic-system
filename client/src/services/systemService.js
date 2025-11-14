// client/src/services/systemService.js
// Service xử lý API calls cho quản lý hệ thống tư vấn

import api from './api';

const systemService = {
  
  // ==================== CONSULTATION SETTINGS APIs ====================
  
  /**
   * Lấy cấu hình hệ thống tư vấn
   * GET /api/settings/consultation
   */
  getConsultationSettings: async () => {
    try {
      const response = await api.get('/settings/consultation');
      return response.data;
    } catch (error) {
      console.error('Error getting consultation settings:', error);
      throw error;
    }
  },
  
  /**
   * Cập nhật cấu hình hệ thống tư vấn
   * PUT /api/settings/consultation
   */
  updateConsultationSettings: async (data) => {
    try {
      const response = await api.put('/settings/consultation', data);
      return response.data;
    } catch (error) {
      console.error('Error updating consultation settings:', error);
      throw error;
    }
  },
  
  /**
   * Upload ảnh banner
   * POST /api/settings/consultation/upload-banner
   */
  uploadBannerImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post('/settings/consultation/upload-banner', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading banner:', error);
      throw error;
    }
  },
  
  // ==================== SERVICE PACKAGE APIs ====================
  
  /**
   * Lấy danh sách gói dịch vụ
   * GET /api/consultations/packages
   */
  getServicePackages: async (params = {}) => {
    try {
      const response = await api.get('/consultations/packages', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting packages:', error);
      throw error;
    }
  },
  
  /**
   * Tạo gói dịch vụ mới
   * POST /api/consultations/packages
   */
  createServicePackage: async (data) => {
    try {
      const response = await api.post('/consultations/packages', data);
      return response.data;
    } catch (error) {
      console.error('Error creating package:', error);
      throw error;
    }
  },
  
  /**
   * Cập nhật gói dịch vụ
   * PUT /api/consultations/packages/:id
   */
  updateServicePackage: async (id, data) => {
    try {
      const response = await api.put(`/consultations/packages/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating package:', error);
      throw error;
    }
  },
  
  /**
   * Xóa gói dịch vụ
   * DELETE /api/consultations/packages/:id
   */
  deleteServicePackage: async (id) => {
    try {
      const response = await api.delete(`/consultations/packages/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting package:', error);
      throw error;
    }
  },
  
  // ==================== REAL-TIME MONITORING APIs ====================
  
  /**
   * Lấy danh sách phòng chat đang hoạt động
   * GET /api/consultations/active-rooms
   */
  getActiveRooms: async () => {
    try {
      const response = await api.get('/consultations/active-rooms');
      return response.data;
    } catch (error) {
      console.error('Error getting active rooms:', error);
      throw error;
    }
  },
  
  /**
   * Giám sát một phòng chat cụ thể
   * GET /api/consultations/:id/monitor
   */
  monitorRoom: async (consultationId) => {
    try {
      const response = await api.get(`/consultations/${consultationId}/monitor`);
      return response.data;
    } catch (error) {
      console.error('Error monitoring room:', error);
      throw error;
    }
  },
  
  /**
   * Cảnh báo bác sĩ vắng mặt
   * POST /api/consultations/:id/alert-doctor
   */
  alertDoctor: async (consultationId) => {
    try {
      const response = await api.post(`/consultations/${consultationId}/alert-doctor`);
      return response.data;
    } catch (error) {
      console.error('Error alerting doctor:', error);
      throw error;
    }
  },
  
  /**
   * Tự động hủy tư vấn (khi bác sĩ vắng quá 10 phút)
   * POST /api/consultations/:id/auto-cancel
   */
  autoCancelConsultation: async (consultationId, reason) => {
    try {
      const response = await api.post(`/consultations/${consultationId}/auto-cancel`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error auto-canceling:', error);
      throw error;
    }
  },
  
  // ==================== REFUND MANAGEMENT APIs ====================
  
  /**
   * Lấy danh sách yêu cầu hoàn tiền
   * GET /api/consultations/refunds
   */
  getRefundRequests: async (params = {}) => {
    try {
      const response = await api.get('/consultations/refunds', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting refund requests:', error);
      throw error;
    }
  },
  
  /**
   * Xử lý hoàn tiền
   * POST /api/consultations/:id/process-refund
   */
  processRefund: async (consultationId, data) => {
    try {
      const response = await api.post(`/consultations/${consultationId}/process-refund`, data);
      return response.data;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  },
  
  /**
   * Lấy lịch sử hoàn tiền
   * GET /api/consultations/refund-history
   */
  getRefundHistory: async (params = {}) => {
    try {
      const response = await api.get('/consultations/refund-history', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting refund history:', error);
      throw error;
    }
  },
  
  /**
   * Tính toán số tiền hoàn lại
   * POST /api/consultations/calculate-refund
   */
  calculateRefund: async (data) => {
    try {
      const response = await api.post('/consultations/calculate-refund', data);
      return response.data;
    } catch (error) {
      console.error('Error calculating refund:', error);
      throw error;
    }
  },
  
  // ==================== REPORTS & STATISTICS APIs ====================
  
  /**
   * Báo cáo doanh thu theo ngày/tháng
   * GET /api/consultations/reports/revenue
   */
  getRevenueReport: async (params = {}) => {
    try {
      const response = await api.get('/consultations/reports/revenue', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting revenue report:', error);
      throw error;
    }
  },
  
  /**
   * Thống kê theo chuyên khoa
   * GET /api/consultations/reports/by-specialty
   */
  getStatsBySpecialty: async (params = {}) => {
    try {
      const response = await api.get('/consultations/reports/by-specialty', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting stats by specialty:', error);
      throw error;
    }
  },
  
  /**
   * Thống kê theo bác sĩ
   * GET /api/consultations/reports/by-doctor
   */
  getStatsByDoctor: async (params = {}) => {
    try {
      const response = await api.get('/consultations/reports/by-doctor', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting stats by doctor:', error);
      throw error;
    }
  },
  
  /**
   * Top bác sĩ được đánh giá cao
   * GET /api/consultations/reports/top-doctors
   */
  getTopDoctors: async (params = {}) => {
    try {
      const response = await api.get('/consultations/reports/top-doctors', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting top doctors:', error);
      throw error;
    }
  },
  
  /**
   * Tỷ lệ hoàn tiền
   * GET /api/consultations/reports/refund-rate
   */
  getRefundRate: async (params = {}) => {
    try {
      const response = await api.get('/consultations/reports/refund-rate', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting refund rate:', error);
      throw error;
    }
  },
  
  /**
   * Lấy log hoạt động
   * GET /api/consultations/activity-logs
   */
  getActivityLogs: async (params = {}) => {
    try {
      const response = await api.get('/consultations/activity-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw error;
    }
  },
  
  /**
   * Dashboard overview
   * GET /api/consultations/dashboard
   */
  getDashboardData: async (params = {}) => {
    try {
      const response = await api.get('/consultations/dashboard', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  },
  
  // ==================== DOCTOR PRICING APIs ====================
  
  /**
   * Lấy danh sách bảng giá của tất cả bác sĩ
   * GET /api/consultations/pricing/all
   */
  getAllDoctorsPricing: async (params = {}) => {
    try {
      const response = await api.get('/consultations/pricing/all', { params });
      return response.data;
    } catch (error) {
      console.error('Error getting all doctors pricing:', error);
      throw error;
    }
  },
  
  /**
   * Cập nhật bảng giá của bác sĩ (Admin)
   * PUT /api/consultations/pricing/:doctorId/admin-update
   */
  updateDoctorPricingAdmin: async (doctorId, data) => {
    try {
      const response = await api.put(`/consultations/pricing/${doctorId}/admin-update`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating doctor pricing (admin):', error);
      throw error;
    }
  },
  
  /**
   * Phê duyệt thay đổi bảng giá
   * PUT /api/consultations/pricing/:doctorId/approve
   */
  approvePricingChange: async (doctorId) => {
    try {
      const response = await api.put(`/consultations/pricing/${doctorId}/approve`);
      return response.data;
    } catch (error) {
      console.error('Error approving pricing change:', error);
      throw error;
    }
  },
  
  // ==================== HELPER FUNCTIONS ====================
  
  /**
   * Format số tiền VNĐ
   */
  formatCurrency: (amount) => {
    if (!amount) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  },
  
  /**
   * Format phần trăm
   */
  formatPercent: (value) => {
    return `${parseFloat(value || 0).toFixed(1)}%`;
  },
  
  /**
   * Tính tỷ lệ phần trăm
   */
  calculatePercentage: (part, total) => {
    if (!total || total === 0) return 0;
    return ((part / total) * 100).toFixed(1);
  },
  
  /**
   * Format trạng thái refund
   */
  formatRefundStatus: (status) => {
    const statusMap = {
      'pending': { text: 'Chờ xử lý', color: 'warning', icon: '⏳' },
      'processing': { text: 'Đang xử lý', color: 'info', icon: '🔄' },
      'completed': { text: 'Đã hoàn tiền', color: 'success', icon: '✅' },
      'failed': { text: 'Thất bại', color: 'danger', icon: '❌' },
      'rejected': { text: 'Từ chối', color: 'danger', icon: '🚫' }
    };
    return statusMap[status] || { text: status, color: 'secondary', icon: '❓' };
  },
  
  /**
   * Lấy màu cho chart theo index
   */
  getChartColor: (index) => {
    const colors = [
      '#667eea',
      '#4facfe',
      '#43e97b',
      '#fa709a',
      '#fee140',
      '#30cfd0',
      '#a8edea',
      '#fed6e3'
    ];
    return colors[index % colors.length];
  },
  
  /**
   * Export dữ liệu ra CSV
   */
  exportToCSV: (data, filename) => {
    if (!data || data.length === 0) {
      alert('Không có dữ liệu để export');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  /**
   * Format date range cho API
   */
  formatDateRange: (startDate, endDate) => {
    return {
      start_date: startDate ? new Date(startDate).toISOString().split('T')[0] : null,
      end_date: endDate ? new Date(endDate).toISOString().split('T')[0] : null
    };
  },
  
  /**
   * Get date presets (hôm nay, tuần này, tháng này...)
   */
  getDatePresets: () => {
    const today = new Date();
    const presets = {
      today: {
        label: 'Hôm nay',
        start: new Date(today.setHours(0, 0, 0, 0)),
        end: new Date(today.setHours(23, 59, 59, 999))
      },
      yesterday: {
        label: 'Hôm qua',
        start: new Date(today.setDate(today.getDate() - 1)),
        end: new Date(today.setHours(23, 59, 59, 999))
      },
      thisWeek: {
        label: 'Tuần này',
        start: new Date(today.setDate(today.getDate() - today.getDay())),
        end: new Date()
      },
      thisMonth: {
        label: 'Tháng này',
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date()
      },
      lastMonth: {
        label: 'Tháng trước',
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 0)
      },
      last7Days: {
        label: '7 ngày qua',
        start: new Date(today.setDate(today.getDate() - 7)),
        end: new Date()
      },
      last30Days: {
        label: '30 ngày qua',
        start: new Date(today.setDate(today.getDate() - 30)),
        end: new Date()
      }
    };
    return presets;
  }
};

export default systemService;
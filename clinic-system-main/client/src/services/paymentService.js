// client/src/services/paymentService.js - HOÀN CHỈNH
import api from './api';

const paymentService = {
  /**
   * Tạo thanh toán mới
   */
  createPayment: (data) => {
    return api.post('/payments', data);
  },

  /**
   * Lấy thanh toán của lịch hẹn
   */
  getPaymentByAppointment: (appointmentId) => {
    return api.get(`/payments/appointment/${appointmentId}`);
  },

  /**
   * Lấy danh sách thanh toán của tôi
   */
  getMyPayments: () => {
    return api.get('/payments/my-payments');
  },

  /**
   * Admin/Staff: Lấy tất cả thanh toán
   */
  getAllPayments: (params = {}) => {
    return api.get('/payments/all', { params });
  },

  /**
   * Admin/Staff: Xác nhận thanh toán
   */
  confirmPayment: (id, transactionId) => {
    return api.put(`/payments/${id}/confirm`, { transaction_id: transactionId });
  },

  /**
   * Admin/Staff: Từ chối thanh toán
   */
  rejectPayment: (id, reason) => {
    return api.put(`/payments/${id}/reject`, { reason });
  }
};

export default paymentService;
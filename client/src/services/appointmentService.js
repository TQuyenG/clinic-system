// client/src/services/appointmentService.js
import axios from 'axios'; // THÊM DÒNG NÀY
import api from './api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'; // THÊM DÒNG NÀY

const appointmentService = {
  /**
   * Tạo lịch hẹn mới
   */
  createAppointment: (data) => {
    return api.post('/appointments', data);
  },

  /**
   * Lấy danh sách lịch hẹn của người dùng hiện tại
   */
  getMyAppointments: (params = {}) => {
    return api.get('/appointments/my-appointments', { params });
  },

  /**
   * SỬA: Đổi tên hàm để khớp với AppointmentDetailPage.js
   * Lấy chi tiết một lịch hẹn bằng CODE
   * Backend: exports.getAppointmentById
   */
  getAppointmentByCode: (code) => {
    // 'code' sẽ được truyền vào làm 'id' trong URL
    return api.get(`/appointments/${code}`);
  },

  /**
   * Cập nhật lịch hẹn (Hàm này có thể không được dùng, nhưng giữ lại)
   */
  updateAppointment: (id, data) => {
    return api.put(`/appointments/${id}`, data);
  },

  /**
   * Hủy lịch hẹn
   * Backend: exports.cancelAppointment
   */
  cancelAppointment: (code, reason) => {
    return api.put(`/appointments/${code}/cancel`, { reason });
  },

  /**
   * Lấy lịch trống của bác sĩ theo ngày
   */
  getAvailableSlots: (doctorId, date) => {
    return api.get('/appointments/available-slots', {
      params: { doctor_id: doctorId, date }
    });
  },

  /**
   * Admin/Staff: Lấy tất cả lịch hẹn
   */
  getAllAppointments: (params = {}) => {
    return api.get('/appointments/admin/all', { params });
  },

  /**
   * Admin/Staff: Xác nhận lịch hẹn
   */
  confirmAppointment: (id) => {
    return api.put(`/appointments/${id}/confirm`);
  },

  /**
   * Admin/Staff: Hoàn thành lịch hẹn (Logic cũ, có thể không dùng)
   */
  completeAppointment: (id) => {
    return api.put(`/appointments/${id}/complete`);
  },

  /**
   * Doctor: Lấy lịch hẹn của bác sĩ
   */
  getDoctorAppointments: (params = {}) => {
    return api.get('/appointments/doctor/my-appointments', { params });
  },

  // --- CÁC HÀM BỔ SUNG CHO AppointmentDetailPage.js ---

  /**
   * THÊM: Đổi lịch hẹn (cho AppointmentDetailPage)
   * Backend: exports.rescheduleAppointment
   */
  rescheduleAppointment: (code, payload) => {
    // payload = { new_date, new_start_time, ... }
    return api.put(`/appointments/${code}/reschedule`, payload);
  },

  /**
   * THÊM: Cập nhật chi tiết (Admin/BS) (cho AppointmentDetailPage)
   * Backend: exports.updateAppointmentDetails
   */
  updateAppointmentDetails: (code, payload) => {
    // payload = { status, appointment_address, ... }
    return api.put(`/appointments/${code}/details`, payload);
  },

  /**
   * Khôi phục mã lịch hẹn (Public)
   */
  recoverAppointmentCodes: (contact, date) => {
    // API này là public, không dùng 'api' (instance có token)
    return axios.post(`${API_URL}/appointments/recover-codes`, { contact, date });
  }
};

export default appointmentService;
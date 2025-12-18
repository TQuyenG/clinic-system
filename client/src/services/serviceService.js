// client/src/services/serviceService.js
import api from './api'; // axios instance

const serviceService = {
  // LẤY DANH SÁCH DỊCH VỤ (ADMIN)
  getAdminServices: (params = {}) => api.get('/services/admin/all', { params }),

  // LẤY CHI TIẾT 1 DỊCH VỤ (ADMIN + PUBLIC)
  getServiceById: (id) => api.get(`/services/${id}`),

  // TẠO MỚI
  createService: (data) => api.post('/services', data),

  // CẬP NHẬT
  updateService: (id, data) => api.put(`/services/${id}`, data),

  // XÓA
  deleteService: (id) => api.delete(`/services/${id}`),

  // LẤY DANH SÁCH DỊCH VỤ (PUBLIC)
  getPublicServices: (params = {}) => api.get('/services', { params }),
};

export default serviceService;
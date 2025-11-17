// client/src/services/userService.js - COMPLETE VERSION
import api from './api';

const userService = {
  // ========== AUTH ==========
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
  verifyEmail: (token) => api.get(`/users/verify-email?token=${token}`),
  forgotPassword: (email) => api.post('/users/forgot-password', { email }),
  verifyOTP: (data) => api.post('/users/verify-otp', data),
  resetPassword: (data) => api.post('/users/reset-password', data),

  // ========== PROFILE ==========
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),

  // ========== DOCTORS PUBLIC ==========
  getDoctors: (params = {}) => api.get('/users/doctors', { params }),
  getAllDoctorsPublic: (params = {}) => api.get('/users/doctors/public', { params }),
  getDoctorById: (userId) => api.get(`/users/doctors/${userId}`),
  getDoctorByCode: (code) => api.get(`/users/doctors/code/${code}`),

  // ========== ADMIN ROUTES ==========
  getAllUsers: () => api.get('/users/all'),
  getUserStats: () => api.get('/users/stats'),
  searchUsers: (params) => api.get('/users/search', { params }),
  getUserById: (userId) => api.get(`/users/${userId}`),
  updateUser: (userId, data) => api.put(`/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
  toggleUserStatus: (userId, data) => api.put(`/users/${userId}/toggle-status`, data),
  resetPasswordByAdmin: (userId, data) => api.put(`/users/${userId}/reset-password-admin`, data),

  // ✅ ========== GET USERS BY ROLE (MỚI THÊM) ========== ✅
  getUsersByRole: (role, params = {}) => {
    return api.get('/users/by-role', {
      params: {
        role: role, // 'doctor', 'staff', hoặc 'doctor,staff'
        ...params
      }
    });
  }, // ⬅️ THÊM DẤU PHẨY NÀY!

  // ✅ ========== SPECIALTIES (THÊM MỚI) ========== ✅
  getAllSpecialties: () => api.get('/specialties'),
  getSpecialtyById: (id) => api.get(`/specialties/${id}`),
  getDoctorsBySpecialty: (specialtyId) => api.get(`/specialties/${specialtyId}/doctors`)
};

export default userService;
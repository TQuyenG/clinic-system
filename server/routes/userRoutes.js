// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ============================================
// ROUTES CÔNG KHAI - Không cần đăng nhập
// ============================================

// Đăng ký, đăng nhập, xác thực email
router.post('/register', userController.register);
router.get('/verify-email', userController.verifyEmail);
router.post('/login', userController.login);

// Quên mật khẩu, đặt lại mật khẩu qua OTP
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-otp', userController.verifyOTP);
router.post('/reset-password', userController.resetPassword);

// Routes công khai cho bác sĩ
// LƯU Ý: Phải đặt TRƯỚC các routes động /:userId
router.get('/doctors/public', userController.getAllDoctorsPublic);
router.get('/doctors/:code', userController.getDoctorByCode);
router.get('/doctors', userController.getDoctors);

// ============================================
// ROUTES CẦN ĐĂNG NHẬP - Authenticated users
// ============================================

// Quản lý profile của chính mình
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.put('/change-password', authenticateToken, userController.changePassword);

// Lấy thông tin role của chính mình (bao gồm code và specialty cho doctor)
router.get('/my-role-info', authenticateToken, userController.getMyRoleInfo);

// ============================================
// ROUTES DÀNH CHO ADMIN - Admin only
// ============================================

// Thống kê và tìm kiếm
router.get('/stats', authenticateToken, authorize('admin'), userController.getUserStats);
router.get('/search', authenticateToken, authorize('admin'), userController.searchUsers);
router.get('/all', authenticateToken, authorize('admin'), userController.getAllUsers);

// Quản lý user cụ thể
// LƯU Ý: Các routes có pattern cụ thể phải đặt TRƯỚC routes động /:userId
router.put('/:userId/reset-password-admin', 
  authenticateToken, 
  authorize('admin'), 
  userController.resetPasswordByAdmin
);

router.put('/:userId/toggle-verification', 
  authenticateToken, 
  authorize('admin'), 
  userController.toggleUserVerification
);

router.put('/:userId/toggle-status', 
  authenticateToken, 
  authorize('admin'), 
  userController.toggleUserStatus
);

// Routes động với /:userId - PHẢI ĐẶT CUỐI CÙNG
router.get('/:userId', authenticateToken, authorize('admin'), userController.getUserById);
router.put('/:userId', authenticateToken, authorize('admin'), userController.updateUser);
router.delete('/:userId', authenticateToken, authorize('admin'), userController.deleteUser);

// ============================================
// Debug log - Hiển thị các routes đã đăng ký
// ============================================
console.log('\n========== USER ROUTES REGISTERED ==========');
console.log('PUBLIC ROUTES:');
console.log('  POST   /api/users/register');
console.log('  GET    /api/users/verify-email');
console.log('  POST   /api/users/login');
console.log('  POST   /api/users/forgot-password');
console.log('  POST   /api/users/verify-otp');
console.log('  POST   /api/users/reset-password');
console.log('  GET    /api/users/doctors');
console.log('  GET    /api/users/doctors/public');
console.log('  GET    /api/users/doctors/:code');
console.log('\nAUTHENTICATED ROUTES:');
console.log('  GET    /api/users/profile');
console.log('  PUT    /api/users/profile');
console.log('  PUT    /api/users/change-password');
console.log('  GET    /api/users/my-role-info');
console.log('\nADMIN ROUTES:');
console.log('  GET    /api/users/stats');
console.log('  GET    /api/users/search');
console.log('  GET    /api/users/all');
console.log('  PUT    /api/users/:userId/reset-password-admin');
console.log('  PUT    /api/users/:userId/toggle-verification');
console.log('  PUT    /api/users/:userId/toggle-status');
console.log('  GET    /api/users/:userId');
console.log('  PUT    /api/users/:userId');
console.log('  DELETE /api/users/:userId');
console.log('============================================\n');

module.exports = router;
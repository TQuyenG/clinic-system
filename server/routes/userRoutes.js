// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ============ ROUTES CÔNG KHAI ============
router.post('/register', userController.register);
router.get('/verify-email', userController.verifyEmail);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/verify-otp', userController.verifyOTP);
router.post('/reset-password', userController.resetPassword);

// ✅ QUAN TRỌNG: Routes với path cụ thể phải đặt TRƯỚC routes động
// Routes công khai cho bác sĩ - PHẢI ĐẶT TRƯỚC /:userId
router.get('/doctors/public', userController.getAllDoctorsPublic);
router.get('/doctors/:code', userController.getDoctorByCode); // Chi tiết bác sĩ theo code
router.get('/doctors', userController.getDoctors); // ✅ Danh sách bác sĩ - KHÔNG CẦN authenticate

// ============ ROUTES CẦN ĐĂNG NHẬP ============
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.put('/change-password', authenticateToken, userController.changePassword);

// ============ ROUTES DÀNH CHO ADMIN ============
router.get('/stats', authenticateToken, authorize('admin'), userController.getUserStats);
router.get('/search', authenticateToken, authorize('admin'), userController.searchUsers);
router.get('/all', authenticateToken, authorize('admin'), userController.getAllUsers);

// ⚠️ Routes có pattern cụ thể phải đặt TRƯỚC routes động /:userId
// Route đặt lại mật khẩu bởi Admin
router.put('/:userId/reset-password-admin', 
  authenticateToken, 
  authorize('admin'), 
  userController.resetPasswordByAdmin
);

// Route toggle verification
router.put('/:userId/toggle-verification', 
  authenticateToken, 
  authorize('admin'), 
  userController.toggleUserVerification
);

// Route toggle status
router.put('/:userId/toggle-status', 
  authenticateToken, 
  authorize('admin'), 
  userController.toggleUserStatus
);

// ⚠️ Routes động với /:userId phải đặt CUỐI CÙNG
router.get('/:userId', authenticateToken, authorize('admin'), userController.getUserById);
router.put('/:userId', authenticateToken, authorize('admin'), userController.updateUser);
router.delete('/:userId', authenticateToken, authorize('admin'), userController.deleteUser);

// Debug log
console.log('\n========== USER ROUTES REGISTERED ==========');
console.log('✓ GET  /api/users/doctors (PUBLIC)');
console.log('✓ GET  /api/users/doctors/public (PUBLIC)');
console.log('✓ GET  /api/users/doctors/:code (PUBLIC)');
console.log('✓ PUT  /api/users/:userId/toggle-verification (ADMIN)');
console.log('✓ PUT  /api/users/:userId/toggle-status (ADMIN)');
console.log('✓ PUT  /api/users/:userId/reset-password-admin (ADMIN)');
console.log('============================================\n');

module.exports = router;
// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ============ ROUTES CÔNG KHAI ============

// POST /api/users/register - Đăng ký tài khoản
router.post('/register', userController.register);

// GET /api/users/verify-email - Xác thực email qua link
router.get('/verify-email', userController.verifyEmail);

// POST /api/users/login - Đăng nhập
router.post('/login', userController.login);

// POST /api/users/forgot-password - Gửi OTP quên mật khẩu
router.post('/forgot-password', userController.forgotPassword);

// POST /api/users/verify-otp - Xác thực OTP
router.post('/verify-otp', userController.verifyOTP);

// POST /api/users/reset-password - Đặt lại mật khẩu với OTP
router.post('/reset-password', userController.resetPassword);

// ============ ROUTES CẦN ĐĂNG NHẬP ============

// GET /api/users/profile - Lấy thông tin profile hiện tại
router.get('/profile', authenticateToken, userController.getProfile);

// PUT /api/users/profile - Cập nhật profile hiện tại
router.put('/profile', authenticateToken, userController.updateProfile);

// PUT /api/users/change-password - Đổi mật khẩu (đã đăng nhập)
router.put('/change-password', authenticateToken, userController.changePassword);

// ============ ROUTES DÀNH CHO ADMIN ============

// GET /api/users/stats - Thống kê users
router.get('/stats', authenticateToken, authorize('admin'), userController.getUserStats);

// GET /api/users/search - Tìm kiếm và lọc users
router.get('/search', authenticateToken, authorize('admin'), userController.searchUsers);

// GET /api/users/all - Lấy tất cả users
router.get('/all', authenticateToken, authorize('admin'), userController.getAllUsers);

// GET /api/users/:userId - Lấy chi tiết 1 user
router.get('/:userId', authenticateToken, authorize('admin'), userController.getUserById);

// PUT /api/users/:userId - Cập nhật user (admin)
router.put('/:userId', authenticateToken, authorize('admin'), userController.updateUser);

// PUT /api/users/:userId/toggle-status - Khóa/mở khóa tài khoản
router.put('/:userId/toggle-status', authenticateToken, authorize('admin'), userController.toggleUserStatus);

// DELETE /api/users/:userId - Xóa user
router.delete('/:userId', authenticateToken, authorize('admin'), userController.deleteUser);

module.exports = router;
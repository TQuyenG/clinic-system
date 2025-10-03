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

// Routes công khai cho bác sĩ
router.get('/doctors', userController.getDoctors);
router.get('/doctors/:userId', userController.getDoctorById);

// ============ ROUTES CẦN ĐĂNG NHẬP ============
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.put('/change-password', authenticateToken, userController.changePassword);

// ============ ROUTES DÀNH CHO ADMIN ============
router.get('/stats', authenticateToken, authorize('admin'), userController.getUserStats);
router.get('/search', authenticateToken, authorize('admin'), userController.searchUsers);
router.get('/all', authenticateToken, authorize('admin'), userController.getAllUsers);

// Route /:userId phải đặt CUỐI CÙNG để tránh conflict
router.get('/:userId', authenticateToken, authorize('admin'), userController.getUserById);
router.put('/:userId', authenticateToken, authorize('admin'), userController.updateUser);
router.put('/:userId/toggle-status', authenticateToken, authorize('admin'), userController.toggleUserStatus);
router.delete('/:userId', authenticateToken, authorize('admin'), userController.deleteUser);

module.exports = router;
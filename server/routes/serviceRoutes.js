// server/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// =================================================================
// ⚠️ CRITICAL: ROUTE ORDER MATTERS!
// Specific routes MUST come before generic patterns
// =================================================================

// =================================================================
// ======================== ADMIN ROUTES ===========================
// =================================================================

/**
 * @route   GET /api/services/admin/all
 * @desc    Lấy tất cả dịch vụ cho admin
 * @access  Private (Admin)
 * ⚠️ MUST be FIRST - Most specific admin route
 */
router.get(
  '/admin/all',
  authenticateToken,
  authorize('admin'),
  serviceController.getServicesForAdmin
);

/**
 * @route   POST /api/services
 * @desc    Tạo dịch vụ mới
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticateToken,
  authorize('admin'),
  serviceController.createService
);

/**
 * @route   PUT /api/services/:id
 * @desc    Cập nhật dịch vụ
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticateToken,
  authorize('admin'),
  serviceController.updateService
);

/**
 * @route   DELETE /api/services/:id
 * @desc    Xóa dịch vụ
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticateToken,
  authorize('admin'),
  serviceController.deleteService
);

// =================================================================
// ======================= PUBLIC ROUTES ===========================
// =================================================================
// ⚠️ PUBLIC ROUTES ORDER: Specific → Generic

/**
 * @route   GET /api/services/:id/doctors
 * @desc    Lấy danh sách bác sĩ của dịch vụ
 * @access  Public
 * ⚠️ MUST be before GET /api/services/:id (more specific)
 */
router.get('/:id/doctors', serviceController.getServiceDoctors);

/**
 * @route   GET /api/services/:id
 * @desc    Lấy chi tiết dịch vụ công khai (bao gồm doctors)
 * @access  Public
 * ⚠️ MUST be before GET /api/services/ (specific before generic)
 */
router.get('/:id', serviceController.getServiceByIdPublic);

/**
 * @route   GET /api/services
 * @desc    Lấy danh sách dịch vụ công khai (với filter, search, pagination)
 * @access  Public
 * ⚠️ MUST be LAST - Most generic public route
 */
router.get('/', serviceController.getPublicServices);

module.exports = router;
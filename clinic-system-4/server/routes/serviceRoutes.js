// server/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

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
 * @access  Private (Admin or Staff with any SERVICE permission)
 * ⚠️ MUST be FIRST - Most specific admin route
 */
router.get(
  '/admin/all',
  authenticateToken,
  async (req, res, next) => {
    // Admin có toàn quyền
    if (req.user.role === 'admin') return next();
    
    // Staff phải có ít nhất 1 quyền về services
    if (req.user.role === 'staff') {
      const { models } = require('../config/db');
      const staffProfile = await models.Staff.findOne({ where: { user_id: req.user.id } });
      
      if (!staffProfile) {
        return res.status(403).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên.' });
      }
      
      const { department, permissions } = staffProfile;
      
      // Phải thuộc phòng system và có ít nhất 1 quyền về services
      if (department === 'system' && permissions && permissions.services && Array.isArray(permissions.services) && permissions.services.length > 0) {
        return next();
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền xem dịch vụ. Cần ít nhất 1 quyền về module Services.',
        yourDepartment: department,
        yourPermissions: permissions?.services
      });
    }
    
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập.' });
  },
  serviceController.getServicesForAdmin
);

/**
 * @route   POST /api/services
 * @desc    Tạo dịch vụ mới
 * @access  Private (Admin or Staff with SERVICE_CREATE permission)
 */
router.post(
  '/',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role === 'admin') return next();
    return roleMiddleware('SERVICE_CREATE')(req, res, next);
  },
  serviceController.createService
);

/**
 * @route   PUT /api/services/:id
 * @desc    Cập nhật dịch vụ
 * @access  Private (Admin or Staff with SERVICE_EDIT permission)
 */
router.put(
  '/:id',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role === 'admin') return next();
    return roleMiddleware('SERVICE_EDIT')(req, res, next);
  },
  serviceController.updateService
);

/**
 * @route   DELETE /api/services/:id
 * @desc    Xóa dịch vụ
 * @access  Private (Admin or Staff with SERVICE_DELETE permission)
 */
router.delete(
  '/:id',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role === 'admin') return next();
    return roleMiddleware('SERVICE_DELETE')(req, res, next);
  },
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
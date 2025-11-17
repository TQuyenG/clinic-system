// server/routes/workShiftRoutes.js
const express = require('express');
const router = express.Router();
const workShiftController = require('../controllers/workShiftController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ========== PUBLIC ROUTES ==========
/**
 * Lấy cấu hình ca làm việc
 * GET /api/work-shifts/config
 * Response: Danh sách ca làm việc đang active
 */
router.get('/config', workShiftController.getWorkShiftConfig);

/**
 * Lấy slots trống của bác sĩ
 * GET /api/work-shifts/available-slots?doctor_id=1&date=2025-01-15&service_id=3
 * Response: { slots: [...], grouped: { morning: [...], afternoon: [...], evening: [...] } }
 */
router.get('/available-slots', workShiftController.getAvailableSlots);

// ========== ADMIN ROUTES ==========
/**
 * Cập nhật cấu hình ca làm việc
 * PUT /api/work-shifts/config
 * Body: { shifts: [{ shift_name, start_time, end_time, days_of_week, is_active }] }
 */
router.put('/config',
  authenticateToken,
  authorize('admin'),
  workShiftController.updateWorkShiftConfig
);

module.exports = router;
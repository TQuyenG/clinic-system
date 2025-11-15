// server/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ========== ADMIN ROUTES ==========
/**
 * Phân công bác sĩ cho staff
 * PUT /api/staff/:id/assign-doctors
 * Body: { doctor_ids: [1, 5, 9] }
 */
router.put('/:id/assign-doctors',
  authenticateToken,
  authorize('admin'),
  staffController.assignDoctorsToStaff
);

/**
 * Lấy danh sách bác sĩ được phân công
 * GET /api/staff/:id/doctors
 */
router.get('/:id/doctors',
  authenticateToken,
  authorize('admin', 'staff'),
  staffController.getAssignedDoctors
);

module.exports = router;
// server/routes/leaveRequestRoutes.js
// SỬA: Bổ sung route GET /history/:userId

const express = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leaveRequestController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ========== DOCTOR/STAFF ROUTES ==========
/**
 * Tạo đơn xin nghỉ
 * POST /api/leave-requests
 */
router.post('/',
  authenticateToken,
  authorize('doctor', 'staff'),
  leaveRequestController.createLeaveRequest
);

/**
 * Lấy danh sách đơn xin nghỉ của tôi
 * GET /api/leave-requests/my-leaves
 */
router.get('/my-leaves',
  authenticateToken,
  authorize('doctor', 'staff'),
  leaveRequestController.getMyLeaveRequests
);

/**
 * Hủy đơn xin nghỉ (chỉ pending)
 * DELETE /api/leave-requests/:id
 */
router.delete('/:id',
  authenticateToken,
  authorize('doctor', 'staff'),
  leaveRequestController.cancelLeaveRequest
);

// ========== ADMIN/STAFF ROUTES ==========
/**
 * Lấy danh sách đơn xin nghỉ (cho Admin/Staff)
 * GET /api/leave-requests/pending
 */
router.get('/pending',
  authenticateToken,
  authorize('admin', 'staff'),
  leaveRequestController.getPendingLeaveRequests
);

/**
 * SỬA: BỔ SUNG ROUTE NÀY (Để fix lỗi 404 kẹt loading)
 * Lấy lịch sử nghỉ của 1 user (Admin/Staff xem)
 * GET /api/leave-requests/history/:userId
 */
router.get('/history/:userId',
  authenticateToken,
  authorize('admin', 'staff'),
  leaveRequestController.getUserLeaveHistory
);

/**
 * Duyệt đơn xin nghỉ
 * PUT /api/leave-requests/:id/approve
 */
router.put('/:id/approve',
  authenticateToken,
  authorize('admin', 'staff'),
  leaveRequestController.approveLeaveRequest
);

/**
 * Từ chối đơn xin nghỉ
 * PUT /api/leave-requests/:id/reject
 */
router.put('/:id/reject',
  authenticateToken,
  authorize('admin', 'staff'),
  leaveRequestController.rejectLeaveRequest
);

module.exports = router;
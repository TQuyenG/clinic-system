// server/routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ========== PUBLIC ROUTES ==========
router.get('/public', scheduleController.getPublicSchedules);

// ========== ADMIN/STAFF/DOCTOR ROUTES (Protected) ==========
router.get('/', 
  authenticateToken,
  scheduleController.getSchedules
);
router.get('/stats',
  authenticateToken,
  scheduleController.getWorkHoursStats
);

// ========== ADMIN ROUTES (Quản lý lịch cố định) ==========
router.post('/fixed',
  authenticateToken,
  authorize('admin'),
  scheduleController.createSingleFixedSchedule
);
router.post('/fixed/batch',
  authenticateToken,
  authorize('admin'),
  scheduleController.createFixedSchedule
);
router.get('/check-conflict',
  authenticateToken,
  authorize('admin'),
  scheduleController.checkScheduleConflict
);
router.put('/:id',
  authenticateToken,
  authorize('admin'),
  scheduleController.updateSchedule
);
router.get('/export',
  authenticateToken,
  authorize('admin', 'staff'),
  scheduleController.exportSchedules
);

// ========== CHUNG (Admin, Doctor, Staff) ==========
router.delete('/:id',
  authenticateToken,
  scheduleController.deleteSchedule
);

// ============================================
// === (MỚI) ROUTES: LỊCH LINH HOẠT ===
// ============================================

/**
 * (User) Đăng ký hoặc cập nhật lịch linh hoạt
 * POST /api/schedules/register-flexible
 * Body: { schedule_type: 'fixed' | 'flexible', weekly_schedule_json: {...} }
 */
router.post('/register-flexible',
  authenticateToken,
  authorize('doctor', 'staff'),
  scheduleController.registerOrUpdateFlexibleSchedule // SỬA: Đổi tên hàm
);

/**
 * (User) Lấy bản ghi đăng ký duy nhất của mình (để edit)
 * GET /api/schedules/my-schedule-registration
 */
router.get('/my-schedule-registration',
  authenticateToken,
  authorize('doctor', 'staff'),
  scheduleController.getMyScheduleRegistration // SỬA: Đổi tên hàm
);

/**
 * (Admin) Lấy danh sách đăng ký lịch đang chờ duyệt
 * GET /api/schedules/pending-registrations
 */
router.get('/pending-registrations',
  authenticateToken,
  authorize('admin'),
  scheduleController.getPendingRegistrations
);

/**
 * (Admin) Phê duyệt một đăng ký lịch
 * PUT /api/schedules/approve-registration/:id
 */
router.put('/approve-registration/:id',
  authenticateToken,
  authorize('admin'),
  scheduleController.approveScheduleRegistration
);

/**
 * (MỚI) (Admin) Từ chối một đăng ký lịch
 * PUT /api/schedules/reject-registration/:id
 * Body: { reason: "..." }
 */
router.put('/reject-registration/:id',
  authenticateToken,
  authorize('admin'),
  scheduleController.rejectScheduleRegistration
);


// ============================================
// === (MỚI) ROUTES: TĂNG CA (OVERTIME) ===
// ============================================

/**
 * (User/Admin) Đăng ký tăng ca (tạo mới)
 * POST /api/schedules/register-overtime
 * Body: { slots: {"date": ["start-end"]}, reason, user_id_for_admin? }
 */
router.post('/register-overtime',
  authenticateToken,
  authorize('doctor', 'staff', 'admin'),
  scheduleController.registerOvertime
);

/**
 * (Admin) Lấy danh sách tăng ca chờ duyệt
 * GET /api/schedules/pending-overtimes
 */
router.get('/pending-overtimes',
  authenticateToken,
  authorize('admin'),
  scheduleController.getPendingOvertimes
);

/**
 * (Admin) Phê duyệt / Từ chối tăng ca
 * PUT /api/schedules/review-overtime/:id
 * Body: { action: 'approve' | 'reject', reason? }
 */
router.put('/review-overtime/:id',
  authenticateToken,
  authorize('admin'),
  scheduleController.reviewOvertime
);


module.exports = router;
// server/routes/appointmentRoutes.js

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ========== PUBLIC ROUTES ==========

/**
 * Lấy lịch trống của bác sĩ
 * Query params: doctor_id, date, service_id
 */
router.get('/available-slots', appointmentController.getAvailableSlots);

router.post('/recover-codes', appointmentController.recoverAppointmentCodes);

/**
 * Lấy lịch hẹn theo guest token
 * GET /api/appointments/guest/:token
 */
router.get('/guest/:token', appointmentController.getAppointmentByToken);

// ========== PATIENT/GUEST ROUTES ==========
/**
 * Tạo lịch hẹn mới
 * POST /api/appointments
 * SỬA: Thêm authenticateToken (để lấy req.user nếu có)
 */
router.post('/', authenticateToken, appointmentController.createAppointment);

/**
 * Hoàn thành thanh toán
 * PUT /api/appointments/:id/complete-payment
 * SỬA: Thêm authenticateToken (để lấy req.user nếu có)
 */
router.put('/:id/complete-payment', authenticateToken, appointmentController.completePayment);

// ========== PATIENT ROUTES ==========
/**
 * Lấy danh sách lịch hẹn của bệnh nhân đăng nhập
 * GET /api/appointments/my-appointments
 */
router.get('/my-appointments',
  authenticateToken,
  authorize('patient'),
  appointmentController.getMyAppointments
);

// SỬA: THÊM ROUTE CHO BÁC SĨ
/**
 * Lấy danh sách lịch hẹn của bác sĩ đăng nhập
 * GET /api/appointments/doctor/my-appointments
 */
router.get('/doctor/my-appointments',
  authenticateToken,
  authorize('doctor'),
  appointmentController.getDoctorAppointments
);

/**
 * SỬA: THÊM ROUTE ĐỔI LỊCH (RESCHEDULE)
 * PUT /api/appointments/:id/reschedule
 * Body: { new_date, new_start_time, new_doctor_id, new_service_id }
 */
router.put('/:id/reschedule',
  authenticateToken,
  authorize('patient', 'admin', 'staff'), // Cho phép cả admin/staff đổi lịch
  appointmentController.rescheduleAppointment
);


// ========== ADMIN/STAFF ROUTES ==========
/**
 * Lấy tất cả lịch hẹn (Admin/Staff)
 * GET /api/appointments/admin/all
 */
router.get('/admin/all',
  authenticateToken,
  authorize('admin', 'staff'),
  appointmentController.getAllAppointments
);

/**
 * Xác nhận lịch hẹn
 * PUT /api/appointments/:id/confirm
 */
router.put('/:id/confirm',
  authenticateToken,
  authorize('admin', 'staff'),
  appointmentController.confirmAppointment
);

/**
 * Hoàn thành lịch hẹn
 * PUT /api/appointments/:id/complete
 */
router.put('/:id/complete',
  authenticateToken,
  authorize('admin', 'staff', 'doctor'),
  appointmentController.completeAppointment
);

router.put('/:id/details',
  authenticateToken,
  authorize('admin', 'staff', 'doctor'),
  appointmentController.updateAppointmentDetails
);

// ========== COMMON ROUTES ==========
/**
 * Lấy chi tiết lịch hẹn
 * GET /api/appointments/:id
 */
router.get('/:id',
  authenticateToken,
  authorize('patient', 'doctor', 'staff', 'admin'),
  appointmentController.getAppointmentById
);

/**
 * Hủy lịch hẹn
 * PUT /api/appointments/:id/cancel
 */
router.put('/:id/cancel',
  authenticateToken,
  authorize('patient', 'admin', 'staff'),
  appointmentController.cancelAppointment
);

/**
 * Review lịch hẹn
 * POST /api/appointments/:id/review
 */
router.post('/:id/review',
  authenticateToken,
  authorize('patient'),
  appointmentController.reviewAppointment
);

router.get('/by-user', 
  authenticateToken,
  authorize('doctor', 'admin', 'staff'),  
  appointmentController.getAppointmentsForCalendar
);

module.exports = router;
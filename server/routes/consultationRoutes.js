// server/routes/consultationRoutes.js
// ✅ HOÀN CHỈNH: Routes cho chức năng tư vấn trực tuyến + ADMIN REALTIME

const express = require('express');
const router = express.Router();

const consultationController = require('../controllers/consultationController');
const consultationAdminController = require('../controllers/consultationAdminController');

const { authMiddleware, authorize } = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES (Không cần auth) ====================

/**
 * Lấy bảng giá tư vấn của bác sĩ (Public)
 * GET /api/consultations/pricing/:doctor_id
 */
router.get(
  '/pricing/:doctor_id',
  consultationController.getDoctorPricing
);

/**
 * Tính phí tư vấn ước lượng (Public)
 * POST /api/consultations/calculate-fee
 */
router.post(
  '/calculate-fee',
  consultationController.calculateConsultationFee
);

/**
 * Lấy danh sách bác sĩ để đặt lịch tư vấn
 * GET /api/consultations/chon-bac-si
 * Auth: Optional (public)
 */
router.get('/chon-bac-si', consultationController.getAvailableDoctors);

// ==================== PATIENT ROUTES ====================

/**
 * Tạo tư vấn mới (đặt lịch)
 * POST /api/consultations
 * Auth: Required
 * Role: patient
 */
router.post(
  '/',
  authMiddleware,
  authorize('patient'),
  consultationController.createConsultation
);

/**
 * Lấy danh sách tư vấn của bệnh nhân
 * GET /api/consultations/my-consultations
 * Auth: Required
 * Role: patient
 */
router.get(
  '/my-consultations',
  authMiddleware,
  authorize('patient'),
  consultationController.getMyConsultations
);

/**
 * Đánh giá buổi tư vấn
 * PUT /api/consultations/:id/rate
 * Auth: Required
 * Role: patient
 */
router.put(
  '/:id/rate',
  authMiddleware,
  authorize('patient'),
  consultationController.rateConsultation
);

/**
 * Thống kê tư vấn của bệnh nhân
 * GET /api/consultations/patient/stats
 * Auth: Required
 * Role: patient
 */
router.get(
  '/patient/stats',
  authMiddleware,
  authorize('patient'),
  consultationController.getPatientStats
);

// ==================== DOCTOR ROUTES ====================

/**
 * Lấy danh sách tư vấn của bác sĩ
 * GET /api/consultations/doctor/my-consultations
 * Auth: Required
 * Role: doctor
 */
router.get(
  '/doctor/my-consultations',
  authMiddleware,
  authorize('doctor'),
  consultationController.getDoctorConsultations
);

/**
 * Xác nhận tư vấn (Bác sĩ chấp nhận)
 * PUT /api/consultations/:id/confirm
 * Auth: Required
 * Role: doctor
 */
router.put(
  '/:id/confirm',
  authMiddleware,
  authorize('doctor'),
  consultationController.confirmConsultation
);

/**
 * Kết thúc tư vấn và điền kết quả
 * PUT /api/consultations/:id/complete
 * Auth: Required
 * Role: doctor
 */
router.put(
  '/:id/complete',
  authMiddleware,
  authorize('doctor'),
  consultationController.completeConsultation
);

/**
 * Thống kê tư vấn của bác sĩ
 * GET /api/consultations/doctor/stats
 * Auth: Required
 * Role: doctor
 */
router.get(
  '/doctor/stats',
  authMiddleware,
  authorize('doctor'),
  consultationController.getDoctorStats
);

/**
 * Báo cáo doanh thu của bác sĩ
 * GET /api/consultations/doctor/revenue
 * Auth: Required
 * Role: doctor
 */
router.get(
  '/doctor/revenue',
  authMiddleware,
  authorize('doctor'),
  consultationController.getDoctorRevenue
);

// ==================== COMMON ROUTES (Patient + Doctor) ====================

/**
 * Lấy chi tiết một tư vấn
 * GET /api/consultations/:id
 * Auth: Required
 * Role: patient, doctor, admin, staff
 */
router.get(
  '/:id',
  authMiddleware,
  authorize('patient', 'doctor', 'admin', 'staff'),
  consultationController.getConsultationById
);

/**
 * Bắt đầu tư vấn (Vào phòng chat)
 * PUT /api/consultations/:id/start
 * Auth: Required
 * Role: patient, doctor
 */
router.put(
  '/:id/start',
  authMiddleware,
  authorize('patient', 'doctor'),
  consultationController.startConsultation
);

/**
 * Hủy tư vấn
 * PUT /api/consultations/:id/cancel
 * Auth: Required
 * Role: patient, doctor
 */
router.put(
  '/:id/cancel',
  authMiddleware,
  authorize('patient', 'doctor'),
  consultationController.cancelConsultation
);

// ==================== ✅ ADMIN REALTIME MANAGEMENT ROUTES ====================

/**
 * 1. DANH SÁCH TƯ VẤN REALTIME
 * GET /api/consultations/admin/realtime/all
 */
router.get(
  '/admin/realtime/all',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getAllConsultationsRealtime
);

/**
 * 2. GIÁM SÁT PHIÊN REALTIME - Lấy phiên đang hoạt động
 * GET /api/consultations/admin/realtime/active
 */
router.get(
  '/admin/realtime/active',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getActiveConsultations
);

/**
 * Xem nội dung chat (read-only)
 * GET /api/consultations/admin/realtime/:id/messages
 */
router.get(
  '/admin/realtime/:id/messages',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getConsultationMessages
);

/**
 * Gửi tin nhắn hệ thống
 * POST /api/consultations/admin/realtime/:id/system-message
 */
router.post(
  '/admin/realtime/:id/system-message',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.sendSystemMessage
);

/**
 * Kết thúc phiên thủ công
 * PUT /api/consultations/admin/realtime/:id/force-end
 */
router.put(
  '/admin/realtime/:id/force-end',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.forceEndConsultation
);

/**
 * 3. QUẢN LÝ GÓI DỊCH VỤ
 * GET /api/consultations/admin/packages
 */
router.get(
  '/admin/packages',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getAllPackages
);

/**
 * Cập nhật gói dịch vụ
 * PUT /api/consultations/admin/packages/:doctorId
 */
router.put(
  '/admin/packages/:doctorId',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.updateDoctorPackage
);

/**
 * 4. QUẢN LÝ HOÀN TIỀN
 * GET /api/consultations/admin/refunds
 */
router.get(
  '/admin/refunds',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getRefundList
);

/**
 * Xử lý hoàn tiền
 * POST /api/consultations/admin/refunds/:id/process
 */
router.post(
  '/admin/refunds/:id/process',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.processRefund
);

/**
 * 5. QUẢN LÝ PHẢN HỒI & ĐÁNH GIÁ
 * GET /api/consultations/admin/feedbacks
 */
router.get(
  '/admin/feedbacks',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getAllFeedbacks
);

/**
 * Ẩn/hiện đánh giá
 * PUT /api/consultations/admin/feedbacks/:id/toggle-status
 */
router.put(
  '/admin/feedbacks/:id/toggle-status',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.toggleFeedbackStatus
);

/**
 * 6. BÁO CÁO & THỐNG KÊ
 * Thống kê tổng quan
 * GET /api/consultations/admin/statistics/overview
 */
router.get(
  '/admin/statistics/overview',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getSystemStatistics
);

/**
 * Thống kê theo bác sĩ
 * GET /api/consultations/admin/statistics/by-doctor
 */
router.get(
  '/admin/statistics/by-doctor',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getDoctorStatistics
);

/**
 * Thống kê theo bệnh nhân
 * GET /api/consultations/admin/statistics/by-patient
 */
router.get(
  '/admin/statistics/by-patient',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.getPatientStatistics
);

/**
 * 7. EXPORT
 * GET /api/consultations/admin/export
 */
router.get(
  '/admin/export',
  authMiddleware,
  authorize('admin'),
  consultationAdminController.exportConsultations
);

// ==================== ADMIN ROUTES (CŨ - GIỮ LẠI) ====================

/**
 * Lấy tất cả tư vấn (Admin)
 * GET /api/consultations/admin/all
 * Auth: Required
 * Role: admin
 */
router.get(
  '/admin/all',
  authMiddleware,
  authorize('admin'),
  consultationController.getAllConsultations
);

/**
 * Xử lý hoàn tiền (Admin) - OLD
 * PUT /api/consultations/:id/refund
 * Auth: Required
 * Role: admin
 */
router.put(
  '/:id/refund',
  authMiddleware,
  authorize('admin'),
  consultationController.processRefund
);

/**
 * Thống kê tổng quan hệ thống (Admin) - OLD
 * GET /api/consultations/admin/stats
 * Auth: Required
 * Role: admin
 */
router.get(
  '/admin/stats',
  authMiddleware,
  authorize('admin'),
  consultationController.getSystemStats
);

/**
 * Cập nhật bảng giá tư vấn (Admin) - OLD
 * PUT /api/consultations/pricing/:doctor_id
 * Auth: Required
 * Role: admin
 */
router.put(
  '/pricing/:doctor_id',
  authMiddleware,
  authorize('admin'),
  consultationController.updateDoctorPricing
);

// ==================== STAFF ROUTES ====================

/**
 * Hỗ trợ đặt lịch cho bệnh nhân (Staff)
 * POST /api/consultations/staff/book-for-patient
 * Auth: Required
 * Role: staff
 */
router.post(
  '/staff/book-for-patient',
  authMiddleware,
  authorize('staff'),
  consultationController.bookConsultationForPatient
);

/**
 * Xác nhận thanh toán tiền mặt (Staff)
 * PUT /api/consultations/:id/confirm-cash-payment
 * Auth: Required
 * Role: staff
 */
router.put(
  '/:id/confirm-cash-payment',
  authMiddleware,
  authorize('staff'),
  consultationController.confirmCashPayment
);

// ==================== SEARCH & FILTER ====================

/**
 * Tìm kiếm và lọc tư vấn
 * GET /api/consultations/search
 * Auth: Required
 * Role: admin, staff
 */
router.get(
  '/search',
  authMiddleware,
  authorize('admin', 'staff'),
  consultationController.searchConsultations
);

module.exports = router;
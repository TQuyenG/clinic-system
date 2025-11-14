// server/routes/paymentRoutes.js - CẬP NHẬT HOÀN CHỈNH
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, authorize } = require('../middleware/authMiddleware'); // ✅ ĐỔI THÀNH authorize

// ==================== PUBLIC ROUTES (Callbacks từ payment gateways) ====================

/**
 * VNPay Return URL (GET)
 */
router.get('/vnpay-return', paymentController.vnpayReturn);

/**
 * MoMo Return URL (GET)
 */
router.get('/momo-return', paymentController.momoReturn);

/**
 * MoMo IPN (POST - Server to Server)
 */
router.post('/momo-ipn', paymentController.momoIPN);

// ==================== PROTECTED ROUTES ====================

/**
 * Tạo thanh toán cho tư vấn
 * POST /api/payment/consultation/create
 */
router.post(
  '/consultation/create',
  authMiddleware,
  authorize('patient'), // ✅ ĐỔI THÀNH authorize
  paymentController.createConsultationPayment
);

/**
 * Xử lý hoàn tiền
 * POST /api/payment/refund
 */
router.post(
  '/refund',
  authMiddleware,
  authorize('admin', 'staff'), // ✅ ĐỔI THÀNH authorize
  paymentController.processRefund
);

/**
 * Lấy danh sách thanh toán của bệnh nhân
 * GET /api/payment/my-payments
 */
router.get(
  '/my-payments',
  authMiddleware,
  authorize('patient'), // ✅ ĐỔI THÀNH authorize
  paymentController.getMyPayments
);

/**
 * Lấy chi tiết thanh toán theo appointment
 * GET /api/payment/appointment/:appointment_id
 */
router.get(
  '/appointment/:appointment_id',
  authMiddleware,
  authorize('patient', 'doctor'), // ✅ ĐỔI THÀNH authorize
  paymentController.getPaymentByAppointment
);

/**
 * Lấy tất cả thanh toán (Admin)
 * GET /api/payment/all
 */
router.get(
  '/all',
  authMiddleware,
  authorize('admin', 'staff'), // ✅ ĐỔI THÀNH authorize
  paymentController.getAllPayments
);

/**
 * Xác nhận thanh toán thủ công (Admin)
 * PUT /api/payment/:payment_id/confirm
 */
router.put(
  '/:payment_id/confirm',
  authMiddleware,
  authorize('admin', 'staff'), // ✅ ĐỔI THÀNH authorize
  paymentController.confirmPayment
);

/**
 * Từ chối thanh toán (Admin)
 * PUT /api/payment/:payment_id/reject
 */
router.put(
  '/:payment_id/reject',
  authMiddleware,
  authorize('admin', 'staff'), // ✅ ĐỔI THÀNH authorize
  paymentController.rejectPayment
);

module.exports = router;
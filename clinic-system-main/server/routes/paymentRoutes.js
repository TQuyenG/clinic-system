// server/routes/paymentRoutes.js - FINAL FIXED VERSION
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Import middleware xác thực và phân quyền
const { authMiddleware, authorize } = require('../middleware/authMiddleware'); 

// ==================================================================
// 1. KHU VỰC PUBLIC (KHÔNG CẦN ĐĂNG NHẬP)
// ⚠️ QUAN TRỌNG: Các route này BẮT BUỘC phải đặt TRƯỚC authMiddleware
// ==================================================================

// Webhook nhận thông báo tiền về từ SePay (Server-to-Server)
// Webhook nhận thông báo tiền về từ SePay (Server-to-Server)
router.post('/webhook/bank-transfer', (req, res, next) => {
  console.log('🔥🔥🔥 ROUTE WEBHOOK ĐƯỢC GỌI');
  console.log('Body:', req.body);
  next();
}, paymentController.handleBankWebhook);

// Callback nhận kết quả từ VNPay
router.get('/vnpay-return', paymentController.vnpayReturn);

// Callback nhận kết quả từ MoMo
router.get('/momo-return', paymentController.momoReturn);
router.post('/momo-ipn', paymentController.momoIPN);


// ==================================================================
// 2. KHU VỰC PROTECTED (CẦN ĐĂNG NHẬP)
// ⚠️ Tất cả các route bên dưới dòng này đều yêu cầu Token hợp lệ
// ==================================================================
router.use(authMiddleware); 

// --- ROUTE CHO NGƯỜI DÙNG (USER / PATIENT) ---
router.post('/', paymentController.createPayment); // Tạo thanh toán lịch hẹn
router.post('/consultation', paymentController.createConsultationPayment); // Tạo thanh toán tư vấn
router.post('/refund', paymentController.processRefund); // Yêu cầu hoàn tiền
router.get('/my-payments', paymentController.getMyPayments); // Lịch sử thanh toán cá nhân
router.get('/appointment/:appointment_id', paymentController.getPaymentByAppointment);

// --- ROUTE CẤU HÌNH (Dùng chung cho Admin và hiển thị User) ---
// Cho phép Admin, Patient, Doctor gọi để hiển thị giao diện thanh toán (đã lọc key bảo mật ở Controller)
router.get('/config', authorize('admin', 'patient', 'doctor'), paymentController.getPaymentConfig);


// ==================================================================
// 3. KHU VỰC ADMIN & STAFF (QUẢN TRỊ)
// ==================================================================

// Cập nhật cấu hình thanh toán (Chỉ Admin)
router.put('/config', authorize('admin'), paymentController.updatePaymentConfig);

// Lấy danh sách tất cả giao dịch
router.get('/all', authorize('admin', 'staff'), paymentController.getAllPayments);

// Xác nhận thanh toán thủ công
router.put('/:id/confirm', authorize('admin', 'staff'), paymentController.confirmPayment);

// Từ chối thanh toán
router.put('/:id/reject', authorize('admin', 'staff'), paymentController.rejectPayment);

// Đối soát giao dịch VNPay (Chỉ Admin)
router.get('/:id/check-status', authorize('admin'), paymentController.adminCheckTransaction);

// Duyệt thanh toán thủ công (Bank Transfer) (Chỉ Admin)
router.put('/:id/verify-manual', authorize('admin'), paymentController.verifyManualPayment);

// Thống kê doanh thu (Chỉ Admin)
router.get('/statistics/revenue', authorize('admin'), paymentController.getRevenueStatistics);

module.exports = router;
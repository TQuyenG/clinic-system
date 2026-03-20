// server/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Import middleware xác thực và phân quyền
const { authMiddleware, authorize } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware'); // ✅ THÊM: Middleware phân quyền chi tiết 

// ==================================================================
// 1. KHU VỰC PUBLIC (WEBHOOK - KHÔNG CẦN ĐĂNG NHẬP)
// ⚠️ QUAN TRỌNG: Route này BẮT BUỘC phải đặt trên cùng
// ==================================================================

// Webhook nhận tiền về (Fix lỗi 404)
router.post('/webhook/bank-transfer', (req, res, next) => {
    console.log('🔔 [WEBHOOK] Nhận tín hiệu từ ngân hàng:', req.body);
    next();
}, paymentController.handleBankWebhook);

// Callback trả về từ cổng thanh toán
router.get('/vnpay-return', paymentController.vnpayReturn);
router.get('/momo-return', paymentController.momoReturn);
router.post('/momo-ipn', paymentController.momoIPN);

// ==================================================================
// 2. KHU VỰC PROTECTED (CẦN ĐĂNG NHẬP)
// ==================================================================
router.use(authMiddleware); 

// --- User Routes (Bệnh nhân/Bác sĩ có thể tạo thanh toán) ---
router.post('/', paymentController.createPayment); 
router.post('/consultation', paymentController.createConsultationPayment);
router.post('/refund', paymentController.processRefund);
router.get('/my-payments', paymentController.getMyPayments);
router.get('/appointment/:appointment_id', paymentController.getPaymentByAppointment);

// --- Config Route (Cho phép cả Staff/Admin/User truy cập để lấy thông tin CK) ---
router.get('/config', authorize('admin', 'patient', 'doctor', 'staff'), paymentController.getPaymentConfig);

// ==================================================================
// ⚠️ QUAN TRỌNG: PHÂN QUYỀN CHI TIẾT CHO STAFF TÀI CHÍNH
// Chỉ Staff Finance có quyền payments:view, payments:verify, payments:approve
// Staff từ phòng ban khác (Content, Clinical) KHÔNG được truy cập
// ==================================================================

// --- Admin/Staff Routes - YÊU CẦU QUYỀN CHI TIẾT ---

// 🔐 CẬP NHẬT CẤU HÌNH THANH TOÁN - Chỉ Admin hoặc Staff có quyền 'payments:approve'
router.put('/config', authMiddleware, roleMiddleware('payments:approve'), paymentController.updatePaymentConfig);

// 👁️ XEM TẤT CẢ THANH TOÁN - Yêu cầu quyền 'payments:view'
// Staff Finance có quyền này, Staff Content/Clinical KHÔNG có
router.get('/all', authMiddleware, roleMiddleware('payments:view'), paymentController.getAllPayments);

// ✅ XÁC NHẬN THANH TOÁN - Yêu cầu quyền 'payments:approve'
// Chỉ Staff Finance Manager hoặc Admin mới có quyền duyệt thanh toán
router.put('/:id/confirm', authMiddleware, roleMiddleware('payments:approve'), paymentController.confirmPayment);

// ❌ TỪ CHỐI THANH TOÁN - Yêu cầu quyền 'payments:approve'
router.put('/:id/reject', authMiddleware, roleMiddleware('payments:approve'), paymentController.rejectPayment);

// 🔍 KIỂM TRA TRẠNG THÁI GIAO DỊCH - Yêu cầu quyền 'payments:verify'
// Staff Finance thường có thể verify, nhưng chỉ Admin check-status
router.get('/:id/check-status', authMiddleware, roleMiddleware('payments:verify'), paymentController.adminCheckTransaction);

// 🖊️ XÁC MINH THỦ CÔNG - Yêu cầu quyền 'payments:verify'
// Dùng khi chuyển khoản ngân hàng cần xác nhận thủ công
router.put('/:id/verify-manual', authMiddleware, roleMiddleware('payments:verify'), paymentController.verifyManualPayment);

// 📊 THỐNG KÊ DOANH THU - Yêu cầu quyền 'payments:view'
// Staff Finance và Admin xem được báo cáo doanh thu
router.get('/statistics/revenue', authMiddleware, roleMiddleware('payments:view'), paymentController.getRevenueStatistics);
// 💰 DANH SÁCH YÊU CẦU HOÀN TIỀN - Yêu cầu quyền 'payments:refund'
// Chỉ Staff Finance có quyền xử lý hoàn tiền
router.get('/refunds', authMiddleware, roleMiddleware('payments:refund'), paymentController.getRefundRequests);
// --- KẾT THÚC ĐOẠN THÊM MỚI ---
// Thêm vào paymentRoutes.js
router.put('/refunds/:id/process', 
  authorize('admin', 'staff'), 
  // uploadMiddleware, // Thêm middleware upload file của bạn vào đây nếu cần
  paymentController.processRefundRequest
);

// --- NHÀ THUỐC BÁN LẺ (RETAIL PHARMACY) ---
// Lấy danh sách hóa đơn bán lẻ
router.get('/pharmacy/retail', paymentController.getRetailInvoices);
// Tạo hóa đơn bán lẻ mới
router.post('/pharmacy/retail', paymentController.createRetailInvoice);

module.exports = router;
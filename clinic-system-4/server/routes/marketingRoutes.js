const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');
const roleMiddleware = require('../middleware/roleMiddleware');
const { authMiddleware } = require('../middleware/authMiddleware');
// Public APIs
router.get('/events/popup', marketingController.getPopupEvent);
router.get('/events', marketingController.getEvents);
router.get('/events/:id', marketingController.getEventDetail);

// Protected APIs (User)
router.use(authMiddleware);
router.get('/my-vouchers', marketingController.getMyVouchers);
router.get('/public-promotions', marketingController.getPublicPromotions); // ✅ SỬA LỖI: Thêm route này để Kho chung hết bị Đang tải
router.post('/claim-voucher', marketingController.claimVoucher); // ✅ SỬA LỖI: Thêm route cho nút Lưu mã
router.post('/game/play', marketingController.playGame); // Quay thưởng
router.get('/game/rewards', marketingController.getGameRewards); // ✅ THÊM MỚI: API Lấy danh sách quà vòng quay
// ✅ THÊM MỚI: API Điểm danh và Đổi điểm
router.get('/my-points', marketingController.getMyPoints);
// SAU KHI SỬA
router.post('/checkin', marketingController.dailyCheckin);
// Đổi route để nhận ID của voucher CỤ THỂ
router.post('/exchange-points/:promoId', marketingController.exchangePoints);
router.post('/validate-voucher', marketingController.validateVoucher); // ✅ MỚI

// Admin APIs (Tạo sự kiện, tạo voucher - Phần này bạn tự bổ sung CRUD cơ bản)
// Ví dụ:
// router.post('/events', roleMiddleware('marketing:manage_events'), marketingController.createEvent);

// --- ADMIN ROUTES (Cần quyền Staff/Admin) ---
// Lưu ý: roleMiddleware bạn đã cấu hình 'marketing:manage_events' ở bước trước
router.post('/events', roleMiddleware('marketing:manage_events', ['admin']), marketingController.createEvent);
router.delete('/events/:id', roleMiddleware('marketing:manage_events', ['admin']), marketingController.deleteEvent);

router.get('/promotions', roleMiddleware('marketing:manage_promotions', ['admin']), marketingController.getAllPromotions);
router.get('/promotions/selection-data', roleMiddleware('marketing:manage_promotions', ['admin']), marketingController.getSelectionData); // <-- API MỚI CHO BỘ LỌC
router.post('/promotions', roleMiddleware('marketing:manage_promotions', ['admin']), marketingController.createPromotion);
router.delete('/promotions/:id', roleMiddleware('marketing:manage_promotions', ['admin']), marketingController.deletePromotion);

router.put('/events/:id', roleMiddleware('marketing:manage_events', ['admin']), marketingController.updateEvent);
router.put('/events/:id/toggle', roleMiddleware('marketing:manage_events', ['admin']), marketingController.toggleEventStatus);
router.post('/events/:id/track', marketingController.trackEventStats); // Public tracking

// ✅ SAU KHI SỬA (thêm các route mới):
router.put('/promotions/:id', roleMiddleware('marketing:manage_promotions', ['admin']), marketingController.updatePromotion);

// ✅ THÊM CÁC ROUTE MỚI:
router.get('/events/stats', roleMiddleware('marketing:manage_events', ['admin']), marketingController.getEventStats);
router.post('/events/:id/duplicate', roleMiddleware('marketing:manage_events', ['admin']), marketingController.duplicateEvent);
router.get('/events/export', roleMiddleware('marketing:manage_events', ['admin']), marketingController.exportEvents);


module.exports = router;
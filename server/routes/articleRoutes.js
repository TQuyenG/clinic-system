const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// =====================================================

// ===== PUBLIC ROUTES - KHÔNG CẦN AUTH =====
router.get('/categories', articleController.getCategories);
router.get('/public', articleController.getPublicArticles);
router.get('/slug/:slug', articleController.getArticleBySlug);
router.get('/tags/all', articleController.getAllTags);
router.get('/related/:id', articleController.getRelatedArticles);
router.post('/:id/view', articleController.trackArticleView);
router.get('/search', articleController.searchArticles);
router.get('/search/global', articleController.globalSearch);

// ===== PROTECTED ROUTES - CẦN AUTH =====

// --- TAGS & SAVED ARTICLES ---
router.get('/tags/suggest', authenticateToken, articleController.suggestTags);
router.get('/saved', authenticateToken, articleController.getSavedArticles);

// =====================================================
// ROUTES CHO THUỐC (MEDICINES) & BỆNH LÝ (DISEASES) - ĐẶT TRƯỚC SLUG CHUNG
// =====================================================

// --- THUỐC (MEDICINES) ---

// ⚠️ QUAN TRỌNG: Đặt các route cụ thể TRƯỚC route có tham số động :id

// 📤 XUẤT DANH SÁCH THUỐC - Yêu cầu quyền 'articles:view'
router.get('/medicines/export', authenticateToken, roleMiddleware('articles:view'), articleController.exportMedicines);

// 📥 NHẬP THUỐC TỪ FILE - Yêu cầu quyền 'articles:create'
router.post('/medicines/import', authenticateToken, roleMiddleware('articles:create'), articleController.importMedicines);

// 📋 XEM DANH SÁCH ĐỀ XUẤT THUỐC - Controller tự kiểm tra quyền
router.get('/medicines/suggestions', authenticateToken, articleController.getMedicineSuggestions);

// ✍️ GỬI ĐỀ XUẤT THUỐC MỚI - Controller tự kiểm tra quyền
router.post('/medicines/suggestions', authenticateToken, articleController.createMedicineSuggestion);

// 🔗 XEM THUỐC THEO SLUG (Public - Không cần quyền)
router.get('/medicines/slug/:slug', articleController.getMedicineBySlug);

// 👁️ ẨN/HIỆN THUỐC - Yêu cầu quyền 'articles:edit'
// Staff Content có thể ẩn thuốc không phù hợp
router.put('/medicines/:id/toggle-hide', authenticateToken, roleMiddleware('articles:edit'), articleController.toggleHideMedicine);

// 🔍 XEM CHI TIẾT THUỐC
router.get('/medicines/:id', authenticateToken, articleController.getArticleById); 

// ✏️ SỬA THÔNG TIN THUỐC - Yêu cầu quyền 'articles:edit'
router.put('/medicines/:id', authenticateToken, roleMiddleware('articles:edit'), articleController.updateMedicine);

// 🗑️ XÓA THUỐC - Yêu cầu quyền 'articles:delete'
// Chỉ Admin hoặc Manager Content mới có quyền xóa
router.delete('/medicines/:id', authenticateToken, roleMiddleware('articles:delete'), articleController.deleteMedicine);

// 📋 DANH SÁCH THUỐC (Public - Không cần auth)
router.get('/medicines', articleController.getMedicines);

// ➕ TẠO THUỐC MỚI - Yêu cầu quyền 'articles:create_medicine'
// 🔐 CHỈ Manager Content hoặc Admin mới được tạo thuốc trực tiếp
// Staff thường phải đi qua /medicines/suggestions để đề xuất
router.post('/medicines', authenticateToken, roleMiddleware('articles:create_medicine'), articleController.createMedicine);

// 📦 XỬ LÝ HÀNG LOẠT THUỐC - Yêu cầu quyền 'articles:edit'
router.post('/medicines/bulk', authenticateToken, roleMiddleware('articles:edit'), articleController.bulkMedicineActions);

// --- BỆNH LÝ (DISEASES) ---

// ⚠️ QUAN TRỌNG: Đặt các route cụ thể TRƯỚC route có tham số động :id

// 📤 XUẤT DANH SÁCH BỆNH LÝ - Yêu cầu quyền 'articles:view'
router.get('/diseases/export', authenticateToken, roleMiddleware('articles:view'), articleController.exportDiseases);

// 📥 NHẬP BỆNH LÝ TỪ FILE - Yêu cầu quyền 'articles:create'
router.post('/diseases/import', authenticateToken, roleMiddleware('articles:create'), articleController.importDiseases);

// 📋 XEM DANH SÁCH ĐỀ XUẤT BỆNH LÝ - Controller tự kiểm tra quyền
router.get('/diseases/suggestions', authenticateToken, articleController.getDiseaseSuggestions);

// ✍️ GỬI ĐỀ XUẤT BỆNH LÝ MỚI - Controller tự kiểm tra quyền
router.post('/diseases/suggestions', authenticateToken, articleController.createDiseaseSuggestion);

// 🔗 XEM BỆNH LÝ THEO SLUG (Public)
router.get('/diseases/slug/:slug', articleController.getDiseaseBySlug);

// 👁️ ẨN/HIỆN BỆNH LÝ - Yêu cầu quyền 'articles:edit'
router.put('/diseases/:id/toggle-hide', authenticateToken, roleMiddleware('articles:edit'), articleController.toggleHideDisease);

// 🔍 XEM CHI TIẾT BỆNH LÝ
router.get('/diseases/:id', authenticateToken, articleController.getArticleById);

// ✏️ SỬA THÔNG TIN BỆNH LÝ - Yêu cầu quyền 'articles:edit'
router.put('/diseases/:id', authenticateToken, roleMiddleware('articles:edit'), articleController.updateDisease);

// 🗑️ XÓA BỆNH LÝ - Yêu cầu quyền 'articles:delete'
router.delete('/diseases/:id', authenticateToken, roleMiddleware('articles:delete'), articleController.deleteDisease);

// 📋 DANH SÁCH BỆNH LÝ (Public)
router.get('/diseases', articleController.getDiseases);

// ➕ TẠO BỆNH LÝ MỚI - Yêu cầu quyền 'articles:create_disease'
// 🔐 CHỈ Manager Content hoặc Admin mới được tạo bệnh lý trực tiếp
// Staff thường phải đi qua /diseases/suggestions để đề xuất
router.post('/diseases', authenticateToken, roleMiddleware('articles:create_disease'), articleController.createDisease);

// 📦 XỬ LÝ HÀNG LOẠT BỆNH LÝ - Yêu cầu quyền 'articles:edit'
router.post('/diseases/bulk', authenticateToken, roleMiddleware('articles:edit'), articleController.bulkDiseaseActions);

// =====================================================
// ROUTES CHO ĐỀ XUẤT BÀI VIẾT (ARTICLE SUGGESTIONS)
// =====================================================

// 📋 XEM DANH SÁCH ĐỀ XUẤT BÀI VIẾT - Yêu cầu quyền 'articles:view'
router.get('/suggestions', authenticateToken, roleMiddleware('articles:view'), articleController.getSuggestions);

// ✍️ GỬI ĐỀ XUẤT BÀI VIẾT MỚI - Yêu cầu quyền 'articles:create_draft'
// Staff Content và Doctor có thể gửi đề xuất
router.post('/suggestions', authenticateToken, roleMiddleware('articles:create_draft'), articleController.createSuggestion);

// ✅ DUYỆT/TỪ CHỐI ĐỀ XUẤT BÀI VIẾT - Yêu cầu quyền 'articles:approve'
// Chỉ Manager Content hoặc Admin mới có quyền duyệt
router.put('/suggestions/:id/review', authenticateToken, roleMiddleware('articles:approve'), articleController.reviewSuggestion);

// ✅ DUYỆT/TỪ CHỐI ĐỀ XUẤT THUỐC - Yêu cầu quyền 'articles:approve_medicine'
// Chỉ Manager Content hoặc Admin mới có quyền duyệt
router.put('/medicines/suggestions/:id/review', authenticateToken, roleMiddleware('articles:approve_medicine'), articleController.reviewMedicineSuggestion);

// ✅ DUYỆT/TỪ CHỐI ĐỀ XUẤT BỆNH LÝ - Yêu cầu quyền 'articles:approve_disease'
// Chỉ Manager Content hoặc Admin mới có quyền duyệt
router.put('/diseases/suggestions/:id/review', authenticateToken, roleMiddleware('articles:approve_disease'), articleController.reviewDiseaseSuggestion);

// =====================================================
// CÁC ROUTES CÓ THAM SỐ ID CHUNG (ARTICLE ID)
// =====================================================

// 📜 XEM LỊCH SỬ DUYỆT BÀI - Yêu cầu quyền 'articles:view'
router.get('/:id/review-history', authenticateToken, roleMiddleware('articles:view'), articleController.getArticleReviewHistory);

// ✅ DUYỆT BÀI VIẾT - Yêu cầu quyền 'articles:approve'
// Manager Content hoặc Admin duyệt bài từ staff/doctor
router.post('/:id/review', authenticateToken, roleMiddleware('articles:approve'), articleController.reviewArticle);

// 🙈 ẨN BÀI VIẾT - Yêu cầu quyền 'articles:edit'
router.post('/:id/hide', authenticateToken, roleMiddleware('articles:edit'), articleController.hideArticle);

// 👁️ HIỆN BÀI VIẾT - Yêu cầu quyền 'articles:edit'
router.post('/:id/unhide', authenticateToken, roleMiddleware('articles:edit'), articleController.unhideArticle);

// 🔄 GỬI LẠI BÀI SAU KHI SỬA - Yêu cầu quyền 'articles:edit'
router.post('/:id/resubmit', authenticateToken, roleMiddleware('articles:edit'), articleController.resubmitArticle);

// ✅ DUYỆT YÊU CẦU CHỈNH SỬA - Yêu cầu quyền 'articles:approve'
router.post('/:id/approve-edit-request', authenticateToken, roleMiddleware('articles:approve'), articleController.approveEditRequest);

// ❌ TỪ CHỐI YÊU CẦU CHỈNH SỬA - Yêu cầu quyền 'articles:approve'
router.post('/:id/reject-edit-request', authenticateToken, roleMiddleware('articles:approve'), articleController.rejectEditRequest);

// 📝 YÊU CẦU VIẾT LẠI - Yêu cầu quyền 'articles:approve'
router.post('/:id/request-rewrite', authenticateToken, roleMiddleware('articles:approve'), articleController.requestRewrite);

// 📋 SAO CHÉP BÀI VIẾT - Yêu cầu quyền 'articles:create'
router.post('/:id/duplicate', authenticateToken, roleMiddleware('articles:create'), articleController.duplicateArticle);

// --- COMMENTS & INTERACTION ---
router.get('/:id/comments', authenticateToken, articleController.getArticleComments);
router.post('/:id/comments', authenticateToken, articleController.addCommentToArticle);
router.delete('/:id/comments/:commentId', authenticateToken, articleController.deleteComment);
router.get('/:id/reports', authenticateToken, roleMiddleware(['admin']), articleController.getArticleReports);
router.post('/:id/report', authenticateToken, articleController.reportArticle);
router.get('/:id/interactions', authenticateToken, articleController.getArticleInteractions);
router.post('/:id/interact', authenticateToken, articleController.interactArticle);

// --- CRUD OPERATIONS (cho Article chung) ---
router.get('/:id', authenticateToken, articleController.getArticleById);

// ✏️ CẬP NHẬT BÀI VIẾT - Yêu cầu quyền 'articles:edit'
router.put('/:id', authenticateToken, roleMiddleware('articles:edit'), articleController.updateArticle);

// 🗑️ XÓA BÀI VIẾT - Yêu cầu quyền 'articles:delete'
router.delete('/:id', authenticateToken, roleMiddleware('articles:delete'), articleController.deleteArticle);

// =====================================================
// ===== ROUTE ĐỘNG /:categoryType/:slug - ĐẶT CUỐI CÙNG =====
// Route này phải luôn đặt cuối để không chặn các route cố định khác
// =====================================================
router.get('/:categoryType/:slug', articleController.getByTypeAndSlug);

// ===== ROUTE MẶC ĐỊNH (LIST & CREATE) =====

// 4. Lấy danh sách bài viết (Admin/Staff/Doctor xem được bài liên quan)
router.get('/',
  authenticateToken, // Sửa từ authMiddleware.verifyToken thành authenticateToken
  roleMiddleware(null, ['admin', 'staff', 'doctor']),
  articleController.getArticles
);

// ➕ TẠO BÀI VIẾT MỚI - Yêu cầu quyền 'articles:create'
// Staff Content và Doctor có thể tạo bài viết
router.post('/', authenticateToken, roleMiddleware('articles:create'), articleController.createArticle);// 🚨 Dòng này có thể là nguyên nhân lỗi 404 nếu thiếu controller trước đó!

module.exports = router; 
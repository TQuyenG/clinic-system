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
router.get('/medicines/export', authenticateToken, roleMiddleware(['admin']), articleController.exportMedicines);
router.post('/medicines/import', authenticateToken, roleMiddleware(['admin']), articleController.importMedicines);
router.get('/medicines/slug/:slug', articleController.getMedicineBySlug);
router.put('/medicines/:id/toggle-hide', authenticateToken, roleMiddleware(['admin']), articleController.toggleHideMedicine);
router.get('/medicines/:id', authenticateToken, articleController.getArticleById); // Có thể cần hàm riêng nếu không tìm thấy
router.put('/medicines/:id', authenticateToken, roleMiddleware(['admin']), articleController.updateMedicine);
router.delete('/medicines/:id', authenticateToken, roleMiddleware(['admin']), articleController.deleteMedicine);
router.get('/medicines', articleController.getMedicines);
router.post('/medicines', authenticateToken, roleMiddleware(['admin']), articleController.createMedicine);
router.post('/medicines/bulk', authenticateToken, roleMiddleware(['admin']), articleController.bulkMedicineActions); 


// --- BỆNH LÝ (DISEASES) ---
router.get('/diseases/export', authenticateToken, roleMiddleware(['admin']), articleController.exportDiseases);
router.post('/diseases/import', authenticateToken, roleMiddleware(['admin']), articleController.importDiseases);
router.get('/diseases/slug/:slug', articleController.getDiseaseBySlug);
router.put('/diseases/:id/toggle-hide', authenticateToken, roleMiddleware(['admin']), articleController.toggleHideDisease);
router.get('/diseases/:id', authenticateToken, articleController.getArticleById); // Có thể cần hàm riêng nếu không tìm thấy
router.put('/diseases/:id', authenticateToken, roleMiddleware(['admin']), articleController.updateDisease);
router.delete('/diseases/:id', authenticateToken, roleMiddleware(['admin']), articleController.deleteDisease);
router.get('/diseases', articleController.getDiseases);
router.post('/diseases', authenticateToken, roleMiddleware(['admin']), articleController.createDisease);
router.post('/diseases/bulk', authenticateToken, roleMiddleware(['admin']), articleController.bulkDiseaseActions); 


// =====================================================
// ROUTES CHO ĐỀ XUẤT (SUGGESTIONS)
// =====================================================
router.get('/suggestions', authenticateToken, articleController.getSuggestions);
router.post('/suggestions', authenticateToken, roleMiddleware(['staff', 'doctor']), articleController.createSuggestion);
router.put('/suggestions/:id/review', authenticateToken, roleMiddleware(['admin']), articleController.reviewSuggestion);

// =====================================================
// CÁC ROUTES CÓ THAM SỐ ID CHUNG (ARTICLE ID)
// =====================================================

// --- REVIEW HISTORY & APPROVAL ---
router.get('/:id/review-history', authenticateToken, articleController.getArticleReviewHistory);
router.post('/:id/review', authenticateToken, roleMiddleware(['admin']), articleController.reviewArticle);
router.post('/:id/hide', authenticateToken, roleMiddleware(['admin']), articleController.hideArticle);
router.post('/:id/unhide', authenticateToken, roleMiddleware(['admin']), articleController.unhideArticle);
router.post('/:id/resubmit', authenticateToken, roleMiddleware(['staff', 'doctor']), articleController.resubmitArticle);
router.post('/:id/request-edit', authenticateToken, articleController.requestEdit); //  FIXED: Hàm requestEdit
router.post('/:id/approve-edit-request', authenticateToken, roleMiddleware(['admin']), articleController.approveEditRequest); //  FIXED: Hàm approveEditRequest
router.post('/:id/reject-edit-request', authenticateToken, roleMiddleware(['admin']), articleController.rejectEditRequest); //  FIXED: Hàm rejectEditRequest
router.post('/:id/request-rewrite', authenticateToken, roleMiddleware(['admin']), articleController.requestRewrite); //  FIXED: Hàm requestRewrite
router.post('/:id/duplicate', authenticateToken, roleMiddleware(['staff', 'doctor', 'admin']), articleController.duplicateArticle);

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
router.put('/:id', authenticateToken, roleMiddleware(['staff', 'doctor', 'admin']), articleController.updateArticle);
router.delete('/:id', authenticateToken, articleController.deleteArticle);

// =====================================================
// ===== ROUTE ĐỘNG /:categoryType/:slug - ĐẶT CUỐI CÙNG =====
// Route này phải luôn đặt cuối để không chặn các route cố định khác
// =====================================================
router.get('/:categoryType/:slug', articleController.getByTypeAndSlug);

// ===== ROUTE MẶC ĐỊNH (LIST & CREATE) =====
router.get('/', authenticateToken, articleController.getArticles);
router.post('/', authenticateToken, roleMiddleware(['staff', 'doctor', 'admin']), articleController.createArticle); // 🚨 Dòng này có thể là nguyên nhân lỗi 404 nếu thiếu controller trước đó!

module.exports = router; 
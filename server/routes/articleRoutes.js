// server/routes/articleRoutes.js - ✅ ĐÃ SỬA LẠI THỨ TỰ
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// =====================================================
// QUAN TRỌNG: THỨ TỰ ROUTES PHẢI ĐÚNG!
// Routes CỐ ĐỊNH phải đặt TRƯỚC routes ĐỘNG
// =====================================================

// ===== PUBLIC ROUTES - KHÔNG CẦN AUTH =====
router.get('/categories', articleController.getCategories);
router.get('/public', articleController.getPublicArticles);
router.get('/slug/:slug', articleController.getArticleBySlug);

// ===== PROTECTED ROUTES - CẦN AUTH =====

// --- TAGS (route cố định) ---
router.get('/tags/suggest', authenticateToken, articleController.suggestTags);

// --- SAVED ARTICLES (route cố định) ---
router.get('/saved', authenticateToken, articleController.getSavedArticles);

// ===== ROUTES VỚI :id - ĐẶT TRƯỚC /:categoryType/:slug =====

// --- REVIEW HISTORY ---
router.get('/:id/review-history', 
  authenticateToken, 
  articleController.getArticleReviewHistory
);

// --- COMMENTS ---
router.get('/:id/comments', 
  authenticateToken, 
  articleController.getArticleComments
);

router.post('/:id/comments', 
  authenticateToken, 
  articleController.addCommentToArticle
);

router.delete('/:id/comments/:commentId', 
  authenticateToken, 
  articleController.deleteComment
);

// --- REPORTS ---
router.get('/:id/reports', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.getArticleReports
);

router.post('/:id/report', 
  authenticateToken, 
  articleController.reportArticle
);

// --- INTERACTIONS ---
router.get('/:id/interactions', 
  authenticateToken, 
  articleController.getArticleInteractions
);

router.post('/:id/interact', 
  authenticateToken, 
  articleController.interactArticle
);

// --- TRACKING VIEW (không cần auth) ---
router.post('/:id/view', articleController.trackArticleView);

// --- REVIEW & APPROVAL (ADMIN) ---
router.post('/:id/review', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.reviewArticle
);

router.post('/:id/hide', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.hideArticle
);

router.post('/:id/unhide', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.unhideArticle
);

// --- REQUEST EDIT (STAFF/DOCTOR) ---
router.post('/:id/request-edit', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor']), 
  articleController.requestEditArticle
);

router.post('/:id/respond-edit', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.respondToEditRequest
);

router.post('/:id/resubmit', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor']), 
  articleController.resubmitArticle
);

// --- DUPLICATE ---
router.post('/:id/duplicate', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor', 'admin']), 
  articleController.duplicateArticle
);

// --- CRUD OPERATIONS (với :id) ---
// GET /:id - Lấy chi tiết bài viết theo ID
router.get('/:id', 
  authenticateToken, 
  articleController.getArticleById
);

router.put('/:id', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor', 'admin']), 
  articleController.updateArticle
);

router.delete('/:id', 
  authenticateToken, 
  articleController.deleteArticle
);

// ===== ROUTE ĐỘNG /:categoryType/:slug - ĐẶT CUỐI CÙNG =====
// Route này phải đặt SAU TẤT CẢ routes có :id
router.get('/:categoryType/:slug', articleController.getByTypeAndSlug);

// ===== ROUTE MẶC ĐỊNH =====
// GET / - Lấy danh sách bài viết (với filters)
router.get('/', 
  authenticateToken, 
  articleController.getArticles
);

// ===== POST / - Tạo bài viết mới =====
router.post('/', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor', 'admin']), 
  articleController.createArticle
);

module.exports = router;
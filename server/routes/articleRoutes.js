// server/routes/articleRoutes.js - Enhanced Routes
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ===== PUBLIC ROUTES - KHÔNG CẦN AUTH =====
router.get('/categories', articleController.getCategories);
router.get('/slug/:slug', articleController.getArticleBySlug);
router.get('/public', articleController.getPublicArticles);
router.get('/:categoryType/:slug', articleController.getByTypeAndSlug);

// ===== PROTECTED ROUTES - CẦN AUTH =====
router.get('/', authenticateToken, articleController.getArticles);
router.get('/tags/suggest', authenticateToken, articleController.suggestTags);
router.get('/saved', authenticateToken, articleController.getSavedArticles);
router.get('/:id', authenticateToken, articleController.getArticleById);
router.get('/:id/interactions', authenticateToken, articleController.getArticleInteractions);

// ===== REVIEW HISTORY =====
router.get('/:id/review-history', 
  authenticateToken, 
  roleMiddleware(['admin', 'staff', 'doctor']), 
  articleController.getArticleReviewHistory
);

// ===== STAFF/DOCTOR/ADMIN - TẠO & SỬA BÀI VIẾT =====
router.post('/', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor', 'admin']), 
  articleController.createArticle
);

router.put('/:id', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor', 'admin']), 
  articleController.updateArticle
);

// ===== STAFF/DOCTOR - YÊU CẦU CHỈNH SỬA & GỬI LẠI =====
router.post('/:id/request-edit', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor']), 
  articleController.requestEditArticle
);

router.post('/:id/resubmit', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor']), 
  articleController.resubmitArticle
);

router.post('/:id/duplicate', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor']), 
  articleController.duplicateArticle
);

// ===== ADMIN - QUẢN LÝ FULL =====
router.post('/:id/review', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.reviewArticle
);

router.post('/:id/respond-edit', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.respondToEditRequest
);

router.post('/:id/allow-edit', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.allowEditArticle
);

router.post('/:id/hide', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.hideArticle
);

router.delete('/:id', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.deleteArticle
);

// ===== TƯƠNG TÁC - TẤT CẢ USER =====
router.post('/:id/interact', 
  authenticateToken, 
  articleController.interactArticle
);

router.post('/:id/report', 
  authenticateToken, 
  articleController.reportArticle
);

module.exports = router;
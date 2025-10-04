// server/routes/articleRoutes.js - Updated
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public route - KHÔNG CẦN AUTH
router.get('/categories', articleController.getCategories);

// Public - Xem bài viết theo slug (không cần đăng nhập)
router.get('/slug/:slug', articleController.getArticleBySlug);

// Public - Danh sách bài viết công khai
router.get('/public', articleController.getPublicArticles);

// Protected routes - CẦN AUTH
router.get('/', authenticateToken, articleController.getArticles);
router.get('/tags/suggest', authenticateToken, articleController.suggestTags);
router.get('/:id', authenticateToken, articleController.getArticleById);

// Staff/Doctor/Admin routes - TẠO BÀI VIẾT
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

router.post('/:id/request-edit', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor']), 
  articleController.requestEditArticle
);

router.post('/:id/request-delete', 
  authenticateToken, 
  roleMiddleware(['staff', 'doctor']), 
  articleController.requestDeleteArticle
);

// Admin routes - QUẢN LÝ FULL
router.post('/:id/review', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  articleController.reviewArticle
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

// Report route - TẤT CẢ USER
router.post('/:id/report', 
  authenticateToken, 
  articleController.reportArticle
);

module.exports = router;
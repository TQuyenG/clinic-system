// server/routes/forumRoutes.js
const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const { authenticateToken, authenticateTokenBasic } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

// ========== PUBLIC ROUTES ==========
// Lấy danh sách câu hỏi đã duyệt (public)
router.get('/questions/public', forumController.getPublicQuestions);

// Lấy thống kê và bảng xếp hạng diễn đàn
router.get('/stats/overview', forumController.getForumOverview);

// Lấy chi tiết một câu hỏi và các câu trả lời
router.get('/questions/:id', forumController.getQuestionDetail);

// ========== AUTHENTICATED USER ROUTES ==========
// Người dùng đăng câu hỏi mới (cho phép user chưa verify/active)
router.post('/questions', authenticateTokenBasic, forumController.createQuestion);

// Người dùng trả lời câu hỏi
router.post('/questions/:id/answers', authenticateTokenBasic, forumController.createAnswer);

// Like/unlike câu hỏi
router.post('/questions/:id/like', authenticateTokenBasic, forumController.toggleLikeQuestion);

// Like/unlike câu trả lời
router.post('/answers/:id/like', authenticateTokenBasic, forumController.toggleLikeAnswer);

// Báo cáo câu hỏi/câu trả lời
router.post('/reports', authenticateTokenBasic, forumController.createReport);

// ========== ADMIN ROUTES ==========
// Lấy tất cả câu hỏi (bao gồm chờ duyệt, đã duyệt, không duyệt)
router.get('/questions', authenticateToken, requireRole(['admin']), forumController.getAllQuestions);

// Cập nhật trạng thái câu hỏi (approve/reject)
router.put('/questions/:id/status', authenticateToken, requireRole(['admin']), forumController.updateQuestionStatus);

// Xóa câu hỏi
router.delete('/questions/:id', authenticateToken, requireRole(['admin']), forumController.deleteQuestion);

// Xóa câu trả lời
router.delete('/answers/:id', authenticateToken, requireRole(['admin']), forumController.deleteAnswer);

// Pin/unpin câu trả lời (đánh dấu câu trả lời hay)
router.put('/answers/:id/pin', authenticateToken, requireRole(['admin', 'doctor']), forumController.togglePinAnswer);

// Verify câu trả lời (đánh dấu câu trả lời được xác thực bởi chuyên gia)
router.put('/answers/:id/verify', authenticateToken, requireRole(['admin', 'doctor']), forumController.toggleVerifyAnswer);

// Lấy danh sách báo cáo
router.get('/reports', authenticateToken, requireRole(['admin']), forumController.getReports);

// Cập nhật trạng thái báo cáo
router.put('/reports/:id', authenticateToken, requireRole(['admin']), forumController.updateReport);

module.exports = router;

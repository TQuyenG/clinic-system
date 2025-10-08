// server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ===== USER ROUTES - Xem và quản lý thông báo của mình =====
router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.put('/:id/read', authenticateToken, notificationController.markAsRead);
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);
router.delete('/:id', authenticateToken, notificationController.deleteNotification);
router.delete('/delete-all', authenticateToken, notificationController.deleteAllRead);

// ===== ADMIN ROUTES - Gửi thông báo hệ thống =====
router.post('/send', 
  authenticateToken, 
  roleMiddleware(['admin']), 
  notificationController.sendSystemNotification
);

module.exports = router;
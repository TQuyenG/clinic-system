// server/routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// PUBLIC - Gửi tin nhắn (không cần đăng nhập)
router.post('/send', contactController.sendMessage);

// PROTECTED - Quản lý tin nhắn (admin + staff support/system)
router.get(
  '/messages',
  authenticateToken,
  roleMiddleware(null, ['admin', 'staff']),
  contactController.getMessages
);

router.get(
  '/messages/:id',
  authenticateToken,
  roleMiddleware(null, ['admin', 'staff']),
  contactController.getMessageById
);

router.put(
  '/messages/:id/status',
  authenticateToken,
  roleMiddleware(null, ['admin', 'staff']),
  contactController.updateStatus
);

router.delete(
  '/messages/:id',
  authenticateToken,
  roleMiddleware(null, ['admin']),
  contactController.deleteMessage
);

router.delete(
  '/messages/bulk',
  authenticateToken,
  roleMiddleware(null, ['admin']),
  contactController.bulkDelete
);

module.exports = router;
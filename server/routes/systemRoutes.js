// server/routes/systemRoutes.js
const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware'); // Sửa tên import

// Routes cho System Settings - Chỉ admin
router.get('/settings/:page', authenticateToken, roleMiddleware(['admin']), systemController.getSettings);
router.put('/settings/:page', authenticateToken, roleMiddleware(['admin']), systemController.updateSettings);

module.exports = router;
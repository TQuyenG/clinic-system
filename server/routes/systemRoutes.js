// server/routes/systemRoutes.js
const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Routes cho System Settings
// GET không yêu cầu auth (cho public view trang tĩnh như home, about)
router.get('/:page', systemController.getSettings);
// PUT yêu cầu admin (để update content, banner, ảnh, v.v.)
router.put('/:page', authenticateToken, roleMiddleware(['admin']), systemController.updateSettings);

module.exports = router;
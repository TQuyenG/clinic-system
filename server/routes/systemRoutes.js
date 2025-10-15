// server/routes/systemRoutes.js
const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticateToken } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Routes cho System Settings

// Test endpoint để kiểm tra DB (không cần auth)
router.get('/test/db', systemController.testDB);

// GET không yêu cầu auth (cho public view trang tĩnh như home, about)
router.get('/:page', systemController.getSettings);

// PUT yêu cầu admin (để update content, banner, ảnh, v.v.)
router.put('/:page', authenticateToken, roleMiddleware(['admin']), systemController.updateSettings);

console.log('SUCCESS: System routes đã được mount với prefix /api/settings');
console.log('  - GET  /api/settings/test/db (test DB connection)');
console.log('  - GET  /api/settings/:page');
console.log('  - PUT  /api/settings/:page (requires admin)');

module.exports = router;
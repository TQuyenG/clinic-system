// ============================================
// server/routes/categoryRoutes.js
// ============================================

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Routes công khai - Lấy danh sách danh mục
router.get('/', categoryController.getAllCategories);
router.get('/parents', categoryController.getParentCategories);
router.get('/by-parent/:parentId', categoryController.getCategoriesByParent);
router.get('/:id', categoryController.getCategoryById);

// Routes dành cho Admin
router.post('/', authenticateToken, authorize('admin'), categoryController.createCategory);
router.put('/:id', authenticateToken, authorize('admin'), categoryController.updateCategory);
router.delete('/:id', authenticateToken, authorize('admin'), categoryController.deleteCategory);

module.exports = router;
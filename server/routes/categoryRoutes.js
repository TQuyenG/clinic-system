// ============================================
// server/routes/categoryRoutes.js
// Routes cho quản lý danh mục với category_type
// ============================================

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// ============================================
// PUBLIC ROUTES - Không cần authentication
// ============================================

/**
 * GET /api/categories
 * Lấy tất cả danh mục
 */
router.get('/', categoryController.getAllCategories);

/**
 * GET /api/categories/types
 * Lấy danh sách các loại danh mục (tin_tuc, thuoc, benh_ly) với số lượng
 */
router.get('/types', categoryController.getCategoryTypes);

/**
 * GET /api/categories/by-type/:type
 * Lấy danh mục theo loại (tin_tuc, thuoc, benh_ly)
 */
router.get('/by-type/:type', categoryController.getCategoriesByType);

/**
 * GET /api/categories/:id
 * Lấy chi tiết 1 danh mục theo ID
 */
router.get('/:id', categoryController.getCategoryById);

// ============================================
// PROTECTED ROUTES - Chỉ dành cho Admin
// ============================================

/**
 * POST /api/categories
 * Tạo danh mục mới (chỉ Admin)
 * Body: { category_type, name, slug, description }
 */
router.post(
  '/', 
  authenticateToken,
  authorize('admin'),
  categoryController.createCategory
);

/**
 * PUT /api/categories/:id
 * Cập nhật danh mục (chỉ Admin)
 * Body: { category_type, name, slug, description }
 */
router.put(
  '/:id', 
  authenticateToken,
  authorize('admin'),
  categoryController.updateCategory
);

/**
 * DELETE /api/categories/:id
 * Xóa danh mục (chỉ Admin)
 */
router.delete(
  '/:id', 
  authenticateToken,
  authorize('admin'),
  categoryController.deleteCategory
);

module.exports = router;
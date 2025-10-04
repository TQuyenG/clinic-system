// ============================================
// server/controllers/categoryController.js
// Controller cho quản lý danh mục với category_type
// ============================================

const { models } = require('../config/db');
const { Op } = require('sequelize');

// Danh sách loại danh mục hợp lệ
const CATEGORY_TYPES = {
  TIN_TUC: 'tin_tuc',
  THUOC: 'thuoc',
  BENH_LY: 'benh_ly'
};

const CATEGORY_TYPE_LABELS = {
  'tin_tuc': 'Tin tức',
  'thuoc': 'Thuốc',
  'benh_ly': 'Bệnh lý'
};

/**
 * Lấy tất cả danh mục
 * GET /api/categories
 */
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await models.Category.findAll({
      order: [
        ['category_type', 'ASC'],
        ['name', 'ASC']
      ],
      raw: true
    });

    // Thêm label cho category_type
    const categoriesWithLabel = categories.map(cat => ({
      ...cat,
      category_type_label: CATEGORY_TYPE_LABELS[cat.category_type] || cat.category_type
    }));

    res.status(200).json({
      success: true,
      count: categories.length,
      categories: categoriesWithLabel
    });
  } catch (error) {
    console.error('ERROR trong getAllCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách danh mục',
      error: error.message
    });
  }
};

/**
 * Lấy danh mục theo loại (tin_tuc, thuoc, benh_ly)
 * GET /api/categories/by-type/:type
 */
exports.getCategoriesByType = async (req, res) => {
  try {
    const { type } = req.params;

    // Validate type
    if (!Object.values(CATEGORY_TYPES).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại danh mục không hợp lệ. Chỉ chấp nhận: tin_tuc, thuoc, benh_ly'
      });
    }

    const categories = await models.Category.findAll({
      where: { category_type: type },
      order: [['name', 'ASC']],
      raw: true
    });

    res.status(200).json({
      success: true,
      type,
      type_label: CATEGORY_TYPE_LABELS[type],
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error('ERROR trong getCategoriesByType:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh mục theo loại',
      error: error.message
    });
  }
};

/**
 * Lấy danh sách các loại danh mục (tin_tuc, thuoc, benh_ly)
 * GET /api/categories/types
 */
exports.getCategoryTypes = async (req, res) => {
  try {
    // Đếm số lượng danh mục con của mỗi loại
    const counts = await Promise.all(
      Object.values(CATEGORY_TYPES).map(async (type) => {
        const count = await models.Category.count({
          where: { category_type: type }
        });
        return {
          type,
          label: CATEGORY_TYPE_LABELS[type],
          count
        };
      })
    );

    res.status(200).json({
      success: true,
      types: counts
    });
  } catch (error) {
    console.error('ERROR trong getCategoryTypes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách loại danh mục',
      error: error.message
    });
  }
};

/**
 * Lấy chi tiết 1 danh mục
 * GET /api/categories/:id
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await models.Category.findByPk(id, {
      raw: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }

    // Đếm số bài viết trong danh mục
    const articleCount = await models.Article.count({
      where: { category_id: id }
    });

    res.status(200).json({
      success: true,
      category: {
        ...category,
        category_type_label: CATEGORY_TYPE_LABELS[category.category_type],
        article_count: articleCount
      }
    });
  } catch (error) {
    console.error('ERROR trong getCategoryById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin danh mục',
      error: error.message
    });
  }
};

/**
 * Tạo danh mục mới
 * POST /api/categories
 * Body: { category_type, name, slug, description }
 */
exports.createCategory = async (req, res) => {
  try {
    const { category_type, name, slug, description } = req.body;

    // Validate: Tên danh mục là bắt buộc
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục là bắt buộc'
      });
    }

    // Validate: category_type là bắt buộc
    if (!category_type) {
      return res.status(400).json({
        success: false,
        message: 'Loại danh mục là bắt buộc'
      });
    }

    // Validate: category_type phải hợp lệ
    if (!Object.values(CATEGORY_TYPES).includes(category_type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại danh mục không hợp lệ. Chỉ chấp nhận: tin_tuc, thuoc, benh_ly'
      });
    }

    // Tự động tạo slug từ tên nếu không nhập
    const finalSlug = slug || name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Kiểm tra slug có trùng không
    const existingSlug = await models.Category.findOne({
      where: { slug: finalSlug }
    });

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: `Slug "${finalSlug}" đã tồn tại. Vui lòng chọn tên khác.`
      });
    }

    // Tạo danh mục mới
    const category = await models.Category.create({
      category_type,
      name,
      slug: finalSlug,
      description: description || null
    });

    res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      category: {
        ...category.toJSON(),
        category_type_label: CATEGORY_TYPE_LABELS[category.category_type]
      }
    });
  } catch (error) {
    console.error('ERROR trong createCategory:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Slug danh mục đã tồn tại'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo danh mục',
      error: error.message
    });
  }
};

/**
 * Cập nhật danh mục
 * PUT /api/categories/:id
 * Body: { category_type, name, slug, description }
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_type, name, slug, description } = req.body;

    const category = await models.Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }

    // Validate category_type nếu có thay đổi
    if (category_type && !Object.values(CATEGORY_TYPES).includes(category_type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại danh mục không hợp lệ'
      });
    }

    // Kiểm tra slug trùng (nếu có thay đổi)
    if (slug && slug !== category.slug) {
      const existingSlug = await models.Category.findOne({
        where: { 
          slug,
          id: { [Op.ne]: id }
        }
      });

      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: `Slug "${slug}" đã tồn tại`
        });
      }
    }

    // Cập nhật thông tin
    if (category_type !== undefined) category.category_type = category_type;
    if (name !== undefined) category.name = name;
    if (slug !== undefined) category.slug = slug;
    if (description !== undefined) category.description = description;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      category: {
        ...category.toJSON(),
        category_type_label: CATEGORY_TYPE_LABELS[category.category_type]
      }
    });
  } catch (error) {
    console.error('ERROR trong updateCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật danh mục',
      error: error.message
    });
  }
};

/**
 * Xóa danh mục
 * DELETE /api/categories/:id
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await models.Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }

    // Kiểm tra còn bài viết trong danh mục không
    const articleCount = await models.Article.count({
      where: { category_id: id }
    });

    if (articleCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa. Có ${articleCount} bài viết trong danh mục này. Vui lòng chuyển hoặc xóa bài viết trước.`
      });
    }

    // Xóa danh mục
    await category.destroy();

    res.status(200).json({
      success: true,
      message: 'Xóa danh mục thành công'
    });
  } catch (error) {
    console.error('ERROR trong deleteCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa danh mục',
      error: error.message
    });
  }
};
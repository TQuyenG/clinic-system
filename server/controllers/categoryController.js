// ============================================
// server/controllers/categoryController.js
// ============================================

const { models } = require('../config/db');
const { Op } = require('sequelize');

// Lấy tất cả danh mục (có cấu trúc cây)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await models.Category.findAll({
      order: [['created_at', 'DESC']],
      include: [{
        model: models.Category,
        as: 'Children',
        required: false
      }]
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories
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

// Lấy danh mục cha (3 danh mục lớn: Tin tức, Thuốc, Bệnh lý)
exports.getParentCategories = async (req, res) => {
  try {
    const parentCategories = await models.Category.findAll({
      where: { parent_id: null },
      include: [{
        model: models.Category,
        as: 'Children',
        required: false
      }],
      order: [['created_at', 'ASC']]
    });

    res.status(200).json({
      success: true,
      categories: parentCategories
    });
  } catch (error) {
    console.error('ERROR trong getParentCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh mục cha',
      error: error.message
    });
  }
};

// Lấy danh mục con theo parent_id
exports.getCategoriesByParent = async (req, res) => {
  try {
    const { parentId } = req.params;

    const categories = await models.Category.findAll({
      where: { parent_id: parentId },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error('ERROR trong getCategoriesByParent:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh mục con',
      error: error.message
    });
  }
};

// Lấy chi tiết 1 danh mục
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await models.Category.findByPk(id, {
      include: [
        {
          model: models.Category,
          as: 'Parent',
          required: false
        },
        {
          model: models.Category,
          as: 'Children',
          required: false
        },
        {
          model: models.Article,
          attributes: ['id'],
          required: false
        }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }

    res.status(200).json({
      success: true,
      category: {
        ...category.toJSON(),
        articleCount: category.Articles?.length || 0
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

// Tạo danh mục mới
exports.createCategory = async (req, res) => {
  try {
    const { name, parent_id, slug } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục là bắt buộc'
      });
    }

    // Kiểm tra parent_id có tồn tại không
    if (parent_id) {
      const parentCategory = await models.Category.findByPk(parent_id);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Danh mục cha không tồn tại'
        });
      }
    }

    // Tự động tạo slug
    const finalSlug = slug || name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const category = await models.Category.create({
      name,
      parent_id: parent_id || null,
      slug: finalSlug
    });

    res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      category
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

// Cập nhật danh mục
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id, slug } = req.body;

    const category = await models.Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
    }

    // Không cho phép set parent_id = chính nó
    if (parent_id && parseInt(parent_id) === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể đặt danh mục làm cha của chính nó'
      });
    }

    // Kiểm tra parent_id mới
    if (parent_id) {
      const parentCategory = await models.Category.findByPk(parent_id);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Danh mục cha không tồn tại'
        });
      }
    }

    // Cập nhật
    if (name !== undefined) category.name = name;
    if (parent_id !== undefined) category.parent_id = parent_id || null;
    if (slug !== undefined) category.slug = slug;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      category
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

// Xóa danh mục
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

    // Kiểm tra danh mục con
    const childCount = await models.Category.count({
      where: { parent_id: id }
    });

    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa. Có ${childCount} danh mục con. Vui lòng xóa danh mục con trước.`
      });
    }

    // Kiểm tra bài viết
    const articleCount = await models.Article.count({
      where: { category_id: id }
    });

    if (articleCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa. Có ${articleCount} bài viết trong danh mục này. Vui lòng chuyển hoặc xóa bài viết trước.`
      });
    }

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
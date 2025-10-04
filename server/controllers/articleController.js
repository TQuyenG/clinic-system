// server/controllers/articleController.js
const { sequelize, models } = require('../config/db');
const { Article, Category, User, Interaction } = models;
const { Op } = require('sequelize');

// GET /api/articles/categories - Lấy danh sách categories (Public)
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['category_type', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/articles/slug/:slug - Lấy bài viết theo slug (Public)
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await Article.findOne({
      where: { 
        slug,
        status: 'approved' // Chỉ hiển thị bài đã duyệt
      },
      include: [
        { 
          model: Category,
          attributes: ['id', 'name', 'category_type', 'slug']
        },
        { 
          model: User, 
          as: 'author', 
          attributes: ['id', 'full_name']
        }
      ]
    });

    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    // Tăng lượt xem
    await article.increment('views');

    // Lấy thống kê interactions
    const interactions = await Interaction.findAll({
      where: { 
        entity_type: 'article', 
        entity_id: article.id 
      },
      attributes: [
        'interaction_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['interaction_type']
    });

    const stats = interactions.reduce((acc, stat) => {
      acc[stat.interaction_type] = parseInt(stat.dataValues.count);
      return acc;
    }, {});

    res.json({
      success: true,
      article: {
        ...article.toJSON(),
        likes: stats.like || 0,
        shares: stats.share || 0,
        saves: stats.save || 0
      }
    });
  } catch (error) {
    console.error('Error fetching article by slug:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/articles/public - Danh sách bài viết công khai
exports.getPublicArticles = async (req, res) => {
  try {
    const {
      category_id, category_type, search,
      page = 1, limit = 12
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { status: 'approved' };

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category_id) where.category_id = category_id;

    const categoryInclude = {
      model: Category,
      attributes: ['id', 'name', 'category_type', 'slug']
    };

    if (category_type) {
      categoryInclude.where = { category_type };
    }

    const { count, rows } = await Article.findAndCountAll({
      where,
      include: [
        categoryInclude,
        {
          model: User,
          as: 'author',
          attributes: ['id', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    res.json({
      success: true,
      articles: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    });
  } catch (error) {
    console.error('Error fetching public articles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/articles - Lấy danh sách bài viết với filters
exports.getArticles = async (req, res) => {
  try {
    const {
      search, status, category_id, category_type, author_id,
      date_from, date_to, min_views,
      page = 1, limit = 10,
      sort_by = 'created_at', sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Filters
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) where.status = status;
    if (category_id) where.category_id = category_id;
    if (author_id) where.author_id = author_id;
    if (min_views) where.views = { [Op.gte]: parseInt(min_views) };

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to);
    }

    // Staff chỉ xem bài viết của mình
    if (req.user.role === 'staff') {
      where.author_id = req.user.id;
    }

    // Include Category
    const categoryInclude = {
      model: Category,
      attributes: ['id', 'name', 'category_type', 'slug']
    };

    if (category_type) {
      categoryInclude.where = { category_type };
    }

    // Query
    const { count, rows } = await Article.findAndCountAll({
      where,
      include: [
        categoryInclude,
        {
          model: User,
          as: 'author',
          attributes: ['id', 'full_name', 'email']
        }
      ],
      order: [[sort_by, sort_order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // Lấy stats từ Interaction
    const articlesWithStats = await Promise.all(
      rows.map(async (article) => {
        const interactions = await Interaction.findAll({
          where: { 
            entity_type: 'article', 
            entity_id: article.id 
          },
          attributes: [
            'interaction_type',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          group: ['interaction_type']
        });

        const stats = interactions.reduce((acc, stat) => {
          acc[stat.interaction_type] = parseInt(stat.dataValues.count);
          return acc;
        }, {});

        return {
          ...article.toJSON(),
          likes: stats.like || 0,
          shares: stats.share || 0,
          views: stats.view || article.views || 0
        };
      })
    );

    // Thống kê tổng quan
    const statsWhere = req.user.role === 'staff' ? { author_id: req.user.id } : {};
    
    const totalStats = {
      total: count,
      pending: await Article.count({ where: { ...statsWhere, status: 'pending' } }),
      approved: await Article.count({ where: { ...statsWhere, status: 'approved' } }),
      rejected: await Article.count({ where: { ...statsWhere, status: 'rejected' } }),
      draft: await Article.count({ where: { ...statsWhere, status: 'draft' } })
    };

    res.json({
      success: true,
      articles: articlesWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      },
      stats: totalStats
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/articles/:id - Lấy chi tiết bài viết
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, {
      include: [
        { model: Category },
        { model: User, as: 'author', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    res.json({ success: true, article });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/articles/tags/suggest - Gợi ý tags
exports.suggestTags = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, tags: [] });
    }

    const articles = await Article.findAll({
      attributes: ['tags_json'],
      where: {
        tags_json: { [Op.ne]: null }
      },
      limit: 100
    });

    const allTags = new Set();
    articles.forEach(article => {
      if (Array.isArray(article.tags_json)) {
        article.tags_json.forEach(tag => {
          if (tag.toLowerCase().includes(q.toLowerCase())) {
            allTags.add(tag);
          }
        });
      }
    });

    res.json({ 
      success: true, 
      tags: Array.from(allTags).slice(0, 10) 
    });
  } catch (error) {
    console.error('Error suggesting tags:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/articles - Tạo bài viết mới (Staff/Doctor/Admin)
exports.createArticle = async (req, res) => {
  try {
    const { title, content, category_id, tags_json } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu tiêu đề hoặc nội dung' 
      });
    }

    // Tạo slug
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Admin tạo bài viết -> approved luôn, Staff/Doctor -> pending
    const status = req.user.role === 'admin' ? 'approved' : 'pending';

    const article = await Article.create({
      title,
      slug,
      content,
      category_id: category_id || null,
      author_id: req.user.id,
      tags_json: tags_json || [],
      status: status
    });

    const message = req.user.role === 'admin' 
      ? 'Tạo bài viết thành công!' 
      : 'Tạo bài viết thành công! Chờ admin duyệt.';

    res.json({ 
      success: true, 
      message: message, 
      article 
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/articles/:id - Cập nhật bài viết
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category_id, tags_json, status } = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    // Kiểm tra quyền
    if (req.user.role === 'staff' || req.user.role === 'doctor') {
      // Staff/Doctor chỉ sửa được bài của mình và phải là draft
      if (article.author_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'Không có quyền chỉnh sửa bài viết này' 
        });
      }

      if (article.status !== 'draft') {
        return res.status(403).json({ 
          success: false, 
          message: 'Chỉ có thể sửa bài viết ở trạng thái nháp' 
        });
      }
    }

    const updateData = { title, content, category_id, tags_json };
    
    // Admin có thể đổi status và ẩn bài
    if (req.user.role === 'admin' && status) {
      updateData.status = status;
    }

    await article.update(updateData);

    res.json({ 
      success: true, 
      message: 'Cập nhật bài viết thành công', 
      article 
    });
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/articles/:id/request-edit - Yêu cầu chỉnh sửa (Staff/Doctor)
exports.requestEditArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    // Chỉ tác giả mới được yêu cầu
    if (article.author_id !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ tác giả mới có thể yêu cầu chỉnh sửa' 
      });
    }

    // TODO: Tạo notification cho admin
    console.log(`User ${req.user.id} yêu cầu chỉnh sửa bài viết ${id}: ${reason}`);

    res.json({ 
      success: true, 
      message: 'Đã gửi yêu cầu chỉnh sửa đến admin' 
    });
  } catch (error) {
    console.error('Error requesting edit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/articles/:id/request-delete - Yêu cầu xóa (Staff/Doctor)
exports.requestDeleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    if (article.author_id !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ tác giả mới có thể yêu cầu xóa' 
      });
    }

    // TODO: Tạo notification cho admin
    console.log(`User ${req.user.id} yêu cầu xóa bài viết ${id}: ${reason}`);

    res.json({ 
      success: true, 
      message: 'Đã gửi yêu cầu xóa đến admin' 
    });
  } catch (error) {
    console.error('Error requesting delete:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/articles/:id/review - Duyệt bài viết (Admin)
exports.reviewArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejection_reason } = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    const updateData = {};

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.rejection_reason = null;
    } else if (action === 'reject') {
      updateData.status = 'rejected';
      updateData.rejection_reason = rejection_reason;
    } else if (action === 'rewrite') {
      updateData.status = 'rejected';
      updateData.rejection_reason = `Yêu cầu viết lại: ${rejection_reason}`;
    }

    await article.update(updateData);

    res.json({ 
      success: true, 
      message: 'Xử lý duyệt bài viết thành công', 
      article 
    });
  } catch (error) {
    console.error('Error reviewing article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/articles/:id/allow-edit - Cho phép chỉnh sửa (Admin)
exports.allowEditArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    // Chuyển về draft để tác giả có thể sửa
    await article.update({ status: 'draft' });

    res.json({ 
      success: true, 
      message: 'Đã cho phép tác giả chỉnh sửa bài viết', 
      article 
    });
  } catch (error) {
    console.error('Error allowing edit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/articles/:id - Xóa bài viết (Admin)
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    await article.destroy();

    res.json({ 
      success: true, 
      message: 'Xóa bài viết thành công' 
    });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/articles/:id/hide - Ẩn/Hiện bài viết (Admin)
exports.hideArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { hide } = req.body; // true = ẩn, false = hiện

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    const newStatus = hide ? 'hidden' : 'approved';
    await article.update({ status: newStatus });

    res.json({ 
      success: true, 
      message: hide ? 'Đã ẩn bài viết' : 'Đã hiện bài viết', 
      article 
    });
  } catch (error) {
    console.error('Error hiding article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/articles/:id/report - Báo cáo bài viết
exports.reportArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bài viết' 
      });
    }

    // Tạo interaction loại report
    await Interaction.create({
      user_id: req.user.id,
      entity_type: 'article',
      entity_id: id,
      interaction_type: 'report',
      reason: reason
    });

    res.json({ 
      success: true, 
      message: 'Đã gửi báo cáo bài viết' 
    });
  } catch (error) {
    console.error('Error reporting article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
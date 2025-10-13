// server/controllers/articleController.js - HOÀN CHỈNH
const { sequelize, models } = require('../config/db');
const { 
  Article, Category, User, Interaction, Notification, Medicine, Disease,
  ArticleReviewHistory, ArticleComment 
} = models;
const { Op } = require('sequelize');
const slugify = require('slugify');

// ==================== HELPER FUNCTIONS ====================

/**
 * Tạo thông báo cho 1 user
 */
const createNotification = async (userId, type, message, link) => {
  try {
    await Notification.create({
      user_id: userId,
      type,
      message,
      link,
      is_read: false
    });
    console.log(`✓ Đã tạo thông báo cho user ${userId}`);
  } catch (error) {
    console.error('✗ Lỗi khi tạo thông báo:', error);
  }
};

/**
 * Gửi thông báo đến tất cả admin
 */
const notifyAllAdmins = async (type, message, link) => {
  try {
    const admins = await User.findAll({
      include: [{
        model: models.Admin,
        as: 'adminProfile',
        required: true
      }]
    });

    for (const admin of admins) {
      await createNotification(admin.id, type, message, link);
    }
    console.log(`✓ Đã gửi thông báo tới ${admins.length} admin`);
  } catch (error) {
    console.error('✗ Lỗi khi gửi thông báo tới admin:', error);
  }
};

/**
 * Load thêm dữ liệu medicine/disease nếu có
 */
const loadEntityData = async (article) => {
  const articleData = article.toJSON ? article.toJSON() : article;
  
  if (articleData.entity_type === 'medicine' && articleData.entity_id) {
    const medicine = await Medicine.findByPk(articleData.entity_id);
    return { ...articleData, medicine };
  }
  
  if (articleData.entity_type === 'disease' && articleData.entity_id) {
    const disease = await Disease.findByPk(articleData.entity_id);
    return { ...articleData, disease };
  }
  
  return articleData;
};

/**
 * Tạo lịch sử phê duyệt
 */
const createReviewHistory = async (
  articleId, 
  reviewerId, 
  authorId, 
  action, 
  reason, 
  prevStatus, 
  newStatus, 
  metadata = null, 
  transaction
) => {
  try {
    await ArticleReviewHistory.create({
      article_id: articleId,
      reviewer_id: reviewerId,
      author_id: authorId,
      action,
      reason: reason ? reason.substring(0, 500) : null,
      previous_status: prevStatus,
      new_status: newStatus,
      metadata_json: metadata
    }, { transaction });
    console.log(`✓ Đã lưu lịch sử: ${action}`);
  } catch (error) {
    console.error('✗ Lỗi khi tạo review history:', error);
    throw error;
  }
};

// ==================== PUBLIC ROUTES (Không cần đăng nhập) ====================

/**
 * GET /api/articles/categories
 * Lấy danh sách tất cả categories
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['category_type', 'ASC'], ['name', 'ASC']]
    });
    res.json({ success: true, categories });
  } catch (error) {
    console.error('ERROR: Lỗi khi lấy danh mục:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/articles/slug/:slug
 * Lấy bài viết theo slug (CHỈ bài đã duyệt)
 */
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await Article.findOne({
      where: { slug, status: 'approved' },
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'author', attributes: ['id', 'username', 'full_name', 'avatar_url'] },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ]
    });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const articleData = await loadEntityData(article);
    res.json({ success: true, article: articleData });
  } catch (error) {
    console.error('ERROR: Lỗi khi lấy bài viết theo slug:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/articles/public
 * Lấy danh sách bài viết public (CHỈ bài đã duyệt)
 */
exports.getPublicArticles = async (req, res) => {
  try {
    const { category_id, category_type, search, page = 1, limit = 12 } = req.query;
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
      as: 'category',
      attributes: ['id', 'name', 'category_type', 'slug']
    };

    if (category_type) {
      categoryInclude.where = { category_type };
    }

    const { count, rows } = await Article.findAndCountAll({
      where,
      include: [
        categoryInclude,
        { model: User, as: 'author', attributes: ['id', 'full_name'] },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    const articlesWithEntity = await Promise.all(
      rows.map(article => loadEntityData(article))
    );

    res.json({
      success: true,
      articles: articlesWithEntity,
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

/**
 * GET /api/articles/:categoryType/:slug
 * Lấy bài viết hoặc danh mục theo categoryType + slug
 */
exports.getByTypeAndSlug = async (req, res) => {
  try {
    const { categoryType, slug } = req.params;

    const typeMap = {
      'tin-tuc': 'tin_tuc',
      'thuoc': 'thuoc',
      'benh-ly': 'benh_ly'
    };

    const dbCategoryType = typeMap[categoryType] || categoryType;

    // Tìm bài viết trước
    const article = await Article.findOne({
      where: { slug, status: 'approved' },
      include: [
        { 
          model: Category, 
          as: 'category',
          where: { category_type: dbCategoryType }
        },
        { model: User, as: 'author', attributes: ['id', 'username', 'full_name', 'avatar_url'] },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ]
    });

    if (article) {
      const articleData = await loadEntityData(article);
      return res.json({ 
        success: true, 
        type: 'article', 
        data: articleData 
      });
    }

    // Không tìm thấy bài viết -> tìm category
    const category = await Category.findOne({
      where: { 
        slug, 
        category_type: dbCategoryType 
      }
    });

    if (category) {
      return res.json({ 
        success: true, 
        type: 'category', 
        data: category 
      });
    }

    return res.status(404).json({ 
      success: false, 
      message: 'Không tìm thấy bài viết hoặc danh mục' 
    });

  } catch (error) {
    console.error('Error in getByTypeAndSlug:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/view
 * Tracking view cho bài viết (KHÔNG cần auth, tracking bằng IP)
 */
exports.trackArticleView = async (req, res) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // Check xem IP này đã view trong 24h chưa (tránh spam)
    const last24h = new Date(Date.now() - 24 * 3600000);
    const existingView = await Interaction.findOne({
      where: {
        entity_type: 'article',
        entity_id: id,
        interaction_type: 'view',
        ip_address: ipAddress,
        created_at: { [Op.gte]: last24h }
      }
    });

    if (existingView) {
      return res.json({ success: true, message: 'View đã được ghi nhận trước đó' });
    }

    // Tạo interaction view
    await Interaction.create({
      user_id: req.user ? req.user.id : null, // Null nếu anonymous
      entity_type: 'article',
      entity_id: id,
      interaction_type: 'view',
      ip_address: ipAddress,
      user_agent: req.get('user-agent')
    });

    // Cập nhật views count trong article
    await article.increment('views');

    res.json({ success: true, message: 'Đã ghi nhận lượt xem' });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== AUTHENTICATED ROUTES (Cần đăng nhập) ====================

/**
 * GET /api/articles/saved
 * Lấy danh sách bài viết đã lưu của user
 */
exports.getSavedArticles = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const savedInteractions = await Interaction.findAll({
      where: {
        user_id: req.user.id,
        entity_type: 'article',
        interaction_type: 'save'
      },
      attributes: ['entity_id'],
      order: [['created_at', 'DESC']]
    });

    const articleIds = savedInteractions.map(i => i.entity_id);

    if (articleIds.length === 0) {
      return res.json({
        success: true,
        articles: [],
        pagination: { currentPage: 1, totalPages: 0, totalItems: 0 }
      });
    }

    const { count, rows } = await Article.findAndCountAll({
      where: { 
        id: { [Op.in]: articleIds },
        status: 'approved' 
      },
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'author', attributes: ['id', 'full_name'] },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    const articlesWithEntity = await Promise.all(
      rows.map(article => loadEntityData(article))
    );

    res.json({
      success: true,
      articles: articlesWithEntity,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    });

  } catch (error) {
    console.error('Error fetching saved articles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/articles
 * Lấy danh sách bài viết (Admin: all, Staff/Doctor: chỉ của mình)
 */
exports.getArticles = async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      category_id = '',
      category_type = '',
      author_id = '',
      date_from = '',
      date_to = '',
      min_views = '',
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const where = {};

    // PHÂN QUYỀN: Staff/Doctor chỉ thấy bài của mình
    if (req.user.role === 'staff' || req.user.role === 'doctor') {
      where.author_id = req.user.id;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { '$category.name$': { [Op.like]: `%${search}%` } },
        { '$author.full_name$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;
    if (category_id) where.category_id = category_id;
    if (author_id && req.user.role === 'admin') where.author_id = author_id; // Chỉ admin filter theo author
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = date_from;
      if (date_to) where.created_at[Op.lte] = date_to;
    }
    if (min_views) where.views = { [Op.gte]: parseInt(min_views) };

    if (category_type) {
      where['$category.category_type$'] = category_type;
    }

    const include = [
      { model: Category, as: 'category' },
      { model: User, as: 'author', attributes: ['id', 'username', 'full_name', 'avatar_url'] },
      { model: Medicine, as: 'medicine', required: false },
      { model: Disease, as: 'disease', required: false }
    ];

    const articles = await Article.findAndCountAll({
      where,
      include,
      order: [[sort_by, sort_order]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      distinct: true
    });

    const processedArticles = await Promise.all(
      articles.rows.map(article => loadEntityData(article))
    );

    res.json({
      success: true,
      count: articles.count,
      articles: processedArticles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(articles.count / parseInt(limit)),
        totalItems: articles.count
      },
      stats: {
        pending: await Article.count({ where: { status: 'pending', ...(req.user.role !== 'admin' && { author_id: req.user.id }) } }),
        approved: await Article.count({ where: { status: 'approved', ...(req.user.role !== 'admin' && { author_id: req.user.id }) } }),
        rejected: await Article.count({ where: { status: 'rejected', ...(req.user.role !== 'admin' && { author_id: req.user.id }) } }),
        request_edit: await Article.count({ where: { status: 'request_edit', ...(req.user.role !== 'admin' && { author_id: req.user.id }) } }),
        draft: await Article.count({ where: { status: 'draft', ...(req.user.role !== 'admin' && { author_id: req.user.id }) } })
      }
    });
  } catch (error) {
    console.error('ERROR: Lỗi khi lấy danh sách bài viết:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/articles/:id
 * Lấy chi tiết bài viết (Admin: all, Staff/Doctor: chỉ của mình)
 */
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'author' },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ]
    });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // PHÂN QUYỀN: Staff/Doctor chỉ xem được bài của mình
    if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem bài viết này' });
    }

    const articleWithEntity = await loadEntityData(article);

    res.json({ success: true, article: articleWithEntity });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/articles/tags/suggest
 * Gợi ý tags
 */
exports.suggestTags = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ success: true, tags: [] });

    const tags = await Article.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('tags_json')), 'tag']
      ],
      where: {
        tags_json: { [Op.like]: `%${query}%` }
      },
      limit: 10
    });

    res.json({
      success: true,
      tags: tags.map(t => t.tag)
    });
  } catch (error) {
    console.error('Error suggesting tags:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CRUD BÀI VIẾT (Staff/Doctor/Admin) ====================

/**
 * POST /api/articles
 * Tạo bài viết mới
 * Params: 
 * - saveAsDraft: true = lưu nháp, false = gửi phê duyệt
 */
exports.createArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title, content, category_id, tags_json, source,
      composition, uses, side_effects, manufacturer,
      symptoms, treatments, description,
      saveAsDraft // ← Tham số mới: true = draft, false = pending
    } = req.body;

    const category = await Category.findByPk(category_id, { transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Danh mục không tồn tại' });
    }

    const slug = slugify(title, { lower: true, strict: true });

    // Check slug trùng với category
    const categoryConflict = await Category.findOne({
      where: { slug, category_type: category.category_type },
      transaction
    });

    if (categoryConflict) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Slug này trùng với danh mục. Vui lòng chọn tiêu đề khác.' 
      });
    }

    // Tạo entity nếu là medicine/disease
    let entity = null;
    let entityType = 'article';

    if (category.category_type === 'thuoc') {
      entity = await Medicine.create({
        category_id,
        name: title,
        composition,
        uses,
        side_effects,
        manufacturer,
        description
      }, { transaction });
      entityType = 'medicine';
    } else if (category.category_type === 'benh_ly') {
      entity = await Disease.create({
        category_id,
        name: title,
        symptoms,
        treatments,
        description
      }, { transaction });
      entityType = 'disease';
    }

    // Xác định status
    let initialStatus;
    if (req.user.role === 'admin') {
      initialStatus = 'approved'; // Admin tự động duyệt
    } else {
      initialStatus = saveAsDraft ? 'draft' : 'pending'; // Staff: draft hoặc pending
    }

    const article = await Article.create({
      title,
      slug,
      content,
      category_id,
      author_id: req.user.id,
      entity_type: entityType,
      entity_id: entity ? entity.id : null,
      tags_json: tags_json || [],
      status: initialStatus,
      source
    }, { transaction });

    // Lưu lịch sử
    await createReviewHistory(
      article.id,
      req.user.id,
      req.user.id,
      req.user.role === 'admin' ? 'approve' : 'submit',
      req.user.role === 'admin' ? 'Tự động duyệt bởi admin' : null,
      null,
      initialStatus,
      { version: 1 },
      transaction
    );

    await transaction.commit();

    // Gửi thông báo nếu là pending (gửi phê duyệt)
    if (initialStatus === 'pending') {
      await notifyAllAdmins(
        'article',
        `${req.user.full_name} đã tạo bài viết mới "${title}" cần phê duyệt.`,
        `/articles/review/${article.id}`
      );
    }

    res.json({ 
      success: true, 
      message: saveAsDraft ? 'Đã lưu nháp' : 'Tạo bài viết thành công', 
      article 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/articles/:id
 * Cập nhật bài viết
 * Quyền: Admin (mọi lúc), Staff/Doctor (chỉ khi draft hoặc request_edit)
 */
exports.updateArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      title, content, category_id, tags_json, source,
      composition, uses, side_effects, manufacturer,
      symptoms, treatments, description, 
      saveAsDraft // ← true = lưu draft, false = gửi pending
    } = req.body;

    const article = await Article.findByPk(id, { transaction });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // PHÂN QUYỀN
    if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa bài viết này' });
    }

    // Staff/Doctor chỉ sửa được khi draft hoặc request_edit
    if (req.user.role !== 'admin' && !['draft', 'request_edit'].includes(article.status)) {
      await transaction.rollback();
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn chỉ có thể sửa bài viết ở trạng thái nháp hoặc được phép chỉnh sửa' 
      });
    }

    const category = await Category.findByPk(category_id || article.category_id, { transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Danh mục không tồn tại' });
    }

    const newSlug = title ? slugify(title, { lower: true, strict: true }) : article.slug;

    // Xác định status mới
    let newStatus = article.status;
    if (req.user.role !== 'admin') {
      newStatus = saveAsDraft ? 'draft' : 'pending';
    }

    await article.update({
      title: title || article.title,
      slug: newSlug,
      content: content || article.content,
      category_id: category_id || article.category_id,
      tags_json: tags_json || article.tags_json,
      source: source || article.source,
      status: newStatus
    }, { transaction });

    // Cập nhật entity
    if (article.entity_type === 'medicine' && article.entity_id) {
      const medicine = await Medicine.findByPk(article.entity_id, { transaction });
      await medicine.update({
        name: title || medicine.name,
        composition: composition || medicine.composition,
        uses: uses || medicine.uses,
        side_effects: side_effects || medicine.side_effects,
        manufacturer: manufacturer || medicine.manufacturer,
        description: description || medicine.description
      }, { transaction });
    } else if (article.entity_type === 'disease' && article.entity_id) {
      const disease = await Disease.findByPk(article.entity_id, { transaction });
      await disease.update({
        name: title || disease.name,
        symptoms: symptoms || disease.symptoms,
        treatments: treatments || disease.treatments,
        description: description || disease.description
      }, { transaction });
    }

    await transaction.commit();

    // Gửi thông báo nếu gửi phê duyệt
    if (newStatus === 'pending' && article.status !== 'pending') {
      await notifyAllAdmins(
        'article',
        `${req.user.full_name} đã cập nhật và gửi phê duyệt bài viết "${article.title}".`,
        `/articles/review/${article.id}`
      );
    }

    res.json({ 
      success: true, 
      message: saveAsDraft ? 'Đã lưu nháp' : 'Cập nhật bài viết thành công', 
      article 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/articles/:id
 * Xóa bài viết
 * Quyền: Admin (mọi lúc), Staff/Doctor (chỉ khi draft)
 */
exports.deleteArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, { transaction });

    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // PHÂN QUYỀN
    if (req.user.role === 'admin') {
      // Admin xóa được mọi lúc
    } else if (article.author_id === req.user.id && article.status === 'draft') {
      // Staff/Doctor xóa được bản nháp của mình
    } else {
      await transaction.rollback();
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn chỉ có thể xóa bài viết ở trạng thái nháp' 
      });
    }

    // Xóa entity liên quan
    if (article.entity_type === 'medicine' && article.entity_id) {
      await Medicine.destroy({ where: { id: article.entity_id }, transaction });
    }
    if (article.entity_type === 'disease' && article.entity_id) {
      await Disease.destroy({ where: { id: article.entity_id }, transaction });
    }

    await article.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Xóa bài viết thành công' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/duplicate
 * Nhân bản bài viết
 * Quyền: Admin, Staff, Doctor (nhân bản bất kỳ bài nào họ có quyền xem)
 */
exports.duplicateArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const original = await Article.findByPk(id, {
      include: [
        { model: Medicine, as: 'medicine' },
        { model: Disease, as: 'disease' }
      ],
      transaction
    });

    if (!original) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // PHÂN QUYỀN: Staff/Doctor chỉ nhân bản bài của mình
    if (req.user.role !== 'admin' && original.author_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền nhân bản bài viết này' });
    }

    // Nhân bản entity
    let newEntity = null;
    if (original.entity_type === 'medicine' && original.medicine) {
      const medicineData = original.medicine.toJSON();
      delete medicineData.id;
      newEntity = await Medicine.create(medicineData, { transaction });
    } else if (original.entity_type === 'disease' && original.disease) {
      const diseaseData = original.disease.toJSON();
      delete diseaseData.id;
      newEntity = await Disease.create(diseaseData, { transaction });
    }

    // Tạo slug mới (thêm số random để tránh trùng)
    const randomSuffix = Math.floor(Math.random() * 10000);
    const newSlug = `${original.slug}-copy-${randomSuffix}`;

    const newArticleData = {
      title: `${original.title} (Copy)`,
      slug: newSlug,
      content: original.content,
      category_id: original.category_id,
      author_id: req.user.id,
      entity_type: original.entity_type,
      entity_id: newEntity ? newEntity.id : null,
      tags_json: original.tags_json,
      status: 'draft',
      source: original.source,
      views: 0
    };

    const newArticle = await Article.create(newArticleData, { transaction });

    await transaction.commit();

    res.json({ success: true, message: 'Nhân bản bài viết thành công', article: newArticle });
  } catch (error) {
    await transaction.rollback();
    console.error('Error duplicating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REVIEW & APPROVAL (Admin Only) ====================

/**
 * POST /api/articles/:id/review
 * Phê duyệt bài viết (Admin only)
 * Body: { action: 'approve' | 'reject' | 'rewrite', reason: string }
 */
exports.reviewArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    const article = await Article.findByPk(id, {
      include: [{ model: User, as: 'author' }],
      transaction
    });

    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      rewrite: 'request_rewrite'
    };

    const prevStatus = article.status;
    const newStatus = statusMap[action];

    if (!newStatus) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Hành động không hợp lệ. Chỉ chấp nhận: approve, reject, rewrite' 
      });
    }

    await article.update({
      status: newStatus,
      rejection_reason: (action === 'reject' || action === 'rewrite') ? reason : null
    }, { transaction });

    // Lưu lịch sử
    await createReviewHistory(
      article.id,
      req.user.id,
      article.author_id,
      action === 'rewrite' ? 'request_rewrite' : action,
      reason,
      prevStatus,
      newStatus,
      { reviewer_role: req.user.role },
      transaction
    );

    await transaction.commit();

    // Gửi thông báo cho tác giả
    const actionMessages = {
      approve: 'đã được phê duyệt',
      reject: 'đã bị từ chối',
      rewrite: 'cần viết lại'
    };

    await createNotification(
      article.author_id,
      'article',
      `Bài viết "${article.title}" ${actionMessages[action]}. ${reason ? `Lý do: ${reason}` : ''}`,
      `/articles/review/${id}`
    );

    res.json({ success: true, message: 'Đã xử lý phê duyệt', article });
  } catch (error) {
    await transaction.rollback();
    console.error('Error reviewing article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/hide
 * Ẩn bài viết (Admin only)
 * Body: { reason: string }
 */
exports.hideArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do ẩn bài viết' });
    }

    const article = await Article.findByPk(id, { transaction });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const prevStatus = article.status;

    await article.update({ status: 'hidden' }, { transaction });

    // Lưu lịch sử
    await createReviewHistory(
      article.id,
      req.user.id,
      article.author_id,
      'hide',
      reason,
      prevStatus,
      'hidden',
      null,
      transaction
    );

    await transaction.commit();

    // Gửi thông báo cho tác giả
    await createNotification(
      article.author_id,
      'article',
      `Admin đã ẩn bài viết "${article.title}". Lý do: ${reason}`,
      `/articles/review/${id}`
    );

    res.json({ 
      success: true, 
      message: 'Đã ẩn bài viết', 
      article 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error hiding article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/unhide
 * Hiện lại bài viết đã ẩn (Admin only)
 */
exports.unhideArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, { transaction });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (article.status !== 'hidden') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Bài viết không ở trạng thái ẩn' });
    }

    const prevStatus = article.status;

    await article.update({ status: 'approved' }, { transaction });

    // Lưu lịch sử
    await createReviewHistory(
      article.id,
      req.user.id,
      article.author_id,
      'unhide',
      'Admin hiện lại bài viết',
      prevStatus,
      'approved',
      null,
      transaction
    );

    await transaction.commit();

    // Gửi thông báo cho tác giả
    await createNotification(
      article.author_id,
      'article',
      `Admin đã hiện lại bài viết "${article.title}"`,
      `/articles/review/${id}`
    );

    res.json({ 
      success: true, 
      message: 'Đã hiện bài viết', 
      article 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error unhiding article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REQUEST EDIT (Staff/Doctor) ====================

/**
 * POST /api/articles/:id/request-edit
 * Yêu cầu chỉnh sửa bài đã duyệt (Staff/Doctor only)
 * Body: { reason: string }
 */
exports.requestEditArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do yêu cầu chỉnh sửa' });
    }

    const article = await Article.findByPk(id, { transaction });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // Check quyền
    if (article.author_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền yêu cầu chỉnh sửa bài viết này' });
    }

    if (article.status !== 'approved') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Chỉ có thể yêu cầu chỉnh sửa bài viết đã duyệt' });
    }

    const prevStatus = article.status;

    await article.update({
      status: 'request_edit',
      edit_request_reason: reason
    }, { transaction });

    await createReviewHistory(
      article.id,
      req.user.id,
      req.user.id,
      'request_edit',
      reason,
      prevStatus,
      'request_edit',
      null,
      transaction
    );

    await transaction.commit();

    await notifyAllAdmins(
      'article',
      `${req.user.full_name} yêu cầu chỉnh sửa bài viết "${article.title}". Lý do: ${reason}`,
      `/articles/review/${id}`
    );

    res.json({ success: true, message: 'Yêu cầu chỉnh sửa đã được gửi' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error requesting edit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/respond-edit
 * Admin phản hồi yêu cầu chỉnh sửa (Admin only)
 * Body: { allow: boolean, reason?: string }
 */
exports.respondToEditRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { allow, reason } = req.body;

    const article = await Article.findByPk(id, { transaction });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const prevStatus = article.status;
    const newStatus = allow ? 'pending' : 'approved';

    await article.update({ 
      status: newStatus,
      edit_request_reason: null
    }, { transaction });

    await createReviewHistory(
      article.id,
      req.user.id,
      article.author_id,
      allow ? 'allow_edit' : 'deny_edit',
      reason,
      prevStatus,
      newStatus,
      null,
      transaction
    );

    await transaction.commit();

    await createNotification(
      article.author_id,
      'article',
      `Admin đã ${allow ? 'cho phép' : 'từ chối'} yêu cầu chỉnh sửa bài viết "${article.title}". ${reason ? `Lý do: ${reason}` : ''}`,
      `/articles/review/${id}`
    );

    res.json({ 
      success: true, 
      message: allow ? 'Đã cho phép chỉnh sửa' : 'Đã từ chối yêu cầu',
      article 
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error responding to edit request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/resubmit
 * Gửi lại bài viết sau khi chỉnh sửa (Staff/Doctor only)
 * Body: { changes: string }
 */
exports.resubmitArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { changes } = req.body;

    const article = await Article.findByPk(id, { transaction });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const prevStatus = article.status;

    await article.update({
      status: 'pending'
    }, { transaction });

    const historyCount = await ArticleReviewHistory.count({
      where: { article_id: id },
      transaction
    });

    await createReviewHistory(
      article.id,
      req.user.id,
      req.user.id,
      'resubmit',
      null,
      prevStatus,
      'pending',
      { version: historyCount + 1, changes },
      transaction
    );

    await transaction.commit();

    await notifyAllAdmins(
      'article',
      `${req.user.full_name} đã gửi lại bài viết "${article.title}" sau khi chỉnh sửa.`,
      `/articles/review/${id}`
    );

    res.json({ success: true, message: 'Đã gửi lại bài viết để phê duyệt' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error resubmitting article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== INTERACTIONS (Like, Share, Save, Report) ====================

/**
 * POST /api/articles/:id/interact
 * Tương tác với bài viết (like, share, save)
 * Body: { type: 'like' | 'share' | 'save', metadata?: object }
 */
exports.interactArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, metadata } = req.body;

    if (!['like', 'share', 'save'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Loại tương tác không hợp lệ' });
    }

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const existingInteraction = await Interaction.findOne({
      where: {
        user_id: req.user.id,
        entity_type: 'article',
        entity_id: id,
        interaction_type: type
      }
    });

    if (existingInteraction) {
      // Toggle off
      await existingInteraction.destroy();
      return res.json({ 
        success: true, 
        message: `Đã hủy ${type === 'like' ? 'thích' : type === 'save' ? 'lưu' : 'chia sẻ'}`,
        action: 'removed',
        state: {
          isLiked: type === 'like' ? false : undefined,
          isSaved: type === 'save' ? false : undefined
        }
      });
    }

    // Toggle on
    await Interaction.create({
      user_id: req.user.id,
      entity_type: 'article',
      entity_id: id,
      interaction_type: type,
      metadata_json: metadata || null
    });

    res.json({ 
      success: true, 
      message: `Đã ${type === 'like' ? 'thích' : type === 'save' ? 'lưu' : 'chia sẻ'} bài viết`,
      action: 'added',
      state: {
        isLiked: type === 'like' ? true : undefined,
        isSaved: type === 'save' ? true : undefined
      }
    });
  } catch (error) {
    console.error('Error interacting with article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/report
 * Báo cáo bài viết vi phạm
 * Body: { reason: string }
 */
exports.reportArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do báo cáo' });
    }

    const article = await Article.findByPk(id, {
      include: [{ model: User, as: 'author' }]
    });
    
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // Check xem đã báo cáo chưa
    const existingReport = await Interaction.findOne({
      where: {
        user_id: req.user.id,
        entity_type: 'article',
        entity_id: id,
        interaction_type: 'report'
      }
    });

    if (existingReport) {
      return res.status(400).json({ success: false, message: 'Bạn đã báo cáo bài viết này rồi' });
    }

    await Interaction.create({
      user_id: req.user.id,
      entity_type: 'article',
      entity_id: id,
      interaction_type: 'report',
      reason: reason
    });

    // Gửi thông báo đến admin (link đến slug bài viết để xem danh sách báo cáo)
    const typeMap = {
      'tin_tuc': 'tin-tuc',
      'thuoc': 'thuoc',
      'benh_ly': 'benh-ly'
    };
    const categoryType = typeMap[article.category?.category_type] || 'tin-tuc';
    const articleUrl = `/${categoryType}/${article.slug}`;

    await notifyAllAdmins(
      'system',
      `Bài viết "${article.title}" bị báo cáo vi phạm bởi ${req.user.full_name}. Lý do: ${reason}`,
      articleUrl
    );

    res.json({ success: true, message: 'Đã gửi báo cáo bài viết. Admin sẽ xem xét.' });
  } catch (error) {
    console.error('ERROR: Lỗi khi báo cáo bài viết:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/articles/:id/reports
 * Lấy danh sách báo cáo của bài viết (Admin only)
 */
exports.getArticleReports = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const reports = await Interaction.findAll({
      where: {
        entity_type: 'article',
        entity_id: id,
        interaction_type: 'report'
      },
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'full_name', 'avatar_url'] 
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      reports,
      count: reports.length
    });
  } catch (error) {
    console.error('Error fetching article reports:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/articles/:id/interactions
 * Lấy thống kê tương tác của bài viết
 */
exports.getArticleInteractions = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const stats = await Interaction.getStats('article', id);

    let userInteractions = {};
    if (req.user) {
      const interactions = await Interaction.findAll({
        where: {
          user_id: req.user.id,
          entity_type: 'article',
          entity_id: id
        },
        attributes: ['interaction_type']
      });

      userInteractions = interactions.reduce((acc, int) => {
        acc[int.interaction_type] = true;
        return acc;
      }, {});
    }

    res.json({
      success: true,
      stats: {
        likes: stats.like || 0,
        shares: stats.share || 0,
        saves: stats.save || 0,
        reports: stats.report || 0,
        views: article.views || 0
      },
      userInteractions
    });
  } catch (error) {
    console.error('ERROR: Lỗi khi lấy tương tác bài viết:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== COMMENTS (Trao đổi giữa Admin & Tác giả) ====================

/**
 * GET /api/articles/:id/comments
 * Lấy danh sách comment của bài viết
 */
exports.getArticleComments = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // PHÂN QUYỀN: Staff/Doctor chỉ xem comment của bài mình
    if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem comment của bài viết này' });
    }

    const comments = await ArticleComment.findAll({
      where: { 
        article_id: id,
        is_deleted: false
      },
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'full_name', 'avatar_url', 'role'] 
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      comments,
      count: comments.length
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/comments
 * Thêm comment vào bài viết
 * Body: { comment_text: string }
 */
exports.addCommentToArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment_text } = req.body;

    if (!comment_text || !comment_text.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung comment' });
    }

    const article = await Article.findByPk(id, {
      include: [{ model: User, as: 'author' }]
    });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // PHÂN QUYỀN: Chỉ admin hoặc tác giả mới comment được
    if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền comment vào bài viết này' });
    }

    const comment = await ArticleComment.create({
      article_id: id,
      user_id: req.user.id,
      comment_text: comment_text.trim()
    });

    // Gửi thông báo cho người còn lại
    const recipientId = req.user.role === 'admin' ? article.author_id : null;
    
    if (recipientId && recipientId !== req.user.id) {
      await createNotification(
        recipientId,
        'article',
        `${req.user.full_name} đã comment trong bài viết "${article.title}"`,
        `/articles/review/${id}`
      );
    } else if (req.user.role !== 'admin') {
      // Staff comment -> gửi cho tất cả admin
      await notifyAllAdmins(
        'article',
        `${req.user.full_name} đã comment trong bài viết "${article.title}"`,
        `/articles/review/${id}`
      );
    }

    const commentWithUser = await ArticleComment.findByPk(comment.id, {
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'full_name', 'avatar_url', 'role'] 
        }
      ]
    });

    res.json({ 
      success: true, 
      message: 'Đã thêm comment', 
      comment: commentWithUser 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/articles/:id/comments/:commentId
 * Xóa comment (chỉ người tạo hoặc admin)
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    const comment = await ArticleComment.findOne({
      where: { 
        id: commentId,
        article_id: id
      }
    });

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy comment' });
    }

    // PHÂN QUYỀN: Chỉ người tạo hoặc admin xóa được
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa comment này' });
    }

    // Soft delete
    await comment.update({ is_deleted: true });

    res.json({ success: true, message: 'Đã xóa comment' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REVIEW HISTORY ====================

/**
 * GET /api/articles/:id/review-history
 * Lấy lịch sử phê duyệt của bài viết
 */
exports.getArticleReviewHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // PHÂN QUYỀN: Staff/Doctor chỉ xem lịch sử bài của mình
    if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem lịch sử bài viết này' });
    }

    const history = await ArticleReviewHistory.findAll({
      where: { article_id: id },
      include: [
        { 
          model: User, 
          as: 'reviewer',  // ✅ Sửa từ 'action_by' thành 'reviewer'
          attributes: ['id', 'full_name', 'avatar_url', 'role'],
          required: false  // Cho phép null
        },
        { 
          model: User, 
          as: 'author', 
          attributes: ['id', 'full_name', 'avatar_url', 'role'],
          required: false  // Cho phép null
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching review history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
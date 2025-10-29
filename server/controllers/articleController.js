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
    // Tìm tất cả user có role là admin
    const admins = await User.findAll({
      where: { role: 'admin' }
    });

    for (const admin of admins) {
      await createNotification(admin.id, type, message, link);
    }
    console.log(`Đã gửi thông báo tới ${admins.length} admin`);
  } catch (error) {
    console.error('Lỗi khi gửi thông báo tới admin:', error);
  }
};

/**
 * Load thêm dữ liệu medicine/disease nếu có
 */
const loadEntityData = async (article) => {
  const articleData = article.toJSON ? article.toJSON() : article;
  
  // Nếu đã có medicine/disease từ include, trả về luôn
  if (articleData.medicine || articleData.disease) {
    return articleData;
  }
  
  // Chỉ fetch khi chưa có data (trường hợp không include)
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
    const { 
      category_id, 
      category_type, 
      search, 
      tag,
      letter,
      sort_by = 'created_at',
      sort_order = 'DESC',
      page = 1, 
      limit = 12 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const where = { status: 'approved' };

    // Search
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    // Letter filter (chữ cái đầu)
    if (letter) {
      where.title = { [Op.like]: `${letter}%` };
    }

    // Category filter
    if (category_id) where.category_id = category_id;

    const categoryInclude = {
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'category_type', 'slug']
    };

    if (category_type) {
      categoryInclude.where = { category_type };
    }

    // Fetch articles
    let { count, rows } = await Article.findAndCountAll({
      where,
      include: [
        categoryInclude,
        { model: User, as: 'author', attributes: ['id', 'full_name'] },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ],
      order: [[sort_by, sort_order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // Filter by tag nếu có
    if (tag) {
      rows = rows.filter(article => 
        article.tags_json && Array.isArray(article.tags_json) && article.tags_json.includes(tag)
      );
      count = rows.length;
    }

    // Load entity data
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
 * Lấy danh sách bài viết (Admin thấy tất cả trừ draft của người khác, Tác giả chỉ thấy của mình)
 */
exports.getArticles = async (req, res) => {
  try {
    const {
      search,
      status,
      category_id,
      category_type,
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'DESC',
      exclude_drafts_of_others,
      author_id
    } = req.query;
    const user = req.user;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Xây dựng điều kiện where
    const where = {};

    // Phân quyền
    if (user.role !== 'admin') {
      // Tác giả: Chỉ thấy bài viết của mình
      where.author_id = user.id;
    } else if (exclude_drafts_of_others === 'true') {
      // Admin ở tab "Tất cả": Loại bỏ draft của người khác
      where[Op.or] = [
        { status: { [Op.ne]: 'draft' } }, // Lấy tất cả bài không phải draft
        { [Op.and]: [{ status: 'draft' }, { author_id: user.id }] } // Chỉ lấy draft của chính admin
      ];
    } else if (status === 'draft') {
      // Admin ở tab "Nháp": Chỉ lấy draft của chính admin
      where.status = 'draft';
      where.author_id = user.id;
    }

    // Bộ lọc tìm kiếm
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    // Bộ lọc trạng thái (nếu chưa được set ở trên)
    if (status && !where.status) {
      where.status = status;
    }

    // Bộ lọc danh mục
    if (category_id) {
      where.category_id = parseInt(category_id);
    }

    // Include cho Category
    const categoryInclude = {
      model: Category,
      as: 'category',
      attributes: ['id', 'name', 'category_type', 'slug']
    };

    // Bộ lọc category_type
    if (category_type) {
      categoryInclude.where = { category_type };
    }

    // Query database
    const { count, rows } = await Article.findAndCountAll({
      where,
      include: [
        categoryInclude,
        { model: User, as: 'author', attributes: ['id', 'full_name', 'avatar_url', 'role'] },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ],
      order: [[sort_by, sort_order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // Load dữ liệu entity (medicine/disease)
    const articlesWithEntity = await Promise.all(
      rows.map(article => loadEntityData(article))
    );

    // Tính stats (admin thấy tổng số, user chỉ thấy của mình)
    const statsWhere = user.role === 'admin' ? {} : { author_id: user.id };
    
    // Trả về response
    res.json({
      success: true,
      articles: articlesWithEntity,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count
      },
      stats: {
        total: count,
        pending: await Article.count({ where: { ...statsWhere, status: 'pending' } }),
        approved: await Article.count({ where: { ...statsWhere, status: 'approved' } }),
        rejected: await Article.count({ where: { ...statsWhere, status: 'rejected' } }),
        draft: await Article.count({ where: { status: 'draft', author_id: user.id } }), // Draft luôn là của user hiện tại
        request_edit: await Article.count({ where: { ...statsWhere, status: 'request_edit' } })
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
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
// Hàm createArticle đã sửa (đồng bộ logic lưu nháp)
exports.createArticle = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { 
    title, content, category_id, tags_json, source, 
    name, composition, uses, side_effects, manufacturer, image_url,
    symptoms, treatments, description, 
    isDraft = false 
  } = req.body;

  // Log để debug
  console.log('DEBUG: createArticle - isDraft:', isDraft, 'Body:', req.body);

  if (!title || !content || !category_id) {
    await t.rollback();
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
  }

  const category = await Category.findByPk(category_id, { transaction: t });
  if (!category) {
    await t.rollback();
    return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
  }

  const slug = slugify(title, { lower: true, strict: true });

  const newArticle = await Article.create({
    title,
    slug,
    content,
    category_id,
    author_id: req.user.id,
    tags_json: tags_json || [],
    source: source || null,
    status: isDraft ? 'draft' : 'pending'
  }, { transaction: t });

  let entity;
  if (category.category_type === 'thuoc') {
    //  THÊM name và category_id
    entity = await Medicine.create({
      category_id,
      name: name || title,  // ← QUAN TRỌNG
      composition,
      uses,
      side_effects,
      image_url,
      manufacturer,
      description
    }, { transaction: t });
    await newArticle.update({ entity_type: 'medicine', entity_id: entity.id }, { transaction: t });
  } else if (category.category_type === 'benh_ly') {
    //  THÊM name và category_id
    entity = await Disease.create({
      category_id,
      name: name || title,  // ← QUAN TRỌNG
      symptoms,
      treatments,
      description
    }, { transaction: t });
    await newArticle.update({ entity_type: 'disease', entity_id: entity.id }, { transaction: t });
  }

    // Xử lý history - Chỉ tạo khi không phải draft
    if (!isDraft) {
      console.log('DEBUG: createArticle - Gửi phê duyệt, action: submit');
      await createReviewHistory(
        newArticle.id,
        req.user.id,
        req.user.id,
        'submit',
        null,
        'draft',
        'pending',
        null,
        t
      );

      await notifyAllAdmins(
        'article',
        `${req.user.full_name} đã gửi bài viết mới "${title}" chờ phê duyệt`,
        `/articles/review/${newArticle.id}`
      );
    } else {
      console.log('DEBUG: createArticle - Lưu nháp, không gửi thông báo');
    }

    await t.commit();

    const articleData = await loadEntityData(newArticle);
    res.status(201).json({ 
      success: true, 
      message: isDraft ? 'Đã tạo bản nháp bài viết' : 'Đã tạo và gửi phê duyệt bài viết', 
      article: articleData 
    });
  } catch (error) {
    await t.rollback();
    console.error('Error creating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/articles/:id
 * Cập nhật bài viết
 * Quyền: Admin (mọi lúc), Staff/Doctor (chỉ khi draft, request_edit, request_rewrite)
 */
exports.updateArticle = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { 
      title, content, category_id, tags_json, source,
      name, composition, uses, side_effects, manufacturer, image_url,
      symptoms, treatments, description,
      isDraft = false 
    } = req.body;

    // Log để debug giá trị isDraft
    console.log('DEBUG: updateArticle - isDraft:', isDraft, 'Body:', req.body);

    const article = await Article.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ],
      transaction: t
    });

    if (!article) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // PHÂN QUYỀN: Chỉ tác giả hoặc admin mới update được
    if (article.author_id !== req.user.id && req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa bài viết này' });
    }

    // Không cho update nếu đã duyệt mà chưa request edit
    if (article.status === 'approved' && !['request_edit', 'request_rewrite'].includes(article.status)) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Bài viết đã duyệt, vui lòng yêu cầu chỉnh sửa trước' });
    }

    // Không cho update nếu đã từ chối hoặc ẩn (trừ admin)
    if (['rejected', 'hidden'].includes(article.status) && req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Bài viết đã bị từ chối hoặc ẩn, không thể chỉnh sửa' });
    }

    const previousStatus = article.status;

    // Cập nhật fields chung
    const updatedArticle = await article.update({
      title,
      slug: slugify(title, { lower: true, strict: true }),
      content,
      category_id,
      tags_json: tags_json || [],
      source: source || null
    }, { transaction: t });

    // Xử lý entity_type dựa trên category_type
    const category = await Category.findByPk(category_id, { transaction: t });
    const categoryType = category ? category.category_type : null;

    if (categoryType === 'thuoc') {
      let medicine = article.medicine;
      if (!medicine && article.entity_id) {
        medicine = await Medicine.findByPk(article.entity_id, { transaction: t });
      }
      if (!medicine) {
        medicine = await Medicine.create({
          category_id,
          name: name || title  // ← Tạo mới với name
        }, { transaction: t });
        await updatedArticle.update({ entity_type: 'medicine', entity_id: medicine.id }, { transaction: t });
      }
      // ✅ UPDATE ĐẦY ĐỦ TẤT CẢ FIELDS
      await medicine.update({
        name: name || title,  // ← Cập nhật name
        composition,
        uses,
        side_effects,
        image_url,
        manufacturer,
        description
      }, { transaction: t });
    } else if (categoryType === 'benh_ly') {
      let disease = article.disease;
      if (!disease && article.entity_id) {
        disease = await Disease.findByPk(article.entity_id, { transaction: t });
      }
      if (!disease) {
        disease = await Disease.create({
          category_id,
          name: name || title  // ← Tạo mới với name
        }, { transaction: t });
        await updatedArticle.update({ entity_type: 'disease', entity_id: disease.id }, { transaction: t });
      }
      // ✅ UPDATE ĐẦY ĐỦ TẤT CẢ FIELDS
      await disease.update({
        name: name || title,  // ← Cập nhật name
        symptoms,
        treatments,
        description
      }, { transaction: t });
    } else {
      await updatedArticle.update({ entity_type: 'article', entity_id: null }, { transaction: t });
    }

    // Xử lý status và history - SỬA Ở ĐÂY
    let action = null;
    if (isDraft) {
      // Log để debug trạng thái khi lưu nháp
      console.log('DEBUG: updateArticle - Lưu nháp, previousStatus:', previousStatus);
      
      if (previousStatus === 'request_rewrite') {
        // Giữ nguyên status = 'request_rewrite', không tạo history, không gửi thông báo
        console.log('DEBUG: Giữ nguyên request_rewrite, không gửi thông báo');
      } else {
        // Các trạng thái khác: Set về 'draft', không tạo history, không gửi thông báo
        updatedArticle.status = 'draft';
        console.log('DEBUG: Set status = draft, không gửi thông báo');
      }
    } else {
      // Gửi phê duyệt: Set 'pending', tạo history, gửi thông báo
      updatedArticle.status = 'pending';
      action = previousStatus === 'draft' ? 'submit' : 'resubmit';
      console.log('DEBUG: Gửi phê duyệt, action:', action);

      await createReviewHistory(
        updatedArticle.id,
        req.user.id, // reviewer là chính mình (tác giả) vì đang submit/resubmit
        updatedArticle.author_id,
        action,
        null,
        previousStatus,
        'pending',
        null,
        t
      );

      // Gửi thông báo cho tất cả admin
      await notifyAllAdmins(
        'article',
        `${req.user.full_name} đã ${action === 'submit' ? 'gửi' : 'gửi lại'} bài viết "${title}" chờ phê duyệt`,
        `/articles/review/${id}`
      );
    }

    await updatedArticle.save({ transaction: t });
    await t.commit();

    const updatedData = await loadEntityData(updatedArticle);
    res.json({ 
      success: true, 
      message: isDraft ? 'Đã lưu nháp bài viết' : 'Đã cập nhật và gửi phê duyệt bài viết', 
      article: updatedData 
    });
  } catch (error) {
    await t.rollback();
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
    const newStatus = allow ? 'request_rewrite' : 'approved';

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
          as: 'reviewer',  // Sửa từ 'action_by' thành 'reviewer'
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

/**
 * GET /api/articles/tags/all
 * Lấy tất cả tags
 */
exports.getAllTags = async (req, res) => {
  try {
    const articles = await Article.findAll({
      where: { status: 'approved' },
      attributes: ['tags_json']
    });

    const tagsSet = new Set();
    articles.forEach(article => {
      if (article.tags_json && Array.isArray(article.tags_json)) {
        article.tags_json.forEach(tag => tagsSet.add(tag));
      }
    });

    const tags = Array.from(tagsSet).sort();
    res.json({ success: true, tags });
  } catch (error) {
    console.error('Error fetching all tags:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/articles/related/:id
 * Lấy bài viết liên quan
 */
// Thay the ham exports.getRelatedArticles trong articleController.js bang ham nay

exports.getRelatedArticles = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, tags } = req.query;
    
    console.log('=== Fetching related articles ===');
    console.log('Article ID:', id);
    console.log('Category ID:', category_id);
    console.log('Tags:', tags);
    
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
        console.log('Parsed tags:', parsedTags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    
    const baseWhere = {
      id: { [Op.ne]: id },
      status: 'approved',
      deleted_at: null
    };
    
    let allArticles = [];
    
    // BUOC 1: Neu co category_id, uu tien lay bai cung danh muc
    if (category_id) {
      console.log('Step 1: Fetching same category articles...');
      const sameCategoryArticles = await Article.findAll({
        where: {
          ...baseWhere,
          category_id: category_id
        },
        include: [
          { 
            model: Category, 
            as: 'category',
            attributes: ['id', 'name', 'category_type', 'slug']
          },
          { 
            model: User, 
            as: 'author', 
            attributes: ['id', 'full_name'] 
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 10
      });
      
      console.log(`Found ${sameCategoryArticles.length} same category articles`);
      
      // Neu co tags, sap xep bai co tag chung len dau
      if (parsedTags.length > 0) {
        const withCommonTags = sameCategoryArticles.filter(article => {
          if (!article.tags_json || !Array.isArray(article.tags_json)) return false;
          return article.tags_json.some(tag => parsedTags.includes(tag));
        });
        
        const withoutCommonTags = sameCategoryArticles.filter(article => {
          if (!article.tags_json || !Array.isArray(article.tags_json)) return true;
          return !article.tags_json.some(tag => parsedTags.includes(tag));
        });
        
        console.log(`- With common tags: ${withCommonTags.length}`);
        console.log(`- Without common tags: ${withoutCommonTags.length}`);
        
        allArticles.push(...withCommonTags, ...withoutCommonTags);
      } else {
        allArticles.push(...sameCategoryArticles);
      }
    }
    
    // BUOC 2: Neu chua du 5 bai, lay them bai gan day nhat (bat ky category nao)
    if (allArticles.length < 5) {
      console.log(`Step 2: Need ${5 - allArticles.length} more articles...`);
      
      const excludeIds = allArticles.map(a => a.id);
      excludeIds.push(parseInt(id));
      
      const recentArticles = await Article.findAll({
        where: {
          ...baseWhere,
          id: { [Op.notIn]: excludeIds }
        },
        include: [
          { 
            model: Category, 
            as: 'category',
            attributes: ['id', 'name', 'category_type', 'slug']
          },
          { 
            model: User, 
            as: 'author', 
            attributes: ['id', 'full_name'] 
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 5 - allArticles.length
      });
      
      console.log(`Found ${recentArticles.length} recent articles`);
      allArticles.push(...recentArticles);
    }
    
    // Loai bo trung lap va gioi han 5 bai
    const uniqueArticles = Array.from(
      new Map(allArticles.map(a => [a.id, a])).values()
    ).slice(0, 5);
    
    console.log(`=== Total articles to return: ${uniqueArticles.length} ===`);
    console.log('Article IDs:', uniqueArticles.map(a => a.id));
    
    res.json({ 
      success: true, 
      articles: uniqueArticles,
      count: uniqueArticles.length
    });
    
  } catch (error) {
    console.error('=== Error fetching related articles ===');
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Thêm vào cuối file articleController.js
exports.searchArticles = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        query: q,
        articles: []
      });
    }
    
    const searchTerm = q.trim();
    
    const articles = await Article.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${searchTerm}%` } },
          { content: { [Op.like]: `%${searchTerm}%` } }
        ],
        status: 'approved',
        deleted_at: null
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'category_type', 'slug']
      }],
      attributes: ['id', 'title', 'slug', 'views', 'created_at'],
      limit: 10,
      order: [['created_at', 'DESC']]
    });
    
    const formattedArticles = articles.map(a => ({
      id: a.id,
      type: 'article',
      title: a.title,
      slug: a.slug,
      category: a.category ? {
        name: a.category.name,
        type: a.category.category_type,
        slug: a.category.slug
      } : null,
      views: a.views || 0
    }));
    
    res.json({
      success: true,
      query: searchTerm,
      articles: formattedArticles
    });
    
  } catch (error) {
    console.error('Error in searchArticles:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm bài viết'
    });
  }
};

// ============================================
// THEM HAM NAY VAO CUOI FILE articleController.js
// ============================================

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        query: q,
        results: {
          articles: [],
          categories: [],
          doctors: [],
          specialties: []
        }
      });
    }
    
    const searchTerm = q.trim();
    
    // 1. TIM BAI VIET (articles)
    const articles = await Article.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${searchTerm}%` } },
          { content: { [Op.like]: `%${searchTerm}%` } }
        ],
        status: 'approved',
        deleted_at: null
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'category_type', 'slug']
      }],
      attributes: ['id', 'title', 'slug', 'views', 'created_at'],
      limit: 5,
      order: [['views', 'DESC']]
    });
    
    // 2. TIM DANH MUC (categories) - Thêm tìm theo slug nếu cần
    const categories = await Category.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { description: { [Op.like]: `%${searchTerm}%` } },
          { slug: { [Op.like]: `%${searchTerm}%` } }  // Mới: Tìm theo slug
        ]
      },
      attributes: ['id', 'name', 'slug', 'category_type', 'description'],
      limit: 5,
      order: [['name', 'ASC']]
    });
    
    // 3. TIM BAC SI (doctors) - Mở rộng tìm theo bio và experience_years (nếu là số)
    let doctors = [];
    let doctorWhere = {
      [Op.or]: [
        { full_name: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.like]: `%${searchTerm}%` } }
      ],
      is_active: true,
      role: 'doctor'
    };
    
    // Nếu searchTerm là số, tìm theo experience_years
    if (!isNaN(searchTerm)) {
      doctorWhere = {
        ...doctorWhere,
        '$Doctor.experience_years$': { [Op.gte]: parseInt(searchTerm) }
      };
    } else {
      // Thêm tìm theo bio
      doctorWhere = {
        ...doctorWhere,
        '$Doctor.bio$': { [Op.like]: `%${searchTerm}%` }
      };
    }
    
    try {
      doctors = await models.User.findAll({  // Sửa từ Doctor sang User để dễ join
        where: doctorWhere,
        include: [{
          model: models.Doctor,
          attributes: ['id', 'code', 'experience_years', 'bio'],
          required: true,
          include: [{
            model: models.Specialty,
            attributes: ['id', 'name', 'slug'],
            required: false
          }]
        }],
        attributes: ['id', 'full_name', 'email', 'avatar_url'],
        limit: 5,
        order: [['full_name', 'ASC']]
      });
    } catch (err) {
      console.log('Error searching doctors:', err.message);
    }
    
    // 4. TIM CHUYEN KHOA (specialties) - Thêm tìm theo slug
    let specialties = [];
    try {
      specialties = await models.Specialty.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${searchTerm}%` } },
            { description: { [Op.like]: `%${searchTerm}%` } },
            { slug: { [Op.like]: `%${searchTerm}%` } }  // Mới: Tìm theo slug
          ]
        },
        attributes: ['id', 'name', 'slug', 'description'],
        limit: 5,
        order: [['name', 'ASC']]
      });
    } catch (err) {
      console.log('Error searching specialties:', err.message);
    }
    
    // FORMAT KET QUA
    const formattedArticles = articles.map(a => ({
      id: a.id,
      type: 'article',
      title: a.title,
      slug: a.slug,
      category: a.category ? {
        name: a.category.name,
        type: a.category.category_type,
        slug: a.category.slug
      } : null,
      views: a.views || 0
    }));
    
    const formattedCategories = categories.map(c => ({
      id: c.id,
      type: 'category',
      name: c.name,
      slug: c.slug,
      category_type: c.category_type,
      description: c.description ? c.description.substring(0, 100) : null
    }));
    
    const formattedDoctors = doctors.map(user => {  // Sửa format để phù hợp với User-Doctor join
      const doctor = user.Doctor;
      return {
        id: user.id,
        type: 'doctor',
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        code: doctor?.code,
        bio: doctor?.bio,
        experience_years: doctor?.experience_years || 0,
        specialty: doctor?.Specialty ? {
          name: doctor.Specialty.name,
          slug: doctor.Specialty.slug
        } : null
      };
    });
    
    const formattedSpecialties = specialties.map(s => ({
      id: s.id,
      type: 'specialty',
      name: s.name,
      slug: s.slug,
      description: s.description ? s.description.substring(0, 100) : null
    }));
    
    res.json({
      success: true,
      query: searchTerm,
      results: {
        articles: formattedArticles,
        categories: formattedCategories,
        doctors: formattedDoctors,
        specialties: formattedSpecialties
      }
    });
    
  } catch (error) {
    console.error('Error in globalSearch:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm toàn bộ hệ thống'
    });
  }
};
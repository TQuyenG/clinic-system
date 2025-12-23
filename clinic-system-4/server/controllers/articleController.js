// server/controllers/articleController.js - HOÀN CHỈNH
const { sequelize, models } = require('../config/db');
const { 
  Article, Category, User, Staff, Interaction, Notification, Medicine, Disease,
  ArticleReviewHistory, ArticleComment, EntitySuggestion 
} = models;
const { Op } = require('sequelize');
const slugify = require('slugify');

// =====================================================
// HELPER FUNCTION - Generate Slug
// =====================================================
function generateSlug(text) {
  if (!text) return '';
  
  let slug = text.toLowerCase();
  
  // Bỏ dấu tiếng Việt
  slug = slug.replace(/á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a');
  slug = slug.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e');
  slug = slug.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i');
  slug = slug.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o');
  slug = slug.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u');
  slug = slug.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y');
  slug = slug.replace(/đ/gi, 'd');
  
  slug = slug.replace(/[^a-z0-9 -]/g, '');
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  
  return slug;
}
// Helper check quyền Content Manager (Admin hoặc Staff Content)
const isContentManager = async (user) => {
  if (user.role === 'admin') return true;
  if (user.role === 'staff') {
    // Tìm thông tin staff để check department
    const staff = await models.Staff.findOne({ where: { user_id: user.id } });
    return staff && staff.department === 'content';
  }
  return false;
};
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
 * Gửi thông báo đến admin và Manager Content (users có quyền approve)
 * Sử dụng khi cần gửi thông báo phê duyệt bài viết
 */
const notifyManagersAndAdmins = async (type, message, link) => {
  try {
    const recipientIds = new Set(); // Dùng Set để tránh duplicate

    // 1. Tìm tất cả admin
    const admins = await User.findAll({
      where: { role: 'admin' }
    });
    admins.forEach(admin => recipientIds.add(admin.id));
    console.log(`   → Tìm thấy ${admins.length} admin`);

    // 2. Tìm Manager Content (department='content', rank='manager')
    const managerContentStaff = await Staff.findAll({
      where: {
        department: 'content',
        rank: 'manager'
      }
    });
    console.log(`   → Tìm thấy ${managerContentStaff.length} Manager Content`);
    managerContentStaff.forEach(staff => {
      if (staff.user_id) {
        recipientIds.add(staff.user_id);
        console.log(`   → Thêm Manager Content user_id: ${staff.user_id}`);
      }
    });

    // 3. Tìm staff có quyền 'approve' trong articles permissions
    const allStaff = await Staff.findAll({
      where: {
        permissions: {
          [Op.ne]: null
        }
      }
    });
    
    let staffWithApproveCount = 0;
    for (const staff of allStaff) {
      if (staff.permissions && staff.permissions.articles) {
        const articlePerms = staff.permissions.articles;
        if (Array.isArray(articlePerms) && articlePerms.includes('approve')) {
          if (staff.user_id) {
            recipientIds.add(staff.user_id);
            staffWithApproveCount++;
            console.log(`   → Thêm Staff có quyền approve: user_id ${staff.user_id}`);
          }
        }
      }
    }
    console.log(`   → Tìm thấy ${staffWithApproveCount} staff có quyền approve`);

    // 4. Gửi thông báo đến tất cả recipients
    console.log(`📧 Gửi thông báo đến ${recipientIds.size} người...`);
    for (const userId of recipientIds) {
      await createNotification(userId, type, message, link);
    }

    console.log(`✓ Đã gửi thông báo tới ${recipientIds.size} người (admin + managers với quyền approve)`);
  } catch (error) {
    console.error('✗ Lỗi khi gửi thông báo tới managers và admin:', error);
  }
};

// Thêm vào đâu đó trong phần Helper Functions trong articleController.js

/**
 * Helper function để thực hiện thao tác hàng loạt (Ẩn/Hiện, Xóa, Cập nhật Danh mục)
 * @param {Model} Model - Sequelize Model (Medicine hoặc Disease)
 * @param {string[]} ids - Mảng các ID cần xử lý
 * @param {string} actionType - 'hide', 'unhide', 'delete', 'update_category'
 * @param {object} updateData - Dữ liệu cập nhật (ví dụ: { category_id: 5, hidden_reason: '...' })
 * @returns {Promise<number>} Số lượng bản ghi đã được cập nhật/xóa
 */
const performBulkUpdate = async (Model, ids, actionType, updateData = {}) => {
  const transaction = await sequelize.transaction();
  try {
    const updateConditions = { 
      id: { [Op.in]: ids } 
    };
    let updateFields = {};
    let result;

    if (actionType === 'delete') {
      // Xóa cứng (hard delete)
      result = await Model.destroy({
        where: updateConditions,
        transaction
      });
    } else if (actionType === 'hide') {
      updateFields = { 
        hidden: true, 
        hidden_reason: updateData.hidden_reason || 'Ẩn thủ công bởi Admin' 
      };
      result = await Model.update(updateFields, { 
        where: updateConditions, 
        transaction 
      });
    } else if (actionType === 'unhide') {
      updateFields = { 
        hidden: false, 
        hidden_reason: null 
      };
      result = await Model.update(updateFields, { 
        where: updateConditions, 
        transaction 
      });
    } else if (actionType === 'update_category') {
      if (!updateData.category_id) {
         throw new Error('Thiếu category_id cho thao tác cập nhật danh mục.');
      }
      updateFields = { 
        category_id: updateData.category_id 
      };
      result = await Model.update(updateFields, { 
        where: updateConditions, 
        transaction 
      });
    } else {
      throw new Error('ActionType không hợp lệ.');
    }

    await transaction.commit();
    // Đối với destroy, result là số lượng dòng bị ảnh hưởng
    return result[0] || result; // result[0] cho update, result cho destroy
  } catch (error) {
    await transaction.rollback();
    throw error;
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
 * Lấy danh sách bài viết
 * 
 * PHÂN QUYỀN MỚI (Đã cập nhật):
 * - Admin: Thấy TẤT CẢ bài viết
 * - Manager Content (rank='manager' && department='content'): Thấy TẤT CẢ bài viết
 * - Staff Content thường: Chỉ thấy bài viết của mình
 * - Doctor: Chỉ thấy bài viết của mình
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

    // ===== PHÂN QUYỀN MỚI =====
    //  Check xem user có phải là Manager Content không
    const isManager = await (async () => {
      if (user.role === 'admin') return true;
      if (user.role === 'staff') {
        const staff = await models.Staff.findOne({ where: { user_id: user.id } });
        return staff && staff.department === 'content' && staff.rank === 'manager';
      }
      return false;
    })();

    if (!isManager) {
      //  Staff thường hoặc Doctor: Chỉ thấy bài của mình
      where.author_id = user.id;
      console.log(` User ${user.username} chỉ xem bài của mình`);
    } else {
      //  Manager Content hoặc Admin: Thấy TẤT CẢ NHƯNG KHÔNG THẤY NHÁP CỦA NGƯỜI KHÁC
      if (user.role === 'admin') {
        // Admin: Xem tất cả kể cả nháp
        console.log(` Admin xem tất cả bài viết (kể cả nháp)`);
      } else {
        // Manager Content: Xem tất cả TRỪĐỀ nháp của người khác
        console.log(` Manager Content xem tất cả bài viết (trừ nháp người khác)`);
        where[Op.or] = [
          { status: { [Op.ne]: 'draft' } }, // Tất cả bài không phải nháp
          { [Op.and]: [{ status: 'draft' }, { author_id: user.id }] } // Hoặc nháp của mình
        ];
      }
    }

    // Bộ lọc tìm kiếm
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    // Bộ lọc trạng thái
    if (status) {
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
        { 
          model: User, 
          as: 'author', 
          attributes: ['id', 'username', 'full_name', 'email', 'avatar_url'] 
        },
        { model: Medicine, as: 'medicine', required: false },
        { model: Disease, as: 'disease', required: false }
      ],
      order: [[sort_by, sort_order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    // Load entity data
    const articlesWithEntity = await Promise.all(
      rows.map(article => loadEntityData(article))
    );

    // Tính stats cho từng trạng thái
    let statsWhere = {};
    
    if (user.role === 'admin') {
      // Admin: Đếm tất cả (kể cả nháp)
      statsWhere = {};
    } else if (isManager) {
      // Manager Content: Đếm tất cả TRỪĐỀ nháp của người khác
      statsWhere = {
        [Op.or]: [
          { status: { [Op.ne]: 'draft' } },
          { [Op.and]: [{ status: 'draft' }, { author_id: user.id }] }
        ]
      };
    } else {
      // Staff thường: Chỉ đếm bài của mình
      statsWhere = { author_id: user.id };
    }

    const allArticles = await Article.findAll({
      where: statsWhere,
      attributes: ['status']
    });

    const stats = {
      total: allArticles.length,
      draft: allArticles.filter(a => a.status === 'draft').length,
      pending: allArticles.filter(a => a.status === 'pending').length,
      approved: allArticles.filter(a => a.status === 'approved').length,
      rejected: allArticles.filter(a => a.status === 'rejected').length,
      hidden: allArticles.filter(a => a.status === 'hidden').length,
      request_edit: allArticles.filter(a => a.status === 'request_edit').length,
      request_rewrite: allArticles.filter(a => a.status === 'request_rewrite').length
    };

    res.json({
      success: true,
      articles: articlesWithEntity,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
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

    // 🔐 PHÂN QUYỀN: Check xem user có quyền xem bài này không
    const isManager = await (async () => {
      if (req.user.role === 'admin') return true;
      if (req.user.role === 'staff') {
        const staff = await models.Staff.findOne({ where: { user_id: req.user.id } });
        return staff && staff.department === 'content' && staff.rank === 'manager';
      }
      return false;
    })();

    //  Staff thường/Doctor chỉ xem được bài của mình
    //  Admin/Manager Content xem được tất cả bài
    if (!isManager && article.author_id !== req.user.id) {
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

// =====================================================
// 1. HÀM createArticle - SỬA HOÀN TOÀN (dòng 656-786)
// =====================================================

exports.createArticle = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    //  CHỈ lấy các trường cần thiết, KHÔNG lấy name, composition, v.v.
    const { 
      title, 
      content, 
      category_id, 
      tags_json, 
      source, 
      entity_id,      //  THÊM - ID thuốc/bệnh lý đã chọn
      entity_type,    //  THÊM - Loại: medicine/disease/article
      isDraft = false 
    } = req.body;

    console.log('DEBUG: createArticle - isDraft:', isDraft, 'Body:', req.body);

    if (!title || !content || !category_id) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc' 
      });
    }

    const category = await Category.findByPk(category_id, { transaction: t });
    if (!category) {
      await t.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy danh mục' 
      });
    }

    const slug = slugify(title, { lower: true, strict: true });
    const { isAdminDirectPublish } = req.body;
    
    // ✅ SỬA: Check quyền Content Manager
    const canDirectPublish = await isContentManager(req.user);

    let articleStatus = 'draft';
    if (!isDraft) {
      if (isAdminDirectPublish && canDirectPublish) {
        articleStatus = 'approved';
      } else {
        articleStatus = 'pending';
      }
    }
    //  VALIDATION: Kiểm tra entity tồn tại
    if (entity_id && entity_type) {
      if (entity_type === 'medicine') {
        const medicine = await Medicine.findByPk(entity_id, { transaction: t });
        if (!medicine || medicine.hidden) {
          await t.rollback();
          return res.status(404).json({ 
            success: false, 
            message: medicine ? 'Thuốc này đã bị ẩn' : 'Không tìm thấy thuốc' 
          });
        }
      } else if (entity_type === 'disease') {
        const disease = await Disease.findByPk(entity_id, { transaction: t });
        if (!disease || disease.hidden) {
          await t.rollback();
          return res.status(404).json({ 
            success: false, 
            message: disease ? 'Bệnh lý này đã bị ẩn' : 'Không tìm thấy bệnh lý' 
          });
        }
      }
    }

    //  TẠO BÀI VIẾT - CHỈ lưu entity_id và entity_type
    const newArticle = await Article.create({
      title,
      slug,
      content,
      category_id,
      author_id: req.user.id,
      tags_json: tags_json || [],
      source: source || null,
      status: articleStatus,
      entity_id: entity_id || null,
      entity_type: entity_type || 'article'
    }, { transaction: t });

    // Xử lý history và thông báo
    if (!isDraft) {
      if (isAdminDirectPublish && req.user.role === 'admin') {
        console.log('DEBUG: createArticle - Admin publish trực tiếp');
        await createReviewHistory(
          newArticle.id,
          req.user.id,
          req.user.id,
          'approve',
          'Admin tạo và đăng trực tiếp',
          null,
          'approved',
          null,
          t
        );
      } else {
        console.log('DEBUG: createArticle - Gửi phê duyệt');
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

        await notifyManagersAndAdmins(
          'article',
          `${req.user.full_name} đã gửi bài viết mới "${title}" chờ phê duyệt`,
          `/phe-duyet-bai-viet/${newArticle.id}`
        );
      }
    }

    await t.commit();
    const articleData = await loadEntityData(newArticle);
    res.status(201).json({ 
      success: true, 
      message: isDraft ? 'Đã tạo bản nháp' : 'Đã tạo và gửi phê duyệt', 
      article: articleData 
    });
  } catch (error) {
    await t.rollback();
    console.error('Error creating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================
// HÀM updateArticle - SỬA HOÀN TOÀN (dòng 792-960)
// =====================================================

exports.updateArticle = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    
    //  CHỈ lấy các trường cần thiết
    const { 
      title, 
      content, 
      category_id, 
      tags_json, 
      source,
      entity_id,      //  THÊM
      entity_type,    //  THÊM
      isDraft = false
    } = req.body;

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

    if (article.author_id !== req.user.id && req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa' });
    }

    //  VALIDATION: Kiểm tra entity tồn tại
    if (entity_id && entity_type) {
      if (entity_type === 'medicine') {
        const medicine = await Medicine.findByPk(entity_id, { transaction: t });
        if (!medicine || medicine.hidden) {
          await t.rollback();
          return res.status(404).json({ 
            success: false, 
            message: medicine ? 'Thuốc này đã bị ẩn' : 'Không tìm thấy thuốc' 
          });
        }
      } else if (entity_type === 'disease') {
        const disease = await Disease.findByPk(entity_id, { transaction: t });
        if (!disease || disease.hidden) {
          await t.rollback();
          return res.status(404).json({ 
            success: false, 
            message: disease ? 'Bệnh lý này đã bị ẩn' : 'Không tìm thấy bệnh lý' 
          });
        }
      }
    }

    const previousStatus = article.status;
    let newStatus = previousStatus;
    let action = null;

    //  CẬP NHẬT - CHỈ cập nhật entity_id và entity_type
    const updatedArticle = await article.update({
      title,
      slug: slugify(title, { lower: true, strict: true }),
      content,
      category_id,
      tags_json: tags_json || [],
      source: source || null,
      entity_id: entity_id !== undefined ? entity_id : article.entity_id,
      entity_type: entity_type !== undefined ? entity_type : article.entity_type
    }, { transaction: t });

    // Xử lý status
    const { isAdminDirectPublish } = req.body;
    
    if (isDraft) {
      if (req.user.role === 'admin') {
        newStatus = previousStatus === 'draft' ? 'draft' : previousStatus;
      } else {
        if (['draft', 'rejected', 'request_rewrite'].includes(previousStatus)) {
          newStatus = 'draft'; 
        } else {
          newStatus = previousStatus;
        }
      }
      updatedArticle.status = newStatus;
    } else {
      if (isAdminDirectPublish && req.user.role === 'admin') {
        newStatus = 'approved';
        action = 'approve';

        await createReviewHistory(
          updatedArticle.id,
          req.user.id,
          updatedArticle.author_id,
          action,
          'Admin cập nhật và đăng trực tiếp',
          previousStatus,
          newStatus,
          null,
          t
        );
      } else {
        newStatus = 'pending';
        action = previousStatus === 'draft' ? 'submit' : 'resubmit'; 
        updatedArticle.status = newStatus;

        await createReviewHistory(
          updatedArticle.id,
          req.user.id,
          updatedArticle.author_id,
          action,
          'Gửi lại sau khi chỉnh sửa',
          previousStatus,
          newStatus,
          null,
          t
        );

        await notifyManagersAndAdmins(
          'article',
          `${req.user.full_name} đã ${action === 'submit' ? 'gửi' : 'gửi lại'} bài viết "${title}" chờ phê duyệt`,
          `/phe-duyet-bai-viet/${updatedArticle.id}`
        );
      }
    }

    await t.commit();
    const articleData = await loadEntityData(updatedArticle);
    res.json({ 
      success: true, 
      message: isDraft ? 'Đã lưu bản nháp' : 'Đã cập nhật và gửi phê duyệt', 
      article: articleData 
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
    // ✅ SỬA: Check quyền duyệt bài (Admin hoặc Staff Content)
    const canReview = await isContentManager(req.user);
    if (!canReview) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền duyệt bài viết' });
    }

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
      `/phe-duyet-bai-viet/${id}`
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
      `/phe-duyet-bai-viet/${id}`
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
      `/phe-duyet-bai-viet/${id}`
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

// // ==================== REQUEST EDIT (Staff/Doctor) ====================

// /**
//  * POST /api/articles/:id/request-edit
//  * Yêu cầu chỉnh sửa bài đã duyệt (Staff/Doctor only)
//  * Body: { reason: string }
//  */
// exports.requestEditArticle = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const { id } = req.params;
//     const { reason } = req.body;

//     if (!reason) {
//       return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do yêu cầu chỉnh sửa' });
//     }

//     const article = await Article.findByPk(id, { transaction });
//     if (!article) {
//       await transaction.rollback();
//       return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
//     }

//     // Check quyền
//     if (article.author_id !== req.user.id) {
//       await transaction.rollback();
//       return res.status(403).json({ success: false, message: 'Bạn không có quyền yêu cầu chỉnh sửa bài viết này' });
//     }

//     if (article.status !== 'approved') {
//       await transaction.rollback();
//       return res.status(400).json({ success: false, message: 'Chỉ có thể yêu cầu chỉnh sửa bài viết đã duyệt' });
//     }

//     const prevStatus = article.status;

//     await article.update({
//       status: 'request_edit',
//       edit_request_reason: reason
//     }, { transaction });

//     await createReviewHistory(
//       article.id,
//       req.user.id,
//       req.user.id,
//       'request_edit',
//       reason,
//       prevStatus,
//       'request_edit',
//       null,
//       transaction
//     );

//     await transaction.commit();

//     await notifyAllAdmins(
//       'article',
//       `${req.user.full_name} yêu cầu chỉnh sửa bài viết "${article.title}". Lý do: ${reason}`,
//       `/phe-duyet-bai-viet/${id}`
//     );

//     res.json({ success: true, message: 'Yêu cầu chỉnh sửa đã được gửi' });
//   } catch (error) {
//     await transaction.rollback();
//     console.error('Error requesting edit:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// /**
//  * POST /api/articles/:id/respond-edit
//  * Admin phản hồi yêu cầu chỉnh sửa (Admin only)
//  * Body: { allow: boolean, reason?: string }
//  */
// exports.respondToEditRequest = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const { id } = req.params;
//     const { allow, reason } = req.body;

//     const article = await Article.findByPk(id, { transaction });
//     if (!article) {
//       await transaction.rollback();
//       return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
//     }

//     const prevStatus = article.status;
//     const newStatus = allow ? 'request_rewrite' : 'approved';

//     await article.update({ 
//       status: newStatus,
//       edit_request_reason: null
//     }, { transaction });

//     await createReviewHistory(
//       article.id,
//       req.user.id,
//       article.author_id,
//       allow ? 'allow_edit' : 'deny_edit',
//       reason,
//       prevStatus,
//       newStatus,
//       null,
//       transaction
//     );

//     await transaction.commit();

//     await createNotification(
//       article.author_id,
//       'article',
//       `Admin đã ${allow ? 'cho phép' : 'từ chối'} yêu cầu chỉnh sửa bài viết "${article.title}". ${reason ? `Lý do: ${reason}` : ''}`,
//       `/phe-duyet-bai-viet/${id}`
//     );

//     res.json({ 
//       success: true, 
//       message: allow ? 'Đã cho phép chỉnh sửa' : 'Đã từ chối yêu cầu',
//       article 
//     });
//   } catch (error) {
//     await transaction.rollback();
//     console.error('Error responding to edit request:', error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

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

    await notifyManagersAndAdmins(
      'article',
      `${req.user.full_name} đã gửi lại bài viết "${article.title}" sau khi chỉnh sửa.`,
      `/phe-duyet-bai-viet/${id}`
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

    // PHÂN QUYỀN: Admin, Tác giả, hoặc người có quyền approve mới xem comments
    const isAuthor = article.author_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Check if user has approve permission
    let hasApprovePermission = false;
    if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ where: { user_id: req.user.id } });
      if (staff && staff.permissions && staff.permissions.articles) {
        hasApprovePermission = Array.isArray(staff.permissions.articles) && 
                              staff.permissions.articles.includes('approve');
      }
    }

    if (!isAdmin && !isAuthor && !hasApprovePermission) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền xem comment của bài viết này' 
      });
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

    // PHÂN QUYỀN: Admin, Tác giả, hoặc người có quyền approve mới comment được
    const isAuthor = article.author_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Check if user has approve permission
    let hasApprovePermission = false;
    if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ where: { user_id: req.user.id } });
      if (staff && staff.permissions && staff.permissions.articles) {
        hasApprovePermission = Array.isArray(staff.permissions.articles) && 
                              staff.permissions.articles.includes('approve');
      }
    }

    if (!isAdmin && !isAuthor && !hasApprovePermission) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền comment vào bài viết này. Cần là tác giả hoặc có quyền phê duyệt.' 
      });
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
        `/phe-duyet-bai-viet/${id}`
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

    // PHÂN QUYỀN: Admin, Tác giả, hoặc người có quyền approve mới xem lịch sử
    const isAuthor = article.author_id === req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Check if user has approve permission
    let hasApprovePermission = false;
    if (req.user.role === 'staff') {
      const staff = await Staff.findOne({ where: { user_id: req.user.id } });
      if (staff && staff.permissions && staff.permissions.articles) {
        hasApprovePermission = Array.isArray(staff.permissions.articles) && 
                              staff.permissions.articles.includes('approve');
      }
    }

    if (!isAdmin && !isAuthor && !hasApprovePermission) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền xem lịch sử bài viết này' 
      });
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
 * POST /api/articles/:id/request-edit
 * Staff/Doctor gửi yêu cầu chỉnh sửa bài viết đã approved
 */
exports.requestEdit = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const user = req.user;

    const article = await Article.findByPk(id, {
      include: [{ model: User, as: 'author' }],
      transaction: t
    });

    if (!article) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    // Kiểm tra quyền: phải là tác giả
    if (article.author_id !== user.id) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' });
    }

    // Kiểm tra trạng thái: phải là approved
    if (article.status !== 'approved') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Chỉ có thể gửi yêu cầu chỉnh sửa với bài viết đã được phê duyệt' });
    }

    // Cập nhật trạng thái
    await article.update({ status: 'request_edit' }, { transaction: t });

    // Tạo thông báo cho admin
    const admins = await User.findAll({ where: { role: 'admin' } });
    for (const admin of admins) {
      await Notification.create({
        user_id: admin.id,
        type: 'article_request_edit',
        title: 'Yêu cầu chỉnh sửa bài viết',
        message: `${user.full_name} yêu cầu chỉnh sửa bài viết "${article.title}"`,
        reference_type: 'article',
        reference_id: article.id
      }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, message: 'Đã gửi yêu cầu chỉnh sửa' });
  } catch (error) {
    await t.rollback();
    console.error('Error requesting edit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/approve-edit-request
 * Admin đồng ý cho phép tác giả chỉnh sửa
 */
exports.approveEditRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền thực hiện thao tác này' });
    }

    const article = await Article.findByPk(id, {
      include: [{ model: User, as: 'author' }],
      transaction: t
    });

    if (!article) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (article.status !== 'request_edit') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Bài viết không ở trạng thái yêu cầu chỉnh sửa' });
    }

    // Cập nhật trạng thái về rejected để tác giả có thể edit
    await article.update({ status: 'rejected' }, { transaction: t });

    // Ghi log lịch sử
    await ArticleReviewHistory.create({
      article_id: article.id,
      reviewer_id: user.id,
      old_status: 'request_edit',
      new_status: 'rejected',
      comment: 'Admin đã đồng ý cho phép chỉnh sửa bài viết'
    }, { transaction: t });

    // Thông báo cho tác giả
    await Notification.create({
      user_id: article.author_id,
      type: 'article_edit_approved',
      title: 'Yêu cầu chỉnh sửa được chấp nhận',
      message: `Admin ${user.full_name} đã đồng ý cho bạn chỉnh sửa bài viết "${article.title}"`,
      reference_type: 'article',
      reference_id: article.id
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Đã cho phép tác giả chỉnh sửa' });
  } catch (error) {
    await t.rollback();
    console.error('Error approving edit request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/reject-edit-request
 * Admin từ chối yêu cầu chỉnh sửa
 */
exports.rejectEditRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền thực hiện thao tác này' });
    }

    const article = await Article.findByPk(id, {
      include: [{ model: User, as: 'author' }],
      transaction: t
    });

    if (!article) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (article.status !== 'request_edit') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Bài viết không ở trạng thái yêu cầu chỉnh sửa' });
    }

    // Trả về trạng thái approved
    await article.update({ status: 'approved' }, { transaction: t });

    // Ghi log lịch sử
    await ArticleReviewHistory.create({
      article_id: article.id,
      reviewer_id: user.id,
      old_status: 'request_edit',
      new_status: 'approved',
      comment: reason || 'Admin từ chối yêu cầu chỉnh sửa'
    }, { transaction: t });

    // Thông báo cho tác giả
    await Notification.create({
      user_id: article.author_id,
      type: 'article_edit_rejected',
      title: 'Yêu cầu chỉnh sửa bị từ chối',
      message: `Admin ${user.full_name} đã từ chối yêu cầu chỉnh sửa bài viết "${article.title}". Lý do: ${reason || 'Không có lý do'}`,
      reference_type: 'article',
      reference_id: article.id
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Đã từ chối yêu cầu chỉnh sửa' });
  } catch (error) {
    await t.rollback();
    console.error('Error rejecting edit request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/articles/:id/request-rewrite
 * Admin yêu cầu tác giả viết lại bài viết đã ẩn
 */
exports.requestRewrite = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền thực hiện thao tác này' });
    }

    const article = await Article.findByPk(id, {
      include: [{ model: User, as: 'author' }],
      transaction: t
    });

    if (!article) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    if (article.status !== 'hidden') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Chỉ có thể yêu cầu viết lại bài viết đã ẩn' });
    }

    // Cập nhật trạng thái về rejected
    await article.update({ status: 'rejected' }, { transaction: t });

    // Ghi log lịch sử
    await ArticleReviewHistory.create({
      article_id: article.id,
      reviewer_id: user.id,
      old_status: 'hidden',
      new_status: 'rejected',
      comment: 'Admin yêu cầu viết lại bài viết'
    }, { transaction: t });

    // Thông báo cho tác giả
    await Notification.create({
      user_id: article.author_id,
      type: 'article_rewrite_requested',
      title: 'Yêu cầu viết lại bài viết',
      message: `Admin ${user.full_name} yêu cầu bạn viết lại bài viết "${article.title}"`,
      reference_type: 'article',
      reference_id: article.id
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Đã gửi yêu cầu viết lại' });
  } catch (error) {
    await t.rollback();
    console.error('Error requesting rewrite:', error);
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

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    
    // Cho phép tìm kiếm từ 1 ký tự
    if (!q || q.trim().length < 1) {
      return res.json({
        success: true,
        query: q,
        results: {
          articles: [],
          medicines: [],
          diseases: [],
          categories: [],
          doctors: [],
          specialties: []
        }
      });
    }
    
    const searchTerm = q.trim();
    
    // Tách thành từng từ để tìm kiếm theo từ khóa
    const keywords = searchTerm.split(/\s+/).filter(k => k.length > 0);
    
    // Helper function: Tính điểm ưu tiên (càng cao càng khớp)
    const calculatePriority = (item, nameField) => {
      const name = item[nameField]?.toLowerCase() || '';
      const searchLower = searchTerm.toLowerCase();
      
      // Ưu tiên 1: Trùng khớp hoàn toàn (100 điểm)
      if (name === searchLower) return 100;
      
      // Ưu tiên 2: Bắt đầu bằng từ khóa (80 điểm)
      if (name.startsWith(searchLower)) return 80;
      
      // Ưu tiên 3: Chứa từ khóa (60 điểm)
      if (name.includes(searchLower)) return 60;
      
      // Ưu tiên 4: Chứa từng từ khóa (40 điểm)
      const matchCount = keywords.filter(k => name.includes(k.toLowerCase())).length;
      if (matchCount > 0) return 40 + matchCount * 5;
      
      // Ưu tiên 5: Tìm trong các trường khác (20 điểm)
      return 20;
    };
    
    // ============================================
    // 1. TÌM THUỐC (MEDICINES) - Ưu tiên cao
    // ============================================
    let medicines = [];
    try {
      // Tìm theo tên (ưu tiên cao nhất)
      const medicinesByName = await Medicine.findAll({
        where: {
          name: { [Op.like]: `%${searchTerm}%` },
          hidden: false
        },
        include: [{
          model: Category,
          attributes: ['id', 'name', 'slug']
        }],
        attributes: ['id', 'name', 'slug', 'image_url', 'composition', 'uses', 'manufacturer', 'created_at'],
        limit: 10,
        order: [['created_at', 'DESC']]
      });
      
      // Nếu không đủ kết quả, tìm trong các trường khác
      if (medicinesByName.length < 10) {
        const medicinesByOther = await Medicine.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { composition: { [Op.like]: `%${searchTerm}%` } },
                  { uses: { [Op.like]: `%${searchTerm}%` } },
                  { manufacturer: { [Op.like]: `%${searchTerm}%` } },
                  { description: { [Op.like]: `%${searchTerm}%` } }
                ]
              },
              { hidden: false }
            ]
          },
          include: [{
            model: Category,
            attributes: ['id', 'name', 'slug']
          }],
          attributes: ['id', 'name', 'slug', 'image_url', 'composition', 'uses', 'manufacturer', 'created_at'],
          limit: 10 - medicinesByName.length,
          order: [['created_at', 'DESC']]
        });
        
        medicines = [...medicinesByName, ...medicinesByOther];
      } else {
        medicines = medicinesByName;
      }
      
      // ============================================
      // QUAN TRỌNG: Loại bỏ duplicate medicines theo ID
      // ============================================
      const uniqueMedicines = [];
      const seenMedicineIds = new Set();
      
      for (const medicine of medicines) {
        if (!seenMedicineIds.has(medicine.id)) {
          seenMedicineIds.add(medicine.id);
          uniqueMedicines.push(medicine);
        }
      }
      
      medicines = uniqueMedicines;
      
      // Tính điểm ưu tiên và sắp xếp
      medicines = medicines.map(m => ({
        ...m.toJSON(),
        priority: calculatePriority(m, 'name')
      })).sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
    } catch (err) {
      console.log('Error searching medicines:', err.message);
    }
    
    // ============================================
    // 2. TÌM BỆNH LÝ (DISEASES) - Ưu tiên cao
    // ============================================
    let diseases = [];
    try {
      // Tìm theo tên (ưu tiên cao nhất)
      const diseasesByName = await Disease.findAll({
        where: {
          name: { [Op.like]: `%${searchTerm}%` },
          hidden: false
        },
        include: [{
          model: Category,
          attributes: ['id', 'name', 'slug']
        }],
        attributes: ['id', 'name', 'slug', 'symptoms', 'treatments', 'description', 'created_at'],
        limit: 10,
        order: [['created_at', 'DESC']]
      });
      
      // Nếu không đủ kết quả, tìm trong các trường khác
      if (diseasesByName.length < 10) {
        const diseasesByOther = await Disease.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { symptoms: { [Op.like]: `%${searchTerm}%` } },
                  { treatments: { [Op.like]: `%${searchTerm}%` } },
                  { description: { [Op.like]: `%${searchTerm}%` } }
                ]
              },
              { hidden: false }
            ]
          },
          include: [{
            model: Category,
            attributes: ['id', 'name', 'slug']
          }],
          attributes: ['id', 'name', 'slug', 'symptoms', 'treatments', 'description', 'created_at'],
          limit: 10 - diseasesByName.length,
          order: [['created_at', 'DESC']]
        });
        
        diseases = [...diseasesByName, ...diseasesByOther];
      } else {
        diseases = diseasesByName;
      }
      
      // ============================================
      // QUAN TRỌNG: Loại bỏ duplicate diseases theo ID
      // ============================================
      const uniqueDiseases = [];
      const seenDiseaseIds = new Set();
      
      for (const disease of diseases) {
        if (!seenDiseaseIds.has(disease.id)) {
          seenDiseaseIds.add(disease.id);
          uniqueDiseases.push(disease);
        }
      }
      
      diseases = uniqueDiseases;
      
      // Tính điểm ưu tiên và sắp xếp
      diseases = diseases.map(d => ({
        ...d.toJSON(),
        priority: calculatePriority(d, 'name')
      })).sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
    } catch (err) {
      console.log('Error searching diseases:', err.message);
    }
    
    // ============================================
    // 3. TÌM BÀI VIẾT (ARTICLES)
    // ============================================
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
      attributes: ['id', 'title', 'slug', 'views', 'created_at', 'category_id'],
      limit: 8,
      order: [['created_at', 'DESC']]
    });
    
    // ============================================
    // 4. TÌM DANH MỤC (CATEGORIES)
    // ============================================
    const categories = await Category.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { description: { [Op.like]: `%${searchTerm}%` } },
          { slug: { [Op.like]: `%${searchTerm}%` } }
        ]
      },
      attributes: ['id', 'name', 'slug', 'category_type', 'description'],
      limit: 5,
      order: [['name', 'ASC']]
    });
    
    // ============================================
    // 5. TÌM BÁC SĨ (DOCTORS)
    // ============================================
    let doctors = [];
    try {
      // Tìm bác sĩ theo: Tên, chuyên khoa, title, position, workplace, bio
      const doctorResults = await models.Doctor.findAll({
        where: {
          work_status: 'active'
        },
        include: [
          {
            model: models.User,
            as: 'user',
            where: {
              [Op.or]: [
                { full_name: { [Op.like]: `%${searchTerm}%` } },
                { email: { [Op.like]: `%${searchTerm}%` } }
              ],
              is_active: true,
              role: 'doctor'
            },
            attributes: ['id', 'full_name', 'email', 'avatar_url'],
            required: true
          },
          {
            model: models.Specialty,
            as: 'specialty',
            attributes: ['id', 'name', 'slug'],
            required: false
          }
        ],
        attributes: ['id', 'code', 'experience_years', 'bio', 'title', 'position', 'workplace'],
        limit: 10,
        order: [['created_at', 'DESC']]
      });
      
      // Nếu không đủ kết quả, tìm thêm trong các trường khác của Doctor
      if (doctorResults.length < 10) {
        const doctorByOther = await models.Doctor.findAll({
          where: {
            [Op.and]: [
              {
                [Op.or]: [
                  { title: { [Op.like]: `%${searchTerm}%` } },
                  { position: { [Op.like]: `%${searchTerm}%` } },
                  { workplace: { [Op.like]: `%${searchTerm}%` } },
                  { bio: { [Op.like]: `%${searchTerm}%` } }
                ]
              },
              { work_status: 'active' }
            ]
          },
          include: [
            {
              model: models.User,
              as: 'user',
              where: {
                is_active: true,
                role: 'doctor'
              },
              attributes: ['id', 'full_name', 'email', 'avatar_url'],
              required: true
            },
            {
              model: models.Specialty,
              as: 'specialty',
              attributes: ['id', 'name', 'slug'],
              required: false
            }
          ],
          attributes: ['id', 'code', 'experience_years', 'bio', 'title', 'position', 'workplace'],
          limit: 10 - doctorResults.length,
          order: [['created_at', 'DESC']]
        });
        
        doctors = [...doctorResults, ...doctorByOther];
      } else {
        doctors = doctorResults;
      }
      
      // Tìm thêm theo chuyên khoa nếu vẫn chưa đủ
      if (doctors.length < 10) {
        const doctorsBySpecialty = await models.Doctor.findAll({
          where: {
            work_status: 'active'
          },
          include: [
            {
              model: models.User,
              as: 'user',
              where: {
                is_active: true,
                role: 'doctor'
              },
              attributes: ['id', 'full_name', 'email', 'avatar_url'],
              required: true
            },
            {
              model: models.Specialty,
              as: 'specialty',
              where: {
                name: { [Op.like]: `%${searchTerm}%` }
              },
              attributes: ['id', 'name', 'slug'],
              required: true
            }
          ],
          attributes: ['id', 'code', 'experience_years', 'bio', 'title', 'position', 'workplace'],
          limit: 10 - doctors.length,
          order: [['created_at', 'DESC']]
        });
        
        doctors = [...doctors, ...doctorsBySpecialty];
      }
      
      // ============================================
      // QUAN TRỌNG: Loại bỏ duplicate doctors theo ID
      // ============================================
      const uniqueDoctors = [];
      const seenIds = new Set();
      
      for (const doctor of doctors) {
        if (!seenIds.has(doctor.id)) {
          seenIds.add(doctor.id);
          uniqueDoctors.push(doctor);
        }
      }
      
      doctors = uniqueDoctors;
      
    } catch (err) {
      console.log('Error searching doctors:', err.message);
    }
    
    // ============================================
    // 6. TÌM CHUYÊN KHOA (SPECIALTIES)
    // ============================================
    let specialties = [];
    try {
      specialties = await models.Specialty.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${searchTerm}%` } },
            { description: { [Op.like]: `%${searchTerm}%` } },
            { slug: { [Op.like]: `%${searchTerm}%` } }
          ]
        },
        attributes: ['id', 'name', 'slug', 'description'],
        limit: 5,
        order: [['name', 'ASC']]
      });
    } catch (err) {
      console.log('Error searching specialties:', err.message);
    }
    
    // ============================================
    // FORMAT KẾT QUẢ
    // ============================================
    const formattedMedicines = medicines.map(m => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      image_url: m.image_url,
      composition: m.composition?.substring(0, 100),
      uses: m.uses?.substring(0, 100),
      manufacturer: m.manufacturer,
      category: m.Category?.name,
      type: 'medicine',
      url: `/tra-cuu-thuoc/${m.slug}`,
      priority: m.priority
    }));
    
    const formattedDiseases = diseases.map(d => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      symptoms: d.symptoms?.substring(0, 100),
      treatments: d.treatments?.substring(0, 100),
      category: d.Category?.name,
      type: 'disease',
      url: `/tra-cuu-benh-ly/${d.slug}`,
      priority: d.priority
    }));
    
    const formattedArticles = articles.map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      views: a.views,
      category: a.category?.name,
      category_type: a.category?.category_type,
      type: 'article',
      url: `/bai-viet/${a.slug}`,
      created_at: a.created_at
    }));
    
    const formattedCategories = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      category_type: c.category_type,
      description: c.description,
      type: 'category',
      url: c.category_type === 'tin_tuc' ? `/tin-tuc/${c.slug}` : 
           c.category_type === 'thuoc' ? `/tra-cuu-thuoc?category_id=${c.id}` :
           `/tra-cuu-benh-ly?category_id=${c.id}`
    }));
    
    const formattedDoctors = doctors.map(d => ({
      id: d.id,
      name: d.user?.full_name,
      code: d.code,
      email: d.user?.email,
      avatar: d.user?.avatar_url,
      specialty: d.specialty?.name,
      experience: d.experience_years,
      title: d.title,
      position: d.position,
      workplace: d.workplace,
      bio: d.bio?.substring(0, 150),
      type: 'doctor',
      url: `/bac-si/${d.code}`
    }));
    
    const formattedSpecialties = specialties.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      type: 'specialty',
      url: `/chuyen-khoa/${s.slug}`
    }));
    
    res.json({
      success: true,
      query: searchTerm,
      keywords: keywords,
      results: {
        medicines: formattedMedicines,
        diseases: formattedDiseases,
        articles: formattedArticles,
        categories: formattedCategories,
        doctors: formattedDoctors,
        specialties: formattedSpecialties
      },
      totalResults: {
        medicines: medicines.length,
        diseases: diseases.length,
        articles: articles.length,
        categories: categories.length,
        doctors: doctors.length,
        specialties: specialties.length,
        total: medicines.length + diseases.length + articles.length + categories.length + doctors.length + specialties.length
      }
    });
    
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm',
      error: error.message
    });
  }
};

// =====================================================
// MEDICINES FUNCTIONS - ĐÃ SỬA LỖI
// =====================================================

// GET - Lấy danh sách thuốc (PUBLIC + ADMIN)
exports.getMedicines = async (req, res) => {
  try {
    // Hỗ trợ cả 2 format: sort_order (DESC/ASC) và sort_direction (descending/ascending)
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category_id, 
      letter, 
      hidden, 
      sort_by = 'created_at', 
      sort_order,
      sort_direction 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereCondition = {};
    const order = [];
    
    // Xử lý tìm kiếm - tìm trong nhiều trường
    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { composition: { [Op.like]: `%${searchTerm}%` } },
        { uses: { [Op.like]: `%${searchTerm}%` } },
        { manufacturer: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ];
    }
    
    // Thêm điều kiện lọc theo category_id
    if (category_id) {
      whereCondition.category_id = category_id;
    }
    
    // Thêm điều kiện lọc theo chữ cái đầu (kết hợp với search, không ghi đè)
    if (letter) {
      whereCondition.name = { 
        ...(whereCondition.name || {}),
        [Op.startsWith]: letter 
      };
    }

    // Thêm điều kiện lọc trạng thái ẩn (Admin View)
    if (hidden === 'true') {
        whereCondition.hidden = true;
    } else if (hidden === 'false') {
        whereCondition.hidden = false;
    }
    
    // Xử lý sắp xếp - hỗ trợ nhiều cột
    let sortColumn = sort_by;
    const validColumns = ['id', 'name', 'created_at', 'updated_at', 'manufacturer', 'category_id'];
    
    if (validColumns.includes(sort_by)) {
        sortColumn = sort_by;
    } else if (sort_by === 'category.name') {
        sortColumn = 'category_id'; 
    } else {
        sortColumn = 'created_at';
    }

    // Xử lý direction - hỗ trợ cả 2 format
    let direction = 'DESC';
    if (sort_order) {
      // Format mới: DESC/ASC
      direction = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    } else if (sort_direction) {
      // Format cũ: descending/ascending
      direction = sort_direction.toUpperCase() === 'ASCENDING' ? 'ASC' : 'DESC';
    }
    
    order.push([sortColumn, direction]);


    const { count, rows } = await Medicine.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: offset,
      order: order,
      include: [
        { 
          model: Category, 
          attributes: ['id', 'name', 'slug', 'category_type'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      medicines: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getMedicines:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách thuốc',
      error: error.message 
    });
  }
};

// GET - Lấy thuốc theo slug (PUBLIC)
exports.getMedicineBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const medicine = await Medicine.findOne({
      where: { slug, hidden: false },
      include: [
        { 
          model: Category, 
          attributes: ['id', 'name', 'slug', 'category_type'],
          required: false
        }
      ]
    });

    if (!medicine) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thuốc' 
      });
    }

    // Tìm bài viết liên quan
    const relatedArticles = await Article.findAll({
      where: {
        entity_type: 'medicine',
        entity_id: medicine.id,
        status: 'approved'
      },
      attributes: ['id', 'title', 'slug', 'created_at'],
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      medicine,
      relatedArticles
    });
  } catch (error) {
    console.error('Error in getMedicineBySlug:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy thông tin thuốc',
      error: error.message 
    });
  }
};

// POST - Tạo thuốc mới (ADMIN)
exports.createMedicine = async (req, res) => {
  try {
    const { 
      name, 
      category_id, 
      composition, 
      uses, 
      side_effects, 
      manufacturer, 
      image_url,
      description 
    } = req.body;

    // Validate
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tên thuốc là bắt buộc' 
      });
    }

    // Tạo slug
    const slug = generateSlug(name);

    // Kiểm tra trùng
    const existing = await Medicine.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thuốc đã tồn tại' 
      });
    }

    const medicine = await Medicine.create({
      name,
      slug,
      category_id: category_id || null,
      composition,
      uses,
      side_effects,
      manufacturer,
      image_url,
      description,
      hidden: false
    });

    // Load lại với Category
    await medicine.reload({
      include: [{ model: Category, attributes: ['id', 'name', 'slug'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Tạo thuốc thành công',
      medicine
    });
  } catch (error) {
    console.error('Error in createMedicine:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tạo thuốc',
      error: error.message 
    });
  }
};

// PUT - Cập nhật thuốc (ADMIN)
exports.updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      category_id, 
      composition, 
      uses, 
      side_effects, 
      manufacturer, 
      image_url,
      description 
    } = req.body;

    const medicine = await Medicine.findByPk(id);
    if (!medicine) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thuốc' 
      });
    }

    // Nếu đổi tên, tạo slug mới
    let slug = medicine.slug;
    if (name && name !== medicine.name) {
      slug = generateSlug(name);
    }

    await medicine.update({
      name: name || medicine.name,
      slug,
      category_id: category_id !== undefined ? category_id : medicine.category_id,
      composition: composition !== undefined ? composition : medicine.composition,
      uses: uses !== undefined ? uses : medicine.uses,
      side_effects: side_effects !== undefined ? side_effects : medicine.side_effects,
      manufacturer: manufacturer !== undefined ? manufacturer : medicine.manufacturer,
      image_url: image_url !== undefined ? image_url : medicine.image_url,
      description: description !== undefined ? description : medicine.description
    });

    // Load lại với Category
    await medicine.reload({
      include: [{ model: Category, attributes: ['id', 'name', 'slug'] }]
    });

    res.json({
      success: true,
      message: 'Cập nhật thuốc thành công',
      medicine
    });
  } catch (error) {
    console.error('Error in updateMedicine:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật thuốc',
      error: error.message 
    });
  }
};

// DELETE - Xóa thuốc (ADMIN)
exports.deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;

    const medicine = await Medicine.findByPk(id);
    if (!medicine) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thuốc' 
      });
    }

    await medicine.destroy();

    res.json({
      success: true,
      message: 'Xóa thuốc thành công'
    });
  } catch (error) {
    console.error('Error in deleteMedicine:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xóa thuốc',
      error: error.message 
    });
  }
};

// POST - Ẩn/hiện thuốc (ADMIN)
exports.toggleHideMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { hidden, hidden_reason } = req.body;

    const medicine = await Medicine.findByPk(id);
    if (!medicine) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thuốc' 
      });
    }

    await medicine.update({
      hidden: hidden,
      hidden_reason: hidden ? hidden_reason : null
    });

    // Load lại với Category
    await medicine.reload({
      include: [{ model: Category, attributes: ['id', 'name', 'slug'] }]
    });

    res.json({
      success: true,
      message: hidden ? 'Đã ẩn thuốc' : 'Đã hiện thuốc',
      medicine
    });
  } catch (error) {
    console.error('Error in toggleHideMedicine:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi thay đổi trạng thái thuốc',
      error: error.message 
    });
  }
};

/**
 * POST - Thực hiện các thao tác hàng loạt cho Thuốc (Bulk Actions)
 * Yêu cầu: role admin
 */
exports.bulkMedicineActions = async (req, res) => {
  try {
    const { ids, action, updateData, category_id, hidden_reason } = req.body; 
    // Hỗ trợ cả 2 format:
    // Format 1: { ids, action, updateData: { category_id, hidden_reason } }
    // Format 2: { ids, action, category_id, hidden_reason }

    if (!Array.isArray(ids) || ids.length === 0 || !action) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dữ liệu hoặc hành động không hợp lệ.' 
      });
    }

    // Merge dữ liệu từ cả 2 format
    const mergedUpdateData = {
      ...updateData,
      category_id: category_id || updateData?.category_id,
      hidden_reason: hidden_reason || updateData?.hidden_reason
    };

    const affectedCount = await performBulkUpdate(Medicine, ids, action, mergedUpdateData);

    res.json({
      success: true,
      message: `Đã thực hiện hành động '${action}' thành công cho ${affectedCount} bản ghi Thuốc.`,
      affectedCount
    });
  } catch (error) {
    console.error('Error in bulkMedicineActions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi thực hiện thao tác hàng loạt cho Thuốc.',
      error: error.message 
    });
  }
};

// POST - Import thuốc từ CSV/Excel (ADMIN) - ĐÃ FIX
exports.importMedicines = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { medicines, handleDuplicates = 'skip' } = req.body; // THÊM handleDuplicates

    if (!Array.isArray(medicines) || medicines.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Dữ liệu import không hợp lệ' 
      });
    }

    const results = {
      success: 0,
      failed: [],
      skipped: 0,
      duplicates: [] // Lưu tên các bản ghi bị trùng
    };

    for (const med of medicines) {
      try {
        if (!med.name) {
          results.failed.push({ ...med, reason: 'Thiếu tên thuốc' });
          continue;
        }

        const existing = await Medicine.findOne({ 
          where: { name: med.name },
          transaction
        });

        if (existing) {
          results.duplicates.push(med.name); // Lưu tên vào mảng duplicates
          
          if (handleDuplicates === 'skip') {
            results.skipped++;
            continue;
          } else if (handleDuplicates === 'replace') {
            // Ghi đè (Update)
            const slug = generateSlug(med.name);
            await existing.update({
              slug,
              category_id: med.category_id || null,
              composition: med.composition || null,
              uses: med.uses || null,
              side_effects: med.side_effects || null,
              manufacturer: med.manufacturer || null,
              image_url: med.image_url || null,
              description: med.description || null,
              hidden: false
            }, { transaction });
            results.success++;
            continue;
          } else if (handleDuplicates === 'rename') {
            // Đổi tên (thêm timestamp/random)
            const newName = `${med.name} (${Date.now() % 100000})`;
            const slug = generateSlug(newName);
            await Medicine.create({
              name: newName,
              slug,
              category_id: med.category_id || null,
              composition: med.composition || null,
              uses: med.uses || null,
              side_effects: med.side_effects || null,
              manufacturer: med.manufacturer || null,
              image_url: med.image_url || null,
              description: med.description || null,
              hidden: false
            }, { transaction });
            results.success++;
            continue;
          }
        }
        
        // Tạo mới
        const slug = generateSlug(med.name);
        await Medicine.create({
          name: med.name,
          slug,
          category_id: med.category_id || null,
          composition: med.composition || null,
          uses: med.uses || null,
          side_effects: med.side_effects || null,
          manufacturer: med.manufacturer || null,
          image_url: med.image_url || null,
          description: med.description || null,
          hidden: false
        }, { transaction });

        results.success++;
      } catch (err) {
        console.error(`Lỗi khi xử lý thuốc "${med.name}":`, err.message); // LOG CHI TIẾT
        results.failed.push({ ...med, reason: err.message });
      }
    }
    
    await transaction.commit();

    res.json({
      success: true,
      message: `Import hoàn tất: ${results.success} thành công, ${results.skipped} bỏ qua, ${results.failed.length} thất bại.`,
      results: {
        success: results.success,
        skipped: results.skipped,
        errors: results.failed,
        duplicates: results.duplicates
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('CRITICAL ERROR in importMedicines (Server):', error); // LOG TỔNG QUAN
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi Server nghiêm trọng khi import thuốc',
      error: error.message 
    });
  }
};

// GET - Export thuốc ra CSV/Excel
exports.exportMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.findAll({
      include: [
        { model: Category, attributes: ['id', 'name'], required: false }
      ],
      order: [['name', 'ASC']]
    });

    const exportData = medicines.map(m => ({
      name: m.name,
      category_name: m.Category?.name || '',
      composition: m.composition || '',
      uses: m.uses || '',
      side_effects: m.side_effects || '',
      manufacturer: m.manufacturer || '',
      description: m.description || '',
      hidden: m.hidden ? 'Có' : 'Không'
    }));

    res.json({
      success: true,
      medicines: exportData
    });
  } catch (error) {
    console.error('Error in exportMedicines:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi export thuốc',
      error: error.message 
    });
  }
};

// =====================================================
// DISEASES FUNCTIONS - ĐÃ SỬA LỖI
// =====================================================

// GET - Lấy danh sách bệnh lý (PUBLIC + ADMIN)
exports.getDiseases = async (req, res) => {
  try {
    // Hỗ trợ cả 2 format: sort_order (DESC/ASC) và sort_direction (descending/ascending)
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category_id, 
      letter, 
      hidden, 
      sort_by = 'created_at', 
      sort_order,
      sort_direction 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereCondition = {};
    const order = [];
    
    // Xử lý tìm kiếm - tìm trong nhiều trường
    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { symptoms: { [Op.like]: `%${searchTerm}%` } },
        { treatments: { [Op.like]: `%${searchTerm}%` } },
        { description: { [Op.like]: `%${searchTerm}%` } }
      ];
    }
    
    // Thêm điều kiện lọc theo category_id
    if (category_id) {
      whereCondition.category_id = category_id;
    }
    
    // Thêm điều kiện lọc theo chữ cái đầu (kết hợp với search, không ghi đè)
    if (letter) {
      whereCondition.name = { 
        ...(whereCondition.name || {}),
        [Op.startsWith]: letter 
      };
    }

    // Thêm điều kiện lọc trạng thái ẩn (Admin View)
    if (hidden === 'true') {
        whereCondition.hidden = true;
    } else if (hidden === 'false') {
        whereCondition.hidden = false;
    }
    
    // Xử lý sắp xếp - hỗ trợ nhiều cột
    let sortColumn = sort_by;
    const validColumns = ['id', 'name', 'created_at', 'updated_at', 'category_id'];
    
    if (validColumns.includes(sort_by)) {
        sortColumn = sort_by;
    } else if (sort_by === 'category.name') {
        sortColumn = 'category_id'; 
    } else {
        sortColumn = 'created_at';
    }

    // Xử lý direction - hỗ trợ cả 2 format
    let direction = 'DESC';
    if (sort_order) {
      // Format mới: DESC/ASC
      direction = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    } else if (sort_direction) {
      // Format cũ: descending/ascending
      direction = sort_direction.toUpperCase() === 'ASCENDING' ? 'ASC' : 'DESC';
    }
    
    order.push([sortColumn, direction]);


    const { count, rows } = await Disease.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: offset,
      order: order,
      include: [
        { 
          model: Category, 
          attributes: ['id', 'name', 'slug', 'category_type'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      diseases: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getDiseases:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách bệnh lý',
      error: error.message 
    });
  }
};

/**
 * GET - Lấy bệnh lý theo slug (PUBLIC)
 * FIX: Đồng nhất cấu trúc trả về với getMedicineBySlug
 */
exports.getDiseaseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1. Tìm Bệnh lý theo slug và đảm bảo KHÔNG bị ẩn
    const disease = await Disease.findOne({
      where: { slug, hidden: false },
      include: [
        { 
          model: Category, 
          attributes: ['id', 'name', 'slug', 'category_type'],
          required: false
        }
      ]
    });

    if (!disease) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bệnh lý' 
      });
    }

    // 2. Tìm bài viết liên quan (Article liên kết với Disease này)
    const relatedArticles = await Article.findAll({
      where: {
        entity_type: 'disease', 
        entity_id: disease.id,
        status: 'approved'
      },
      attributes: ['id', 'title', 'slug', 'created_at'],
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    // 3. Trả về kết quả
    res.json({
      success: true,
      disease, // SỬA: Key trả về là 'disease'
      relatedArticles
    });
  } catch (error) {
    // Nếu lỗi vẫn xảy ra ở đây, hãy kiểm tra Server Log để tìm lỗi chi tiết của Sequelize
    console.error('CRITICAL ERROR in getDiseaseBySlug (Server):', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi Server khi lấy thông tin bệnh lý',
      error: error.message 
    });
  }
};

// POST - Tạo bệnh lý mới (ADMIN)
exports.createDisease = async (req, res) => {
  try {
    const { 
      name, 
      category_id, 
      symptoms, 
      treatments, 
      description 
    } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tên bệnh lý là bắt buộc' 
      });
    }

    const slug = generateSlug(name);

    const existing = await Disease.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bệnh lý đã tồn tại' 
      });
    }

    const disease = await Disease.create({
      name,
      slug,
      category_id: category_id || null,
      symptoms,
      treatments,
      description,
      hidden: false
    });

    await disease.reload({
      include: [{ model: Category, attributes: ['id', 'name', 'slug'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Tạo bệnh lý thành công',
      disease
    });
  } catch (error) {
    console.error('Error in createDisease:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tạo bệnh lý',
      error: error.message 
    });
  }
};

// PUT - Cập nhật bệnh lý (ADMIN)
exports.updateDisease = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      category_id, 
      symptoms, 
      treatments, 
      description 
    } = req.body;

    const disease = await Disease.findByPk(id);
    if (!disease) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bệnh lý' 
      });
    }

    let slug = disease.slug;
    if (name && name !== disease.name) {
      slug = generateSlug(name);
    }

    await disease.update({
      name: name || disease.name,
      slug,
      category_id: category_id !== undefined ? category_id : disease.category_id,
      symptoms: symptoms !== undefined ? symptoms : disease.symptoms,
      treatments: treatments !== undefined ? treatments : disease.treatments,
      description: description !== undefined ? description : disease.description
    });

    await disease.reload({
      include: [{ model: Category, attributes: ['id', 'name', 'slug'] }]
    });

    res.json({
      success: true,
      message: 'Cập nhật bệnh lý thành công',
      disease
    });
  } catch (error) {
    console.error('Error in updateDisease:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật bệnh lý',
      error: error.message 
    });
  }
};

// DELETE - Xóa bệnh lý (ADMIN)
exports.deleteDisease = async (req, res) => {
  try {
    const { id } = req.params;

    const disease = await Disease.findByPk(id);
    if (!disease) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bệnh lý' 
      });
    }

    await disease.destroy();

    res.json({
      success: true,
      message: 'Xóa bệnh lý thành công'
    });
  } catch (error) {
    console.error('Error in deleteDisease:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xóa bệnh lý',
      error: error.message 
    });
  }
};

// POST - Ẩn/hiện bệnh lý (ADMIN)
exports.toggleHideDisease = async (req, res) => {
  try {
    const { id } = req.params;
    const { hidden, hidden_reason } = req.body;

    const disease = await Disease.findByPk(id);
    if (!disease) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy bệnh lý' 
      });
    }

    await disease.update({
      hidden: hidden,
      hidden_reason: hidden ? hidden_reason : null
    });

    await disease.reload({
      include: [{ model: Category, attributes: ['id', 'name', 'slug'] }]
    });

    res.json({
      success: true,
      message: hidden ? 'Đã ẩn bệnh lý' : 'Đã hiện bệnh lý',
      disease
    });
  } catch (error) {
    console.error('Error in toggleHideDisease:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi thay đổi trạng thái bệnh lý',
      error: error.message 
    });
  }
};

/**
 * POST - Thực hiện các thao tác hàng loạt cho Bệnh lý (Bulk Actions)
 * Yêu cầu: role admin
 */
exports.bulkDiseaseActions = async (req, res) => {
  try {
    const { ids, action, updateData, category_id, hidden_reason } = req.body;
    // Hỗ trợ cả 2 format:
    // Format 1: { ids, action, updateData: { category_id, hidden_reason } }
    // Format 2: { ids, action, category_id, hidden_reason }

    if (!Array.isArray(ids) || ids.length === 0 || !action) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dữ liệu hoặc hành động không hợp lệ.' 
      });
    }

    // Merge dữ liệu từ cả 2 format
    const mergedUpdateData = {
      ...updateData,
      category_id: category_id || updateData?.category_id,
      hidden_reason: hidden_reason || updateData?.hidden_reason
    };

    const affectedCount = await performBulkUpdate(Disease, ids, action, mergedUpdateData);

    res.json({
      success: true,
      message: `Đã thực hiện hành động '${action}' thành công cho ${affectedCount} bản ghi Bệnh lý.`,
      affectedCount
    });
  } catch (error) {
    console.error('Error in bulkDiseaseActions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi thực hiện thao tác hàng loạt cho Bệnh lý.',
      error: error.message 
    });
  }
};

// POST - Import bệnh lý từ CSV/Excel (ADMIN) - ĐÃ FIX
exports.importDiseases = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { diseases, handleDuplicates = 'skip' } = req.body; // THÊM handleDuplicates

    if (!Array.isArray(diseases) || diseases.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Dữ liệu import không hợp lệ' 
      });
    }

    const results = {
      success: 0,
      failed: [],
      skipped: 0,
      duplicates: [] // Lưu tên các bản ghi bị trùng
    };

    for (const dis of diseases) {
      try {
        if (!dis.name) {
          results.failed.push({ ...dis, reason: 'Thiếu tên bệnh lý' });
          continue;
        }

        const existing = await Disease.findOne({ 
          where: { name: dis.name },
          transaction
        });

        if (existing) {
          results.duplicates.push(dis.name);
          
          if (handleDuplicates === 'skip') {
            results.skipped++;
            continue;
          } else if (handleDuplicates === 'replace') {
            // Ghi đè (Update)
            const slug = generateSlug(dis.name);
            await existing.update({
              slug,
              category_id: dis.category_id || null,
              symptoms: dis.symptoms || null,
              treatments: dis.treatments || null,
              description: dis.description || null,
              hidden: false
            }, { transaction });
            results.success++;
            continue;
          } else if (handleDuplicates === 'rename') {
            // Đổi tên (thêm timestamp/random)
            const newName = `${dis.name} (${Date.now() % 100000})`;
            const slug = generateSlug(newName);
            await Disease.create({
              name: newName,
              slug,
              category_id: dis.category_id || null,
              symptoms: dis.symptoms || null,
              treatments: dis.treatments || null,
              description: dis.description || null,
              hidden: false
            }, { transaction });
            results.success++;
            continue;
          }
        }
        
        // Tạo mới
        const slug = generateSlug(dis.name);
        await Disease.create({
          name: dis.name,
          slug,
          category_id: dis.category_id || null,
          symptoms: dis.symptoms || null,
          treatments: dis.treatments || null,
          description: dis.description || null,
          hidden: false
        }, { transaction });

        results.success++;
      } catch (err) {
        console.error(`Lỗi khi xử lý bệnh lý "${dis.name}":`, err.message); // LOG CHI TIẾT
        results.failed.push({ ...dis, reason: err.message });
      }
    }
    
    await transaction.commit();

    res.json({
      success: true,
      message: `Import hoàn tất: ${results.success} thành công, ${results.skipped} bỏ qua, ${results.failed.length} thất bại.`,
      results: {
        success: results.success,
        skipped: results.skipped,
        errors: results.failed,
        duplicates: results.duplicates
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('CRITICAL ERROR in importDiseases (Server):', error); // LOG TỔNG QUAN
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi Server nghiêm trọng khi import bệnh lý',
      error: error.message 
    });
  }
};

// GET - Export bệnh lý ra CSV/Excel
exports.exportDiseases = async (req, res) => {
  try {
    const diseases = await Disease.findAll({
      include: [
        { model: Category, attributes: ['id', 'name'], required: false }
      ],
      order: [['name', 'ASC']]
    });

    const exportData = diseases.map(d => ({
      name: d.name,
      category_name: d.Category?.name || '',
      symptoms: d.symptoms || '',
      treatments: d.treatments || '',
      description: d.description || '',
      hidden: d.hidden ? 'Có' : 'Không'
    }));

    res.json({
      success: true,
      diseases: exportData
    });
  } catch (error) {
    console.error('Error in exportDiseases:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi export bệnh lý',
      error: error.message 
    });
  }
};

// =====================================================
// SUGGESTIONS FUNCTIONS - ĐÃ SỬA LỖI
// =====================================================

// POST - Tạo đề xuất (STAFF/DOCTOR)
exports.createSuggestion = async (req, res) => {
  try {
    const { 
      entity_type,
      suggestion_type,
      entity_id,
      suggested_data,
      reason
    } = req.body;

    const user_id = req.user.id;

    if (!entity_type || !suggestion_type || !suggested_data) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin bắt buộc' 
      });
    }

    if (suggestion_type === 'update' && !entity_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cần entity_id khi đề xuất cập nhật' 
      });
    }

    if (suggestion_type === 'update' && !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cần nêu lý do khi đề xuất cập nhật' 
      });
    }

    if (suggestion_type === 'update') {
      const Model = entity_type === 'medicine' ? Medicine : Disease;
      const entity = await Model.findByPk(entity_id);
      if (!entity) {
        return res.status(404).json({ 
          success: false, 
          message: `Không tìm thấy ${entity_type}` 
        });
      }
    }

    const suggestion = await EntitySuggestion.create({
      entity_type,
      entity_id: suggestion_type === 'create' ? null : entity_id,
      user_id,
      suggestion_type,
      suggested_data,
      reason: reason || null,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Đã gửi đề xuất thành công',
      suggestion
    });
  } catch (error) {
    console.error('Error in createSuggestion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tạo đề xuất',
      error: error.message 
    });
  }
};

// GET - Lấy danh sách đề xuất
exports.getSuggestions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '', 
      entity_type = '',
      suggestion_type = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    // Nếu không phải admin, chỉ xem đề xuất của mình
    if (req.user.role !== 'admin') {
      where.user_id = req.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (entity_type) {
      where.entity_type = entity_type;
    }

    if (suggestion_type) {
      where.suggestion_type = suggestion_type;
    }

    const { count, rows } = await EntitySuggestion.findAndCountAll({
      where,
      include: [
        { 
          model: User, 
          as: 'user',
          attributes: ['id', 'full_name', 'email', 'role']
        },
        { 
          model: User, 
          as: 'admin',
          attributes: ['id', 'full_name', 'email'],
          required: false
        },
        {
          model: Medicine,
          as: 'medicine',
          attributes: ['id', 'name', 'slug'],
          required: false
        },
        {
          model: Disease,
          as: 'disease',
          attributes: ['id', 'name', 'slug'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      suggestions: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error in getSuggestions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách đề xuất',
      error: error.message 
    });
  }
};

// PUT - Admin phê duyệt/từ chối đề xuất
exports.reviewSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, admin_note, final_data } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action không hợp lệ' 
      });
    }

    const suggestion = await EntitySuggestion.findByPk(id, {
      include: [
        { model: User, as: 'user' },
        { model: Medicine, as: 'medicine' },
        { model: Disease, as: 'disease' }
      ]
    });

    if (!suggestion) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy đề xuất' 
      });
    }

    if (suggestion.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Đề xuất đã được xử lý' 
      });
    }

    await suggestion.update({
      status: action === 'approve' ? 'approved' : 'rejected',
      admin_id: req.user.id,
      admin_note: admin_note || null
    });

    if (action === 'approve') {
      const Model = suggestion.entity_type === 'medicine' ? Medicine : Disease;
      const dataToSave = final_data || suggestion.suggested_data;

      if (suggestion.suggestion_type === 'create') {
        const slug = generateSlug(dataToSave.name);
        await Model.create({
          ...dataToSave,
          slug,
          hidden: false
        });
      } else if (suggestion.suggestion_type === 'update') {
        const entity = await Model.findByPk(suggestion.entity_id);
        if (entity) {
          let slug = entity.slug;
          if (dataToSave.name && dataToSave.name !== entity.name) {
            slug = generateSlug(dataToSave.name);
          }
          await entity.update({ ...dataToSave, slug });
        }
      }
    }

    res.json({
      success: true,
      message: action === 'approve' ? 'Đã phê duyệt đề xuất' : 'Đã từ chối đề xuất',
      suggestion
    });
  } catch (error) {
    console.error('Error in reviewSuggestion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xử lý đề xuất',
      error: error.message 
    });
  }
};

// =====================================================
// MEDICINE SUGGESTIONS - ĐỀ XUẤT THUỐC
// =====================================================

/**
 * GET /api/articles/medicines/suggestions
 * Lấy danh sách đề xuất thuốc
 * 
 * PHÂN QUYỀN:
 * - Admin/Manager Content: Thấy tất cả đề xuất
 * - Staff thường: Chỉ thấy đề xuất của mình
 */
exports.getMedicineSuggestions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const user = req.user;

    console.log(`\n🔍 getMedicineSuggestions - User: ${user.id} (${user.role})`);

    // 🔐 Check quyền: Admin || Manager Content || Staff có quyền approve_medicine
    const canApprove = await (async () => {
      if (user.role === 'admin') {
        console.log('  ✓ User là Admin → canApprove = true');
        return true;
      }
      
      if (user.role === 'staff') {
        const staff = await Staff.findOne({ 
          where: { user_id: user.id },
          attributes: ['user_id', 'department', 'rank', 'permissions']
        });
        
        if (!staff) {
          console.log('  ✗ Không tìm thấy staff profile');
          return false;
        }
        
        console.log(`  → Staff: ${staff.department}/${staff.rank}`);
        
        // Manager Content có full quyền
        if (staff.department === 'content' && staff.rank === 'manager') {
          console.log('  ✓ Manager Content → canApprove = true');
          return true;
        }
        
        // Hoặc Staff có quyền approve_medicine
        if (staff.permissions && staff.permissions.articles) {
          const hasPermission = Array.isArray(staff.permissions.articles) && 
                                staff.permissions.articles.includes('approve_medicine');
          console.log(`  → Permissions.articles: ${JSON.stringify(staff.permissions.articles)}`);
          console.log(`  → Has approve_medicine: ${hasPermission}`);
          return hasPermission;
        } else {
          console.log('  ✗ Không có permissions.articles');
        }
      }
      return false;
    })();

    console.log(`  → RESULT: canApprove = ${canApprove}`);

    const where = { entity_type: 'medicine' };

    // ⚠️ Staff thường chỉ thấy đề xuất của mình, người có quyền approve thấy tất cả
    if (!canApprove) {
      where.user_id = user.id;
      console.log(`  → Chỉ xem đề xuất của mình (user_id: ${user.id})`);
    } else {
      console.log(`  → Xem TẤT CẢ đề xuất thuốc`);
    }

    // Filter theo status
    if (status) {
      where.status = status;
    }

    const { count, rows } = await EntitySuggestion.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: User,
          as: 'admin', // ✅ Sửa từ 'reviewer' thành 'admin'
          attributes: ['id', 'username', 'full_name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`  → Kết quả: ${rows.length}/${count} medicine suggestions\n`);

    res.json({
      success: true,
      suggestions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching medicine suggestions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy danh sách đề xuất thuốc',
      error: error.message 
    });
  }
};

/**
 * POST /api/articles/medicines/suggestions
 * Tạo đề xuất thuốc mới
 * 
 * PHÂN QUYỀN:
 * - Staff Content thường: Gửi đề xuất thuốc
 * - Manager/Admin: Có thể tạo trực tiếp qua route /medicines
 */
exports.createMedicineSuggestion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, composition, uses, side_effects, manufacturer, image_url, description } = req.body;
    const user = req.user;

    // 🔐 KIỂM TRA QUYỀN: Chỉ staff content hoặc doctor mới được gửi đề xuất
    if (user.role === 'staff') {
      const staff = await Staff.findOne({ where: { user_id: user.id } });
      if (!staff || staff.department !== 'content') {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: 'Chỉ nhân viên Content mới có thể gửi đề xuất thuốc'
        });
      }
    } else if (user.role !== 'admin' && user.role !== 'doctor') {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền gửi đề xuất thuốc'
      });
    }

    // Validate
    if (!name || !composition || !uses) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Tên thuốc, Thành phần, Công dụng'
      });
    }

    // Tạo suggestion
    const suggestion = await EntitySuggestion.create({
      user_id: req.user.id,
      entity_type: 'medicine',
      suggestion_type: req.body.suggestion_type || 'create', // 'create' hoặc 'update'
      entity_id: req.body.entity_id || null, // ID thuốc nếu là update
      suggested_data: {
        name,
        composition,
        uses,
        side_effects,
        manufacturer,
        image_url,
        description
      },
      reason: req.body.reason || null, // Lý do đề xuất (bắt buộc với update)
      status: 'pending'
    }, { transaction: t });

    // ⚠️ COMMIT TRANSACTION TRƯỚC KHI GỬI THÔNG BÁO
    await t.commit();

    // 📧 THÔNG BÁO CHO ADMIN + MANAGER CONTENT + STAFF CÓ QUYỀN APPROVE_MEDICINE
    try {
      const recipientIds = new Set();

      // 1. Lấy tất cả Admin
      const adminUsers = await User.findAll({
        where: { role: 'admin' },
        attributes: ['id']
      });
      console.log(`🔍 Tìm thấy ${adminUsers.length} admin`);
      adminUsers.forEach(admin => recipientIds.add(admin.id));

      // 2. Lấy Manager Content (department=content, rank=manager)
      const managerContentStaff = await Staff.findAll({
        where: { department: 'content', rank: 'manager' },
        attributes: ['user_id', 'department', 'rank']
      });
      console.log(`🔍 Tìm thấy ${managerContentStaff.length} Manager Content`);
      managerContentStaff.forEach(staff => {
        if (staff.user_id) {
          console.log(`  → Manager Content user_id: ${staff.user_id}`);
          recipientIds.add(staff.user_id);
        }
      });

      // 3. Lấy TẤT CẢ Staff và filter có quyền approve_medicine
      const allStaff = await Staff.findAll({
        attributes: ['user_id', 'permissions', 'department', 'rank']
      });
      console.log(`🔍 Kiểm tra ${allStaff.length} staff để tìm quyền approve_medicine`);
      
      allStaff.forEach(staff => {
        if (staff.permissions && staff.permissions.articles) {
          if (Array.isArray(staff.permissions.articles) && 
              staff.permissions.articles.includes('approve_medicine')) {
            console.log(`  ✓ Staff user_id ${staff.user_id} có quyền approve_medicine (${staff.department}/${staff.rank})`);
            recipientIds.add(staff.user_id);
          }
        }
      });

      console.log(`📧 Tổng số người nhận thông báo: ${recipientIds.size}`);
      console.log(`📧 Danh sách user_id: [${Array.from(recipientIds).join(', ')}]`);

      // Gửi thông báo cho tất cả recipients
      for (const userId of recipientIds) {
        await createNotification(
          userId,
          'suggestion',
          `${req.user.full_name} đề xuất thuốc mới "${name}"`,
          `/quan-ly-thuoc?tab=suggestions&suggestionId=${suggestion.id}`
        );
      }

      console.log(`✓ Đã gửi ${recipientIds.size} thông báo đề xuất thuốc "${name}"`);
    } catch (notifError) {
      console.error('⚠️ Lỗi khi gửi thông báo (suggestion đã tạo thành công):', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Đã gửi đề xuất thuốc thành công',
      suggestion
    });
  } catch (error) {
    await t.rollback();
    console.error('Error creating medicine suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đề xuất thuốc',
      error: error.message
    });
  }
};

/**
 * PUT /api/articles/medicines/suggestions/:id/review
 * Duyệt/Từ chối đề xuất thuốc
 * 
 * PHÂN QUYỀN:
 * - CHỈ Manager Content hoặc Admin
 */
exports.reviewMedicineSuggestion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'approve' hoặc 'reject'

    if (!['approve', 'reject'].includes(action)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Action phải là "approve" hoặc "reject"'
      });
    }

    // Lấy suggestion
    const suggestion = await EntitySuggestion.findByPk(id, {
      include: [{ model: User, as: 'user' }],
      transaction: t
    });

    if (!suggestion) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đề xuất'
      });
    }

    if (suggestion.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Đề xuất đã được ${suggestion.status === 'approved' ? 'duyệt' : 'từ chối'}`
      });
    }

    if (action === 'approve') {
      // ✅ TẠO THUỐC MỚI
      const medicineData = suggestion.suggested_data; // ✅ Sửa từ data_json
      const slug = generateSlug(medicineData.name);

      const medicine = await Medicine.create({
        name: medicineData.name,
        slug,
        composition: medicineData.composition,
        uses: medicineData.uses,
        side_effects: medicineData.side_effects || null,
        manufacturer: medicineData.manufacturer || null,
        image_url: medicineData.image_url || null,
        description: medicineData.description || null,
        hidden: false
      }, { transaction: t });

      // Cập nhật suggestion
      await suggestion.update({
        status: 'approved',
        admin_id: req.user.id, // ✅ Sửa từ reviewed_by thành admin_id
        entity_id: medicine.id,
        admin_note: reason // ✅ Sửa từ reason thành admin_note
      }, { transaction: t });

      await t.commit();

      // 📧 Thông báo cho người đề xuất (tác giả) - SAU KHI COMMIT
      await createNotification(
        suggestion.user_id,
        'suggestion_approved',
        `Đề xuất thuốc "${medicineData.name}" đã được duyệt bởi ${req.user.full_name}`,
        `/quan-ly-thuoc?tab=suggestions&suggestionId=${suggestion.id}`
      );

      res.json({
        success: true,
        message: 'Đã duyệt đề xuất và tạo thuốc thành công',
        medicine
      });
    } else {
      // ❌ TỪ CHỐI
      await suggestion.update({
        status: 'rejected',
        admin_id: req.user.id, // ✅ Sửa từ reviewed_by
        admin_note: reason || 'Không phù hợp' // ✅ Sửa từ reason
      }, { transaction: t });

      await t.commit();

      // 📧 Thông báo cho người đề xuất (tác giả) - SAU KHI COMMIT
      await createNotification(
        suggestion.user_id,
        'suggestion_rejected',
        `Đề xuất thuốc "${suggestion.suggested_data.name}" đã bị từ chối bởi ${req.user.full_name}${reason ? `: ${reason}` : ''}`,
        `/quan-ly-thuoc?tab=suggestions&suggestionId=${suggestion.id}`
      );

      res.json({
        success: true,
        message: 'Đã từ chối đề xuất'
      });
    }
  } catch (error) {
    await t.rollback();
    console.error('Error reviewing medicine suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý đề xuất thuốc',
      error: error.message
    });
  }
};

// =====================================================
// DISEASE SUGGESTIONS - ĐỀ XUẤT BỆNH LÝ
// =====================================================

/**
 * GET /api/articles/diseases/suggestions
 * Lấy danh sách đề xuất bệnh lý
 */
exports.getDiseaseSuggestions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const user = req.user;

    console.log(`\n🔍 getDiseaseSuggestions - User: ${user.id} (${user.role})`);

    // 🔐 Check quyền: Admin || Manager Content || Staff có quyền approve_disease
    const canApprove = await (async () => {
      if (user.role === 'admin') {
        console.log('  ✓ User là Admin → canApprove = true');
        return true;
      }
      
      if (user.role === 'staff') {
        const staff = await Staff.findOne({ 
          where: { user_id: user.id },
          attributes: ['user_id', 'department', 'rank', 'permissions']
        });
        
        if (!staff) {
          console.log('  ✗ Không tìm thấy staff profile');
          return false;
        }
        
        console.log(`  → Staff: ${staff.department}/${staff.rank}`);
        
        // Manager Content có full quyền
        if (staff.department === 'content' && staff.rank === 'manager') {
          console.log('  ✓ Manager Content → canApprove = true');
          return true;
        }
        
        // Hoặc Staff có quyền approve_disease
        if (staff.permissions && staff.permissions.articles) {
          const hasPermission = Array.isArray(staff.permissions.articles) && 
                                staff.permissions.articles.includes('approve_disease');
          console.log(`  → Permissions.articles: ${JSON.stringify(staff.permissions.articles)}`);
          console.log(`  → Has approve_disease: ${hasPermission}`);
          return hasPermission;
        } else {
          console.log('  ✗ Không có permissions.articles');
        }
      }
      return false;
    })();

    console.log(`  → RESULT: canApprove = ${canApprove}`);

    const where = { entity_type: 'disease' };

    // ⚠️ Staff thường chỉ thấy đề xuất của mình, người có quyền approve thấy tất cả
    if (!canApprove) {
      where.user_id = user.id;
      console.log(`  → Chỉ xem đề xuất của mình (user_id: ${user.id})`);
    } else {
      console.log(`  → Xem TẤT CẢ đề xuất bệnh lý`);
    }

    // Filter theo status
    if (status) {
      where.status = status;
    }

    const { count, rows } = await EntitySuggestion.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: User,
          as: 'admin', // ✅ Sửa từ 'reviewer' thành 'admin'
          attributes: ['id', 'username', 'full_name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`  → Kết quả: ${rows.length}/${count} disease suggestions\n`);

    res.json({
      success: true,
      suggestions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching disease suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đề xuất bệnh lý',
      error: error.message
    });
  }
};

/**
 * POST /api/articles/diseases/suggestions
 * Tạo đề xuất bệnh lý mới
 */
exports.createDiseaseSuggestion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, symptoms, treatments, description, image_url } = req.body;
    const user = req.user;

    // 🔐 KIỂM TRA QUYỀN: Chỉ staff content hoặc doctor mới được gửi đề xuất
    if (user.role === 'staff') {
      const staff = await Staff.findOne({ where: { user_id: user.id } });
      if (!staff || staff.department !== 'content') {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: 'Chỉ nhân viên Content mới có thể gửi đề xuất bệnh lý'
        });
      }
    } else if (user.role !== 'admin' && user.role !== 'doctor') {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền gửi đề xuất bệnh lý'
      });
    }

    // Validate
    if (!name || !symptoms || !treatments) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Tên bệnh, Triệu chứng, Điều trị'
      });
    }

    // Tạo suggestion
    const suggestion = await EntitySuggestion.create({
      user_id: req.user.id,
      entity_type: 'disease',
      suggestion_type: req.body.suggestion_type || 'create', // 'create' hoặc 'update'
      entity_id: req.body.entity_id || null, // ID bệnh lý nếu là update
      suggested_data: {
        name,
        symptoms,
        treatments,
        description,
        image_url
      },
      reason: req.body.reason || null, // Lý do đề xuất (bắt buộc với update)
      status: 'pending'
    }, { transaction: t });

    // ⚠️ COMMIT TRANSACTION TRƯỚC KHI GỬI THÔNG BÁO
    await t.commit();

    // 📧 THÔNG BÁO CHO ADMIN + MANAGER CONTENT + STAFF CÓ QUYỀN APPROVE_DISEASE
    try {
      const recipientIds = new Set();

      // 1. Lấy tất cả Admin
      const adminUsers = await User.findAll({
        where: { role: 'admin' },
        attributes: ['id']
      });
      console.log(`🔍 Tìm thấy ${adminUsers.length} admin`);
      adminUsers.forEach(admin => recipientIds.add(admin.id));

      // 2. Lấy Manager Content (department=content, rank=manager)
      const managerContentStaff = await Staff.findAll({
        where: { department: 'content', rank: 'manager' },
        attributes: ['user_id', 'department', 'rank']
      });
      console.log(`🔍 Tìm thấy ${managerContentStaff.length} Manager Content`);
      managerContentStaff.forEach(staff => {
        if (staff.user_id) {
          console.log(`  → Manager Content user_id: ${staff.user_id}`);
          recipientIds.add(staff.user_id);
        }
      });

      // 3. Lấy TẤT CẢ Staff và filter có quyền approve_disease
      const allStaff = await Staff.findAll({
        attributes: ['user_id', 'permissions', 'department', 'rank']
      });
      console.log(`🔍 Kiểm tra ${allStaff.length} staff để tìm quyền approve_disease`);
      
      allStaff.forEach(staff => {
        if (staff.permissions && staff.permissions.articles) {
          if (Array.isArray(staff.permissions.articles) && 
              staff.permissions.articles.includes('approve_disease')) {
            console.log(`  ✓ Staff user_id ${staff.user_id} có quyền approve_disease (${staff.department}/${staff.rank})`);
            recipientIds.add(staff.user_id);
          }
        }
      });

      console.log(`📧 Tổng số người nhận thông báo: ${recipientIds.size}`);
      console.log(`📧 Danh sách user_id: [${Array.from(recipientIds).join(', ')}]`);

      // Gửi thông báo cho tất cả recipients
      for (const userId of recipientIds) {
        await createNotification(
          userId,
          'suggestion',
          `${req.user.full_name} đề xuất bệnh lý mới "${name}"`,
          `/quan-ly-benh-ly?tab=suggestions&suggestionId=${suggestion.id}`
        );
      }

      console.log(`✓ Đã gửi ${recipientIds.size} thông báo đề xuất bệnh lý "${name}"`);
    } catch (notifError) {
      console.error('⚠️ Lỗi khi gửi thông báo (suggestion đã tạo thành công):', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Đã gửi đề xuất bệnh lý thành công',
      suggestion
    });
  } catch (error) {
    await t.rollback();
    console.error('Error creating disease suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đề xuất bệnh lý',
      error: error.message
    });
  }
};

/**
 * PUT /api/articles/diseases/suggestions/:id/review
 * Duyệt/Từ chối đề xuất bệnh lý
 */
exports.reviewDiseaseSuggestion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Action phải là "approve" hoặc "reject"'
      });
    }

    // Lấy suggestion
    const suggestion = await EntitySuggestion.findByPk(id, {
      include: [{ model: User, as: 'user' }],
      transaction: t
    });

    if (!suggestion) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đề xuất'
      });
    }

    if (suggestion.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Đề xuất đã được ${suggestion.status === 'approved' ? 'duyệt' : 'từ chối'}`
      });
    }

    if (action === 'approve') {
      // ✅ TẠO BỆNH LÝ MỚI
      const diseaseData = suggestion.suggested_data; // ✅ Sửa từ data_json
      const slug = generateSlug(diseaseData.name);

      const disease = await Disease.create({
        name: diseaseData.name,
        slug,
        symptoms: diseaseData.symptoms,
        treatments: diseaseData.treatments,
        description: diseaseData.description || null,
        image_url: diseaseData.image_url || null,
        hidden: false
      }, { transaction: t });

      // Cập nhật suggestion
      await suggestion.update({
        status: 'approved',
        admin_id: req.user.id, // ✅ Sửa từ reviewed_by
        entity_id: disease.id,
        admin_note: reason // ✅ Sửa từ reason
      }, { transaction: t });

      await t.commit();

      // 📧 Thông báo cho người đề xuất (tác giả) - SAU KHI COMMIT
      await createNotification(
        suggestion.user_id,
        'suggestion_approved',
        `Đề xuất bệnh lý "${diseaseData.name}" đã được duyệt bởi ${req.user.full_name}`,
        `/quan-ly-benh-ly?tab=suggestions&suggestionId=${suggestion.id}`
      );

      res.json({
        success: true,
        message: 'Đã duyệt đề xuất và tạo bệnh lý thành công',
        disease
      });
    } else {
      // ❌ TỪ CHỐI
      await suggestion.update({
        status: 'rejected',
        admin_id: req.user.id, // ✅ Sửa từ reviewed_by
        admin_note: reason || 'Không phù hợp' // ✅ Sửa từ reason
      }, { transaction: t });

      await t.commit();

      // 📧 Thông báo cho người đề xuất (tác giả) - SAU KHI COMMIT
      await createNotification(
        suggestion.user_id,
        'suggestion_rejected',
        `Đề xuất bệnh lý "${suggestion.suggested_data.name}" đã bị từ chối bởi ${req.user.full_name}${reason ? `: ${reason}` : ''}`,
        `/quan-ly-benh-ly?tab=suggestions&suggestionId=${suggestion.id}`
      );

      res.json({
        success: true,
        message: 'Đã từ chối đề xuất'
      });
    }
  } catch (error) {
    await t.rollback();
    console.error('Error reviewing disease suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý đề xuất bệnh lý',
      error: error.message
    });
  }
};

// server/controllers/articleController.js - FIXED ALL ERRORS + NEW FEATURES
const { sequelize, models } = require('../config/db');
const { Article, Category, User, Interaction, Notification, Medicine, Disease } = models;
const { Op } = require('sequelize');
const slugify = require('slugify');

// ==================== HELPER FUNCTIONS ====================

const createNotification = async (userId, type, message, link) => {
  try {
    await Notification.create({
      user_id: userId,
      type,
      message,
      link,
      is_read: false
    });
    console.log(`SUCCESS: Đã tạo thông báo cho user ${userId}`);
  } catch (error) {
    console.error('ERROR: Lỗi khi tạo thông báo:', error);
  }
};

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
    console.log('SUCCESS: Đã gửi thông báo tới tất cả admin');
  } catch (error) {
    console.error('ERROR: Lỗi khi gửi thông báo tới admin:', error);
  }
};

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

// ==================== PUBLIC ROUTES ====================

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

// SỬA: Đổi alias 'Category' thành 'category' (lowercase)
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

// SỬA: Alias + include Medicine/Disease đúng
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

// MỚI: Lấy bài viết hoặc danh mục theo categoryType + slug
exports.getByTypeAndSlug = async (req, res) => {
  try {
    const { categoryType, slug } = req.params;

    const typeMap = {
      'tin-tuc': 'tin_tuc',
      'thuoc': 'thuoc',
      'benh-ly': 'benh_ly'
    };

    const dbCategoryType = typeMap[categoryType] || categoryType;

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

// MỚI: Lấy bài viết đã lưu của user
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
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0
        }
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

// ==================== AUTHENTICATED ROUTES ====================

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
    if (author_id) where.author_id = author_id;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = date_from;
      if (date_to) where.created_at[Op.lte] = date_to;
    }
    if (min_views) where.views = { [Op.gte]: parseInt(min_views) };

    if (category_type) {
      where['$category.category_type$'] = category_type;
      if (category_type === 'thuoc') {
        where.entity_type = 'medicine';
      } else if (category_type === 'benh_ly') {
        where.entity_type = 'disease';
      } else if (category_type === 'tin_tuc') {
        where.entity_type = 'article';
      }
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
      pages: Math.ceil(articles.count / parseInt(limit)),
      articles: processedArticles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(articles.count / parseInt(limit)),
        totalItems: articles.count
      },
      stats: {
        pending: await Article.count({ where: { status: 'pending' } }),
        approved: await Article.count({ where: { status: 'approved' } }),
        rejected: await Article.count({ where: { status: 'rejected' } }),
        request_edit: await Article.count({ where: { status: 'request_edit' } })
      }
    });
  } catch (error) {
    console.error('ERROR: Lỗi khi lấy danh sách bài viết:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// SỬA: Alias Category
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

    const articleWithEntity = await loadEntityData(article);

    res.json({ success: true, article: articleWithEntity });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

// SỬA: Thêm validation slug không trùng category
exports.createArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title, content, category_id, tags_json, source,
      composition, uses, side_effects, manufacturer,
      symptoms, treatments, description
    } = req.body;

    const category = await Category.findByPk(category_id, { transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Danh mục không tồn tại' });
    }

    const slug = slugify(title, { lower: true, strict: true });

    const categoryConflict = await Category.findOne({
      where: { 
        slug, 
        category_type: category.category_type 
      },
      transaction
    });

    if (categoryConflict) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Slug này trùng với danh mục. Vui lòng chọn tiêu đề khác.' 
      });
    }

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

    const article = await Article.create({
      title,
      slug,
      content,
      category_id,
      author_id: req.user.id,
      entity_type: entityType,
      entity_id: entity ? entity.id : null,
      tags_json: tags_json || [],
      status: req.user.role === 'admin' ? 'approved' : 'pending',
      source
    }, { transaction });

    await transaction.commit();

    if (req.user.role !== 'admin') {
      await notifyAllAdmins(
        'system',
        `Staff ${req.user.full_name} đã tạo bài viết mới "${title}" cần phê duyệt.`,
        `/articles/review/${article.id}`
      );
    }

    res.json({ success: true, message: 'Tạo bài viết thành công', article });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      title, content, category_id, tags_json, source,
      composition, uses, side_effects, manufacturer,
      symptoms, treatments, description, hideAfterEdit
    } = req.body;

    const article = await Article.findByPk(id, { transaction });
    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const category = await Category.findByPk(category_id || article.category_id, { transaction });
    if (!category) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Danh mục không tồn tại' });
    }

    const newSlug = title ? slugify(title, { lower: true, strict: true }) : article.slug;

    await article.update({
      title: title || article.title,
      slug: newSlug,
      content: content || article.content,
      category_id: category_id || article.category_id,
      tags_json: tags_json || article.tags_json,
      source: source || article.source,
      status: hideAfterEdit ? 'hidden' : article.status
    }, { transaction });

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

    res.json({ success: true, message: 'Cập nhật bài viết thành công', article });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.requestEditArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    await article.update({
      status: 'request_edit',
      edit_request_reason: reason
    });

    await notifyAllAdmins(
      'system',
      `Staff ${req.user.full_name} yêu cầu chỉnh sửa bài viết "${article.title}". Lý do: ${reason}`,
      `/articles/review/${id}`
    );

    res.json({ success: true, message: 'Yêu cầu chỉnh sửa đã được gửi' });
  } catch (error) {
    console.error('Error requesting edit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    let newEntity = null;
    if (original.entity_type === 'medicine' && original.medicine) {
      newEntity = await Medicine.create(original.medicine.toJSON(), { transaction });
    } else if (original.entity_type === 'disease' && original.disease) {
      newEntity = await Disease.create(original.disease.toJSON(), { transaction });
    }

    const newArticleData = {
      ...original.toJSON(),
      id: undefined,
      title: `${original.title} (Copy)`,
      slug: `${original.slug}-copy`,
      author_id: req.user.id,
      status: 'draft',
      views: 0,
      entity_id: newEntity ? newEntity.id : null
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

exports.allowEditArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    await article.update({ status: 'pending' });

    await createNotification(
      article.author_id,
      'system',
      `Admin đã cho phép chỉnh sửa bài viết "${article.title}".`,
      `/articles/edit/${id}`
    );

    res.json({ success: true, message: 'Đã cho phép chỉnh sửa', article });
  } catch (error) {
    console.error('Error allowing edit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reviewArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    const article = await Article.findByPk(id, {
      include: [{ model: User, as: 'author' }]
    });

    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

    const messages = {
      approve: 'approved',
      rewrite: 'request_rewrite',
      reject: 'rejected'
    };

    await article.update({
      status: messages[action],
      rejection_reason: reason || null
    });

    await createNotification(
      article.author_id,
      'system',
      `Bài viết "${article.title}" đã được ${action === 'approve' ? 'phê duyệt' : action === 'reject' ? 'từ chối' : 'yêu cầu viết lại'}. ${reason ? `Lý do: ${reason}` : ''}`,
      `/articles/${id}`
    );

    res.json({ success: true, message: messages[action], article });
  } catch (error) {
    console.error('Error reviewing article:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteArticle = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const article = await Article.findByPk(id, { transaction });

    if (!article) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
    }

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

exports.hideArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { hide } = req.body;

    const article = await Article.findByPk(id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết' });
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

// ==================== INTERACTIONS ====================

// SỬA: Trả về state mới sau khi interact
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

    await Interaction.create({
      user_id: req.user.id,
      entity_type: 'article',
      entity_id: id,
      interaction_type: 'report',
      reason: reason
    });

    await notifyAllAdmins(
      'system',
      `Bài viết "${article.title}" bị báo cáo vi phạm bởi ${req.user.full_name}. Lý do: ${reason}`,
      `/articles/manage?id=${id}`
    );

    res.json({ success: true, message: 'Đã gửi báo cáo bài viết. Admin sẽ xem xét.' });
  } catch (error) {
    console.error('ERROR: Lỗi khi báo cáo bài viết:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// SỬA: Trả về cả userInteractions để frontend biết state
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
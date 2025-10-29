// server/controllers/forumController.js
const db = require('../config/db');
const { Op, fn, col, where } = require('sequelize');
const jwt = require('jsonwebtoken');

// Helper to get models (since they're initialized asynchronously)
const getModels = () => {
  return db.models;
};

// ========== PUBLIC ENDPOINTS ==========

/**
 * Lấy danh sách câu hỏi đã duyệt (public)
 * GET /api/forum/questions/public
 */
exports.getPublicQuestions = async (req, res) => {
  try {
    const { Question, Answer, User, Patient, Doctor, Specialty } = getModels();
    let currentUserId = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (err) {
        console.warn('WARN: Token không hợp lệ trong getPublicQuestions:', err.message);
      }
    }
    const {
      page = 1,
      limit = 10,
      search = '',
      specialty = '',
      tags = ''
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      status: 'closed', // Chỉ lấy câu hỏi đã duyệt
    };

    const tagFilters = Array.isArray(tags)
      ? tags.filter(Boolean)
      : String(tags)
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

    // Tìm kiếm theo title hoặc content
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }

    // Lọc theo specialty nếu có
    if (specialty) {
      whereClause.specialtyId = specialty;
    }

    if (tagFilters.length > 0) {
      const tagConditions = tagFilters.map((tag) =>
        where(
          fn('JSON_SEARCH', col('Question.tags_json'), 'one', tag),
          {
            [Op.ne]: null,
          }
        )
      );

      whereClause[Op.and] = whereClause[Op.and] || [];
      whereClause[Op.and].push({ [Op.or]: tagConditions });
    }

    const { count, rows: questions } = await Question.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', ['full_name', 'fullName'], 'role'],
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id'],
            },
            {
              model: Doctor,
              as: 'doctor',
              attributes: ['id', ['specialty_id', 'specialtyId']],
              include: [
                {
                  model: Specialty,
                  as: 'specialty',
                  attributes: ['id', 'name', 'slug'],
                },
              ],
            },
          ],
        },
        {
          model: Specialty,
          as: 'specialty',
          attributes: ['id', 'name'],
        },
        {
          model: Answer,
          as: 'answers',
          attributes: ['id'],
          where: { isDeleted: false },
          required: false,
        },
      ],
      // Use actual column names to avoid Unknown column errors
      order: [
        ['is_pinned', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: {
        questions: questions.map((q) => {
          const data = q.toJSON();
          const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
          return {
            ...data,
            answerCount: data.answers ? data.answers.length : 0,
            liked: currentUserId ? likedBy.includes(currentUserId) : false,
          };
        }),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching public questions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách câu hỏi',
      error: error.message,
    });
  }
};

/**
 * Lấy tổng quan bảng xếp hạng và thống kê diễn đàn
 * GET /api/forum/stats/overview
 */
exports.getForumOverview = async (req, res) => {
  try {
    const { sequelize } = db;

    const [[rawStats]] = await sequelize.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_members,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) AS active_members,
        (SELECT COUNT(*) FROM questions WHERE status = 'closed') AS approved_questions,
        (SELECT COUNT(*) FROM answers WHERE is_deleted = 0) AS total_answers
    `);

    const [contributors] = await sequelize.query(`
      SELECT 
        u.id,
        COALESCE(NULLIF(u.full_name, ''), u.email, CONCAT('Người dùng #', u.id)) AS display_name,
        u.full_name,
        u.email,
        u.avatar_url,
        u.role,
        COALESCE(q.question_count, 0) AS question_count,
        COALESCE(a.answer_count, 0) AS answer_count,
        COALESCE(q.total_likes, 0) AS question_likes,
        COALESCE(a.total_likes, 0) AS answer_likes,
        (
          COALESCE(a.answer_count, 0) * 10 +
          COALESCE(a.total_likes, 0) * 2 +
          COALESCE(q.question_count, 0) * 4 +
          COALESCE(q.total_likes, 0)
        ) AS score
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS question_count, COALESCE(SUM(likes_count), 0) AS total_likes
        FROM questions
        WHERE status = 'closed'
        GROUP BY user_id
      ) q ON q.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS answer_count, COALESCE(SUM(likes_count), 0) AS total_likes
        FROM answers
        WHERE is_deleted = 0
        GROUP BY user_id
      ) a ON a.user_id = u.id
      WHERE COALESCE(q.question_count, 0) > 0 OR COALESCE(a.answer_count, 0) > 0
      ORDER BY score DESC, COALESCE(a.answer_count, 0) DESC, COALESCE(q.question_count, 0) DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        stats: {
          totalMembers: Number(rawStats?.total_members || 0),
          activeMembers: Number(rawStats?.active_members || 0),
          approvedQuestions: Number(rawStats?.approved_questions || 0),
          totalAnswers: Number(rawStats?.total_answers || 0),
        },
        contributors: contributors.map((row) => ({
          id: row.id,
          name: row.display_name,
          fullName: row.full_name,
          email: row.email,
          avatarUrl: row.avatar_url,
          role: row.role,
          questions: Number(row.question_count || 0),
          answers: Number(row.answer_count || 0),
          questionLikes: Number(row.question_likes || 0),
          answerLikes: Number(row.answer_likes || 0),
          points: Number(row.score || 0),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching forum overview:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thống kê diễn đàn',
      error: error.message,
    });
  }
};

/**
 * Lấy chi tiết câu hỏi và các câu trả lời
 * GET /api/forum/questions/:id
 */
exports.getQuestionDetail = async (req, res) => {
  try {
    const { Question, Answer, User, Patient, Doctor, Specialty } = getModels();
    let currentUserId = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (err) {
        console.warn('WARN: Token không hợp lệ trong getQuestionDetail:', err.message);
      }
    }
    const { id } = req.params;

    const question = await Question.findOne({
      where: {
        id,
        status: 'closed', // Chỉ hiển thị câu hỏi đã duyệt
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'full_name', 'role', 'avatar_url'],
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id'],
            },
            {
              model: Doctor,
              as: 'doctor',
              attributes: ['id', ['specialty_id', 'specialtyId'], ['certifications_json', 'qualifications'], ['experience_years', 'experience']],
              include: [
                {
                  model: Specialty,
                  as: 'specialty',
                  attributes: ['id', 'name'],
                },
              ],
            },
          ],
        },
        {
          model: Specialty,
          as: 'specialty',
          attributes: ['id', 'name', 'description'],
        },
        {
          model: Answer,
          as: 'answers',
          where: { isDeleted: false },
          required: false,
          separate: true,
          order: [
            ['is_pinned', 'DESC'],
            ['is_verified', 'DESC'],
            ['likes_count', 'DESC'],
            ['created_at', 'ASC'],
          ],
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'full_name', 'role', 'avatar_url'],
              include: [
                {
                  model: Doctor,
                  as: 'doctor',
                  attributes: [
                    'id',
                    'specialty_id',
                    'certifications_json',
                    'experience_years',
                  ],
                  include: [
                    {
                      model: Specialty,
                      as: 'specialty',
                      attributes: ['id', 'name', 'slug'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi hoặc câu hỏi chưa được duyệt',
      });
    }

    // Tăng view count
    await question.increment('viewsCount');

    const questionJSON = question.toJSON();
    const likedBy = Array.isArray(questionJSON.likedBy) ? questionJSON.likedBy : [];
    const questionLiked = currentUserId ? likedBy.includes(currentUserId) : false;

    const mapUser = (userData) => {
      if (!userData) return null;
      return {
        ...userData,
        fullName: userData.full_name || userData.fullName || null,
        avatar: userData.avatar_url || userData.avatar || null,
        doctor: userData.doctor
          ? {
              ...userData.doctor,
              specialtyId: userData.doctor.specialty_id || userData.doctor.specialtyId || null,
              qualifications: userData.doctor.certifications_json || userData.doctor.qualifications || null,
              experience: userData.doctor.experience_years || userData.doctor.experience || null,
            }
          : null,
      };
    };

    const answers = (questionJSON.answers || []).map((answer) => {
      const answerLikedBy = Array.isArray(answer.likedBy) ? answer.likedBy : [];
      const answerLiked = currentUserId ? answerLikedBy.includes(currentUserId) : false;
      return {
        ...answer,
        liked: answerLiked,
        author: mapUser(answer.author),
      };
    });

    res.json({
      success: true,
      data: {
        ...questionJSON,
        liked: questionLiked,
        author: mapUser(questionJSON.author),
        answers,
      },
    });
  } catch (error) {
    console.error('Error fetching question detail:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết câu hỏi',
      error: error.message,
    });
  }
};

// ========== AUTHENTICATED USER ENDPOINTS ==========

/**
 * Tạo câu hỏi mới
 * POST /api/forum/questions
 */
exports.createQuestion = async (req, res) => {
  try {
    const { Question, User, Specialty } = getModels();
    const { title, content, specialtyId, tags, isAnonymous, images } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung câu hỏi',
      });
    }

    // Validate images array if provided
    if (images && (!Array.isArray(images) || images.length > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Tối đa 5 hình ảnh',
      });
    }

    const question = await Question.create({
      title,
      content,
      specialtyId: specialtyId || null,
      tags: tags || [],
      images: images || [],
      isAnonymous: isAnonymous || false,
      authorId: userId,
      status: userRole === 'admin' ? 'closed' : 'open',
      approvedBy: userRole === 'admin' ? userId : null,
      approvedAt: userRole === 'admin' ? new Date() : null,
    });

    // Optional: auto-approve in development/testing
    if (process.env.FORUM_AUTO_APPROVE === 'true' && question.status !== 'closed') {
      question.status = 'closed';
      question.approvedAt = new Date();
      question.approvedBy = userId;
      await question.save();
    }

    // Lấy thông tin câu hỏi vừa tạo với các associations
    const newQuestion = await Question.findByPk(question.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', ['full_name', 'fullName'], 'role'],
        },
        {
          model: Specialty,
          as: 'specialty',
          attributes: ['id', 'name', 'slug'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Câu hỏi của bạn đã được gửi và đang chờ duyệt',
      data: newQuestion,
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo câu hỏi',
      error: error.message,
    });
  }
};

/**
 * Trả lời câu hỏi
 * POST /api/forum/questions/:id/answers
 */
exports.createAnswer = async (req, res) => {
  try {
    const { Question, Answer, User, Doctor, Specialty } = getModels();
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung câu trả lời',
      });
    }

    // Kiểm tra câu hỏi có tồn tại và đã được duyệt
    const question = await Question.findOne({
      where: { id, status: 'closed' },
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi hoặc câu hỏi chưa được duyệt',
      });
    }

    const answer = await Answer.create({
      content,
      questionId: id,
      authorId: userId,
    });

    // Tăng answersCount của question
    await question.increment('answersCount');

    // Lấy thông tin câu trả lời với associations
    const newAnswer = await Answer.findByPk(answer.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: [
            'id',
            ['full_name', 'fullName'],
            'role',
            ['avatar_url', 'avatar'],
          ],
          include: [
            {
              model: Doctor,
              as: 'doctor',
              attributes: [
                'id',
                ['specialty_id', 'specialtyId'],
                ['certifications_json', 'qualifications'],
                ['experience_years', 'experienceYears'],
              ],
              include: [
                {
                  model: Specialty,
                  as: 'specialty',
                  attributes: ['id', 'name'],
                },
              ],
            },
          ],
        },
      ],
    });

    const newAnswerJSON = newAnswer ? newAnswer.toJSON() : null;
    if (newAnswerJSON) {
      newAnswerJSON.liked = false;
    }

    res.status(201).json({
      success: true,
      message: 'Câu trả lời đã được đăng thành công',
      data: newAnswerJSON || newAnswer,
    });
  } catch (error) {
    console.error('Error creating answer:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo câu trả lời',
      error: error.message,
    });
  }
};

/**
 * Like/Unlike câu trả lời
 * POST /api/forum/answers/:id/like
 */
exports.toggleAnswerLike = async (req, res) => {
  try {
    const { Answer } = getModels();
    const { id } = req.params;
    const userId = req.user.id;

    const answer = await Answer.findByPk(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu trả lời',
      });
    }

    // Kiểm tra user đã like chưa (giả sử có field likedBy là array)
    const likedBy = answer.likedBy || [];
    const hasLiked = likedBy.includes(userId);

    if (hasLiked) {
      // Unlike
      answer.likedBy = likedBy.filter((id) => id !== userId);
      await answer.decrement('likesCount');
    } else {
      // Like
      answer.likedBy = [...likedBy, userId];
      await answer.increment('likesCount');
    }

    await answer.save();

    res.json({
      success: true,
      message: hasLiked ? 'Đã bỏ thích' : 'Đã thích câu trả lời',
      data: {
        liked: !hasLiked,
        likesCount: answer.likesCount,
      },
    });
  } catch (error) {
    console.error('Error toggling answer like:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý like',
      error: error.message,
    });
  }
};

// ========== ADMIN ENDPOINTS ==========

/**
 * Lấy tất cả câu hỏi (admin)
 * GET /api/forum/questions
 */
exports.getAllQuestions = async (req, res) => {
  try {
    const { Question, User, Patient, Specialty } = getModels();
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Search by title, content, or author
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: questions } = await Question.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: [
            'id',
            ['full_name', 'fullName'],
            'role',
            'email',
            ['avatar_url', 'avatar']
          ],
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id'],
            },
          ],
        },
        {
          model: Specialty,
          as: 'specialty',
          attributes: ['id', 'name'],
        },
      ],
      // Use snake_case DB columns
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Thống kê
    const stats = await Question.findAll({
      attributes: [
        'status',
        [Question.sequelize.fn('COUNT', Question.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
    });

    const statsMap = {
      total: 0,
      open: 0,
      closed: 0,
      hidden: 0,
    };

    stats.forEach((stat) => {
      const statusCount = parseInt(stat.dataValues.count);
      statsMap[stat.status] = statusCount;
      statsMap.total += statusCount;
    });

    res.json({
      success: true,
      data: {
        questions,
        stats: statsMap,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching all questions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách câu hỏi',
      error: error.message,
    });
  }
};

/**
 * Cập nhật trạng thái câu hỏi (approve/reject)
 * PUT /api/forum/questions/:id/status
 */
exports.updateQuestionStatus = async (req, res) => {
  try {
    const { Question, Notification } = getModels();
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    // Validate status
    if (!['open', 'closed', 'hidden'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ',
      });
    }

    const question = await Question.findByPk(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi',
      });
    }

    const oldStatus = question.status;
    
    // Cập nhật trạng thái
    question.status = status;

    if (status === 'hidden' && rejectionReason) {
      question.rejectionReason = rejectionReason;
    }

    if (status === 'closed') {
      question.approvedAt = new Date();
      question.approvedBy = req.user.id;
    }

    await question.save();

    // Tạo thông báo cho tác giả nếu trạng thái thay đổi từ 'open'
    if (oldStatus === 'open' && question.authorId && (status === 'closed' || status === 'hidden')) {
      let notificationMessage = '';
      let notificationType = 'info';

      if (status === 'closed') {
        notificationMessage = `Câu hỏi "${question.title}" của bạn đã được phê duyệt và xuất bản.`;
        notificationType = 'success';
      } else if (status === 'hidden') {
        notificationMessage = `Câu hỏi "${question.title}" của bạn không được duyệt.`;
        if (rejectionReason) {
          notificationMessage += ` Lý do: ${rejectionReason}`;
        }
        notificationType = 'warning';
      }

      try {
        await Notification.create({
          user_id: question.authorId,
          type: 'system',
          message: notificationMessage,
          is_read: false,
          link: status === 'closed' ? `/dien-dan-suc-khoe/cau-hoi/${question.id}` : null,
        });
      } catch (notifyError) {
        console.warn('WARN: Không thể tạo notification cho câu hỏi:', notifyError.message);
      }
    }

    res.json({
      success: true,
      message:
        status === 'closed'
          ? 'Câu hỏi đã được duyệt'
          : status === 'hidden'
          ? 'Câu hỏi đã bị từ chối'
          : 'Câu hỏi đang chờ duyệt',
      data: question,
    });
  } catch (error) {
    console.error('Error updating question status:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái câu hỏi',
      error: error.message,
    });
  }
};

/**
 * Xóa câu hỏi (admin)
 * DELETE /api/forum/questions/:id
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { Question } = getModels();
    const { id } = req.params;

    const question = await Question.findByPk(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi',
      });
    }

    await question.destroy();

    res.json({
      success: true,
      message: 'Câu hỏi đã được xóa',
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa câu hỏi',
      error: error.message,
    });
  }
};

/**
 * Xóa câu trả lời (admin)
 * DELETE /api/forum/answers/:id
 */
exports.deleteAnswer = async (req, res) => {
  try {
    const { Answer, Question } = getModels();
    const { id } = req.params;

    const answer = await Answer.findByPk(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu trả lời',
      });
    }

    // Soft delete
    answer.isDeleted = true;
    await answer.save();

    // Giảm answersCount của question
    const question = await Question.findByPk(answer.questionId);
    if (question) {
      await question.decrement('answersCount');
    }

    res.json({
      success: true,
      message: 'Câu trả lời đã được xóa',
    });
  } catch (error) {
    console.error('Error deleting answer:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa câu trả lời',
      error: error.message,
    });
  }
};

/**
 * Pin/Unpin câu trả lời
 * PUT /api/forum/answers/:id/pin
 */
exports.togglePinAnswer = async (req, res) => {
  try {
    const { Answer } = getModels();
    const { id } = req.params;

    const answer = await Answer.findByPk(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu trả lời',
      });
    }

    answer.isPinned = !answer.isPinned;
    await answer.save();

    res.json({
      success: true,
      message: answer.isPinned ? 'Đã ghim câu trả lời' : 'Đã bỏ ghim câu trả lời',
      data: answer,
    });
  } catch (error) {
    console.error('Error toggling pin answer:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý ghim câu trả lời',
      error: error.message,
    });
  }
};

/**
 * Verify/Unverify câu trả lời (đánh dấu câu trả lời được xác thực)
 * PUT /api/forum/answers/:id/verify
 */
exports.toggleVerifyAnswer = async (req, res) => {
  try {
    const { Answer } = getModels();
    const { id } = req.params;

    const answer = await Answer.findByPk(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu trả lời',
      });
    }

    answer.isVerified = !answer.isVerified;
    if (answer.isVerified) {
      answer.verifiedBy = req.user.id;
      answer.verifiedAt = new Date();
    } else {
      answer.verifiedBy = null;
      answer.verifiedAt = null;
    }
    await answer.save();

    res.json({
      success: true,
      message: answer.isVerified
        ? 'Đã xác thực câu trả lời'
        : 'Đã bỏ xác thực câu trả lời',
      data: answer,
    });
  } catch (error) {
    console.error('Error toggling verify answer:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý xác thực câu trả lời',
      error: error.message,
    });
  }
};

/**
 * Like/Unlike câu hỏi
 * POST /api/forum/questions/:id/like
 */
exports.toggleLikeQuestion = async (req, res) => {
  try {
    const { Question } = getModels();
    const { id } = req.params;
    const userId = req.user.id;

    const question = await Question.findByPk(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu hỏi',
      });
    }

    const userIdNum = Number(userId);
    let likedBy = Array.isArray(question.likedBy)
      ? question.likedBy.map((value) => Number(value))
      : [];
    const hasLiked = likedBy.includes(userIdNum);

    if (hasLiked) {
      likedBy = likedBy.filter((likedUserId) => likedUserId !== userIdNum);
      question.likesCount = Math.max(0, Number(question.likesCount || 0) - 1);
    } else {
      likedBy.push(userIdNum);
      question.likesCount = Number(question.likesCount || 0) + 1;
    }

    question.likedBy = likedBy;
    await question.save();

    res.json({
      success: true,
      message: hasLiked ? 'Đã bỏ thích' : 'Đã thích câu hỏi',
      data: {
        liked: !hasLiked,
        likesCount: question.likesCount,
      },
    });
  } catch (error) {
    console.error('Error toggling like question:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý thích câu hỏi',
      error: error.message,
    });
  }
};

/**
 * Like/Unlike câu trả lời
 * POST /api/forum/answers/:id/like
 */
exports.toggleLikeAnswer = async (req, res) => {
  try {
    const { Answer } = getModels();
    const { id } = req.params;
    const userId = req.user.id;

    const answer = await Answer.findByPk(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy câu trả lời',
      });
    }

    const userIdNum = Number(userId);
    let likedBy = Array.isArray(answer.likedBy)
      ? answer.likedBy.map((value) => Number(value))
      : [];
    const hasLiked = likedBy.includes(userIdNum);

    if (hasLiked) {
      likedBy = likedBy.filter((likedUserId) => likedUserId !== userIdNum);
      answer.likesCount = Math.max(0, Number(answer.likesCount || 0) - 1);
    } else {
      likedBy.push(userIdNum);
      answer.likesCount = Number(answer.likesCount || 0) + 1;
    }

    answer.likedBy = likedBy;
    await answer.save();

    res.json({
      success: true,
      message: hasLiked ? 'Đã bỏ thích' : 'Đã thích câu trả lời',
      data: {
        liked: !hasLiked,
        likesCount: answer.likesCount,
      },
    });
  } catch (error) {
    console.error('Error toggling like answer:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý thích câu trả lời',
      error: error.message,
    });
  }
};

/**
 * Báo cáo câu hỏi hoặc câu trả lời
 * POST /api/forum/reports
 */
exports.createReport = async (req, res) => {
  try {
    const { Report, Question, Answer } = getModels();
    const { entityType, entityId, reason, description } = req.body;
    const reporterId = req.user.id;

    // Validate
    if (!['question', 'answer'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Loại nội dung không hợp lệ',
      });
    }

    if (!['spam', 'inappropriate', 'misleading', 'offensive', 'other'].includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Lý do báo cáo không hợp lệ',
      });
    }

    // Kiểm tra entity tồn tại
    if (entityType === 'question') {
      const question = await Question.findByPk(entityId);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy câu hỏi',
        });
      }
    } else {
      const answer = await Answer.findByPk(entityId);
      if (!answer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy câu trả lời',
        });
      }
    }

    // Kiểm tra đã báo cáo chưa
    const existingReport = await Report.findOne({
      where: {
        reporterId,
        entityType,
        entityId,
        status: 'pending',
      },
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã báo cáo nội dung này rồi',
      });
    }

    const report = await Report.create({
      reporterId,
      entityType,
      entityId,
      reason,
      description: description || null,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Báo cáo của bạn đã được gửi',
      data: report,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi báo cáo',
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách báo cáo (admin)
 * GET /api/forum/reports
 */
exports.getReports = async (req, res) => {
  try {
    const { Report, User, Question, Answer } = getModels();
    const { status, entityType, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: reports } = await Report.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: [
            'id',
            ['full_name', 'fullName'],
            'email',
            'role',
          ],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: [
            'id',
            ['full_name', 'fullName'],
          ],
        },
      ],
      order: [
        ['status', 'ASC'], // pending trước
        ['created_at', 'DESC'],
      ],
      limit: parseInt(limit),
      offset,
    });

    // Lấy thêm thông tin entity
    const reportsWithEntity = await Promise.all(
      reports.map(async (report) => {
        const reportData = report.toJSON();
        
        if (report.entityType === 'question') {
          const question = await Question.findByPk(report.entityId, {
            attributes: ['id', 'title', 'status', 'created_at'],
          });
          reportData.entity = question;
          reportData.relatedQuestion = question;
        } else {
          const answer = await Answer.findByPk(report.entityId, {
            attributes: ['id', 'content', 'isDeleted', ['question_id', 'questionId']],
          });
          reportData.entity = answer;

          if (answer && answer.questionId) {
            const parentQuestion = await Question.findByPk(answer.questionId, {
              attributes: ['id', 'title', 'status', 'created_at'],
            });
            reportData.relatedQuestion = parentQuestion;
          }
        }

        return reportData;
      })
    );

    res.json({
      success: true,
      data: {
        reports: reportsWithEntity,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách báo cáo',
      error: error.message,
    });
  }
};

/**
 * Cập nhật trạng thái báo cáo (admin)
 * PUT /api/forum/reports/:id
 */
exports.updateReport = async (req, res) => {
  try {
    const { Report } = getModels();
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ',
      });
    }

    const report = await Report.findByPk(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy báo cáo',
      });
    }

    report.status = status;
    if (adminNote) report.adminNote = adminNote;
    
    if (status !== 'pending') {
      report.reviewedBy = req.user.id;
      report.reviewedAt = new Date();
    }

    await report.save();

    res.json({
      success: true,
      message: 'Đã cập nhật trạng thái báo cáo',
      data: report,
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật báo cáo',
      error: error.message,
    });
  }
};

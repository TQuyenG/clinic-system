// server/controllers/contactController.js
const { models } = require('../config/db');
const { Op } = require('sequelize');

/**
 * POST /api/contact/send
 * Gửi tin nhắn liên hệ (public, không cần auth)
 */
exports.sendMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc (tên, email, chủ đề, nội dung)'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
    }

    // Rate limit: không quá 5 tin/giờ từ cùng email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await models.ContactMessage.count({
      where: {
        email,
        created_at: { [Op.gte]: oneHourAgo }
      }
    });

    if (recentCount >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau 1 giờ.'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || '';

    const contactMsg = await models.ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      subject: subject.trim(),
      message: message.trim(),
      status: 'new',
      ip_address: ipAddress
    });

    // Tạo notification cho admin nếu có model Notification
    if (models.Notification) {
      const admins = await models.User.findAll({ where: { role: 'admin', is_active: true } });
      for (const admin of admins) {
        await models.Notification.create({
          user_id: admin.id,
          type: 'system',
          title: '📩 Tin nhắn liên hệ mới',
          content: `${name} (${email}) vừa gửi tin nhắn: "${subject}"`,
          related_id: contactMsg.id,
          related_type: 'contact_message',
          link: '/quan-ly-lien-he',
          priority: 'normal',
          is_read: false
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Tin nhắn của bạn đã được gửi thành công! Chúng tôi sẽ phản hồi sớm nhất.',
      data: { id: contactMsg.id }
    });
  } catch (error) {
    console.error('[contactController] sendMessage ERROR:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

/**
 * GET /api/contact/messages
 * Lấy danh sách tin nhắn (admin/staff)
 */
exports.getMessages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } }
      ];
    }

    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.created_at[Op.lte] = end;
      }
    }

    const allowedSort = ['created_at', 'name', 'email', 'status', 'updated_at'];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'created_at';

    const { count, rows } = await models.ContactMessage.findAndCountAll({
      where: whereClause,
      include: [{
        model: models.User,
        as: 'replier',
        attributes: ['id', 'full_name', 'email', 'avatar_url'],
        required: false
      }],
      order: [[sortField, sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Thống kê theo status
    const stats = await models.ContactMessage.findAll({
      attributes: [
        'status',
        [models.ContactMessage.sequelize.fn('COUNT', models.ContactMessage.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const statsMap = { new: 0, read: 0, replied: 0, closed: 0, total: count };
    stats.forEach(s => { statsMap[s.status] = parseInt(s.count); });

    res.json({
      success: true,
      data: rows,
      total: count,
      stats: statsMap,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('[contactController] getMessages ERROR:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

/**
 * GET /api/contact/messages/:id
 * Chi tiết 1 tin nhắn + tự động mark as read
 */
exports.getMessageById = async (req, res) => {
  try {
    const msg = await models.ContactMessage.findByPk(req.params.id, {
      include: [{
        model: models.User,
        as: 'replier',
        attributes: ['id', 'full_name', 'email'],
        required: false
      }]
    });

    if (!msg) return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn' });

    if (msg.status === 'new') {
      await msg.update({ status: 'read' });
    }

    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

/**
 * PUT /api/contact/messages/:id/status
 * Cập nhật trạng thái tin nhắn
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    const validStatuses = ['new', 'read', 'replied', 'closed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const msg = await models.ContactMessage.findByPk(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn' });

    const updateData = { status };
    if (admin_note !== undefined) updateData.admin_note = admin_note;
    if (status === 'replied') {
      updateData.replied_by = req.user.id;
      updateData.replied_at = new Date();
    }

    await msg.update(updateData);
    res.json({ success: true, message: 'Cập nhật thành công', data: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

/**
 * DELETE /api/contact/messages/:id
 * Xóa tin nhắn (admin only)
 */
exports.deleteMessage = async (req, res) => {
  try {
    const msg = await models.ContactMessage.findByPk(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Không tìm thấy tin nhắn' });

    await msg.destroy();
    res.json({ success: true, message: 'Đã xóa tin nhắn thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

/**
 * DELETE /api/contact/messages/bulk
 * Xóa nhiều tin nhắn
 */
exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });
    }

    const deleted = await models.ContactMessage.destroy({ where: { id: { [Op.in]: ids } } });
    res.json({ success: true, message: `Đã xóa ${deleted} tin nhắn` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};
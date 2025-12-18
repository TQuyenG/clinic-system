// server/controllers/chatController.js
// Controller xử lý tin nhắn chat real-time trong tư vấn

const { models } = require('../config/db');
const { Op } = require('sequelize');

// ==================== GỬI TIN NHẮN ====================

/**
 * Gửi tin nhắn trong phòng tư vấn
 * POST /api/chat/messages
 */
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const {
      consultation_id,
      message_type,
      content,
      file_url,
      file_name,
      file_size,
      file_type,
      thumbnail_url,
      voice_duration,
      reply_to_id
    } = req.body;

    // Validate
    if (!consultation_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu consultation_id'
      });
    }

    if (!content && !file_url) {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn phải có nội dung hoặc file đính kèm'
      });
    }

    // Kiểm tra consultation tồn tại
    const consultation = await models.Consultation.findByPk(consultation_id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền gửi tin nhắn
    const canSend = 
      consultation.patient_id === senderId || 
      consultation.doctor_id === senderId;

    if (!canSend) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền gửi tin nhắn trong phòng này'
      });
    }

    // Kiểm tra trạng thái consultation
    if (!['confirmed', 'in_progress'].includes(consultation.status)) {
      return res.status(400).json({
        success: false,
        message: 'Không thể gửi tin nhắn khi tư vấn chưa bắt đầu hoặc đã hủy'
      });
    }

    // Xác định người nhận
    const receiverId = senderId === consultation.patient_id 
      ? consultation.doctor_id 
      : consultation.patient_id;

    // Xác định sender_type
    const senderType = senderId === consultation.patient_id ? 'patient' : 'doctor';

    // Tạo tin nhắn
    const message = await models.ChatMessage.create({
      consultation_id,
      sender_id: senderId,
      sender_type: senderType,
      receiver_id: receiverId,
      message_type: message_type || 'text',
      content,
      file_url,
      file_name,
      file_size,
      file_type,
      thumbnail_url,
      voice_duration,
      reply_to_id,
      is_system_message: false,
      sent_from_device: (req.headers['user-agent'] || 'web').substring(0, 100)
    });

    // Load message với thông tin người gửi
    const messageData = await models.ChatMessage.findByPk(message.id, {
      include: [
        {
          model: models.User,
          as: 'sender',
          attributes: ['id', 'full_name', 'avatar_url']
        },
        {
          model: models.ChatMessage,
          as: 'replyTo',
          attributes: ['id', 'content', 'message_type'],
          include: [{
            model: models.User,
            as: 'sender',
            attributes: ['id', 'full_name']
          }]
        }
      ]
    });

    // Tạo thông báo cho người nhận (không chặn gửi tin nhắn nếu lỗi)
    try {
      // ✅ SỬA LỖI BẢO MẬT: Thay thế nội dung tin nhắn bằng văn bản chung
      const senderName = req.user.full_name || 'Một người dùng'; // Lấy tên người gửi
      const notificationMessage = content 
        ? `Bạn có tin nhắn mới từ ${senderName}` 
        : `Bạn đã nhận được một file từ ${senderName}`;

      await models.Notification.create({
        user_id: receiverId,
        type: 'other', // ✅ SỬA: dùng 'other' (giá trị hợp lệ trong ENUM)
        message: notificationMessage, // <-- SỬA DÒNG NÀY
        link: `/tu-van/${consultation_id}/chat`,
        is_read: false
      });
    } catch (notifError) {
      console.error('⚠️ Lỗi tạo notification (không ảnh hưởng gửi tin):', notifError.message);
    }

    // ✅ THÊM: Broadcast tin nhắn qua WebSocket
    // ✅ Broadcast tin nhắn qua WebSocket
    console.log(`📨 Attempting to broadcast message to consultation ${consultation_id}`);
    console.log(`🔍 wsBroadcastToConsultation exists: ${!!global.wsBroadcastToConsultation}`);
    console.log(`🔍 wsConsultationRooms exists: ${!!global.wsConsultationRooms}`);
    
    if (global.wsBroadcastToConsultation) {
      console.log(`📡 Broadcasting to room: consultation_${consultation_id}`);
      console.log(`👥 Users in room:`, global.wsConsultationRooms?.get(consultation_id));
      
      global.wsBroadcastToConsultation(consultation_id, {
        type: 'new_message',
        payload: messageData
      });
      
      console.log('✅ Broadcast completed');
    } else {
      console.log('⚠️ wsBroadcastToConsultation is undefined!');
    }

    res.status(201).json({
      success: true,
      message: messageData
    });

  } catch (error) {
    console.error('❌ Error sendMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// ==================== LẤY TIN NHẮN ====================

/**
 * Lấy lịch sử chat
 * GET /api/chat/messages/:consultation_id
 */
exports.getChatHistory = async (req, res) => {
  try {
    const consultationId = req.params.consultation_id;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    // Kiểm tra consultation
    const consultation = await models.Consultation.findByPk(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền truy cập
    const hasAccess = 
      consultation.patient_id === userId || 
      consultation.doctor_id === userId ||
      ['admin', 'staff'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem tin nhắn này'
      });
    }

    const offset = (page - 1) * limit;

    // Lấy tin nhắn
    const { count, rows: messages } = await models.ChatMessage.findAndCountAll({
      where: {
        consultation_id: consultationId,
        is_deleted: false
      },
      include: [
        {
          model: models.User,
          as: 'sender',
          attributes: ['id', 'full_name', 'avatar_url']
        },
        {
          model: models.ChatMessage,
          as: 'replyTo',
          attributes: ['id', 'content', 'message_type'],
          include: [{
            model: models.User,
            as: 'sender',
            attributes: ['id', 'full_name']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Đảo ngược mảng để tin nhắn cũ nhất ở đầu
    const messagesReversed = messages.reverse();

    res.status(200).json({
      success: true,
      messages: messagesReversed,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error getChatHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * Lấy tin nhắn chưa đọc
 * GET /api/chat/messages/:consultation_id/unread
 */
exports.getUnreadMessages = async (req, res) => {
  try {
    const consultationId = req.params.consultation_id;
    const userId = req.user.id;

    // Kiểm tra consultation
    const consultation = await models.Consultation.findByPk(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền
    const hasAccess = 
      consultation.patient_id === userId || 
      consultation.doctor_id === userId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập'
      });
    }

    // Lấy tin nhắn chưa đọc
    const messages = await models.ChatMessage.getUnreadMessages(consultationId, userId);

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });

  } catch (error) {
    console.error('❌ Error getUnreadMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * Đếm tin nhắn chưa đọc
 * GET /api/chat/messages/:consultation_id/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const consultationId = req.params.consultation_id;
    const userId = req.user.id;

    const count = await models.ChatMessage.countUnreadMessages(consultationId, userId);

    res.status(200).json({
      success: true,
      count
    });

  } catch (error) {
    console.error('❌ Error getUnreadCount:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// ==================== ĐÁNH DẤU ĐÃ ĐỌC ====================

/**
 * Đánh dấu tin nhắn đã đọc
 * PUT /api/chat/messages/:message_id/read
 */
exports.markMessageAsRead = async (req, res) => {
  try {
    const messageId = req.params.message_id;
    const userId = req.user.id;

    const message = await models.ChatMessage.findByPk(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Chỉ người nhận mới có thể đánh dấu đã đọc
    if (message.receiver_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }

    await message.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tin nhắn là đã đọc'
    });

  } catch (error) {
    console.error('❌ Error markMessageAsRead:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * Đánh dấu tất cả tin nhắn đã đọc
 * PUT /api/chat/messages/:consultation_id/read-all
 */
exports.markAllMessagesAsRead = async (req, res) => {
  try {
    const consultationId = req.params.consultation_id;
    const userId = req.user.id;

    // Kiểm tra consultation
    const consultation = await models.Consultation.findByPk(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền
    const hasAccess = 
      consultation.patient_id === userId || 
      consultation.doctor_id === userId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập'
      });
    }

    const count = await models.ChatMessage.markAllAsRead(consultationId, userId);

    res.status(200).json({
      success: true,
      message: `Đã đánh dấu ${count} tin nhắn là đã đọc`
    });

  } catch (error) {
    console.error('❌ Error markAllMessagesAsRead:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// ==================== XÓA TIN NHẮN ====================

/**
 * Xóa tin nhắn (soft delete)
 * DELETE /api/chat/messages/:message_id
 */
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.message_id;
    const userId = req.user.id;

    const message = await models.ChatMessage.findByPk(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tin nhắn'
      });
    }

    // Chỉ người gửi mới có thể xóa
    if (message.sender_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể xóa tin nhắn của mình'
      });
    }

    // Không thể xóa tin nhắn hệ thống
    if (message.is_system_message) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tin nhắn hệ thống'
      });
    }

    // Kiểm tra thời gian (chỉ xóa được trong 5 phút)
    const messageTime = new Date(message.created_at);
    const now = new Date();
    const timeDiff = (now - messageTime) / 60000; // phút

    if (timeDiff > 5) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể xóa tin nhắn trong vòng 5 phút sau khi gửi'
      });
    }

    await message.softDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Đã xóa tin nhắn'
    });

  } catch (error) {
    console.error('❌ Error deleteMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// ==================== TYPING INDICATOR ====================

/**
 * Gửi trạng thái đang gõ
 * POST /api/chat/typing
 */
exports.sendTypingStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { consultation_id, is_typing } = req.body;

    // Kiểm tra consultation
    const consultation = await models.Consultation.findByPk(consultation_id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền
    const hasAccess = 
      consultation.patient_id === userId || 
      consultation.doctor_id === userId;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập'
      });
    }

    // Trả về thành công (WebSocket sẽ xử lý việc broadcast)
    res.status(200).json({
      success: true,
      data: {
        consultation_id,
        user_id: userId,
        is_typing
      }
    });

  } catch (error) {
    console.error('❌ Error sendTypingStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// ==================== SEARCH MESSAGES ====================

/**
 * Tìm kiếm tin nhắn
 * GET /api/chat/messages/:consultation_id/search
 */
exports.searchMessages = async (req, res) => {
  try {
    const consultationId = req.params.consultation_id;
    const userId = req.user.id;
    const { keyword, message_type, date_from, date_to } = req.query;

    // Kiểm tra consultation
    const consultation = await models.Consultation.findByPk(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền
    const hasAccess = 
      consultation.patient_id === userId || 
      consultation.doctor_id === userId ||
      ['admin', 'staff'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập'
      });
    }

    // Build where clause
    const where = {
      consultation_id: consultationId,
      is_deleted: false
    };

    if (keyword) {
      where.content = {
        [Op.like]: `%${keyword}%`
      };
    }

    if (message_type) {
      where.message_type = message_type;
    }

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        where.created_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.created_at[Op.lte] = new Date(date_to);
      }
    }

    // Tìm kiếm
    const messages = await models.ChatMessage.findAll({
      where,
      include: [
        {
          model: models.User,
          as: 'sender',
          attributes: ['id', 'full_name', 'avatar_url']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });

  } catch (error) {
    console.error('❌ Error searchMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// ==================== STATISTICS ====================

/**
 * Thống kê tin nhắn
 * GET /api/chat/messages/:consultation_id/stats
 */
exports.getMessageStats = async (req, res) => {
  try {
    const consultationId = req.params.consultation_id;
    const userId = req.user.id;

    // Kiểm tra consultation
    const consultation = await models.Consultation.findByPk(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền
    const hasAccess = 
      consultation.patient_id === userId || 
      consultation.doctor_id === userId ||
      ['admin', 'staff'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập'
      });
    }

    // Đếm tổng số tin nhắn
    const totalMessages = await models.ChatMessage.count({
      where: {
        consultation_id: consultationId,
        is_deleted: false
      }
    });

    // Đếm theo loại
    const messagesByType = await models.ChatMessage.findAll({
      where: {
        consultation_id: consultationId,
        is_deleted: false
      },
      attributes: [
        'message_type',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['message_type'],
      raw: true
    });

    // Đếm tin nhắn của từng người
    const messagesBySender = await models.ChatMessage.findAll({
      where: {
        consultation_id: consultationId,
        is_deleted: false,
        is_system_message: false
      },
      attributes: [
        'sender_id',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['sender_id'],
      include: [
        {
          model: models.User,
          as: 'sender',
          attributes: ['id', 'full_name']
        }
      ]
    });

    res.status(200).json({
      success: true,
      stats: {
        total_messages: totalMessages,
        by_type: messagesByType,
        by_sender: messagesBySender
      }
    });

  } catch (error) {
    console.error('❌ Error getMessageStats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// ==================== OTP VERIFICATION (MỚI) ====================

/**
 * Xác thực OTP để vào phòng chat
 * POST /api/chat/:consultation_id/verify-otp
 */
exports.verifyChatOTP = async (req, res) => {
  try {
    const consultationId = req.params.consultation_id;
    const userId = req.user.id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập OTP' });
    }

    const consultation = await models.Consultation.findByPk(consultationId);

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy buổi tư vấn' });
    }

    // Chỉ bệnh nhân mới cần xác thực OTP
    if (consultation.patient_id !== userId) {
      return res.status(200).json({ success: true, message: 'Bác sĩ không cần OTP' });
    }

    // Kiểm tra OTP
    if (consultation.chat_otp !== otp) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
    }

    // Kiểm tra OTP hết hạn
    if (new Date() > new Date(consultation.otp_expires_at)) {
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn' });
    }
    
    // Nếu OK, xóa OTP để không dùng lại được
    await consultation.update({ chat_otp: null, otp_expires_at: null });

    res.status(200).json({
      success: true,
      message: 'Xác thực OTP thành công'
    });

  } catch (error) {
    console.error('❌ Error verifyChatOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

// ==================== UPLOAD FILE ====================

/**
 * Upload file đính kèm
 * POST /api/chat/upload
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file được upload'
      });
    }

    const { consultation_id, receiver_id, message_type } = req.body;

    if (!consultation_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu consultation_id'
      });
    }

    // Tạo tin nhắn với file đính kèm
    const messageData = {
      consultation_id,
      sender_id: req.user.id,
      receiver_id,
      message_type: message_type || 'file',
      content: req.file.originalname,
      file_url: `/uploads/images/${req.file.filename}`,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype
    };

    const message = await models.ChatMessage.create(messageData);

    // Load message với thông tin người gửi
    const messageWithSender = await models.ChatMessage.findByPk(message.id, {
      include: [{
        model: models.User,
        as: 'sender',
        attributes: ['id', 'full_name', 'avatar_url']
      }]
    });

    // Broadcast qua WebSocket
    if (global.wsBroadcastToConsultation) {
      global.wsBroadcastToConsultation(consultation_id, {
        type: 'new_message',
        payload: messageWithSender
      });
    }

    res.status(201).json({
      success: true,
      message: messageWithSender,
      file_url: messageData.file_url
    });

  } catch (error) {
    console.error('❌ Error uploadFile:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
};

module.exports = {
  sendMessage: exports.sendMessage,
  getChatHistory: exports.getChatHistory,
  getUnreadMessages: exports.getUnreadMessages,
  getUnreadCount: exports.getUnreadCount,
  markMessageAsRead: exports.markMessageAsRead,
  markAllMessagesAsRead: exports.markAllMessagesAsRead,
  deleteMessage: exports.deleteMessage,
  sendTypingStatus: exports.sendTypingStatus,
  searchMessages: exports.searchMessages,
  getMessageStats: exports.getMessageStats,
  verifyChatOTP: exports.verifyChatOTP,
  uploadFile: exports.uploadFile
};
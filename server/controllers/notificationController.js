// server/controllers/notificationController.js
const { models } = require('../config/db');
const { Notification, User } = models;
const { Op } = require('sequelize');

// GET /api/notifications - Lấy danh sách thông báo của user
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, unread_only = false } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.id };
    
    // Chỉ lấy thông báo chưa đọc nếu yêu cầu
    if (unread_only === 'true') {
      where.is_read = false;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Đếm số thông báo chưa đọc
    const unreadCount = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    res.json({
      success: true,
      notifications: rows,
      unreadCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/notifications/unread-count - Lấy số lượng thông báo chưa đọc
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        user_id: req.user.id,
        is_read: false
      }
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/notifications/:id/read - Đánh dấu đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    await notification.update({ is_read: true });

    res.json({
      success: true,
      message: 'Đã đánh dấu đọc',
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/notifications/read-all - Đánh dấu tất cả đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      {
        where: {
          user_id: req.user.id,
          is_read: false
        }
      }
    );

    res.json({
      success: true,
      message: 'Đã đánh dấu tất cả đã đọc'
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/:id - Xóa thông báo
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/delete-all - Xóa tất cả thông báo đã đọc
exports.deleteAllRead = async (req, res) => {
  try {
    await Notification.destroy({
      where: {
        user_id: req.user.id,
        is_read: true
      }
    });

    res.json({
      success: true,
      message: 'Đã xóa tất cả thông báo đã đọc'
    });
  } catch (error) {
    console.error('Error deleting all read notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifications/send - Admin gửi thông báo hệ thống
exports.sendSystemNotification = async (req, res) => {
  try {
    const { user_ids, message, link, type = 'system' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu nội dung thông báo'
      });
    }

    // Nếu không chỉ định user_ids -> gửi cho tất cả
    let targetUserIds = user_ids;
    
    if (!targetUserIds || targetUserIds.length === 0) {
      const allUsers = await User.findAll({
        attributes: ['id'],
        where: {
          is_active: true
        }
      });
      targetUserIds = allUsers.map(u => u.id);
    }

    // Tạo thông báo cho từng user
    const notifications = targetUserIds.map(userId => ({
      user_id: userId,
      type,
      message,
      link: link || null,
      is_read: false
    }));

    await Notification.bulkCreate(notifications);

    res.json({
      success: true,
      message: `Đã gửi thông báo đến ${targetUserIds.length} người dùng`
    });
  } catch (error) {
    console.error('Error sending system notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Thêm function này vào cuối file notificationController.js

exports.requestManualVerification = async (req, res) => {
  try {
    const { verification_token } = req.body;

    if (!verification_token) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin verification_token'
      });
    }

    const { models } = require('../config/db');

    const user = await models.User.findOne({
      where: { verification_token }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với token này'
      });
    }

    if (user.is_verified && user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được xác thực trước đó'
      });
    }

    const admins = await models.User.findAll({
      where: { 
        role: 'admin',
        is_active: true 
      },
      attributes: ['id']
    });

    if (admins.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Không tìm thấy admin trong hệ thống'
      });
    }

    const notifications = admins.map(admin => ({
      user_id: admin.id,
      type: 'system',
      message: `Yêu cầu xác thực thủ công: Tài khoản ${user.email} (${user.full_name || 'Chưa cập nhật'}) không thể xác thực tự động. Vui lòng kiểm tra và xác thực.`,
      link: `/quan-ly-nguoi-dung?user_id=${user.id}`,
      is_read: false,
      created_at: new Date(),
      updated_at: new Date()
    }));

    await models.Notification.bulkCreate(notifications);

    console.log(`Đã gửi ${notifications.length} thông báo cho admin về user ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu xác thực đến admin. Bạn sẽ nhận được email thông báo khi tài khoản được kích hoạt.'
    });

  } catch (error) {
    console.error('ERROR trong requestManualVerification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi yêu cầu xác thực',
      error: error.message
    });
  }
};
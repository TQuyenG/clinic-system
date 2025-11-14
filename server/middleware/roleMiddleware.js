// server/middleware/roleMiddleware.js
const { models } = require('../config/db');

/**
 * Middleware kiểm tra quyền truy cập theo role
 * Sử dụng khi cần verify role từ database (đảm bảo role không bị thay đổi)
 * @param {Array} allowedRoles - Danh sách các role được phép truy cập
 * @returns {Function} Middleware function
 */
const roleMiddleware = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Kiểm tra đã authenticate chưa
      if (!req.user || !req.user.id) {
        return res.status(401).json({ 
          success: false,
          message: 'Chưa xác thực. Vui lòng đăng nhập.' 
        });
      }

      const userId = req.user.id;

      // Lấy thông tin user từ DB để verify role (đảm bảo role chính xác)
      const user = await models.User.findByPk(userId, {
        attributes: ['id', 'email', 'role', 'is_active', 'is_verified']
      });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Người dùng không tồn tại' 
        });
      }

      // Kiểm tra trạng thái tài khoản
      if (!user.is_active) {
        return res.status(403).json({ 
          success: false,
          message: 'Tài khoản đã bị khóa' 
        });
      }

      if (!user.is_verified) {
        return res.status(403).json({ 
          success: false,
          message: 'Tài khoản chưa được xác thực' 
        });
      }

      // Kiểm tra role có trong danh sách cho phép không
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          success: false,
          message: 'Bạn không có quyền truy cập chức năng này',
          requiredRoles: allowedRoles,
          currentRole: user.role
        });
      }

      // Cập nhật lại thông tin role từ DB vào request (đảm bảo consistency)
      req.user.role = user.role;
      req.user.is_active = user.is_active;
      req.user.is_verified = user.is_verified;

      next();

    } catch (error) {
      console.error('ERROR trong roleMiddleware:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Lỗi khi kiểm tra quyền truy cập', 
        error: error.message 
      });
    }
  };
};

module.exports = roleMiddleware;
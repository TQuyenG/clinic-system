const { User } = require('../models');

const roleMiddleware = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Lấy thông tin user từ DB để verify role
      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({ message: 'Người dùng không tồn tại' });
      }

      if (!user.is_active) {
        return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
      }

      // Kiểm tra role có trong danh sách cho phép không
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: 'Bạn không có quyền truy cập chức năng này',
          requiredRole: allowedRoles,
          currentRole: user.role
        });
      }

      // Gắn thêm thông tin role đầy đủ vào request
      req.user.role = user.role;
      req.user.is_active = user.is_active;

      next();

    } catch (error) {
      console.error('Lỗi kiểm tra quyền:', error);
      return res.status(500).json({ message: 'Lỗi khi kiểm tra quyền truy cập', error: error.message });
    }
  };
};

module.exports = roleMiddleware;
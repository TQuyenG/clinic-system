// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { models } = require('../config/db');

// Middleware xác thực token JWT
exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không tìm thấy token xác thực' 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          message: 'Token không hợp lệ hoặc đã hết hạn' 
        });
      }

      // Kiểm tra user còn tồn tại và active
      const user = await models.User.findByPk(decoded.id);
      if (!user || !user.is_active) {
        return res.status(403).json({ 
          success: false, 
          message: 'Tài khoản không tồn tại hoặc đã bị khóa' 
        });
      }

      req.user = decoded; // Lưu thông tin user vào request
      next();
    });
  } catch (error) {
    console.error('ERROR trong authenticateToken:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi xác thực', 
      error: error.message 
    });
  }
};

// Middleware kiểm tra quyền theo role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa xác thực' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền truy cập chức năng này' 
      });
    }

    next();
  };
};
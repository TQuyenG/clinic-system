// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { models } = require('../config/db');

/**
 * Middleware xác thực JWT token
 * Kiểm tra token trong header Authorization
 * Gắn thông tin user vào req.user nếu hợp lệ
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Lấy token từ header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không tìm thấy token xác thực' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra user còn tồn tại và active
    const user = await models.User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản không tồn tại' 
      });
    }

    const allowUnverified = process.env.ALLOW_UNVERIFIED_LOGIN === 'true';

    if (!allowUnverified) {
      if (!user.is_active) {
        return res.status(403).json({ 
          success: false, 
          message: 'Tài khoản đã bị khóa' 
        });
      }

      if (!user.is_verified) {
        return res.status(403).json({ 
          success: false, 
          message: 'Tài khoản chưa được xác thực email' 
        });
      }
    }

    // Lưu thông tin user vào request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      is_active: user.is_active,
      is_verified: user.is_verified
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.warn('WARN: Token không hợp lệ:', error.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.warn('WARN: Token đã hết hạn');
      return res.status(401).json({ 
        success: false, 
        message: 'Token đã hết hạn' 
      });
    }
    
    console.error('ERROR trong authenticateToken:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi xác thực', 
      error: error.message 
    });
  }
};

/**
 * Middleware xác thực JWT token (nới lỏng)
 * - Chỉ xác thực token và user tồn tại
 * - KHÔNG chặn khi user chưa verify hoặc chưa active
 * Dùng cho các tính năng ít nhạy cảm như đăng câu hỏi/đáp trong diễn đàn
 */
const authenticateTokenBasic = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Không tìm thấy token xác thực' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await models.User.findByPk(decoded.id);

    if (!user) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản không tồn tại' 
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      is_active: user.is_active,
      is_verified: user.is_verified
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.warn('WARN: Token không hợp lệ (basic):', error.message);
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }
    if (error.name === 'TokenExpiredError') {
      console.warn('WARN: Token đã hết hạn (basic)');
      return res.status(401).json({ success: false, message: 'Token đã hết hạn' });
    }
    console.error('ERROR trong authenticateTokenBasic:', error);
    res.status(500).json({ success: false, message: 'Lỗi xác thực', error: error.message });
  }
};

/**
 * Middleware kiểm tra quyền theo role
 * @param {Array} allowedRoles - Danh sách các role được phép
 * @returns {Function} Middleware function
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Chưa xác thực' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền truy cập chức năng này',
        requiredRoles: allowedRoles,
        currentRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware kiểm tra user có phải chủ sở hữu tài nguyên không
 * Sử dụng cho các route cần kiểm tra quyền sở hữu (edit profile, etc)
 */
const checkOwnership = (req, res, next) => {
  const { userId } = req.params;
  
  // Admin có thể truy cập mọi tài nguyên
  if (req.user.role === 'admin') {
    return next();
  }

  // User chỉ có thể truy cập tài nguyên của chính mình
  if (parseInt(userId) !== req.user.id) {
    return res.status(403).json({ 
      success: false, 
      message: 'Bạn không có quyền truy cập tài nguyên này' 
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  authenticateTokenBasic,
  authorize,
  checkOwnership
};

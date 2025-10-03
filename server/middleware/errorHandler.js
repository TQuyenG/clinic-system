// FILE: server/middleware/errorHandler.js
// Mô tả: Middleware xử lý lỗi tập trung cho toàn bộ API, log chi tiết lỗi

const errorHandler = (err, req, res, next) => {
  // Log chi tiết lỗi
  console.error('==================== LỖI API ====================');
  console.error('Thời gian:', new Date().toISOString());
  console.error('Endpoint:', req.method, req.path);
  console.error('Body:', JSON.stringify(req.body, null, 2));
  console.error('Lỗi:', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  console.error('================================================');

  // Xác định status code
  const statusCode = err.statusCode || err.status || 500;

  // Xác định message
  let message = err.message || 'Lỗi máy chủ';

  // Xử lý lỗi Sequelize
  if (err.name === 'SequelizeValidationError') {
    message = err.errors.map(e => e.message).join(', ');
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    message = 'Dữ liệu đã tồn tại trong hệ thống';
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    message = 'Dữ liệu liên quan không hợp lệ';
  } else if (err.name === 'SequelizeDatabaseError') {
    message = 'Lỗi cơ sở dữ liệu';
  }

  // Trả về response lỗi
  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? {
      name: err.name,
      message: err.message,
      stack: err.stack
    } : undefined
  });
};

module.exports = errorHandler;
const errorHandler = (err, req, res, next) => {
  console.error(`ERROR: Lỗi server: ${err.message}`);
  res.status(500).json({ error: `Lỗi server: ${err.message}` });
};

module.exports = errorHandler;
// server/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { authenticateToken } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');

// Route upload ảnh - POST /api/upload/image
router.post('/image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không có file nào được upload' 
      });
    }

    // Xóa ảnh cũ nếu có
    if (req.body.oldImage) {
      const oldImagePath = path.join(__dirname, '..', req.body.oldImage);
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
          console.log('Đã xóa ảnh cũ:', req.body.oldImage);
        } catch (err) {
          console.error('Lỗi khi xóa ảnh cũ:', err);
        }
      }
    }

    // ✅ QUAN TRỌNG: Trả về URL đầy đủ với protocol và host
    // Thay vì: `/uploads/images/${req.file.filename}`
    // Dùng: `http://localhost:3001/uploads/images/${req.file.filename}`
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;
    
    console.log('Upload thành công:', imageUrl); // Debug
    
    res.json({
      success: true,
      url: imageUrl, // ✅ URL đầy đủ: http://localhost:3001/uploads/images/article-123456.jpg
      file: {
        name: req.file.originalname,
        size: req.file.size,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
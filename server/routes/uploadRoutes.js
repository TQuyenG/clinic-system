// server/routes/uploadRoutes.js - CẬP NHẬT
const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { authenticateToken } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');

// Upload single image - XÓA ẢNH CŨ TRƯỚC KHI UPLOAD MỚI
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

    // URL của ảnh đã upload
    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    // Response format
    res.json({
      success: true,
      url: imageUrl,
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
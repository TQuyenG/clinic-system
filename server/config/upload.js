// ============================================
// server/config/upload.js - Cấu hình upload ảnh
// ============================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, '../uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'article-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - chỉ cho phép ảnh
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)'));
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

module.exports = upload;

// ============================================
// server/server.js hoặc app.js - Cấu hình body parser
// Thêm vào file chính của server
// ============================================

/*
const express = require('express');
const app = express();

// ⚠️ QUAN TRỌNG: Tăng giới hạn body size để tránh lỗi "request entity too large"
app.use(express.json({ limit: '50mb' })); // Tăng từ mặc định (100kb) lên 50mb
app.use(express.urlencoded({ 
  limit: '50mb', 
  extended: true,
  parameterLimit: 50000 
}));

// Serve static files cho ảnh đã upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/articles', articleRoutes);
*/

// ============================================
// server/routes/uploadRoutes.js - Routes cho upload ảnh
// ============================================

const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { authenticateToken } = require('../middleware/authMiddleware');

// Upload single image cho CKEditor
router.post('/image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không có file nào được upload' 
      });
    }

    // URL của ảnh đã upload
    const imageUrl = `/uploads/images/${req.file.filename}`;
    
    // Response format cho CKEditor
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

// Upload multiple images
router.post('/images', authenticateToken, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không có file nào được upload' 
      });
    }

    const uploadedFiles = req.files.map(file => ({
      name: file.originalname,
      size: file.size,
      url: `/uploads/images/${file.filename}`
    }));

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Delete image
router.delete('/image/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/images', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ 
        success: true, 
        message: 'Đã xóa ảnh thành công' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy file' 
      });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;

// ============================================
// Thêm vào server/server.js
// ============================================

/*
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/upload', uploadRoutes);
*/
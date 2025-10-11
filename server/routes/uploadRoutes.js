// server/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Upload single image cho CKEditor (dùng field name 'upload')
router.post('/image', authenticateToken, uploadController.uploadImage);

// Upload multiple images
router.post('/images', authenticateToken, uploadController.uploadMultipleImages);

// Delete image
router.delete('/image/:filename', authenticateToken, uploadController.deleteImage);

module.exports = router;
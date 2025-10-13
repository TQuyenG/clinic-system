// server/controllers/systemController.js
const { sequelize, models } = require('../config/db');

// Get Settings
exports.getSettings = async (req, res) => {
  const { page } = req.params;
  try {
    const setting = await SystemSetting.findOne({ where: { setting_key: page } });
    if (setting) {
      res.json(setting.value_json);
    } else {
      res.json({}); // Trả về empty nếu chưa có
    }
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Update Settings
exports.updateSettings = async (req, res) => {
  const { page } = req.params;
  const data = req.body;
  try {
    const [setting, created] = await SystemSetting.upsert({
      setting_key: page,
      value_json: data,
      updated_by: req.user.id // Giả định req.user từ authMiddleware
    });
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};
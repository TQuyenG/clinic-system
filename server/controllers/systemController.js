// server/controllers/systemController.js
const { models } = require('../config/db');

exports.getSettings = async (req, res) => {
  const { page } = req.params;
  try {
    if (!page) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số page' });
    }
    const setting = await models.SystemSetting.findOne({ where: { setting_key: page } });
    if (setting) {
      res.json(setting.value_json || {});
    } else {
      res.json({}); // Trả về empty nếu chưa có
    }
  } catch (error) {
    console.error(`Lỗi khi lấy cài đặt cho page ${page}:`, error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  const { page } = req.params;
  const data = req.body;
  try {
    if (!page) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số page' });
    }
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Không xác định được người dùng' });
    }
    const [setting, created] = await models.SystemSetting.upsert({
      setting_key: page,
      value_json: data,
      updated_by: req.user.id
    });
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (error) {
    console.error(`Lỗi khi cập nhật cài đặt cho page ${page}:`, error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};
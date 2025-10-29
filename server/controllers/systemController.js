// server/controllers/systemController.js
const { models } = require('../config/db');

exports.getSettings = async (req, res) => {
  const { page } = req.params;
  try {
    console.log(`[systemController] GET Settings cho page: ${page}`);
    
    if (!page) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số page' });
    }
    
    // Kiểm tra model tồn tại
    if (!models.SystemSetting) {
      console.error('[systemController] ERROR: Model SystemSetting không tồn tại!');
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống: Model không được định nghĩa' 
      });
    }
    
    const setting = await models.SystemSetting.findOne({ 
      where: { setting_key: page } 
    });
    
    if (setting) {
      console.log(`[systemController] Tìm thấy setting cho ${page}:`, setting.value_json);
      res.json(setting.value_json || {});
    } else {
      console.log(`[systemController] Không tìm thấy setting cho ${page}, trả về empty object`);
      res.json({}); // Trả về empty nếu chưa có
    }
  } catch (error) {
    console.error(`[systemController] Lỗi khi lấy cài đặt cho page ${page}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ', 
      error: error.message 
    });
  }
};

exports.updateSettings = async (req, res) => {
  const { page } = req.params;
  const data = req.body;
  try {
    console.log(`[systemController] PUT Settings cho page: ${page}`);
    console.log(`[systemController] Data nhận được:`, JSON.stringify(data).substring(0, 200) + '...');
    
    if (!page) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số page' });
    }
    
    if (!req.user?.id) {
      console.error('[systemController] Không xác định được user từ token');
      return res.status(401).json({ 
        success: false, 
        message: 'Không xác định được người dùng. Vui lòng đăng nhập lại.' 
      });
    }
    
    // Kiểm tra model tồn tại
    if (!models.SystemSetting) {
      console.error('[systemController] ERROR: Model SystemSetting không tồn tại!');
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi hệ thống: Model không được định nghĩa' 
      });
    }
    
    console.log(`[systemController] User ID: ${req.user.id}, Page: ${page}`);
    
    // Sử dụng upsert để tạo mới hoặc cập nhật
    const [setting, created] = await models.SystemSetting.upsert({
      setting_key: page,
      value_json: data,
      updated_by: req.user.id
    }, {
      returning: true
    });
    
    console.log(`[systemController] ${created ? 'Tạo mới' : 'Cập nhật'} thành công setting cho ${page}`);
    
    res.json({ 
      success: true, 
      message: created ? 'Tạo mới thành công' : 'Cập nhật thành công',
      created: created
    });
  } catch (error) {
    console.error(`[systemController] Lỗi khi cập nhật cài đặt cho page ${page}:`, error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi máy chủ', 
      error: error.message 
    });
  }
};

// Test endpoint để kiểm tra DB connection
exports.testDB = async (req, res) => {
  try {
    console.log('[systemController] Testing DB connection...');
    
    // Kiểm tra model
    if (!models.SystemSetting) {
      throw new Error('Model SystemSetting không tồn tại');
    }
    
    // Thử query
    const count = await models.SystemSetting.count();
    console.log(`[systemController] Tổng số settings trong DB: ${count}`);
    
    // Lấy tất cả settings
    const allSettings = await models.SystemSetting.findAll();
    console.log(`[systemController] Các settings hiện có:`, 
      allSettings.map(s => s.setting_key));
    
    res.json({
      success: true,
      message: 'Database kết nối thành công',
      totalSettings: count,
      settingKeys: allSettings.map(s => s.setting_key)
    });
  } catch (error) {
    console.error('[systemController] Lỗi test DB:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi kết nối database',
      error: error.message
    });
  }
};
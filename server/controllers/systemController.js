// server/controllers/systemController.js
const { models } = require('../config/db');

exports.getSettings = async (req, res) => {
  // Helper function để trả về default settings
function getDefaultSettings(page) {
  const defaults = {
    'header-nav-footer': {
      header: {
        phone: '1900 1234',
        email: 'contact@clinicsystem.vn',
        working_hours: 'T2-T7: 7:00-20:00 | CN: 8:00-17:00',
        welcome_text: 'Chào mừng bạn đến với Clinic System'
      },
      navbar: {
        logo_text: 'Clinic System',
        logo_image: ''
      },
      footer: {
        about: 'Hệ thống y tế hàng đầu',
        contact: {}
      }
    },
    'home': {
      bannerSlides: [
        {
          title: 'Chăm Sóc Sức Khỏe Toàn Diện',
          subtitle: 'Đội ngũ bác sĩ giàu kinh nghiệm',
          description: 'Chúng tôi cam kết mang đến dịch vụ y tế chất lượng cao với đội ngũ bác sĩ chuyên nghiệp',
          image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200',
          buttonText: 'Đặt lịch ngay',
          buttonLink: '/dat-lich-hen',
          buttonColor: '#10b981',
          buttonIcon: 'FaCalendarAlt'
        }
      ],
      features: [
        {
          title: 'Đặt lịch online',
          description: 'Đặt lịch khám bệnh dễ dàng, nhanh chóng',
          icon: 'FaCalendarCheck',
          iconBgColor: '#10b981'
        },
        {
          title: 'Bác sĩ giàu kinh nghiệm',
          description: 'Đội ngũ bác sĩ chuyên môn cao',
          icon: 'FaUserMd',
          iconBgColor: '#3b82f6'
        },
        {
          title: 'Tư vấn trực tuyến',
          description: 'Tư vấn sức khỏe từ xa tiện lợi',
          icon: 'FaComments',
          iconBgColor: '#f59e0b'
        },
        {
          title: 'Theo dõi sức khỏe',
          description: 'Quản lý hồ sơ y tế cá nhân',
          icon: 'FaHeartbeat',
          iconBgColor: '#ef4444'
        }
      ],
      aboutSection: {
        title: 'Về Chúng Tôi',
        image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800',
        alt: 'Về chúng tôi',
        yearsExperience: '10+',
        highlights: [
          {
            title: 'Đội ngũ chuyên môn cao',
            description: 'Bác sĩ giàu kinh nghiệm, tận tâm',
            icon: 'FaAward'
          },
          {
            title: 'Trang thiết bị hiện đại',
            description: 'Công nghệ y tế tiên tiến nhất',
            icon: 'FaMicroscope'
          }
        ],
        buttonText: 'Tìm hiểu thêm',
        buttonLink: '/gioi-thieu'
      },
      testimonials: [
        {
          name: 'Nguyễn Văn A',
          role: 'Bệnh nhân',
          comment: 'Dịch vụ tuyệt vời, bác sĩ rất tận tâm',
          rating: 5,
          avatar: 'https://i.pravatar.cc/150?img=1',
          alt: 'Nguyễn Văn A'
        }
      ],
      bookingSection: {
        title: 'Đặt Lịch Khám Bệnh',
        description: 'Điền thông tin để đặt lịch khám',
        features: [
          {
            text: 'Xác nhận nhanh chóng',
            icon: 'FaCheckCircle'
          }
        ],
        hotline: '1900 1234',
        email: 'contact@clinicsystem.vn',
        address: 'Hồ Chí Minh'
      }
    }
  };

  return defaults[page] || {};
}
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
      console.log(`[systemController] Không tìm thấy setting cho ${page}, trả về default data`);
      
      // Trả về default data thay vì empty object
      const defaultData = getDefaultSettings(page);
      res.json(defaultData);
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
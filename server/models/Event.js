const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true },
    
    // --- PHÂN LOẠI ---
    event_type: { 
      type: DataTypes.ENUM('event', 'promotion', 'notification', 'news'), 
      defaultValue: 'event',
      comment: 'Loại: Sự kiện, Khuyến mãi, Thông báo, Tin tức'
    },

    // --- NỘI DUNG ---
    description: { type: DataTypes.TEXT }, 
    content: { type: DataTypes.TEXT('long') },
    
    // --- MEDIA (HÌNH ẢNH) ---
    thumbnail: { type: DataTypes.STRING, comment: 'Ảnh nhỏ hiện ở danh sách/popup' }, 
    banner_url: { type: DataTypes.STRING, comment: 'Ảnh lớn ở trang chi tiết' },
    gallery: { 
  type: DataTypes.JSON, 
  defaultValue: [],
  get() {
    const rawValue = this.getDataValue('gallery');
    return rawValue ? (typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue) : [];
  },
  set(val) {
    this.setDataValue('gallery', Array.isArray(val) ? val : []);
  },
  comment: 'Mảng chứa URL ảnh album' 
},
    
    // --- THỜI GIAN & TRẠNG THÁI ---
    start_date: { type: DataTypes.DATE, allowNull: false },
    end_date: { type: DataTypes.DATE, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

    // --- CẤU HÌNH POPUP NÂNG CAO ---
    is_popup: { type: DataTypes.BOOLEAN, defaultValue: false },
    popup_config: {
      type: DataTypes.JSON,
      defaultValue: {
        delay: 0, // Giây
        frequency: 'once_per_day', // once_per_session, always
        display_pages: ['home'] // home, all
      }
    },

    // --- CẤU HÌNH CTA (NÚT HÀNH ĐỘNG) ---
    cta_config: {
      type: DataTypes.JSON,
      defaultValue: {
        text: 'Xem chi tiết',
        link: '', // Nếu rỗng sẽ link vào trang chi tiết sự kiện
        type: 'internal' // internal, external, booking
      }
    },

    location: { type: DataTypes.STRING },
    
    // --- THỐNG KÊ ---
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    clicks: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    tableName: 'events',
    underscored: true
  });

  return Event;
};
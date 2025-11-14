// server/models/ConsultationPricing.js
// Model bảng giá tư vấn theo bác sĩ

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConsultationPricing = sequelize.define('ConsultationPricing', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Bác sĩ
    doctor_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Giá chat text (15-30 phút)
    chat_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 100000,
      comment: 'Phí chat text 30 phút'
    },
    
    // Giá video call (30 phút)
    video_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 300000,
      comment: 'Phí video call 30 phút'
    },
    
    // Giá tư vấn trực tiếp (60 phút)
    offline_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 500000,
      comment: 'Phí tư vấn trực tiếp tại bệnh viện'
    },
    
    // Thời lượng chat (phút)
    chat_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Thời lượng chat mặc định (phút)'
    },
    
    // Thời lượng video (phút)
    video_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Thời lượng video call mặc định (phút)'
    },
    
    // Thời lượng offline (phút)
    offline_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: 'Thời lượng tư vấn trực tiếp (phút)'
    },
    
    // Cho phép chat
    allow_chat: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    // Cho phép video
    allow_video: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    
    // Cho phép offline
    allow_offline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    // Giờ làm việc (JSON)
    working_hours: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        monday: { start: '08:00', end: '17:00', enabled: true },
        tuesday: { start: '08:00', end: '17:00', enabled: true },
        wednesday: { start: '08:00', end: '17:00', enabled: true },
        thursday: { start: '08:00', end: '17:00', enabled: true },
        friday: { start: '08:00', end: '17:00', enabled: true },
        saturday: { start: '08:00', end: '12:00', enabled: false },
        sunday: { start: '08:00', end: '12:00', enabled: false }
      }
    },
    
    // Ghi chú
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Trạng thái
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
    
  }, {
    tableName: 'consultation_pricing',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['doctor_id'] },
      { fields: ['is_active'] }
    ]
  });

  ConsultationPricing.associate = (models) => {
    ConsultationPricing.belongsTo(models.User, {
      foreignKey: 'doctor_id',
      as: 'doctor'
    });
  };

  console.log('✅ Model ConsultationPricing đã được định nghĩa');
  return ConsultationPricing;
};
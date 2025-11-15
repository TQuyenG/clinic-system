// server/models/ConsultationFeedback.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConsultationFeedback = sequelize.define('ConsultationFeedback', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    consultation_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      references: { model: 'consultations', key: 'id' }
    },
    patient_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    doctor_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    rating: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    review: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'hidden'),
      defaultValue: 'pending'
    },
    admin_note: { type: DataTypes.TEXT, allowNull: true },
    reviewed_by: { type: DataTypes.BIGINT, allowNull: true },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    
  }, {
    tableName: 'consultation_feedback',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  ConsultationFeedback.associate = (models) => {
    // Quan trọng: Định nghĩa các 'as' (bí danh)
    ConsultationFeedback.belongsTo(models.Consultation, { 
      foreignKey: 'consultation_id', 
      as: 'consultation' // Đây là 'as' gây ra lỗi 500 của bạn
    });
    ConsultationFeedback.belongsTo(models.User, { 
      foreignKey: 'patient_id', 
      as: 'patient' 
    });
    ConsultationFeedback.belongsTo(models.User, { 
      foreignKey: 'doctor_id', 
      as: 'doctor' 
    });
  };

  return ConsultationFeedback;
};
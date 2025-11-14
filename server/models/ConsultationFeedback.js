// server/models/ConsultationFeedback.js
// Model đánh giá sau buổi tư vấn

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConsultationFeedback = sequelize.define('ConsultationFeedback', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Buổi tư vấn
    consultation_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true, // Mỗi consultation chỉ có 1 đánh giá
      references: {
        model: 'consultations',
        key: 'id'
      }
    },
    
    // Người đánh giá (bệnh nhân)
    patient_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Bác sĩ được đánh giá
    doctor_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Điểm đánh giá (1-5 sao)
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    
    // Đánh giá chi tiết
    professionalism_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Đánh giá tính chuyên nghiệp (1-5)'
    },
    
    communication_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Đánh giá khả năng giao tiếp (1-5)'
    },
    
    satisfaction_rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Mức độ hài lòng (1-5)'
    },
    
    // Nhận xét
    review: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Gợi ý cải thiện
    suggestions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Có giới thiệu cho người khác không
    would_recommend: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    
    // Trạng thái
    status: {
      type: DataTypes.ENUM('pending', 'published', 'hidden', 'flagged'),
      allowNull: false,
      defaultValue: 'published'
    },
    
    // Lý do ẩn/gắn cờ (nếu có)
    admin_note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Người xử lý (admin)
    reviewed_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Metadata
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
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
    tableName: 'consultation_feedback',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['consultation_id'] },
      { fields: ['patient_id'] },
      { fields: ['doctor_id'] },
      { fields: ['rating'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  // ==================== ASSOCIATIONS ====================
  
  ConsultationFeedback.associate = (models) => {
    ConsultationFeedback.belongsTo(models.Consultation, {
      foreignKey: 'consultation_id',
      as: 'consultation'
    });
    
    ConsultationFeedback.belongsTo(models.User, {
      foreignKey: 'patient_id',
      as: 'patient'
    });
    
    ConsultationFeedback.belongsTo(models.User, {
      foreignKey: 'doctor_id',
      as: 'doctor'
    });
    
    ConsultationFeedback.belongsTo(models.User, {
      foreignKey: 'reviewed_by',
      as: 'reviewer'
    });
  };

  // ==================== CLASS METHODS ====================
  
  /**
   * Tính điểm trung bình của bác sĩ
   */
  ConsultationFeedback.getDoctorStats = async function(doctorId) {
    const feedbacks = await this.findAll({
      where: {
        doctor_id: doctorId,
        status: 'published'
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
        [sequelize.fn('AVG', sequelize.col('professionalism_rating')), 'avg_professionalism'],
        [sequelize.fn('AVG', sequelize.col('communication_rating')), 'avg_communication'],
        [sequelize.fn('AVG', sequelize.col('satisfaction_rating')), 'avg_satisfaction'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
      ],
      raw: true
    });
    
    return feedbacks[0] || {
      avg_rating: 0,
      avg_professionalism: 0,
      avg_communication: 0,
      avg_satisfaction: 0,
      total_reviews: 0
    };
  };
  
  /**
   * Lấy top bác sĩ được đánh giá cao
   */
  ConsultationFeedback.getTopRatedDoctors = async function(limit = 10) {
    return await this.findAll({
      where: { status: 'published' },
      attributes: [
        'doctor_id',
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
      ],
      include: [
        {
          model: sequelize.models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'avatar_url'],
          include: [
            {
              model: sequelize.models.Doctor,
              attributes: ['id', 'specialty_id'],
              include: [
                {
                  model: sequelize.models.Specialty,
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ],
      group: ['doctor_id'],
      order: [[sequelize.literal('avg_rating'), 'DESC']],
      limit: limit,
      subQuery: false
    });
  };

  console.log('✅ Model ConsultationFeedback đã được định nghĩa');
  return ConsultationFeedback;
};
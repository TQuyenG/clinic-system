// server/models/Payment.js - FIXED EXPORT
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: { 
      type: DataTypes.BIGINT, 
      primaryKey: true, 
      autoIncrement: true 
    },
    
    code: { 
      type: DataTypes.STRING(20), 
      unique: true,
      comment: 'Mã thanh toán: PY20241020-0001'
    },
    
    appointment_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      comment: 'ID lịch hẹn'
    },
    
    user_id: { 
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'ID người thanh toán (patient)'
    },
    
    amount: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false,
      comment: 'Số tiền thanh toán'
    },
    
    discount_id: { 
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'ID mã giảm giá (nếu có)'
    },
    
    status: { 
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'), 
      defaultValue: 'pending',
      comment: 'Trạng thái thanh toán'
    },
    
    // ✅ FIX: THÊM 'cash' VÀ 'bank_transfer' VÀO ENUM
    method: { 
      type: DataTypes.ENUM('cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay', 'qr'), 
      allowNull: false,
      comment: 'Phương thức thanh toán'
    },
    
    transaction_id: { 
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Mã giao dịch từ cổng thanh toán'
    },
    
    payment_info: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Thông tin thanh toán dạng JSON string'
    },
    
    proof_image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL ảnh chứng từ (cho bank_transfer)'
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
    tableName: 'payments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['code'] },
      { fields: ['appointment_id'] },
      { fields: ['user_id'] },
      { fields: ['status'] }
    ]
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Appointment, { 
      foreignKey: 'appointment_id',
      as: 'Appointment'
    });
    
    Payment.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'User'
    });
    
    if (models.Discount) {
      Payment.belongsTo(models.Discount, { 
        foreignKey: 'discount_id',
        as: 'Discount',
        required: false
      });
    }
  };

  // Hook: Tạo mã thanh toán tự động
  Payment.addHook('beforeCreate', async (payment) => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(5, 10).replace('-', ''); // MMDD
      
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { Op } = require('sequelize');
      const count = await Payment.count({
        where: {
          created_at: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay
          }
        }
      });
      
      payment.code = `PY2025${dateStr}-${String(count + 1).padStart(4, '0')}`;
      console.log(`✅ Tạo mã ${payment.code} cho thanh toán mới.`);
    } catch (error) {
      console.error('❌ Lỗi tạo mã thanh toán:', error.message);
      throw error;
    }
  });

  console.log('✅ Model Payment đã được định nghĩa.');
  return Payment;
};
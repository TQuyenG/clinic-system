const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(20), unique: true },
    appointment_id: { type: DataTypes.BIGINT, allowNull: false },
    user_id: { type: DataTypes.BIGINT },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    discount_id: { type: DataTypes.BIGINT },
    status: { type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'), defaultValue: 'pending' },
    method: { type: DataTypes.ENUM('momo', 'zalopay', 'vnpay', 'qr'), allowNull: false },
    transaction_id: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['code'] }]
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Appointment, { foreignKey: 'appointment_id' });
    Payment.belongsTo(models.User, { foreignKey: 'user_id' });
    Payment.belongsTo(models.Discount, { foreignKey: 'discount_id' });
  };

  Payment.addHook('beforeCreate', async (payment) => {
    try {
      const dateStr = new Date().toISOString().slice(8, 10) + new Date().toISOString().slice(5, 7);
      const count = await Payment.count({ where: { created_at: { [sequelize.Op.gte]: new Date().setHours(0,0,0,0), [sequelize.Op.lt]: new Date().setHours(23,59,59,999) } } });
      payment.code = `PY${dateStr}${String(count + 1).padStart(4, '0')}`;
      console.log(`SUCCESS: Tạo mã ${payment.code} cho thanh toán mới.`);
    } catch (error) {
      console.error('ERROR: Không thể tạo mã cho thanh toán:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Payment đã được định nghĩa.');
  return Payment;
};
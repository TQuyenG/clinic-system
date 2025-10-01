const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    appointment_id: { type: DataTypes.BIGINT, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
    payment_method: { type: DataTypes.STRING(50) },
    transaction_id: { type: DataTypes.STRING(100) },
    payment_date: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Appointment, { foreignKey: 'appointment_id' });
  };

  console.log('SUCCESS: Model Payment đã được định nghĩa.');
  return Payment;
};
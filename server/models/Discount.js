const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Discount = sequelize.define('Discount', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(20), unique: true },
    percentage: { type: DataTypes.INTEGER, allowNull: false },
    start_date: { type: DataTypes.DATE, allowNull: false },
    end_date: { type: DataTypes.DATE, allowNull: false },
    description: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'discounts',
    timestamps: true,
    underscored: true
  });

  Discount.associate = (models) => {
    // Không có quan hệ trực tiếp
  };

  console.log('SUCCESS: Model Discount đã được định nghĩa.');
  return Discount;
};
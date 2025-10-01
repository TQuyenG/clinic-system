const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemSetting = sequelize.define('SystemSetting', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    value: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'system_settings',
    timestamps: true,
    underscored: true
  });

  SystemSetting.associate = (models) => {
    // Không có quan hệ trực tiếp
  };

  console.log('SUCCESS: Model SystemSetting đã được định nghĩa.');
  return SystemSetting;
};
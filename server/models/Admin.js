const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Admin = sequelize.define('Admin', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true },
    permissions_json: { type: DataTypes.JSON },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'admins',
    timestamps: true,
    underscored: true
  });

  Admin.associate = (models) => {
    Admin.belongsTo(models.User, { foreignKey: 'user_id' });
    Admin.hasMany(models.SystemSetting, { foreignKey: 'updated_by', sourceKey: 'user_id' });
  };

  Admin.addHook('beforeCreate', async (admin) => {
    try {
      const count = await Admin.count();
      admin.code = `AD${String(count + 1).padStart(5, '0')}`;
      console.log(`SUCCESS: Tạo mã ${admin.code} cho quản trị viên mới.`);
    } catch (error) {
      console.error('ERROR: Không thể tạo mã cho quản trị viên:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Admin đã được định nghĩa.');
  return Admin;
};
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Staff = sequelize.define('Staff', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true },
    department: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'staff',
    timestamps: true,
    underscored: true
  });

  Staff.associate = (models) => {
    Staff.belongsTo(models.User, { foreignKey: 'user_id' });
    Staff.hasMany(models.Article, { foreignKey: 'author_id', sourceKey: 'user_id' });
  };

  Staff.addHook('beforeCreate', async (staff) => {
    try {
      const count = await Staff.count();
      staff.code = `ST${String(count + 1).padStart(5, '0')}`;
      console.log(`SUCCESS: Tạo mã ${staff.code} cho nhân viên mới.`);
    } catch (error) {
      console.error('ERROR: Không thể tạo mã cho nhân viên:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Staff đã được định nghĩa.');
  return Staff;
};
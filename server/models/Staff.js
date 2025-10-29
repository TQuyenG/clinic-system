const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Staff = sequelize.define('Staff', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    username: { type: DataTypes.STRING(50), unique: false, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true, allowNull: false },
    department: { type: DataTypes.STRING(255), allowNull: true }, // Cho phép null
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'staff',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['username'] }]
  });

  Staff.associate = (models) => {
    Staff.belongsTo(models.User, { foreignKey: 'user_id' });
    Staff.hasMany(models.Article, { foreignKey: 'author_id', sourceKey: 'user_id' });
  };

  Staff.addHook('beforeValidate', async (staff, options) => {
    try {
      console.log('Bắt đầu hook beforeValidate cho Staff');
      // Lấy username từ User
      const user = await sequelize.models.User.findOne({
        where: { id: staff.user_id },
        transaction: options.transaction
      });
      if (!user) {
        throw new Error(`Không tìm thấy User với user_id: ${staff.user_id}`);
      }
      staff.username = user.username;
      console.log(`SUCCESS: Đã gán username ${staff.username} cho Staff`);

      // Tạo code
      const count = await Staff.count({ transaction: options.transaction });
      staff.code = `ST${String(count + 1).padStart(5, '0')}`;
      console.log(`SUCCESS: Tạo mã ${staff.code} cho nhân viên mới.`);
    } catch (error) {
      console.error('ERROR trong hook beforeValidate cho Staff:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Staff đã được định nghĩa.');
  return Staff;
};
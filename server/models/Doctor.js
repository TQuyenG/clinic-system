const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Doctor = sequelize.define('Doctor', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    username: { type: DataTypes.STRING(50), unique: false, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true, allowNull: false },
    specialty_id: { type: DataTypes.BIGINT, allowNull: true }, // Cho phép null
    experience_years: { type: DataTypes.INTEGER, allowNull: true },
    certifications_json: { type: DataTypes.JSON, allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'doctors',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['username'] }]
  });

  Doctor.associate = (models) => {
    Doctor.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Doctor.belongsTo(models.Specialty, { foreignKey: 'specialty_id', as: 'specialty' });
    Doctor.hasMany(models.Appointment, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.Schedule, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.Consultation, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.MedicalRecord, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.Discount, { foreignKey: 'doctor_id' });
  };

  Doctor.addHook('beforeValidate', async (doctor, options) => {
    try {
      console.log('Bắt đầu hook beforeValidate cho Doctor');
      // Lấy username từ User
      const user = await sequelize.models.User.findOne({
        where: { id: doctor.user_id },
        transaction: options.transaction
      });
      if (!user) {
        throw new Error(`Không tìm thấy User với user_id: ${doctor.user_id}`);
      }
      doctor.username = user.username;
      console.log(`SUCCESS: Đã gán username ${doctor.username} cho Doctor`);

      // Tạo code
      const count = await Doctor.count({ transaction: options.transaction });
      doctor.code = `DR${String(count + 1).padStart(5, '0')}`;
      console.log(`SUCCESS: Tạo mã ${doctor.code} cho bác sĩ mới.`);
    } catch (error) {
      console.error('ERROR trong hook beforeValidate cho Doctor:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Doctor đã được định nghĩa.');
  return Doctor;
};
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Doctor = sequelize.define('Doctor', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true, allowNull: false },  // Thêm allowNull: false
    specialty_id: { type: DataTypes.BIGINT },
    experience_years: { type: DataTypes.INTEGER },
    certifications_json: { type: DataTypes.JSON },
    bio: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'doctors',
    timestamps: true,
    underscored: true
  });

  Doctor.associate = (models) => {
    Doctor.belongsTo(models.User, { foreignKey: 'user_id' });
    Doctor.belongsTo(models.Specialty, { foreignKey: 'specialty_id' });
    Doctor.hasMany(models.Appointment, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.Schedule, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.Consultation, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.MedicalRecord, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.Discount, { foreignKey: 'doctor_id' });
  };

  Doctor.addHook('beforeValidate', async (doctor, options) => {
    try {
      console.log('Bắt đầu hook beforeValidate cho Doctor');
      const count = await Doctor.count({ transaction: options.transaction });
      doctor.code = `DR${String(count + 1).padStart(5, '0')}`;
      console.log(`SUCCESS: Tạo mã ${doctor.code} cho bác sĩ mới.`);
    } catch (error) {
      console.error('ERROR: Không thể tạo mã cho bác sĩ:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Doctor đã được định nghĩa.');
  return Doctor;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true },
    medical_history: { type: DataTypes.JSON },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'patients',
    timestamps: true,
    underscored: true
  });

  Patient.associate = (models) => {
    Patient.belongsTo(models.User, { foreignKey: 'user_id' });
    Patient.hasMany(models.Appointment, { foreignKey: 'patient_id' });
    Patient.hasMany(models.MedicalRecord, { foreignKey: 'patient_id' });
    Patient.hasMany(models.Consultation, { foreignKey: 'patient_id' });
  };

  // Hook để tự động tạo mã PT00001, PT00002, ...
  Patient.addHook('beforeCreate', async (patient) => {
    try {
      const count = await Patient.count();
      patient.code = `PT${String(count + 1).padStart(5, '0')}`;
      console.log(`SUCCESS: Tạo mã ${patient.code} cho bệnh nhân mới.`);
    } catch (error) {
      console.error('ERROR: Không thể tạo mã cho bệnh nhân:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Patient đã được định nghĩa.');
  return Patient;
};

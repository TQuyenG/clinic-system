const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    username: { type: DataTypes.STRING(50), unique: false, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true, allowNull: false },
    medical_history: { type: DataTypes.JSON, allowNull: true }, // Cho phép null
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'patients',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['username'] }]
  });

  Patient.associate = (models) => {
    Patient.belongsTo(models.User, { foreignKey: 'user_id' });
    Patient.hasMany(models.Appointment, { foreignKey: 'patient_id' });
    Patient.hasMany(models.MedicalRecord, { foreignKey: 'patient_id' });
    Patient.hasMany(models.Consultation, { foreignKey: 'patient_id' });
  };

  Patient.addHook('beforeValidate', async (patient, options) => {
    try {
      console.log('Bắt đầu hook beforeValidate cho Patient');
      // Lấy username từ User
      const user = await sequelize.models.User.findOne({
        where: { id: patient.user_id },
        transaction: options.transaction
      });
      if (!user) {
        throw new Error(`Không tìm thấy User với user_id: ${patient.user_id}`);
      }
      patient.username = user.username;
      console.log(`SUCCESS: Đã gán username ${patient.username} cho Patient`);

      // Tạo code
      const count = await Patient.count({ transaction: options.transaction });
      patient.code = `PT${String(count + 1).padStart(5, '0')}`;
      console.log(`SUCCESS: Tạo mã ${patient.code} cho bệnh nhân mới.`);
    } catch (error) {
      console.error('ERROR trong hook beforeValidate cho Patient:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Patient đã được định nghĩa.');
  return Patient;
};
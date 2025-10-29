const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalRecord = sequelize.define('MedicalRecord', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    patient_id: { type: DataTypes.BIGINT, allowNull: false },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    appointment_id: { type: DataTypes.BIGINT },
    type: { type: DataTypes.ENUM('consultation', 'exam', 'other') },
    content_json: { type: DataTypes.JSON, allowNull: false },
    shared_with_json: { type: DataTypes.JSON },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'medical_records',
    timestamps: true,
    underscored: true
  });

  MedicalRecord.associate = (models) => {
    MedicalRecord.belongsTo(models.User, { foreignKey: 'patient_id' });
    MedicalRecord.belongsTo(models.User, { foreignKey: 'doctor_id' });
    MedicalRecord.belongsTo(models.Appointment, { foreignKey: 'appointment_id' });
  };

  console.log('SUCCESS: Model MedicalRecord đã được định nghĩa.');
  return MedicalRecord;
};
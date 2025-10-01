const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalRecord = sequelize.define('MedicalRecord', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    patient_id: { type: DataTypes.BIGINT, allowNull: false },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    diagnosis: { type: DataTypes.TEXT },
    prescription: { type: DataTypes.TEXT },
    record_date: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'medical_records',
    timestamps: true,
    underscored: true
  });

  MedicalRecord.associate = (models) => {
    MedicalRecord.belongsTo(models.Patient, { foreignKey: 'patient_id' });
    MedicalRecord.belongsTo(models.Doctor, { foreignKey: 'doctor_id' });
  };

  console.log('SUCCESS: Model MedicalRecord đã được định nghĩa.');
  return MedicalRecord;
};
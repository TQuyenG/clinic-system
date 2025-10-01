const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Consultation = sequelize.define('Consultation', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    patient_id: { type: DataTypes.BIGINT, allowNull: false },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    appointment_id: { type: DataTypes.BIGINT, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'ongoing', 'completed'), defaultValue: 'pending' },
    consultation_date: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'consultations',
    timestamps: true,
    underscored: true
  });

  Consultation.associate = (models) => {
    Consultation.belongsTo(models.Patient, { foreignKey: 'patient_id' });
    Consultation.belongsTo(models.Doctor, { foreignKey: 'doctor_id' });
    Consultation.belongsTo(models.Appointment, { foreignKey: 'appointment_id' });
    Consultation.hasMany(models.ChatMessage, { foreignKey: 'consultation_id' });
  };

  console.log('SUCCESS: Model Consultation đã được định nghĩa.');
  return Consultation;
};
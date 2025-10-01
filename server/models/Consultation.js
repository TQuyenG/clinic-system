const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Consultation = sequelize.define('Consultation', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    appointment_id: { type: DataTypes.BIGINT, allowNull: false },
    patient_id: { type: DataTypes.BIGINT, allowNull: false },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    start_time: { type: DataTypes.DATE },
    end_time: { type: DataTypes.DATE },
    video_link: { type: DataTypes.STRING(255) },
    notes_json: { type: DataTypes.JSON },
    status: { type: DataTypes.ENUM('pending', 'active', 'completed', 'expired'), defaultValue: 'pending' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'consultations',
    timestamps: true,
    underscored: true
  });

  Consultation.associate = (models) => {
    Consultation.belongsTo(models.User, { foreignKey: 'patient_id' });
    Consultation.belongsTo(models.User, { foreignKey: 'doctor_id' });
    Consultation.belongsTo(models.Appointment, { foreignKey: 'appointment_id' });
    Consultation.hasMany(models.ChatMessage, { foreignKey: 'consultation_id' });
  };

  console.log('SUCCESS: Model Consultation đã được định nghĩa.');
  return Consultation;
};
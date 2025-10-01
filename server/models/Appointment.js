const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define('Appointment', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(12), unique: true },
    patient_id: { type: DataTypes.BIGINT, allowNull: false },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    specialty_id: { type: DataTypes.BIGINT },
    schedule_id: { type: DataTypes.BIGINT },
    status: { type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'), defaultValue: 'pending' },
    appointment_date: { type: DataTypes.DATE },
    reason: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'appointments',
    timestamps: true,
    underscored: true
  });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.Patient, { foreignKey: 'patient_id' });
    Appointment.belongsTo(models.Doctor, { foreignKey: 'doctor_id' });
    Appointment.belongsTo(models.Specialty, { foreignKey: 'specialty_id' });
    Appointment.belongsTo(models.Schedule, { foreignKey: 'schedule_id' });
    Appointment.hasOne(models.Consultation, { foreignKey: 'appointment_id' });
    Appointment.hasOne(models.Payment, { foreignKey: 'appointment_id' });
  };

  Appointment.addHook('beforeCreate', async (appointment) => {
    try {
      const count = await Appointment.count();
      const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      appointment.code = `AP${date}${String(count + 1).padStart(4, '0')}`;
      console.log(`SUCCESS: Tạo mã ${appointment.code} cho lịch hẹn mới.`);
    } catch (error) {
      console.error('ERROR: Không thể tạo mã cho lịch hẹn:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Appointment đã được định nghĩa.');
  return Appointment;
};
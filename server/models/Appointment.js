const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define('Appointment', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(20), unique: true },
    patient_id: { type: DataTypes.BIGINT, allowNull: false },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    specialty_id: { type: DataTypes.BIGINT },
    schedule_id: { type: DataTypes.BIGINT },
    status: { type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'), defaultValue: 'pending' },
    appointment_time: { type: DataTypes.DATE },
    reason: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['appointment_time'] }, { fields: ['code'] }]
  });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.Patient, { foreignKey: 'patient_id' });
    Appointment.belongsTo(models.Doctor, { foreignKey: 'doctor_id' });
    Appointment.belongsTo(models.Specialty, { foreignKey: 'specialty_id' });
    Appointment.belongsTo(models.Schedule, { foreignKey: 'schedule_id' });
    Appointment.hasOne(models.Consultation, { foreignKey: 'appointment_id' });
    Appointment.hasOne(models.Payment, { foreignKey: 'appointment_id' });
    Appointment.hasOne(models.MedicalRecord, { foreignKey: 'appointment_id' });
  };

  Appointment.addHook('beforeCreate', async (appointment) => {
    try {
      const dateStr = appointment.appointment_time
        ? appointment.appointment_time.toISOString().slice(8, 10) + appointment.appointment_time.toISOString().slice(5, 7)
        : new Date().toISOString().slice(8, 10) + new Date().toISOString().slice(5, 7);
      const count = await Appointment.count({ where: { appointment_time: { [sequelize.Op.gte]: new Date(appointment.appointment_time).setHours(0,0,0,0), [sequelize.Op.lt]: new Date(appointment.appointment_time).setHours(23,59,59,999) } } });
      appointment.code = `AP${dateStr}${String(count + 1).padStart(4, '0')}`;
      console.log(`SUCCESS: Tạo mã ${appointment.code} cho lịch hẹn mới.`);
    } catch (error) {
      console.error('ERROR: Không thể tạo mã cho lịch hẹn:', error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model Appointment đã được định nghĩa.');
  return Appointment;
};
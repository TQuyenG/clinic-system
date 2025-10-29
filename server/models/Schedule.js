const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Schedule = sequelize.define('Schedule', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('available', 'booked', 'off', 'pending_off'), defaultValue: 'available' },
    off_reason: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'schedules',
    timestamps: true,
    underscored: true
  });

  Schedule.associate = (models) => {
    Schedule.belongsTo(models.User, { foreignKey: 'doctor_id' });
    Schedule.hasOne(models.Appointment, { foreignKey: 'schedule_id' });
  };

  console.log('SUCCESS: Model Schedule đã được định nghĩa.');
  return Schedule;
};
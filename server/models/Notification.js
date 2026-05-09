const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    type: { type: DataTypes.ENUM('otp', 'appointment', 'payment', 'article', 'system', 'other', 'leave_req', 'schedule', 'consultation', 'community'), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    content: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('message');
      },
      set(value) {
        this.setDataValue('message', value);
      }
    },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
    link: { type: DataTypes.STRING(255) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'notifications',
    timestamps: true,
    underscored: true
  });

  Notification.addHook('beforeValidate', (notification) => {
    if (!notification.message) {
      notification.message = notification.content || notification.title || '';
    }
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  console.log('SUCCESS: Model Notification đã được định nghĩa.');
  return Notification;
};
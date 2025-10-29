const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    consultation_id: { type: DataTypes.BIGINT, allowNull: false },
    sender_id: { type: DataTypes.BIGINT, allowNull: false },
    receiver_id: { type: DataTypes.BIGINT, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'chat_messages',
    timestamps: true,
    underscored: true
  });

  ChatMessage.associate = (models) => {
    ChatMessage.belongsTo(models.Consultation, { foreignKey: 'consultation_id' });
    ChatMessage.belongsTo(models.User, { foreignKey: 'sender_id' });
    ChatMessage.belongsTo(models.User, { foreignKey: 'receiver_id' });
  };

  console.log('SUCCESS: Model ChatMessage đã được định nghĩa.');
  return ChatMessage;
};
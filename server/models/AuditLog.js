const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    action: { type: DataTypes.STRING(255), allowNull: false },
    entity_type: { type: DataTypes.STRING(255) },
    entity_id: { type: DataTypes.BIGINT },
    details_json: { type: DataTypes.JSON },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true
  });

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  console.log('SUCCESS: Model AuditLog đã được định nghĩa.');
  return AuditLog;
};
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Interaction = sequelize.define('Interaction', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT },
    entity_type: { type: DataTypes.ENUM('article', 'question', 'answer', 'medicine', 'disease'), allowNull: false },
    entity_id: { type: DataTypes.BIGINT, allowNull: false },
    type: { type: DataTypes.ENUM('like', 'share', 'save', 'report', 'bookmark'), allowNull: false },
    reason: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'interactions',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id', 'entity_type', 'entity_id', 'type'] }
    ]
  });

  Interaction.associate = (models) => {
    Interaction.belongsTo(models.User, { foreignKey: 'user_id' });
    Interaction.belongsTo(models.Article, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'article' } });
    Interaction.belongsTo(models.Question, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'question' } });
    Interaction.belongsTo(models.Answer, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'answer' } });
    Interaction.belongsTo(models.Medicine, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'medicine' } });
    Interaction.belongsTo(models.Disease, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'disease' } });
  };

  console.log('SUCCESS: Model Interaction đã được định nghĩa.');
  return Interaction;
};
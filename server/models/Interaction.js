const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Interaction = sequelize.define('Interaction', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    medicine_id: { type: DataTypes.BIGINT, allowNull: false },
    disease_id: { type: DataTypes.BIGINT, allowNull: false },
    description: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'interactions',
    timestamps: true,
    underscored: true
  });

  Interaction.associate = (models) => {
    Interaction.belongsTo(models.Medicine, { foreignKey: 'medicine_id' });
    Interaction.belongsTo(models.Disease, { foreignKey: 'disease_id' });
  };

  console.log('SUCCESS: Model Interaction đã được định nghĩa.');
  return Interaction;
};
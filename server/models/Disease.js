const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Disease = sequelize.define('Disease', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    category_id: { type: DataTypes.BIGINT },
    name: { type: DataTypes.STRING(255), unique: true, allowNull: false },
    symptoms: { type: DataTypes.TEXT },
    treatments: { type: DataTypes.TEXT },
    description: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'diseases',
    timestamps: true,
    underscored: true
  });

  Disease.associate = (models) => {
    Disease.belongsTo(models.Category, { foreignKey: 'category_id' });
    Disease.hasMany(models.Interaction, { foreignKey: 'disease_id' });
  };

  console.log('SUCCESS: Model Disease đã được định nghĩa.');
  return Disease;
};
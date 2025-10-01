const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Disease = sequelize.define('Disease', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    icd10_code: { type: DataTypes.STRING(10) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'diseases',
    timestamps: true,
    underscored: true
  });

  Disease.associate = (models) => {
    Disease.hasMany(models.Interaction, { foreignKey: 'disease_id' });
  };

  console.log('SUCCESS: Model Disease đã được định nghĩa.');
  return Disease;
};
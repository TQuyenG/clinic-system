const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Medicine = sequelize.define('Medicine', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    dosage: { type: DataTypes.STRING(50) },
    price: { type: DataTypes.DECIMAL(10, 2) },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'medicines',
    timestamps: true,
    underscored: true
  });

  Medicine.associate = (models) => {
    Medicine.hasMany(models.Interaction, { foreignKey: 'medicine_id' });
  };

  console.log('SUCCESS: Model Medicine đã được định nghĩa.');
  return Medicine;
};
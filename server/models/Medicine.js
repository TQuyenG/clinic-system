const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Medicine = sequelize.define('Medicine', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    category_id: { type: DataTypes.BIGINT },
    name: { type: DataTypes.STRING(255), unique: true, allowNull: false },
    components: { type: DataTypes.TEXT },
    medicine_usage: { type: DataTypes.TEXT },
    description: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'medicines',
    timestamps: true,
    underscored: true
  });

  Medicine.associate = (models) => {
    Medicine.belongsTo(models.Category, { foreignKey: 'category_id' });
    Medicine.hasMany(models.Interaction, { foreignKey: 'medicine_id' });
  };

  console.log('SUCCESS: Model Medicine đã được định nghĩa.');
  return Medicine;
};
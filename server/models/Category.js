const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'categories',
    timestamps: true,
    underscored: true
  });

  Category.associate = (models) => {
    Category.hasMany(models.Article, { foreignKey: 'category_id' });
  };

  console.log('SUCCESS: Model Category đã được định nghĩa.');
  return Category;
};
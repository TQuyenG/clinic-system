const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    parent_id: { type: DataTypes.BIGINT },
    name: { type: DataTypes.STRING(255), allowNull: false },
    slug: { type: DataTypes.STRING(255), unique: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'categories',
    timestamps: true,
    underscored: true
  });

  Category.associate = (models) => {
    Category.belongsTo(models.Category, { foreignKey: 'parent_id' });
    Category.hasMany(models.Category, { foreignKey: 'parent_id' });
    Category.hasMany(models.Article, { foreignKey: 'category_id' });
    Category.hasMany(models.Medicine, { foreignKey: 'category_id' });
    Category.hasMany(models.Disease, { foreignKey: 'category_id' });
  };

  console.log('SUCCESS: Model Category đã được định nghĩa.');
  return Category;
};
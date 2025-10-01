const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Article = sequelize.define('Article', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    author_id: { type: DataTypes.BIGINT, allowNull: false },
    category_id: { type: DataTypes.BIGINT, allowNull: false },
    status: { type: DataTypes.ENUM('draft', 'published', 'archived'), defaultValue: 'draft' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'articles',
    timestamps: true,
    underscored: true
  });

  Article.associate = (models) => {
    Article.belongsTo(models.User, { foreignKey: 'author_id' });
    Article.belongsTo(models.Category, { foreignKey: 'category_id' });
  };

  console.log('SUCCESS: Model Article đã được định nghĩa.');
  return Article;
};
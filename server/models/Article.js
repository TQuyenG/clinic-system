const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Article = sequelize.define('Article', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    category_id: { type: DataTypes.BIGINT },
    author_id: { type: DataTypes.BIGINT, allowNull: false },
    tags_json: { type: DataTypes.JSON, defaultValue: [] },
    status: { 
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected', 'hidden'), 
      defaultValue: 'draft' 
    },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    source_url: { type: DataTypes.STRING(255) },
    rejection_reason: { type: DataTypes.TEXT },
    deleted_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'articles',
    timestamps: true,
    underscored: true
  });

  Article.associate = (models) => {
    Article.belongsTo(models.User, { 
      foreignKey: 'author_id',
      as: 'author'
    });
    Article.belongsTo(models.Category, { 
      foreignKey: 'category_id'
    });
    Article.hasMany(models.Interaction, { 
      foreignKey: 'entity_id', 
      constraints: false, 
      scope: { entity_type: 'article' } 
    });
  };

  console.log('SUCCESS: Model Article đã được định nghĩa.');
  return Article;
};
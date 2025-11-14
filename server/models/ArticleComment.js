// server/models/ArticleComment.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ArticleComment = sequelize.define('ArticleComment', {
    id: { 
      type: DataTypes.BIGINT, 
      primaryKey: true, 
      autoIncrement: true,
      comment: 'ID comment'
    },
    article_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      comment: 'ID bài viết'
    },
    user_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      comment: 'ID người comment (admin hoặc tác giả)'
    },
    comment_text: { 
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Nội dung comment'
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Đánh dấu comment đã xóa (soft delete)'
    },
    created_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW,
      comment: 'Thời gian tạo'
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'Thời gian cập nhật'
    }
  }, {
    tableName: 'article_comments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['article_id'] },
      { fields: ['user_id'] },
      { fields: ['created_at'] }
    ],
    comment: 'Bảng lưu comment trao đổi giữa admin và tác giả khi phê duyệt'
  });

  ArticleComment.associate = (models) => {
    // Liên kết với Article
    ArticleComment.belongsTo(models.Article, { 
      foreignKey: 'article_id',
      as: 'article',
      onDelete: 'CASCADE'
    });

    // Liên kết với User (người comment)
    ArticleComment.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  console.log('SUCCESS: Model ArticleComment đã được định nghĩa.');
  return ArticleComment;
};
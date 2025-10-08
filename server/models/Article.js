const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Định nghĩa model Article
  const Article = sequelize.define('Article', {
    id: { 
      type: DataTypes.BIGINT, 
      primaryKey: true, 
      autoIncrement: true,
      comment: 'ID duy nhất của bài viết'
    },
    title: { 
      type: DataTypes.STRING(255), 
      allowNull: false,
      comment: 'Tiêu đề bài viết'
    },
    slug: { 
      type: DataTypes.STRING(255), 
      allowNull: false, 
      unique: true,
      comment: 'Slug duy nhất để truy cập bài viết'
    },
    content: { 
      type: DataTypes.TEXT, 
      allowNull: false,
      comment: 'Nội dung chi tiết của bài viết'
    },
    category_id: { 
      type: DataTypes.BIGINT,
      comment: 'ID của danh mục liên quan'
    },
    author_id: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      comment: 'ID của tác giả bài viết'
    },
    // Trường đa hình để liên kết với medicines/diseases
    entity_type: { 
      type: DataTypes.ENUM('medicine', 'disease', 'article'), 
      defaultValue: 'article',
      comment: 'Loại nội dung: thuốc, bệnh lý, hoặc bài viết thông thường'
    },
    entity_id: { 
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'ID của medicine hoặc disease nếu có'
    },
    tags_json: { 
      type: DataTypes.JSON, 
      defaultValue: [],
      comment: 'Danh sách các tag của bài viết dưới dạng JSON'
    },
    status: { 
      type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected', 'hidden', 'request_edit', 'request_rewrite'), 
      defaultValue: 'draft',
      comment: 'Trạng thái bài viết: nháp, chờ duyệt, đã duyệt, bị từ chối, ẩn, yêu cầu chỉnh sửa, yêu cầu viết lại'
    },
    views: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0,
      comment: 'Số lượt xem bài viết'
    },
    source: { 
      type: DataTypes.STRING(255),
      comment: 'Nguồn bài viết nếu có'
    },
    rejection_reason: { 
      type: DataTypes.TEXT,
      comment: 'Lý do từ chối/yêu cầu sửa'
    },
    edit_request_reason: { 
      type: DataTypes.TEXT,
      comment: 'Lý do yêu cầu chỉnh sửa từ nhân viên'
    },
    deleted_at: { 
      type: DataTypes.DATE,
      comment: 'Thời gian xóa mềm'
    },
    created_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW,
      comment: 'Thời gian tạo bài viết'
    },
    updated_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW,
      comment: 'Thời gian cập nhật bài viết'
    }
  }, {
    tableName: 'articles',
    timestamps: true,
    underscored: true,
    comment: 'Bảng lưu trữ thông tin bài viết'
  });

  // Thiết lập quan hệ với các model khác
  Article.associate = (models) => {
    // Quan hệ với User (tác giả)
    Article.belongsTo(models.User, { 
      foreignKey: 'author_id',
      as: 'author',
      comment: 'Quan hệ 1-n với User, xác định tác giả bài viết'
    });

    // Quan hệ với Category (danh mục)
    Article.belongsTo(models.Category, { 
      foreignKey: 'category_id',
      as: 'category',
      comment: 'Quan hệ 1-n với Category, xác định danh mục bài viết'
    });
    
    // Quan hệ đa hình với Medicine (không sử dụng scope)
    Article.belongsTo(models.Medicine, { 
      foreignKey: 'entity_id', 
      constraints: false,
      as: 'medicine',
      comment: 'Quan hệ 1-1 với Medicine nếu entity_type là medicine'
    });

    // Quan hệ đa hình với Disease (không sử dụng scope)
    Article.belongsTo(models.Disease, { 
      foreignKey: 'entity_id', 
      constraints: false,
      as: 'disease',
      comment: 'Quan hệ 1-1 với Disease nếu entity_type là disease'
    });
    
    // Quan hệ ngược từ Medicine tới Article
    models.Medicine.hasOne(Article, {
      foreignKey: 'entity_id',
      constraints: false,
      scope: { entity_type: 'medicine' },
      as: 'article',
      comment: 'Quan hệ 1-1 ngược từ Medicine tới Article'
    });

    // Quan hệ ngược từ Disease tới Article
    models.Disease.hasOne(Article, {
      foreignKey: 'entity_id',
      constraints: false,
      scope: { entity_type: 'disease' },
      as: 'article',
      comment: 'Quan hệ 1-1 ngược từ Disease tới Article'
    });
    
    // Quan hệ với Interaction
    Article.hasMany(models.Interaction, { 
      foreignKey: 'entity_id', 
      constraints: false, 
      scope: { entity_type: 'article' },
      as: 'interactions',
      comment: 'Quan hệ 1-n với Interaction cho các tương tác với bài viết'
    });
  };

  console.log('SUCCESS: Model Article (Polymorphic) đã được định nghĩa.');
  return Article;
};
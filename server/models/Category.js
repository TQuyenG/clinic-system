// ============================================
// server/models/Category.js
// Model Category - CHỈ lưu danh mục con
// Sử dụng category_type (ENUM) thay vì parent_id
// ============================================

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: { 
      type: DataTypes.BIGINT, 
      primaryKey: true, 
      autoIncrement: true 
    },
    category_type: { 
      type: DataTypes.ENUM('tin_tuc', 'thuoc', 'benh_ly'), 
      allowNull: false,
      comment: 'Loại danh mục: tin_tuc (Tin tức), thuoc (Thuốc), benh_ly (Bệnh lý)'
    },
    name: { 
      type: DataTypes.STRING(255), 
      allowNull: false,
      comment: 'Tên danh mục con (VD: Thuốc giảm đau, Bệnh tim mạch)'
    },
    slug: { 
      type: DataTypes.STRING(255), 
      unique: true,
      comment: 'URL thân thiện (VD: thuoc-giam-dau)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mô tả chi tiết về danh mục'
    },
    created_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    },
    updated_at: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, {
    tableName: 'categories',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['category_type']
      },
      {
        fields: ['slug'],
        unique: true
      }
    ]
  });

  // Associations
  Category.associate = (models) => {
    // Category -> Article (1-N)
    // Bài viết TIN TỨC không cần category_id (để NULL)
    // Bài viết THUỐC/BỆNH LÝ phải có category_id
    Category.hasMany(models.Article, { 
      foreignKey: 'category_id',
      onDelete: 'RESTRICT'
    });

    // Category -> Medicine (1-N)
    // Chỉ danh mục có category_type = 'thuoc'
    Category.hasMany(models.Medicine, { 
      foreignKey: 'category_id',
      onDelete: 'RESTRICT'
    });

    // Category -> Disease (1-N)
    // Chỉ danh mục có category_type = 'benh_ly'
    Category.hasMany(models.Disease, { 
      foreignKey: 'category_id',
      onDelete: 'RESTRICT'
    });
  };

  // Helper methods
  Category.getCategoryTypeLabel = (type) => {
    const labels = {
      'tin_tuc': 'Tin tức',
      'thuoc': 'Thuốc',
      'benh_ly': 'Bệnh lý'
    };
    return labels[type] || type;
  };

  console.log('SUCCESS: Model Category đã được định nghĩa.');
  return Category;
};
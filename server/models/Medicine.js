// server/models/Medicine.js - FIXED
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Medicine = sequelize.define('Medicine', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    category_id: { type: DataTypes.BIGINT },
    name: { type: DataTypes.STRING(255), unique: true, allowNull: false },
    composition: { type: DataTypes.TEXT, comment: 'Thành phần thuốc' },
    uses: { type: DataTypes.TEXT, comment: 'Công dụng' },
    side_effects: { type: DataTypes.TEXT, comment: 'Tác dụng phụ' },
    image_url: { type: DataTypes.STRING(500), comment: 'URL hình ảnh' },
    manufacturer: { type: DataTypes.STRING(255), comment: 'Nhà sản xuất' },
    excellent_review_percent: { type: DataTypes.DECIMAL(5,2), defaultValue: 0, comment: '% đánh giá xuất sắc' },
    average_review_percent: { type: DataTypes.DECIMAL(5,2), defaultValue: 0, comment: '% đánh giá trung bình' },
    poor_review_percent: { type: DataTypes.DECIMAL(5,2), defaultValue: 0, comment: '% đánh giá kém' },
    
    // Giữ lại cột cũ để tương thích
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
    // Liên kết với Category
    Medicine.belongsTo(models.Category, { foreignKey: 'category_id' });
    
    // Polymorphic relationship với Interaction
    Medicine.hasMany(models.Interaction, { 
      foreignKey: 'entity_id',
      constraints: false,
      scope: { entity_type: 'medicine' },
      as: 'interactions'
    });
  };

  console.log('SUCCESS: Model Medicine đã được định nghĩa.');
  return Medicine;
};
// server/models/CommunityGroup.js
// Nghiệp vụ:
// - Chỉ Doctor, Staff, Admin tạo được nhóm (kiểm tra ở controller/middleware)
// - Mỗi nhóm BẮT BUỘC có 1 doctor_id (bác sĩ phụ trách)
// - type='official': do Clinic/Doctor tạo, có tích xanh, ưu tiên hiển thị
// - type='community': do staff tạo thay mặt cộng đồng, có disclaimer
// - status='pending': chờ admin duyệt trước khi hiển thị public
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityGroup = sequelize.define('CommunityGroup', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Tên nhóm cộng đồng'
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'URL-friendly slug, auto-generate từ name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cover_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'URL ảnh bìa nhóm'
    },
    icon: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Emoji icon đại diện'
    },

    // Loại nhóm — ảnh hưởng UI badge và ưu tiên hiển thị
    type: {
      type: DataTypes.ENUM('official', 'community'),
      defaultValue: 'community',
      allowNull: false,
      comment: 'official=do Clinic/Doctor tạo có tích xanh, community=nhóm cộng đồng'
    },

    // Quyền riêng tư
    privacy: {
      type: DataTypes.ENUM('public', 'private', 'invite_only'),
      defaultValue: 'public',
      allowNull: false,
      comment: 'public=join ngay, private=gửi request, invite_only=chỉ qua link'
    },

    // Trạng thái — pending cho đến khi admin duyệt
    status: {
      type: DataTypes.ENUM('pending', 'active', 'suspended'),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'pending=chờ admin duyệt, active=đang hoạt động, suspended=bị đình chỉ'
    },

    // RÀNG BUỘC CORE: Mỗi nhóm BẮT BUỘC có bác sĩ phụ trách
    requires_doctor: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Luôn true — nhóm bị suspend nếu bác sĩ rời đi'
    },

    // Người tạo nhóm (Owner)
    owner_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'FK → users.id — Doctor hoặc Staff tạo nhóm'
    },

    // Bác sĩ phụ trách (bắt buộc)
    doctor_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'FK → doctors.id — BẮT BUỘC, nhóm suspend nếu null'
    },

    // Cấu hình kiểm duyệt bài đăng trong nhóm
    requires_post_approval: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'true=bài đăng phải được duyệt trước khi hiển thị'
    },

    // Cached counters — cập nhật sau mỗi join/post
    members_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    posts_count: { type: DataTypes.INTEGER, defaultValue: 0 },

    // Admin duyệt
    approved_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'FK → users.id — admin duyệt nhóm'
    },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },

    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'community_groups',
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  CommunityGroup.associate = (models) => {
    CommunityGroup.belongsTo(models.User, { foreignKey: 'owner_id', as: 'owner' });
    CommunityGroup.belongsTo(models.Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
    CommunityGroup.hasMany(models.GroupMember, { foreignKey: 'group_id', as: 'members' });
    CommunityGroup.hasMany(models.GroupPost, { foreignKey: 'group_id', as: 'posts' });
    CommunityGroup.hasMany(models.GroupJoinRequest, { foreignKey: 'group_id', as: 'joinRequests' });
  };

  console.log('✅ Model CommunityGroup đã được định nghĩa.');
  return CommunityGroup;
};
// server/models/GroupMember.js
// Nghiệp vụ:
// - role='owner': toàn quyền nhóm (1 người duy nhất)
// - role='moderator': duyệt bài, ẩn comment, mute member (do owner promote)
// - role='member': đăng bài, comment, like
// - Doctor phụ trách tự động có role='moderator'
// - Không thể kick/ban owner hoặc doctor phụ trách
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupMember = sequelize.define('GroupMember', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

    group_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'FK → community_groups.id'
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'FK → users.id'
    },

    // Vai trò trong nhóm
    role: {
      type: DataTypes.ENUM('owner', 'moderator', 'member'),
      defaultValue: 'member',
      allowNull: false
    },

    // Trạng thái thành viên
    status: {
      type: DataTypes.ENUM('active', 'muted', 'banned'),
      defaultValue: 'active',
      allowNull: false,
      comment: 'muted=không đăng bài được, banned=bị đuổi khỏi nhóm'
    },

    // Thời gian mute tạm thời (null = vĩnh viễn nếu status=muted)
    muted_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Hết hạn mute — null nếu mute vĩnh viễn'
    },

    // Token mời (dùng cho invite_only group)
    invite_token: {
      type: DataTypes.STRING(64),
      allowNull: true,
      comment: 'Token ngẫu nhiên khi được mời — dùng 1 lần rồi null'
    },
    invited_by: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'FK → users.id — ai đã mời user này'
    },

    joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'group_members',
    timestamps: true,
    underscored: true,
    indexes: [
      // UNIQUE: mỗi user chỉ là thành viên 1 lần trong 1 nhóm
      { unique: true, fields: ['group_id', 'user_id'] },
      { fields: ['group_id'] },
      { fields: ['user_id'] }
    ]
  });

  GroupMember.associate = (models) => {
    GroupMember.belongsTo(models.CommunityGroup, { foreignKey: 'group_id', as: 'group' });
    GroupMember.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    GroupMember.belongsTo(models.User, { foreignKey: 'invited_by', as: 'inviter' });
  };

  console.log('✅ Model GroupMember đã được định nghĩa.');
  return GroupMember;
};
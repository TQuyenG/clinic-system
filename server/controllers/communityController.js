// server/controllers/communityController.js
// Mỗi hàm ghi rõ: đang áp dụng business rule nào
const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');
const { createNotification, notifyAllAdmins } = require('../utils/notificationHelper');

// ─────────────────────────────────────────────
// HELPER: Tạo slug từ tên nhóm
// ─────────────────────────────────────────────
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    + '-' + Date.now();
};

// ─────────────────────────────────────────────
// HELPER: Scan từ khóa nhạy cảm / khẩn cấp
// Business rule: bảo vệ doanh thu tư vấn
// ─────────────────────────────────────────────
const SENSITIVE_KEYWORDS = [
  'đơn thuốc', 'liều lượng', 'liều dùng', 'mg/kg', 'ml/ngày',
  'xét nghiệm', 'kết quả xét nghiệm', 'x-quang', 'siêu âm', 'mri', 'ct scan',
  'chẩn đoán', 'phác đồ điều trị'
];
const EMERGENCY_KEYWORDS = [
  'đau thắt ngực', 'khó thở', 'mất ý thức', 'ngất xỉu',
  'sốt cao co giật', 'xuất huyết', 'liệt nửa người', 'đột quỵ'
];

const scanContent = (text) => {
  const lower = text.toLowerCase();
  return {
    hasSensitive: SENSITIVE_KEYWORDS.some(kw => lower.includes(kw)),
    hasEmergency: EMERGENCY_KEYWORDS.some(kw => lower.includes(kw))
  };
};

// ═══════════════════════════════════════════════════════════
// NHÓM 1: QUẢN LÝ NHÓM (CRUD)
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// NHÓM 1: QUẢN LÝ NHÓM (CRUD)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/community/groups
 * Public: Lấy danh sách nhóm đang active
 * Không cần đăng nhập — ai cũng có thể xem danh sách nhóm
 */
const getGroups = async (req, res, next) => {
  try {
    console.log("🚀 [DEBUG] Đang gọi API lấy danh sách nhóm...");
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const type = req.query.type; // 'official' | 'community'

    const where = { status: 'active' };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (type && ['official', 'community'].includes(type)) {
      where.type = type;
    }

    console.log("🚀 [DEBUG] Bắt đầu truy vấn Database...");
    
    // Dùng findAll an toàn hơn findAndCountAll
    const groups = await models.CommunityGroup.findAll({
      where,
      include: [
        { model: models.User, as: 'owner', attributes: ['id', 'full_name', 'avatar_url'] },
        {
          model: models.Doctor,
          as: 'doctor',
          include: [{ model: models.User, as: 'user', attributes: ['id', 'full_name', 'avatar_url'] }]
        },
        // BỔ SUNG ĐOẠN NÀY ĐỂ KÉO THEO DANH SÁCH THÀNH VIÊN
        {
          model: models.GroupMember,
          as: 'members',
          attributes: ['user_id', 'role', 'status'],
          required: false // Dùng LEFT JOIN để lấy cả những nhóm chưa có ai tham gia
        }
      ],
      order: [['created_at', 'DESC']], // Bỏ sắp xếp phức tạp để tránh kẹt DB
      limit,
      offset
    });

    // Đếm số lượng độc lập để không gây lỗi ngầm
    const total = await models.CommunityGroup.count({ where });

    console.log(`🚀 [DEBUG] Truy vấn thành công! Lấy được ${groups.length} nhóm.`);

    return res.json({
      success: true,
      data: { groups, total, page, limit }
    });
  } catch (error) {
    console.error("❌ [LỖI GET GROUPS]:", error);
    // Bắt buộc trả về response 500, không được dùng next() để tránh treo request
    return res.status(500).json({ success: false, message: 'Lỗi server khi tải nhóm', error: error.message });
  }
};

/**
 * GET /api/community/groups/:slug
 * Public: Chi tiết 1 nhóm theo slug
 */
const getGroupBySlug = async (req, res, next) => {
  try {
    const group = await models.CommunityGroup.findOne({
      where: { slug: req.params.slug, status: 'active' },
      include: [
        { model: models.User, as: 'owner', attributes: ['id', 'full_name', 'avatar_url', 'role'] },
        {
          model: models.Doctor,
          as: 'doctor',
          include: [{ model: models.User, as: 'user', attributes: ['id', 'full_name', 'avatar_url'] }]
        }
      ]
    });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Nhóm không tồn tại' });
    }

    // Nếu user đã đăng nhập, kiểm tra membership
    let membershipStatus = null;
    if (req.user) {
      const member = await models.GroupMember.findOne({
        where: { group_id: group.id, user_id: req.user.id }
      });
      membershipStatus = member ? { role: member.role, status: member.status } : null;
    }

    res.json({ success: true, data: { ...group.toJSON(), membershipStatus } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/community/groups
 * Business rules áp dụng:
 * 1. Chỉ Doctor, Staff, Admin tạo được — Patient bị chặn ở middleware
 * 2. BẮT BUỘC có doctor_id hợp lệ
 * 3. Status mặc định = 'pending', chờ Admin duyệt
 * 4. Doctor tạo → type='official', Staff tạo → type='community'
 * 5. Owner tự động được thêm vào GroupMember với role='owner'
 * 6. Doctor phụ trách tự động được thêm vào GroupMember với role='moderator'
 */
const createGroup = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { name, description, cover_image, icon, privacy, doctor_id, requires_post_approval } = req.body;
    const { id: userId, role } = req.user;

    // Validate bắt buộc
    if (!name || !doctor_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu tên nhóm hoặc bác sĩ phụ trách' });
    }

    // Kiểm tra doctor_id tồn tại và đang active (Hỗ trợ truyền cả Doctor PK hoặc User ID)
    const doctor = await models.Doctor.findOne({
      where: { 
        [Op.or]: [{ id: doctor_id }, { user_id: doctor_id }],
        work_status: 'active' 
      },
      include: [{ model: models.User, as: 'user', attributes: ['id'] }],
      transaction: t
    });
    if (!doctor) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Bác sĩ không tồn tại hoặc không đang hoạt động' });
    }

    // Tạo slug unique
    const slug = generateSlug(name);

    // Doctor tạo → official, Staff/Admin tạo → community
    const groupType = role === 'doctor' ? 'official' : 'community';

    // Tạo nhóm với status='pending' — chờ Admin duyệt
    const group = await models.CommunityGroup.create({
      name: name.trim(),
      slug, // <--- có dấu phẩy
      description: description ? description.trim() : null,
      cover_image: cover_image || null,
      icon: icon || '👥',
      type: groupType,
      privacy: privacy || 'public',
      status: 'pending', 
      owner_id: userId,
      doctor_id: doctor.id, 
      requires_post_approval: requires_post_approval !== false
    }, { transaction: t }); // <--- đóng ngoặc đầy đủ

    // Owner tự động là member với role='owner'
    await models.GroupMember.create({
      group_id: group.id,
      user_id: userId,
      role: 'owner',
      status: 'active',
      joined_at: new Date()
    }, { transaction: t });

    // Doctor phụ trách tự động là moderator
    // (chỉ thêm nếu doctor.user_id khác owner)
    if (doctor.user_id !== userId) {
      await models.GroupMember.create({
        group_id: group.id,
        user_id: doctor.user_id,
        role: 'moderator',
        status: 'active',
        joined_at: new Date()
      }, { transaction: t });
    }

    await t.commit();

    // Thông báo Admin có nhóm mới cần duyệt
    await notifyAllAdmins(
      'community',
      `Có nhóm cộng đồng mới "${name}" cần được duyệt`,
      `/quan-ly-nhom-cong-dong?tab=pending`
    );

    res.status(201).json({
      success: true,
      message: 'Tạo nhóm thành công. Nhóm đang chờ Admin duyệt trước khi hiển thị.',
      data: group
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * PUT /api/community/groups/:id
 * Business rule: Chỉ owner hoặc Admin được sửa thông tin nhóm
 */
const updateGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const { id: userId, role } = req.user;

    const group = await models.CommunityGroup.findByPk(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Nhóm không tồn tại' });

    // Chỉ owner hoặc admin được sửa
    if (role !== 'admin' && group.owner_id !== userId) {
      return res.status(403).json({ success: false, message: 'Chỉ owner hoặc Admin được sửa thông tin nhóm' });
    }

    const { name, description, cover_image, icon, privacy, requires_post_approval } = req.body;

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description;
    if (cover_image !== undefined) group.cover_image = cover_image;
    if (icon !== undefined) group.icon = icon;
    if (privacy && ['public', 'private', 'invite_only'].includes(privacy)) group.privacy = privacy;
    if (requires_post_approval !== undefined) group.requires_post_approval = requires_post_approval;

    await group.save();
    // Gửi thông báo cho bác sĩ phụ trách
    if (group.doctor_id) {
      await createNotification({
        user_id: group.doctor_id,
        type: 'system',
        message: `Nhóm cộng đồng "${group.name}" do bạn phụ trách đã được phê duyệt và bắt đầu hoạt động.`,
        link: `/cong-dong/nhom/${group.slug}`
      });
    }
    res.json({ success: true, message: 'Cập nhật nhóm thành công', data: group });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/community/groups/:id
 * Business rule: Soft delete, thông báo tất cả members
 */
const deleteGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const { id: userId, role } = req.user;

    const group = await models.CommunityGroup.findByPk(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Nhóm không tồn tại' });

    if (role !== 'admin' && group.owner_id !== userId) {
      return res.status(403).json({ success: false, message: 'Chỉ owner hoặc Admin được xóa nhóm' });
    }

    // Lấy danh sách members để gửi thông báo
    const members = await models.GroupMember.findAll({
      where: { group_id: groupId, status: 'active' },
      attributes: ['user_id']
    });

    // Soft delete nhóm
    await group.destroy();

    // Thông báo tất cả members nhóm đã bị xóa
    const notifications = members
      .filter(m => m.user_id !== userId)
      .map(m => ({
        user_id: m.user_id,
        type: 'community',
        message: `Nhóm "${group.name}" đã bị giải thể`,
        link: '/cong-dong'
      }));

    if (notifications.length > 0) {
      const { createNotifications } = require('../utils/notificationHelper');
      await createNotifications(notifications);
    }

    res.json({ success: true, message: 'Đã xóa nhóm thành công' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════
// NHÓM 2: THÀNH VIÊN — JOIN / LEAVE / INVITE
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/community/groups/:id/join
 * Business rules:
 * - Public group → join ngay, tạo GroupMember
 * - Private group → tạo GroupJoinRequest, chờ owner/mod duyệt
 * - Invite_only → từ chối (phải có invite_token)
 * - User đã là member → báo lỗi
 */
const joinGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const { id: userId } = req.user;
    const { message } = req.body; // Lý do xin vào (optional)

    const group = await models.CommunityGroup.findOne({
      where: { id: groupId, status: 'active' }
    });
    if (!group) return res.status(404).json({ success: false, message: 'Nhóm không tồn tại hoặc chưa được duyệt' });

    // Kiểm tra đã là member chưa
    const existing = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: userId }
    });
    if (existing) {
      if (existing.status === 'banned') {
        return res.status(403).json({ success: false, message: 'Bạn đã bị cấm khỏi nhóm này' });
      }
      return res.status(400).json({ success: false, message: 'Bạn đã là thành viên nhóm này' });
    }

    // Invite-only: không thể tự join
    if (group.privacy === 'invite_only') {
      return res.status(403).json({
        success: false,
        message: 'Nhóm này chỉ cho phép tham gia qua lời mời'
      });
    }

    // Public: join ngay
    if (group.privacy === 'public') {
      await models.GroupMember.create({
        group_id: groupId,
        user_id: userId,
        role: 'member',
        status: 'active',
        joined_at: new Date()
      });

      // Cập nhật counter
      await models.CommunityGroup.increment('members_count', { where: { id: groupId } });

      // Thông báo owner
      await createNotification({
        user_id: group.owner_id,
        type: 'community',
        message: `Có thành viên mới vừa tham gia nhóm "${group.name}"`,
        link: `/cong-dong/nhom/${group.slug}`
      });

      return res.json({ success: true, message: 'Tham gia nhóm thành công', data: { status: 'joined' } });
    }

    // Private: tạo request
    if (group.privacy === 'private') {
      // Kiểm tra đã có request pending chưa
      const pendingReq = await models.GroupJoinRequest.findOne({
        where: { group_id: groupId, user_id: userId, status: 'pending' }
      });
      if (pendingReq) {
        return res.status(400).json({ success: false, message: 'Bạn đã gửi yêu cầu tham gia rồi, đang chờ duyệt' });
      }

      await models.GroupJoinRequest.create({
        group_id: groupId,
        user_id: userId,
        status: 'pending',
        message: message || null
      });

      // Thông báo owner/moderator
      await createNotification({
        user_id: group.owner_id,
        type: 'community',
        message: `Có yêu cầu tham gia nhóm "${group.name}" cần duyệt`,
        link: `/cong-dong/nhom/${group.slug}?tab=requests`
      });

      return res.json({ success: true, message: 'Đã gửi yêu cầu tham gia. Vui lòng chờ owner duyệt.', data: { status: 'pending' } });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/community/groups/:id/leave
 * Business rule: Owner không thể rời nhóm (phải xóa hoặc chuyển quyền trước)
 */
const leaveGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const { id: userId } = req.user;

    const member = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: userId }
    });
    if (!member) return res.status(404).json({ success: false, message: 'Bạn không phải thành viên nhóm này' });

    // Owner không thể rời nhóm
    if (member.role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Owner không thể rời nhóm. Hãy xóa nhóm hoặc chuyển quyền owner trước.'
      });
    }

    await member.destroy();
    await models.CommunityGroup.decrement('members_count', { where: { id: groupId } });

    res.json({ success: true, message: 'Đã rời nhóm thành công' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/community/groups/:id/invite
 * Business rule: Chỉ owner/moderator được mời
 * Kết bạn chỉ dùng để mời vào nhóm — không nhắn tin được
 */
const inviteMember = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const { id: inviterId } = req.user;
    const { user_id: targetUserId } = req.body;

    // Kiểm tra inviter là owner hoặc moderator
    const inviterMember = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: inviterId, status: 'active' }
    });
    if (!inviterMember || !['owner', 'moderator'].includes(inviterMember.role)) {
      return res.status(403).json({ success: false, message: 'Chỉ owner hoặc moderator được mời thành viên' });
    }

    // Kiểm tra target user đã là member chưa
    const existing = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: targetUserId }
    });
    if (existing) return res.status(400).json({ success: false, message: 'Người dùng đã là thành viên nhóm này' });

    const group = await models.CommunityGroup.findByPk(groupId);

    // Tạo invite token ngẫu nhiên
    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Tạo GroupMember với status pending (chờ user accept)
    await models.GroupMember.create({
      group_id: groupId,
      user_id: targetUserId,
      role: 'member',
      status: 'active', // Direct invite = active ngay
      invite_token: inviteToken,
      invited_by: inviterId,
      joined_at: new Date()
    });

    await models.CommunityGroup.increment('members_count', { where: { id: groupId } });

    // Thông báo user được mời
    await createNotification({
      user_id: targetUserId,
      type: 'community',
      message: `Bạn đã được mời tham gia nhóm "${group.name}"`,
      link: `/cong-dong/nhom/${group.slug}`
    });

    res.json({ success: true, message: 'Đã mời thành viên thành công' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════
// NHÓM 3: BÀI ĐĂNG TRONG NHÓM
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/community/groups/:id/posts
 * Lấy bài đăng đã approved trong nhóm
 * Cần là member mới xem được (public group cho xem preview)
 */
const getGroupPosts = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const offset = (page - 1) * limit;

    // 1. Lấy danh sách bài viết (Dùng findAll thay vì findAndCountAll)
    const posts = await models.GroupPost.findAll({
      where: { group_id: groupId, status: 'approved' },
      include: [
        { 
          model: models.User, 
          as: 'author', // Đổi thành 'author' để khớp với Model vừa sửa ở trên
          attributes: ['id', 'full_name', 'avatar_url', 'role'] 
        }
      ],
      order: [
        ['is_pinned', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 2. Đếm tổng số bài viết riêng biệt để an toàn cho SQL
    const total = await models.GroupPost.count({
      where: { group_id: groupId, status: 'approved' }
    });

    res.json({ 
      success: true, 
      data: { 
        posts, 
        total, 
        page, 
        limit 
      } 
    });
  } catch (error) {
    console.error('❌ Lỗi getGroupPosts:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy bài viết nhóm', error: error.message });
  }
};

/**
 * POST /api/community/groups/:id/posts
 * Business rules:
 * 1. Phải là member active (không bị muted/banned)
 * 2. Scan SENSITIVE_KEYWORDS → đánh flag, hiện nút tư vấn ở frontend
 * 3. Scan EMERGENCY_KEYWORDS → đánh flag, frontend hiện popup Video Call
 * 4. Bài của Doctor/Owner/Moderator → auto approved
 * 5. Bài của member thường → status='pending' nếu requires_post_approval=true
 * 6. disclaimer_shown luôn = true
 */
const createGroupPost = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const { id: userId, role: userRole } = req.user;
    const { content, images } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung bài đăng không được trống' });
    }

    // Kiểm tra group tồn tại và active
    const group = await models.CommunityGroup.findOne({
      where: { id: groupId, status: 'active' }
    });
    if (!group) return res.status(404).json({ success: false, message: 'Nhóm không tồn tại' });

    // Kiểm tra membership
    const member = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: userId, status: 'active' }
    });
    if (!member) {
      return res.status(403).json({ success: false, message: 'Bạn chưa là thành viên nhóm này' });
    }

    // Kiểm tra muted
    if (member.status === 'muted') {
      const now = new Date();
      if (!member.muted_until || member.muted_until > now) {
        return res.status(403).json({ success: false, message: 'Bạn đang bị hạn chế đăng bài trong nhóm này' });
      }
      // Hết hạn mute → tự động restore
      member.status = 'active';
      member.muted_until = null;
      await member.save();
    }

    // Scan nội dung — business rule bảo vệ tư vấn
    const { hasSensitive, hasEmergency } = scanContent(content);

    // Xác định status bài đăng
    // Doctor/Owner/Moderator → auto approved, member thường phụ thuộc requires_post_approval
    const isPrivileged = ['owner', 'moderator'].includes(member.role) || userRole === 'doctor';
    const postStatus = (isPrivileged || !group.requires_post_approval) ? 'approved' : 'pending';

    const post = await models.GroupPost.create({
      group_id: groupId,
      author_id: userId,
      content: content.trim(),
      images: Array.isArray(images) ? images.slice(0, 5) : [], // Max 5 ảnh
      is_anonymous: req.body.is_anonymous === true,
      status: postStatus,
      has_sensitive_content: hasSensitive,
      has_emergency_content: hasEmergency,
      disclaimer_shown: true, // Luôn true
      approved_by: isPrivileged ? userId : null,
      approved_at: isPrivileged ? new Date() : null
    });

    // Nếu approved, cập nhật counter
    if (postStatus === 'approved') {
      await models.CommunityGroup.increment('posts_count', { where: { id: groupId } });
    } else {
      // Lấy danh sách các ID cần thông báo (dùng Set để tránh trùng lặp nếu Bác sĩ cũng là Owner)
      const notifyUsers = new Set();
      if (group.owner_id) notifyUsers.add(group.owner_id);
      if (group.doctor_id) notifyUsers.add(group.doctor_id);
      if (group.created_by) notifyUsers.add(group.created_by);

      // Gửi thông báo đến tất cả những người quản lý nhóm
      for (const uid of notifyUsers) {
        await createNotification({
          user_id: uid,
          type: 'system',
          message: `⏳ Có bài đăng mới đang chờ duyệt trong nhóm "${group.name}"`,
          link: `/cong-dong/nhom/${group.slug}?tab=manage` // <-- Sửa thêm ?tab=manage vào cuối link
        });
      }
    }

    res.status(201).json({
      success: true,
      message: postStatus === 'approved' ? 'Đăng bài thành công' : 'Bài đăng đang chờ duyệt',
      data: {
        ...post.toJSON(),
        // Trả về flag để frontend xử lý popup
        showConsultationNudge: hasSensitive,
        showEmergencyPopup: hasEmergency
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/community/posts/:postId/approve
 * Business rule: Chỉ owner/moderator/doctor của nhóm được duyệt bài
 */
const approveGroupPost = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.postId);
    const { id: userId } = req.user;

    const post = await models.GroupPost.findByPk(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Bài đăng không tồn tại' });

    // Kiểm tra quyền trong nhóm
    const member = await models.GroupMember.findOne({
      where: { group_id: post.group_id, user_id: userId, status: 'active' }
    });
    if (!member || member.role === 'member') {
      return res.status(403).json({ success: false, message: 'Chỉ owner hoặc moderator mới được duyệt bài' });
    }

    post.status = 'approved';
    post.approved_by = userId;
    post.approved_at = new Date();
    await post.save();

    // Lấy group_id từ chính bài post
    const group = await models.CommunityGroup.findByPk(post.group_id);
      
      // Thông báo cho bác sĩ phụ trách
      if (group && group.doctor_id) {
        await createNotification({
          user_id: group.doctor_id,
          type: 'system',
          message: `Có bài viết mới đang chờ duyệt trong nhóm "${group.name}".`,
          link: `/cong-dong/nhom/${group.slug}`
        });
      }
      
      // Nếu có lưu người tạo nhóm (created_by), thông báo cho Staff đó
      if (group && group.created_by) {
         await createNotification({
          user_id: group.created_by,
          type: 'system',
          message: `Có bài viết mới đang chờ duyệt trong nhóm "${group.name}".`,
          link: `/cong-dong/nhom/${group.slug}`
        });
      }

    await models.CommunityGroup.increment('posts_count', { where: { id: post.group_id } });

    // Thông báo tác giả bài được duyệt
    await createNotification({
      user_id: post.author_id,
      type: 'community',
      message: 'Bài đăng của bạn đã được duyệt',
      link: `/cong-dong/nhom/${req.params.postId}`
    });

    res.json({ success: true, message: 'Đã duyệt bài đăng', data: post });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════
// NHÓM 4: ADMIN — Duyệt nhóm, quản lý toàn hệ thống
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/community/admin/groups
 * Admin xem tất cả nhóm kể cả pending/suspended
 */
const adminGetAllGroups = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const status = req.query.status; // 'pending' | 'active' | 'suspended'

    const where = {};
    if (status && ['pending', 'active', 'suspended'].includes(status)) {
      where.status = status;
    }

    const result = await models.CommunityGroup.findAndCountAll({
      where,
      include: [
        { model: models.User, as: 'owner', attributes: ['id', 'full_name', 'email'] },
        {
          model: models.Doctor,
          as: 'doctor',
          include: [{ model: models.User, as: 'user', attributes: ['id', 'full_name'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      paranoid: false, // Admin xem cả deleted
      limit,
      offset
    });

    res.json({ success: true, data: { groups: result.rows, total: result.count, page, limit } });
  } catch (error) {
    next(error);
  }
};

const rejectGroupPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const post = await GroupPost.findByPk(postId, { include: [{ model: CommunityGroup, as: 'group' }] });
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài đăng' });
    if (post.status !== 'pending') return res.status(400).json({ success: false, message: 'Bài đăng không ở trạng thái chờ duyệt' });
    const userRole = req.user.role?.name?.toLowerCase() || req.user.role?.toLowerCase();
    const membership = await GroupMember.findOne({ where: { group_id: post.group_id, user_id: userId, status: 'active' } });
    const isModerator = membership?.role === 'moderator' || membership?.role === 'owner';
    if (!['admin'].includes(userRole) && post.group?.created_by !== userId && !(userRole === 'doctor' && post.group?.doctor_id === userId) && !isModerator) {
      return res.status(403).json({ success: false, message: 'Không có quyền từ chối bài viết' });
    }
    post.status = 'rejected';
    post.rejection_reason = reason || '';
    await post.save();
    return res.json({ success: true, message: 'Đã từ chối bài viết', data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/community/admin/groups/:id/approve
 * Business rule: Admin duyệt nhóm → status='active', nhóm hiển thị public
 */
const adminApproveGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const group = await models.CommunityGroup.findByPk(groupId);

    if (!group) return res.status(404).json({ success: false, message: 'Nhóm không tồn tại' });
    if (group.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Nhóm không ở trạng thái chờ duyệt' });
    }

    group.status = 'active';
    group.approved_by = req.user.id;
    group.approved_at = new Date();
    await group.save();

    // Thông báo owner nhóm được duyệt
    await createNotification({
      user_id: group.owner_id,
      type: 'community',
      message: `Nhóm "${group.name}" đã được duyệt và hiển thị công khai`,
      link: `/cong-dong/nhom/${group.slug}`
    });

    res.json({ success: true, message: 'Đã duyệt nhóm thành công', data: group });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/community/admin/groups/:id/reject
 */
const adminRejectGroup = async (req, res, next) => {
  try {
    const groupId = parseInt(req.params.id);
    const { reason } = req.body;

    const group = await models.CommunityGroup.findByPk(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Nhóm không tồn tại' });

    group.status = 'suspended';
    group.rejection_reason = reason || 'Không đáp ứng tiêu chuẩn cộng đồng';
    await group.save();

    await createNotification({
      user_id: group.owner_id,
      type: 'community',
      message: `Nhóm "${group.name}" bị từ chối: ${group.rejection_reason}`,
      link: '/cong-dong'
    });

    res.json({ success: true, message: 'Đã từ chối nhóm', data: group });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════
// NHÓM TƯƠNG TÁC (LIKE, COMMENT, REPORT) TRÊN BÀI VIẾT
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/community/posts/:postId/like
 * Toggle thả tim/bỏ tim bài viết
 */
const toggleLikePost = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.user.id;

    const post = await models.GroupPost.findByPk(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Bài đăng không tồn tại' });

    // Đảm bảo likedBy luôn là mảng
    let likedBy = post.liked_by || [];
    if (typeof likedBy === 'string') likedBy = JSON.parse(likedBy);

    const hasLiked = likedBy.includes(userId);

    if (hasLiked) {
      likedBy = likedBy.filter(id => id !== userId); // Bỏ tim
      post.likes_count = Math.max(0, post.likes_count - 1);
    } else {
      likedBy.push(userId); // Thả tim
      post.likes_count += 1;
    }

    post.liked_by = likedBy;
    await post.save();

    res.json({ success: true, isLiked: !hasLiked, likesCount: post.likes_count });
  } catch (error) { next(error); }
};

/**
 * POST /api/community/posts/:postId/comment
 * Bình luận bài viết
 */
const commentOnPost = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được trống' });
    }

    const post = await models.GroupPost.findByPk(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Bài đăng không tồn tại' });

    // Lấy thông tin người bình luận để lưu cứng vào JSON
    const user = await models.User.findByPk(userId);

    let comments = post.comments_data || [];
    if (typeof comments === 'string') comments = JSON.parse(comments);

    const newComment = {
      id: Date.now(), // ID ảo để làm key map ở Frontend
      user_id: userId,
      user_name: user.full_name || 'Thành viên',
      avatar_url: user.avatar_url || '/default-avatar.png',
      content: content.trim(),
      created_at: new Date()
    };

    comments.push(newComment);
    post.comments_data = comments;
    post.comments_count += 1;

    await post.save();

    res.json({ success: true, message: 'Đã bình luận', data: newComment });
  } catch (error) { next(error); }
};

/**
 * POST /api/community/posts/:postId/report
 * Báo cáo bài viết
 */
const reportPost = async (req, res, next) => {
  try {
    const postId = parseInt(req.params.postId);
    const userId = req.user.id;
    const { reason } = req.body;

    const post = await models.GroupPost.findByPk(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Bài đăng không tồn tại' });

    let reports = post.reports_data || [];
    if (typeof reports === 'string') reports = JSON.parse(reports);

    // Kiểm tra xem user này đã report chưa
    if (reports.some(r => r.user_id === userId)) {
      return res.status(400).json({ success: false, message: 'Bạn đã báo cáo bài viết này rồi' });
    }

    reports.push({
      user_id: userId,
      reason: reason || 'Vi phạm tiêu chuẩn cộng đồng',
      created_at: new Date()
    });

    post.reports_data = reports;
    await post.save();

    res.json({ success: true, message: 'Đã gửi báo cáo thành công' });
  } catch (error) { next(error); }
};

// Lấy danh sách bài viết chờ duyệt
const getPendingGroupPosts = async (req, res, next) => {
  try {
    const { id } = req.params; // groupId
    const posts = await models.GroupPost.findAll({
      where: { group_id: id, status: 'pending' },
      // Sửa as: 'author' thành as: 'User'
      include: [{ model: models.User, as: 'User', attributes: ['id', 'full_name', 'avatar_url'] }],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: posts });
  } catch (error) { next(error); }
};

// Lấy danh sách bài bị báo cáo
const getReportedGroupPosts = async (req, res, next) => {
  try {
    const { id } = req.params; // groupId
    const posts = await models.GroupPost.findAll({
      where: { 
        group_id: id,
        reports_data: { [Op.not]: null } 
      },
      // Sửa as: 'author' thành as: 'User'
      include: [{ model: models.User, as: 'User', attributes: ['id', 'full_name', 'avatar_url'] }],
      order: [['created_at', 'DESC']]
    });
    
    // Lọc lại những bài thực sự có dữ liệu báo cáo (phòng hờ mảng rỗng)
    const reported = posts.filter(p => {
      let rep = p.reports_data;
      if (typeof rep === 'string') rep = JSON.parse(rep);
      return Array.isArray(rep) && rep.length > 0;
    });
    
    res.json({ success: true, data: reported });
  } catch (error) { next(error); }
};

module.exports = {
  getGroups,
  getGroupBySlug,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  inviteMember,
  getGroupPosts,
  createGroupPost,
  approveGroupPost,
  rejectGroupPost,
  adminGetAllGroups,
  adminApproveGroup,
  adminRejectGroup,
  toggleLikePost,
  commentOnPost,
  getPendingGroupPosts,
  getReportedGroupPosts,
  reportPost
};
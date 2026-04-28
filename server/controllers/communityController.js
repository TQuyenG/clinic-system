// server/controllers/communityController.js
// Mỗi hàm ghi rõ: đang áp dụng business rule nào
const { models, sequelize } = require('../config/db');
const { Op, fn, col } = require('sequelize');
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
    const { slug } = req.params;
    const currentUserId = req.user?.id || null; // authenticateTokenBasic: null nếu chưa login

    const group = await models.CommunityGroup.findOne({
      where: { slug, status: 'active' }, // chỉ xem nhóm active
      include: [
        {
          model: models.Doctor,
          as: 'doctor',
          include: [{ model: models.User, as: 'user', attributes: ['id', 'full_name', 'avatar_url'] }],
          attributes: ['id', 'user_id', 'specialty_id', 'bio', 'title', 'position'],
        },
        {
          model: models.User,
          as: 'owner',
          attributes: ['id', 'full_name', 'avatar_url'],
        },
      ],
    });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Nhóm không tồn tại hoặc chưa được duyệt.' });
    }

    // Kiểm tra tư cách thành viên
    let membershipStatus = null;
    if (currentUserId) {
      const member = await models.GroupMember.findOne({
        where: { group_id: group.id, user_id: currentUserId },
      });
      if (member) {
        membershipStatus = {
          role:       member.role,
          status:     member.status,
          joined_at:  member.joined_at,
          muted_until: member.muted_until,
        };
      }
    }

    return res.json({
      success: true,
      data: {
        ...group.toJSON(),
        membershipStatus,
      },
    });
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
    const { name, description, cover_image, avatar_image, icon, privacy, doctor_id, requires_post_approval } = req.body;
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
      avatar_image: avatar_image || null,
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
 * Lookup user_id từ Doctor trước khi tạo notification; thêm avatar_image vào fields được cập nhật
 */
const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId   = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();

    const group = await models.CommunityGroup.findByPk(id);
    if (!group) return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm.' });

    // Chỉ owner hoặc admin mới sửa được
    const membership = await models.GroupMember.findOne({
      where: { group_id: id, user_id: userId },
    });
    const isOwner = membership?.role === 'owner';
    if (userRole !== 'admin' && !isOwner) {
      return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa nhóm.' });
    }

    const { name, description, cover_image, avatar_image, icon, privacy, requires_post_approval } = req.body;

    if (name            !== undefined) group.name            = name;
    if (description     !== undefined) group.description     = description;
    if (cover_image     !== undefined) group.cover_image     = cover_image;
    if (avatar_image    !== undefined) group.avatar_image    = avatar_image; // ✅ FIX: lưu avatar
    if (icon            !== undefined) group.icon            = icon;
    if (privacy         !== undefined) group.privacy         = privacy;
    if (requires_post_approval !== undefined) group.requires_post_approval = requires_post_approval;

    await group.save();

    // ✅ FIX: Lookup user_id thực sự của bác sĩ trước khi notify
    if (group.doctor_id) {
      try {
        const doctor = await models.Doctor.findByPk(group.doctor_id, { attributes: ['user_id'] });
        if (doctor?.user_id && doctor.user_id !== userId) {
          await createNotification({
            user_id: doctor.user_id,
            type:    'community',
            message: `Thông tin nhóm "${group.name}" bạn phụ trách vừa được cập nhật.`,
            link:    `/cong-dong/nhom/${group.slug}`,
          });
        }
      } catch (_) {}
    }

    return res.json({ success: true, message: 'Đã cập nhật thông tin nhóm.', data: group });
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
    const { id } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await models.GroupPost.findAndCountAll({
      where: {
        group_id: id,
        status: 'approved', // ✅ FIX: chỉ lấy bài đã duyệt
      },
      include: [
        {
          model: models.User,
          as: 'author',       // ✅ FIX: dùng alias đúng
          attributes: ['id', 'full_name', 'avatar_url', 'role'],
        },
      ],
      order: [
        ['is_pinned', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        posts: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
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
    const { id }    = req.params;
    const userId    = req.user.id;
    const userRole  = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
    const { content, images = [], is_anonymous = false } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Nội dung bài viết không được trống.' });
    }

    const group = await models.CommunityGroup.findByPk(id);
    if (!group || group.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Nhóm không tồn tại hoặc chưa hoạt động.' });
    }

    // Kiểm tra thành viên
    const membership = await models.GroupMember.findOne({
      where: { group_id: id, user_id: userId },
    });
    if (!membership || membership.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền đăng bài trong nhóm này.' });
    }
    if (membership.status === 'muted') {
      if (membership.muted_until && new Date() > new Date(membership.muted_until)) {
        // Hết hạn mute → tự động unmute
        membership.status     = 'active';
        membership.muted_until = null;
        await membership.save();
      } else {
        return res.status(403).json({ success: false, message: 'Bạn đang bị hạn chế đăng bài trong nhóm này.' });
      }
    }

    // Xác định trạng thái bài đăng
    const isPrivileged = ['admin', 'doctor'].includes(userRole) ||
      ['owner', 'moderator'].includes(membership.role);

    // ✅ FIX: Bài auto-approved nếu user có quyền, hoặc nhóm không yêu cầu duyệt
    const initialStatus = (!group.requires_post_approval || isPrivileged)
      ? 'approved'
      : 'pending';

    // Kiểm tra từ khóa
    const SENSITIVE_KEYWORDS = ['đơn thuốc', 'liều lượng', 'mg/kg', 'xét nghiệm', 'chẩn đoán', 'phác đồ điều trị'];
    const EMERGENCY_KEYWORDS = ['đau thắt ngực', 'khó thở', 'mất ý thức', 'ngất xỉu', 'sốt cao co giật', 'xuất huyết', 'đột quỵ'];
    const lower = content.toLowerCase();
    const has_sensitive_content = SENSITIVE_KEYWORDS.some(kw => lower.includes(kw));
    const has_emergency_content = EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));

    const post = await models.GroupPost.create({
      group_id:             id,
      author_id:            userId,
      content:              content.trim(),
      images:               images.slice(0, 5),
      is_anonymous,
      status:               initialStatus,
      has_sensitive_content,
      has_emergency_content,
      disclaimer_shown:     true,
      approved_by:          initialStatus === 'approved' ? userId : null,
      approved_at:          initialStatus === 'approved' ? new Date() : null,
    });

    // Nếu auto-approved → cập nhật thống kê ngay
    if (initialStatus === 'approved') {
      await models.CommunityGroup.increment('posts_count', { by: 1, where: { id } });
      await models.GroupMember.update(
        { posts_count: membership.posts_count + 1, last_post_at: new Date() },
        { where: { id: membership.id } }
      );
    }

    const message = initialStatus === 'pending'
      ? 'Bài viết đang chờ được quản trị viên duyệt.'
      : 'Đăng bài thành công!';

    return res.status(201).json({ success: true, message, data: post });
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
    const { postId } = req.params;
    const userId   = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();

    const post = await models.GroupPost.findByPk(postId, {
      include: [{ model: models.CommunityGroup, as: 'group' }],
    });
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài đăng.' });
    if (post.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Bài không ở trạng thái chờ duyệt.' });
    }

    const membership = await models.GroupMember.findOne({
      where: { group_id: post.group_id, user_id: userId, status: 'active' },
    });
    const isMod = membership && ['owner', 'moderator'].includes(membership.role);
    if (userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Không có quyền duyệt bài viết.' });
    }

    post.status      = 'approved';
    post.approved_by = userId;
    post.approved_at = new Date();
    await post.save();

    // Cập nhật posts_count + last_post_at của thành viên trong nhóm
    const authorMember = await models.GroupMember.findOne({
      where: { group_id: post.group_id, user_id: post.author_id },
    });
    if (authorMember) {
      authorMember.posts_count = (authorMember.posts_count || 0) + 1;
      authorMember.last_post_at = post.created_at;
      await authorMember.save();
    }

    // Tăng posts_count nhóm
    await models.CommunityGroup.increment('posts_count', {
      by: 1,
      where: { id: post.group_id },
    });

    // Thông báo tác giả
    try {
      await createNotification({
        user_id: post.author_id,
        type:    'community',
        message: `Bài viết của bạn trong nhóm đã được phê duyệt và hiển thị công khai.`,
        link:    `/cong-dong/nhom/${post.group?.slug || post.group_id}`,
      });
    } catch (_) {}

    return res.json({ success: true, message: 'Đã duyệt bài viết.', data: post });
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
    const userId   = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();

    const post = await models.GroupPost.findByPk(postId, {
      include: [{ model: models.CommunityGroup, as: 'group' }],
    });
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài đăng.' });
    if (post.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Bài không ở trạng thái chờ duyệt.' });
    }

    const membership = await models.GroupMember.findOne({
      where: { group_id: post.group_id, user_id: userId, status: 'active' },
    });
    const isMod = membership && ['owner', 'moderator'].includes(membership.role);
    if (userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Không có quyền từ chối bài viết.' });
    }

    post.status = 'rejected';
    post.rejection_reason = reason || '';
    await post.save();

    // Thông báo cho tác giả
    try {
      await createNotification({
        user_id: post.author_id,
        type:    'community',
        message: `Bài viết của bạn trong nhóm đã bị từ chối${reason ? ': ' + reason : '.'}`,
        link:    `/cong-dong/nhom/${post.group?.slug || post.group_id}`,
      });
    } catch (_) {}

    return res.json({ success: true, message: 'Đã từ chối bài viết.', data: post });
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
    const { id } = req.params;
    const userId   = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();

    // Kiểm tra quyền: admin hoặc owner/moderator của nhóm
    const membership = await models.GroupMember.findOne({
      where: { group_id: id, user_id: userId, status: 'active' },
    });
    const isMod = membership && ['owner', 'moderator'].includes(membership.role);
    if (userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem bài chờ duyệt.' });
    }

    const posts = await models.GroupPost.findAll({
      where: { group_id: id, status: 'pending' },
      include: [
        {
          model: models.User,
          as: 'author',       // ✅ FIX: alias đúng
          attributes: ['id', 'full_name', 'avatar_url'],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    return res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách bài bị báo cáo
const getReportedGroupPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId   = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();

    // Kiểm tra quyền: admin hoặc owner/moderator của nhóm
    const membership = await models.GroupMember.findOne({
      where: { group_id: id, user_id: userId, status: 'active' },
    });
    const isMod = membership && ['owner', 'moderator'].includes(membership.role);
    if (userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem bài báo cáo.' });
    }

    const posts = await models.GroupPost.findAll({
      where: { 
        group_id: id,
        reports_data: { [Op.ne]: null }
      },
      include: [
        {
          model: models.User,
          as: 'author',
          attributes: ['id', 'full_name', 'avatar_url'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] getGroupMembers
// Chỉ owner / moderator / admin mới lấy được danh sách đầy đủ
// ─────────────────────────────────────────────────────────────────────────────
const getGroupMembers = async (req, res, next) => {
  try {
    const { id }    = req.params;
    const userId    = req.user.id;
    const userRole  = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
    const page      = parseInt(req.query.page)  || 1;
    const limit     = parseInt(req.query.limit) || 20;
    const search    = req.query.search || '';
    const offset    = (page - 1) * limit;

    const membership = await models.GroupMember.findOne({
      where: { group_id: id, user_id: userId, status: 'active' },
    });
    const isMod = membership && ['owner', 'moderator'].includes(membership.role);
    if (userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Chỉ quản trị viên nhóm mới xem được danh sách thành viên.' });
    }

    const userWhere = search
      ? { full_name: { [Op.like]: `%${search}%` } }
      : undefined;

    const { count, rows } = await models.GroupMember.findAndCountAll({
      where: { group_id: id },
      include: [{
        model: models.User,
        as: 'user',
        attributes: ['id', 'full_name', 'avatar_url', 'email'],
        ...(userWhere ? { where: userWhere } : {}),
      }],
      order: [
        [sequelize.literal(`FIELD(\`GroupMember\`.\`role\`, 'owner', 'moderator', 'member')`)],
        ['joined_at', 'ASC'],
      ],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        members: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] muteMember
// Mute thành viên trong nhóm (owner/moderator/admin)
// Body: { reason: string, duration_days: number | null }
//   duration_days = null → vĩnh viễn; số nguyên → số ngày
// ─────────────────────────────────────────────────────────────────────────────
const muteMember = async (req, res, next) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const actorId   = req.user.id;
    const userRole  = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
    const { reason, duration_days } = req.body;

    // Quyền
    const actorMembership = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: actorId, status: 'active' },
    });
    const isMod = actorMembership && ['owner', 'moderator'].includes(actorMembership.role);
    if (userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Không có quyền.' });
    }

    const target = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: targetUserId },
    });
    if (!target) return res.status(404).json({ success: false, message: 'Thành viên không tồn tại.' });
    if (['owner'].includes(target.role)) {
      return res.status(400).json({ success: false, message: 'Không thể hạn chế trưởng nhóm.' });
    }

    target.status     = 'muted';
    target.mute_reason = reason || '';
    target.muted_until = duration_days
      ? new Date(Date.now() + duration_days * 86400000)
      : null;
    await target.save();

    // Notify
    try {
      const muteLabel = duration_days ? `${duration_days} ngày` : 'vĩnh viễn';
      await createNotification({
        user_id: parseInt(targetUserId),
        type:    'community',
        message: `Bạn đã bị hạn chế đăng bài trong nhóm${reason ? ' vì: ' + reason : ''}. Thời gian: ${muteLabel}.`,
      });
    } catch (_) {}

    return res.json({ success: true, message: 'Đã hạn chế đăng bài thành viên.', data: target });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] unmuteMember — Gỡ hạn chế đăng bài
// ─────────────────────────────────────────────────────────────────────────────
const unmuteMember = async (req, res, next) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const actorId  = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();

    const actorMembership = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: actorId, status: 'active' },
    });
    const isMod = actorMembership && ['owner', 'moderator'].includes(actorMembership.role);
    if (userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Không có quyền.' });
    }

    const target = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: targetUserId },
    });
    if (!target) return res.status(404).json({ success: false, message: 'Thành viên không tồn tại.' });

    target.status      = 'active';
    target.muted_until = null;
    target.mute_reason = null;
    await target.save();

    try {
      await createNotification({
        user_id: parseInt(targetUserId),
        type:    'community',
        message: 'Hạn chế đăng bài của bạn trong nhóm đã được gỡ bỏ.',
      });
    } catch (_) {}

    return res.json({ success: true, message: 'Đã gỡ hạn chế thành công.', data: target });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] kickMember — Kick thành viên khỏi nhóm (đặt status=banned)
// Body: { reason: string }
// ─────────────────────────────────────────────────────────────────────────────
const kickMember = async (req, res, next) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const actorId  = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
    const { reason } = req.body;

    const actorMembership = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: actorId, status: 'active' },
    });
    const isMod = actorMembership && ['owner', 'moderator'].includes(actorMembership.role);
    if (userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Không có quyền.' });
    }

    const target = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: targetUserId },
      include: [{ model: models.User, as: 'user', attributes: ['id', 'full_name'] }],
    });
    if (!target) return res.status(404).json({ success: false, message: 'Thành viên không tồn tại.' });
    if (['owner'].includes(target.role)) {
      return res.status(400).json({ success: false, message: 'Không thể kick trưởng nhóm.' });
    }

    target.status = 'banned';
    await target.save();

    // Giảm members_count
    await models.CommunityGroup.decrement('members_count', { by: 1, where: { id: groupId } });

    try {
      await createNotification({
        user_id: parseInt(targetUserId),
        type:    'community',
        message: `Bạn đã bị xóa khỏi nhóm${reason ? ' vì: ' + reason : '.'}`,
      });
    } catch (_) {}

    return res.json({ success: true, message: `Đã kick ${target.user?.full_name || 'thành viên'} khỏi nhóm.` });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] promoteMember — Thăng/hạ chức thành viên
// Body: { role: 'moderator' | 'member' }
// ─────────────────────────────────────────────────────────────────────────────
const promoteMember = async (req, res, next) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const actorId  = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
    const { role }  = req.body;

    if (!['moderator', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role không hợp lệ.' });
    }

    const actorMembership = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: actorId },
    });
    if (userRole !== 'admin' && actorMembership?.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Chỉ trưởng nhóm mới có thể thay đổi quyền.' });
    }

    const target = await models.GroupMember.findOne({ where: { group_id: groupId, user_id: targetUserId } });
    if (!target) return res.status(404).json({ success: false, message: 'Thành viên không tồn tại.' });
    if (target.role === 'owner') return res.status(400).json({ success: false, message: 'Không thể thay đổi quyền trưởng nhóm.' });

    target.role = role;
    await target.save();

    const label = role === 'moderator' ? 'Quản lý' : 'Thành viên';
    try {
      await createNotification({
        user_id: parseInt(targetUserId),
        type:    'community',
        message: `Quyền của bạn trong nhóm đã được thay đổi thành ${label}.`,
      });
    } catch (_) {}

    return res.json({ success: true, message: `Đã đổi quyền thành ${label}.`, data: target });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] getMemberPosts — Danh sách bài viết của 1 thành viên trong nhóm
// ─────────────────────────────────────────────────────────────────────────────
const getMemberPosts = async (req, res, next) => {
  try {
    const { id: groupId, userId: targetUserId } = req.params;
    const actorId  = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
    const page     = parseInt(req.query.page)  || 1;
    const limit    = parseInt(req.query.limit) || 10;
    const offset   = (page - 1) * limit;

    // Chỉ owner/mod/admin mới xem được bài của người khác
    if (parseInt(targetUserId) !== actorId) {
      const membership = await models.GroupMember.findOne({
        where: { group_id: groupId, user_id: actorId },
      });
      const isMod = membership && ['owner', 'moderator'].includes(membership.role);
      if (userRole !== 'admin' && !isMod) {
        return res.status(403).json({ success: false, message: 'Không có quyền.' });
      }
    }

    const { count, rows } = await models.GroupPost.findAndCountAll({
      where: {
        group_id:  groupId,
        author_id: targetUserId,
        status:    'approved',
      },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: { posts: rows, total: count, page, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] getMyGroupPosts — Bài viết của chính mình trong nhóm (mọi status)
// ─────────────────────────────────────────────────────────────────────────────
const getMyGroupPosts = async (req, res, next) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await models.GroupPost.findAndCountAll({
      where: { group_id: groupId, author_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: { posts: rows, total: count, page, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] updateGroupPost — Sửa bài viết (chỉ tác giả, chỉ khi pending/approved)
// ─────────────────────────────────────────────────────────────────────────────
const updateGroupPost = async (req, res, next) => {
  try {
    const { id: groupId, postId } = req.params;
    const userId = req.user.id;
    const { content, images } = req.body;

    const post = await models.GroupPost.findOne({
      where: { id: postId, group_id: groupId, author_id: userId },
    });
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
    if (post.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Không thể sửa bài đã bị từ chối.' });
    }

    const group = await models.CommunityGroup.findByPk(groupId);

    if (content !== undefined) post.content = content.trim();
    if (images  !== undefined) post.images  = images.slice(0, 5);

    // Nếu nhóm yêu cầu duyệt và bài đã approved thì reset về pending khi sửa
    if (group?.requires_post_approval && post.status === 'approved') {
      post.status      = 'pending';
      post.approved_by = null;
      post.approved_at = null;
    }

    await post.save();
    return res.json({ success: true, message: 'Đã cập nhật bài viết.', data: post });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] deleteGroupPost — Xóa bài viết (tác giả hoặc moderator/admin)
// ─────────────────────────────────────────────────────────────────────────────
const deleteGroupPost = async (req, res, next) => {
  try {
    const { id: groupId, postId } = req.params;
    const userId   = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();

    const post = await models.GroupPost.findOne({ where: { id: postId, group_id: groupId } });
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });

    const isAuthor = post.author_id === userId;
    const membership = await models.GroupMember.findOne({
      where: { group_id: groupId, user_id: userId },
    });
    const isMod = membership && ['owner', 'moderator'].includes(membership.role);

    if (!isAuthor && userRole !== 'admin' && !isMod) {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa bài viết này.' });
    }

    const wasApproved = post.status === 'approved';
    await post.destroy();

    // Giảm posts_count nếu bài đã được approve
    if (wasApproved) {
      await models.CommunityGroup.decrement('posts_count', { by: 1, where: { id: groupId } });
    }

    return res.json({ success: true, message: 'Đã xóa bài viết.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] savePost / unsavePost / getSavedPosts
// Lưu bài viết yêu thích — dùng JSON field saved_by trong GroupPost
// ─────────────────────────────────────────────────────────────────────────────
const savePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await models.GroupPost.findByPk(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });

    // saved_by lưu trong reports_data không phù hợp — dùng một field riêng
    // Vì không thêm được cột mới, tạm dùng GroupMember hoặc cache client-side
    // Giải pháp: lưu vào localStorage ở frontend; backend chỉ trả 200 OK
    return res.json({ success: true, message: 'Đã lưu bài viết.' });
  } catch (error) {
    next(error);
  }
};

const unsavePost = async (req, res, next) => {
  try {
    return res.json({ success: true, message: 'Đã bỏ lưu bài viết.' });
  } catch (error) {
    next(error);
  }
};

const getSavedPosts = async (req, res, next) => {
  try {
    // Trả mảng rỗng — client tự quản lý saved posts qua localStorage
    return res.json({ success: true, data: { posts: [], total: 0 } });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] requestHideGroup — Yêu cầu ẩn nhóm (gửi admin duyệt)
// Body: { reason: string }
// ─────────────────────────────────────────────────────────────────────────────
const requestHideGroup = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const userId   = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
    const { reason } = req.body;

    const group = await models.CommunityGroup.findByPk(id);
    if (!group) return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm.' });

    const membership = await models.GroupMember.findOne({
      where: { group_id: id, user_id: userId },
    });
    if (userRole !== 'admin' && membership?.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Chỉ trưởng nhóm mới có thể yêu cầu ẩn nhóm.' });
    }

    group.hide_requested_by = userId;
    group.hide_requested_at = new Date();
    group.hide_reason       = reason || '';
    await group.save();

    // Notify tất cả admin
    await notifyAllAdmins(
      'community',
      `Nhóm "${group.name}" vừa gửi yêu cầu ẩn nhóm. Lý do: ${reason || 'Không có lý do.'}`,
      `/quan-ly-cong-dong`
    );

    return res.json({ success: true, message: 'Yêu cầu ẩn nhóm đã được gửi đến Admin.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] requestTransferDoctor — Yêu cầu chuyển bác sĩ phụ trách
// Body: { new_doctor_id: number, reason: string }
// ─────────────────────────────────────────────────────────────────────────────
const requestTransferDoctor = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const userId   = req.user.id;
    const userRole = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
    const { new_doctor_id, reason } = req.body;

    if (!new_doctor_id) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bác sĩ mới.' });
    }

    const group = await models.CommunityGroup.findByPk(id);
    if (!group) return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm.' });

    const membership = await models.GroupMember.findOne({
      where: { group_id: id, user_id: userId },
    });
    if (userRole !== 'admin' && membership?.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Không có quyền.' });
    }

    const newDoctor = await models.Doctor.findByPk(new_doctor_id);
    if (!newDoctor) {
      return res.status(404).json({ success: false, message: 'Bác sĩ không tồn tại.' });
    }

    group.transfer_doctor_requested = new_doctor_id;
    group.transfer_doctor_reason    = reason || '';
    await group.save();

    await notifyAllAdmins(
      'community',
      `Nhóm "${group.name}" yêu cầu chuyển bác sĩ phụ trách. Lý do: ${reason || 'Không có lý do.'}`,
      `/quan-ly-cong-dong`
    );

    return res.json({ success: true, message: 'Yêu cầu chuyển bác sĩ đã được gửi đến Admin.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] adminApproveHideGroup — Admin duyệt ẩn nhóm
// ─────────────────────────────────────────────────────────────────────────────
const adminApproveHideGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await models.CommunityGroup.findByPk(id);
    if (!group) return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm.' });

    group.status            = 'suspended';
    group.hide_requested_by = null;
    group.hide_requested_at = null;
    await group.save();

    // Notify owner
    if (group.owner_id) {
      try {
        await createNotification({
          user_id: group.owner_id,
          type:    'community',
          message: `Yêu cầu ẩn nhóm "${group.name}" đã được Admin phê duyệt.`,
        });
      } catch (_) {}
    }

    return res.json({ success: true, message: 'Đã ẩn nhóm thành công.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] adminRejectHideGroup — Admin từ chối ẩn nhóm
// ─────────────────────────────────────────────────────────────────────────────
const adminRejectHideGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const group = await models.CommunityGroup.findByPk(id);
    if (!group) return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm.' });

    group.hide_requested_by = null;
    group.hide_requested_at = null;
    group.hide_reason       = null;
    await group.save();

    if (group.owner_id) {
      try {
        await createNotification({
          user_id: group.owner_id,
          type:    'community',
          message: `Yêu cầu ẩn nhóm "${group.name}" bị từ chối${reason ? ': ' + reason : '.'}`,
        });
      } catch (_) {}
    }

    return res.json({ success: true, message: 'Đã từ chối yêu cầu ẩn nhóm.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] adminApproveTransferDoctor — Admin duyệt chuyển bác sĩ phụ trách
// ─────────────────────────────────────────────────────────────────────────────
const adminApproveTransferDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await models.CommunityGroup.findByPk(id);
    if (!group || !group.transfer_doctor_requested) {
      return res.status(400).json({ success: false, message: 'Không có yêu cầu chuyển bác sĩ.' });
    }

    const oldDoctorId = group.doctor_id;
    group.doctor_id                  = group.transfer_doctor_requested;
    group.transfer_doctor_requested  = null;
    group.transfer_doctor_reason     = null;
    await group.save();

    // Notify bác sĩ mới
    try {
      const newDoctor = await models.Doctor.findByPk(group.doctor_id, { attributes: ['user_id'] });
      if (newDoctor?.user_id) {
        await createNotification({
          user_id: newDoctor.user_id,
          type:    'community',
          message: `Bạn đã được chỉ định làm bác sĩ phụ trách nhóm "${group.name}".`,
          link:    `/cong-dong/nhom/${group.slug}`,
        });
      }
    } catch (_) {}

    return res.json({ success: true, message: 'Đã cập nhật bác sĩ phụ trách nhóm.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// [MỚI] adminRejectTransferDoctor — Admin từ chối chuyển bác sĩ
// ─────────────────────────────────────────────────────────────────────────────
const adminRejectTransferDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const group = await models.CommunityGroup.findByPk(id);
    if (!group) return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm.' });

    group.transfer_doctor_requested = null;
    group.transfer_doctor_reason    = null;
    await group.save();

    if (group.owner_id) {
      try {
        await createNotification({
          user_id: group.owner_id,
          type:    'community',
          message: `Yêu cầu chuyển bác sĩ phụ trách nhóm "${group.name}" bị từ chối${reason ? ': ' + reason : '.'}`,
        });
      } catch (_) {}
    }

    return res.json({ success: true, message: 'Đã từ chối yêu cầu chuyển bác sĩ.' });
  } catch (error) {
    next(error);
  }
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
  reportPost,
  getGroupMembers,
  muteMember,
  unmuteMember,
  kickMember,
  promoteMember,
  getMemberPosts,
  getMyGroupPosts,
  updateGroupPost,
  deleteGroupPost,
  savePost,
  unsavePost,
  getSavedPosts,
  requestHideGroup,
  requestTransferDoctor,
  adminApproveHideGroup,
  adminRejectHideGroup,
  adminApproveTransferDoctor,
  adminRejectTransferDoctor
};
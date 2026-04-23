// server/routes/communityRoutes.js
const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { authenticateToken, authenticateTokenBasic } = require('../middleware/authMiddleware');

// Middleware tự định nghĩa để cho phép Admin, Staff, Doctor tạo và quản lý nhóm
const allowDoctorStaffAdmin = (req, res, next) => {
  const role = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
  if (['admin', 'staff', 'doctor'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Quyền hạn không hợp lệ. Yêu cầu Admin/Staff/Doctor.' });
};

// ═══════════════════════════════════════
// PUBLIC ROUTES — Không cần đăng nhập
// ═══════════════════════════════════════

// Danh sách nhóm (chỉ active, có phân trang + tìm kiếm)
router.get('/groups', communityController.getGroups);

// Chi tiết 1 nhóm theo slug (authenticateTokenBasic để check xem user có đang đăng nhập không)
router.get('/groups/:slug', authenticateTokenBasic, communityController.getGroupBySlug);

// Bài đăng trong nhóm (chỉ lấy bài đã approved)
router.get('/groups/:id/posts', communityController.getGroupPosts);


// ═══════════════════════════════════════
// AUTHENTICATED ROUTES — Bắt buộc đăng nhập
// ═══════════════════════════════════════

// Tạo nhóm mới (Chỉ Admin, Staff, Doctor)
router.post(
  '/groups',
  authenticateToken,
  allowDoctorStaffAdmin,
  communityController.createGroup
);

// Sửa thông tin nhóm (owner hoặc admin)
router.put('/groups/:id', authenticateToken, communityController.updateGroup);

// Xóa nhóm (owner hoặc admin)
router.delete('/groups/:id', authenticateToken, communityController.deleteGroup);

// Tham gia nhóm
router.post('/groups/:id/join', authenticateToken, communityController.joinGroup);

// Rời nhóm
router.delete('/groups/:id/leave', authenticateToken, communityController.leaveGroup);

// Mời thành viên vào nhóm (chỉ để thêm vào nhóm — KHÔNG nhắn tin được)
router.post('/groups/:id/invite', authenticateToken, communityController.inviteMember);

// Đăng bài trong nhóm
router.post('/groups/:id/posts', authenticateToken, communityController.createGroupPost);

// Duyệt bài đăng (owner/moderator/doctor của nhóm)
router.put('/posts/:postId/approve', authenticateToken, communityController.approveGroupPost);
router.put('/posts/:postId/reject', authenticateToken, communityController.rejectGroupPost);

router.get('/groups/:id/posts/pending', authenticateToken, communityController.getPendingGroupPosts);
router.get('/groups/:id/posts/reported', authenticateToken, communityController.getReportedGroupPosts);

// Tương tác bài đăng (Fanpage)
router.post('/posts/:postId/like', authenticateToken, communityController.toggleLikePost);
router.post('/posts/:postId/comment', authenticateToken, communityController.commentOnPost);
router.post('/posts/:postId/report', authenticateToken, communityController.reportPost);


// ═══════════════════════════════════════
// ADMIN ROUTES — Quản lý hệ thống (Chỉ Admin, Staff, Doctor)
// ═══════════════════════════════════════

// Xem tất cả nhóm (kể cả pending, suspended)
router.get(
  '/admin/groups',
  authenticateToken,
  allowDoctorStaffAdmin,
  communityController.adminGetAllGroups
);

// Admin duyệt cho phép nhóm hoạt động
router.put(
  '/admin/groups/:id/approve',
  authenticateToken,
  allowDoctorStaffAdmin,
  communityController.adminApproveGroup
);

// Admin từ chối/khóa nhóm
router.put(
  '/admin/groups/:id/reject',
  authenticateToken,
  allowDoctorStaffAdmin,
  communityController.adminRejectGroup
);

module.exports = router;
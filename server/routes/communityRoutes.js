// server/routes/communityRoutes.js
const express = require('express');
const router  = express.Router();
const communityController = require('../controllers/communityController');
const { authenticateToken, authenticateTokenBasic } = require('../middleware/authMiddleware');

// ── Middleware phân quyền ────────────────────────────────────────────────────
const allowDoctorStaffAdmin = (req, res, next) => {
  const role = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
  if (['admin', 'staff', 'doctor'].includes(role)) return next();
  return res.status(403).json({
    success: false,
    message: 'Yêu cầu quyền Admin / Staff / Doctor.',
  });
};

const allowAdminOnly = (req, res, next) => {
  const role = req.user?.role?.name?.toLowerCase() || req.user?.role?.toLowerCase();
  if (role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền này.' });
};

// ════════════════════════════════════════════════════════════════════
// PUBLIC — Không cần đăng nhập
// ════════════════════════════════════════════════════════════════════

// Danh sách nhóm active (phân trang + tìm kiếm)
router.get('/groups', communityController.getGroups);

// Chi tiết nhóm theo slug
// authenticateTokenBasic: nếu có token thì set req.user, không có thì next() luôn
router.get('/groups/:slug', authenticateTokenBasic, communityController.getGroupBySlug);

// Bài đăng đã approved trong nhóm
router.get('/groups/:id/posts', authenticateTokenBasic, communityController.getGroupPosts);

// ════════════════════════════════════════════════════════════════════
// AUTHENTICATED — Bắt buộc đăng nhập
// ════════════════════════════════════════════════════════════════════

// ── Nhóm ────────────────────────────────────────────────────────────
router.post('/groups', authenticateToken, allowDoctorStaffAdmin, communityController.createGroup);
router.put ('/groups/:id', authenticateToken, communityController.updateGroup);
router.delete('/groups/:id', authenticateToken, communityController.deleteGroup);

// ── Tham gia / Rời nhóm ─────────────────────────────────────────────
router.post  ('/groups/:id/join',  authenticateToken, communityController.joinGroup);
router.delete('/groups/:id/leave', authenticateToken, communityController.leaveGroup);

// ── Mời thành viên ──────────────────────────────────────────────────
router.post('/groups/:id/invite', authenticateToken, communityController.inviteMember);

// ── Quản lý thành viên (owner / moderator / admin) ──────────────────
router.get ('/groups/:id/members',                       authenticateToken, communityController.getGroupMembers);
router.put ('/groups/:id/members/:userId/mute',          authenticateToken, communityController.muteMember);
router.put ('/groups/:id/members/:userId/unmute',        authenticateToken, communityController.unmuteMember);
router.put ('/groups/:id/members/:userId/kick',          authenticateToken, communityController.kickMember);
router.put ('/groups/:id/members/:userId/promote',       authenticateToken, communityController.promoteMember);
router.get ('/groups/:id/members/:userId/posts',         authenticateToken, communityController.getMemberPosts);

// ── Bài đăng ────────────────────────────────────────────────────────
router.post('/groups/:id/posts',         authenticateToken, communityController.createGroupPost);
router.put ('/groups/:id/posts/:postId', authenticateToken, communityController.updateGroupPost);
router.delete('/groups/:id/posts/:postId', authenticateToken, communityController.deleteGroupPost);

// Duyệt / Từ chối bài đăng
router.put('/posts/:postId/approve', authenticateToken, communityController.approveGroupPost);
router.put('/posts/:postId/reject',  authenticateToken, communityController.rejectGroupPost);

// Bài đăng chờ duyệt & bị báo cáo (dành cho moderator/admin)
router.get('/groups/:id/posts/pending',  authenticateToken, communityController.getPendingGroupPosts);
router.get('/groups/:id/posts/reported', authenticateToken, communityController.getReportedGroupPosts);

// Bài viết của tôi trong nhóm (bao gồm pending, approved, rejected)
router.get('/groups/:id/my-posts', authenticateToken, communityController.getMyGroupPosts);

// ── Tương tác bài đăng ──────────────────────────────────────────────
router.post('/posts/:postId/like',    authenticateToken, communityController.toggleLikePost);
router.post('/posts/:postId/comment', authenticateToken, communityController.commentOnPost);
router.post('/posts/:postId/report',  authenticateToken, communityController.reportPost);

// ── Lưu bài viết yêu thích ──────────────────────────────────────────
router.post  ('/posts/:postId/save',   authenticateToken, communityController.savePost);
router.delete('/posts/:postId/save',   authenticateToken, communityController.unsavePost);
router.get   ('/groups/:id/saved',     authenticateToken, communityController.getSavedPosts);

// ── Yêu cầu ẩn nhóm (gửi admin duyệt) ──────────────────────────────
router.post('/groups/:id/request-hide',            authenticateToken, communityController.requestHideGroup);
router.post('/groups/:id/request-transfer-doctor', authenticateToken, communityController.requestTransferDoctor);

// ════════════════════════════════════════════════════════════════════
// ADMIN — Quản lý hệ thống
// ════════════════════════════════════════════════════════════════════

// Xem tất cả nhóm (kể cả pending, suspended, hidden)
router.get('/admin/groups', authenticateToken, allowDoctorStaffAdmin, communityController.adminGetAllGroups);

// Duyệt / Từ chối nhóm mới
router.put('/admin/groups/:id/approve', authenticateToken, allowDoctorStaffAdmin, communityController.adminApproveGroup);
router.put('/admin/groups/:id/reject',  authenticateToken, allowDoctorStaffAdmin, communityController.adminRejectGroup);

// Phê duyệt / Từ chối yêu cầu ẩn nhóm
router.put('/admin/groups/:id/approve-hide',  authenticateToken, allowAdminOnly, communityController.adminApproveHideGroup);
router.put('/admin/groups/:id/reject-hide',   authenticateToken, allowAdminOnly, communityController.adminRejectHideGroup);

// Phê duyệt / Từ chối yêu cầu chuyển bác sĩ phụ trách
router.put('/admin/groups/:id/approve-transfer', authenticateToken, allowAdminOnly, communityController.adminApproveTransferDoctor);
router.put('/admin/groups/:id/reject-transfer',  authenticateToken, allowAdminOnly, communityController.adminRejectTransferDoctor);

module.exports = router;
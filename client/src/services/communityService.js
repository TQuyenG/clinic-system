// client/src/services/communityService.js
import api from './api';

const communityService = {

  // ── PUBLIC ──────────────────────────────────
  getGroups: (params = {}) =>
    api.get('/community/groups', { params }),

  getGroupBySlug: (slug) =>
    api.get(`/community/groups/${slug}`),

  getGroupPosts: (groupId, params = {}) =>
    api.get(`/community/groups/${groupId}/posts`, { params }),

  // ── AUTHENTICATED ────────────────────────────
  // Tạo nhóm — chỉ Doctor/Staff/Admin gọi được
  createGroup: (data) =>
    api.post('/community/groups', data),

  updateGroup: (id, data) =>
    api.put(`/community/groups/${id}`, data),

  deleteGroup: (id) =>
    api.delete(`/community/groups/${id}`),

  joinGroup: (id, message = '') =>
    api.post(`/community/groups/${id}/join`, { message }),

  leaveGroup: (id) =>
    api.delete(`/community/groups/${id}/leave`),

  // Mời thành viên — chỉ để thêm vào nhóm, KHÔNG nhắn tin
  inviteMember: (groupId, userId) =>
    api.post(`/community/groups/${groupId}/invite`, { user_id: userId }),

  createPost: (groupId, data) =>
    api.post(`/community/groups/${groupId}/posts`, data),

  // Duyệt bài (owner/moderator/doctor của nhóm)
  approvePost: (postId) =>
    api.put(`/community/posts/${postId}/approve`),

  // BỔ SUNG: Từ chối bài viết
  rejectPost: (postId, reason = '') =>
    api.put(`/community/posts/${postId}/reject`, { reason }),

  getPendingGroupPosts: (groupId) =>
    api.get(`/community/groups/${groupId}/posts/pending`),

  getReportedGroupPosts: (groupId) =>
    api.get(`/community/groups/${groupId}/posts/reported`),

  // ── TƯƠNG TÁC BÀI ĐĂNG (FANPAGE) ─────────────
  toggleLikePost: (postId) => api.post(`/community/posts/${postId}/like`),
  commentOnPost: (postId, content) => api.post(`/community/posts/${postId}/comment`, { content }),
  reportPost: (postId, reason) => api.post(`/community/posts/${postId}/report`, { reason }),

  // ── ADMIN ────────────────────────────────────

  // ── ADMIN ────────────────────────────────────
  adminGetAllGroups: (params = {}) =>
    api.get('/community/admin/groups', { params }),

  adminApproveGroup: (id) =>
    api.put(`/community/admin/groups/${id}/approve`),

  adminRejectGroup: (id, reason) =>
    api.put(`/community/admin/groups/${id}/reject`, { reason }),
};

export default communityService;
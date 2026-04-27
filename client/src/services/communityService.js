// client/src/services/communityService.js
import api from './api';

const communityService = {

  // ════════════════════════════════════════════════════════
  // PUBLIC
  // ════════════════════════════════════════════════════════

  getGroups: (params = {}) =>
    api.get('/community/groups', { params }),

  getGroupBySlug: (slug) =>
    api.get(`/community/groups/${slug}`),

  getGroupPosts: (groupId, params = {}) =>
    api.get(`/community/groups/${groupId}/posts`, { params }),

  // ════════════════════════════════════════════════════════
  // NHÓM
  // ════════════════════════════════════════════════════════

  createGroup: (data) =>
    api.post('/community/groups', data),

  updateGroup: (id, data) =>
    api.put(`/community/groups/${id}`, data),

  deleteGroup: (id) =>
    api.delete(`/community/groups/${id}`),

  // ════════════════════════════════════════════════════════
  // THAM GIA / RỜI NHÓM
  // ════════════════════════════════════════════════════════

  joinGroup: (id, message = '') =>
    api.post(`/community/groups/${id}/join`, { message }),

  leaveGroup: (id) =>
    api.delete(`/community/groups/${id}/leave`),

  inviteMember: (groupId, userId) =>
    api.post(`/community/groups/${groupId}/invite`, { user_id: userId }),

  // ════════════════════════════════════════════════════════
  // QUẢN LÝ THÀNH VIÊN
  // ════════════════════════════════════════════════════════

  /** Danh sách thành viên (chỉ owner/mod/admin mới lấy được đầy đủ) */
  getGroupMembers: (groupId, params = {}) =>
    api.get(`/community/groups/${groupId}/members`, { params }),

  /**
   * Mute thành viên
   * @param {object} data - { reason, duration_days }
   *   duration_days: null = vĩnh viễn, số nguyên = số ngày
   */
  muteMember: (groupId, userId, data) =>
    api.put(`/community/groups/${groupId}/members/${userId}/mute`, data),

  unmuteMember: (groupId, userId) =>
    api.put(`/community/groups/${groupId}/members/${userId}/unmute`),

  /**
   * Kick (ban) thành viên khỏi nhóm
   * @param {object} data - { reason }
   */
  kickMember: (groupId, userId, data) =>
    api.put(`/community/groups/${groupId}/members/${userId}/kick`, data),

  /**
   * Thăng / hạ chức thành viên
   * @param {object} data - { role: 'moderator' | 'member' }
   */
  promoteMember: (groupId, userId, data) =>
    api.put(`/community/groups/${groupId}/members/${userId}/promote`, data),

  /** Danh sách bài viết của 1 thành viên cụ thể trong nhóm */
  getMemberPosts: (groupId, userId, params = {}) =>
    api.get(`/community/groups/${groupId}/members/${userId}/posts`, { params }),

  // ════════════════════════════════════════════════════════
  // BÀI ĐĂNG
  // ════════════════════════════════════════════════════════

  createPost: (groupId, data) =>
    api.post(`/community/groups/${groupId}/posts`, data),

  updatePost: (groupId, postId, data) =>
    api.put(`/community/groups/${groupId}/posts/${postId}`, data),

  deletePost: (groupId, postId) =>
    api.delete(`/community/groups/${groupId}/posts/${postId}`),

  approvePost: (postId) =>
    api.put(`/community/posts/${postId}/approve`),

  rejectPost: (postId, reason = '') =>
    api.put(`/community/posts/${postId}/reject`, { reason }),

  getPendingGroupPosts: (groupId) =>
    api.get(`/community/groups/${groupId}/posts/pending`),

  getReportedGroupPosts: (groupId) =>
    api.get(`/community/groups/${groupId}/posts/reported`),

  /** Bài viết của chính mình (bao gồm pending/approved/rejected) */
  getMyGroupPosts: (groupId, params = {}) =>
    api.get(`/community/groups/${groupId}/my-posts`, { params }),

  // ════════════════════════════════════════════════════════
  // TƯƠNG TÁC BÀI ĐĂNG
  // ════════════════════════════════════════════════════════

  toggleLikePost: (postId) =>
    api.post(`/community/posts/${postId}/like`),

  commentOnPost: (postId, content) =>
    api.post(`/community/posts/${postId}/comment`, { content }),

  reportPost: (postId, reason) =>
    api.post(`/community/posts/${postId}/report`, { reason }),

  // ════════════════════════════════════════════════════════
  // LƯU BÀI VIẾT YÊU THÍCH
  // ════════════════════════════════════════════════════════

  savePost: (postId) =>
    api.post(`/community/posts/${postId}/save`),

  unsavePost: (postId) =>
    api.delete(`/community/posts/${postId}/save`),

  getSavedPosts: (groupId, params = {}) =>
    api.get(`/community/groups/${groupId}/saved`, { params }),

  // ════════════════════════════════════════════════════════
  // YÊU CẦU ẨN NHÓM / CHUYỂN BÁC SĨ (gửi admin duyệt)
  // ════════════════════════════════════════════════════════

  requestHideGroup: (groupId, reason) =>
    api.post(`/community/groups/${groupId}/request-hide`, { reason }),

  requestTransferDoctor: (groupId, newDoctorId, reason = '') =>
    api.post(`/community/groups/${groupId}/request-transfer-doctor`, {
      new_doctor_id: newDoctorId,
      reason,
    }),

  // ════════════════════════════════════════════════════════
  // ADMIN
  // ════════════════════════════════════════════════════════

  adminGetAllGroups: (params = {}) =>
    api.get('/community/admin/groups', { params }),

  adminApproveGroup: (id) =>
    api.put(`/community/admin/groups/${id}/approve`),

  adminRejectGroup: (id, reason) =>
    api.put(`/community/admin/groups/${id}/reject`, { reason }),

  // Duyệt / từ chối yêu cầu ẩn nhóm
  adminApproveHideGroup: (id) =>
    api.put(`/community/admin/groups/${id}/approve-hide`),

  adminRejectHideGroup: (id, reason) =>
    api.put(`/community/admin/groups/${id}/reject-hide`, { reason }),

  // Duyệt / từ chối yêu cầu chuyển bác sĩ
  adminApproveTransferDoctor: (id) =>
    api.put(`/community/admin/groups/${id}/approve-transfer`),

  adminRejectTransferDoctor: (id, reason) =>
    api.put(`/community/admin/groups/${id}/reject-transfer`, { reason }),
};

export default communityService;
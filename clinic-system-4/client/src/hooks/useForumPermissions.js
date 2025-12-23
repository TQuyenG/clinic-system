// client/src/hooks/useForumPermissions.js
// Custom hook để check quyền hạn forum
// ✅ PHÂN CHIA RÕ: Quyền quản lý TOPIC vs Quyền kiểm duyệt CÂU HỎI

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook để kiểm tra quyền hạn forum
 * @returns {Object} - Object chứa các quyền
 */
export const useForumPermissions = () => {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) {
      return {
        canCreateTopic: false,
        canEditTopic: false,
        canToggleTopic: false,
        canDeleteTopic: false,
        canModerateQuestions: false,
        hasAnyPermission: false,
        forumPermissions: []
      };
    }

    // Admin có tất cả quyền
    if (user.role === 'admin') {
      return {
        canCreateTopic: true,
        canEditTopic: true,
        canToggleTopic: true,
        canDeleteTopic: true,
        canModerateQuestions: true,
        hasAnyPermission: true,
        forumPermissions: ['create_topic', 'edit_topic', 'toggle_topic', 'delete_topic', 'moderate_questions']
      };
    }

    // Manager (rank=manager) của CSKH hoặc Content có full quyền forum
    if (user.role === 'staff') {
      const staff = user.staff || user.role_info;
      const rank = staff?.rank;
      const department = staff?.department;
      
      if (rank === 'manager' && (department === 'support' || department === 'content')) {
        return {
          canCreateTopic: true,
          canEditTopic: true,
          canToggleTopic: true,
          canDeleteTopic: true,
          canModerateQuestions: true,
          hasAnyPermission: true,
          forumPermissions: ['create_topic', 'edit_topic', 'toggle_topic', 'delete_topic', 'moderate_questions']
        };
      }
    }

    // Staff phải check permissions từ user.role_info.permissions
    if (user.role === 'staff' && user.role_info?.permissions) {
      const forumPerms = user.role_info.permissions.forum;
      
      if (!forumPerms) {
        return {
          canCreateTopic: false,
          canEditTopic: false,
          canToggleTopic: false,
          canDeleteTopic: false,
          canModerateQuestions: false,
          hasAnyPermission: false,
          forumPermissions: []
        };
      }

      const permsArray = Array.isArray(forumPerms) ? forumPerms : [];

      return {
        canCreateTopic: permsArray.includes('create_topic'),
        canEditTopic: permsArray.includes('edit_topic'),
        canToggleTopic: permsArray.includes('toggle_topic'),
        canDeleteTopic: permsArray.includes('delete_topic'),
        canModerateQuestions: permsArray.includes('moderate_questions'),
        hasAnyPermission: permsArray.length > 0,
        forumPermissions: permsArray
      };
    }

    // Default: Không có quyền
    return {
      canCreateTopic: false,
      canEditTopic: false,
      canToggleTopic: false,
      canDeleteTopic: false,
      canModerateQuestions: false,
      hasAnyPermission: false,
      forumPermissions: []
    };
  }, [user]);

  return permissions;
};

export default useForumPermissions;

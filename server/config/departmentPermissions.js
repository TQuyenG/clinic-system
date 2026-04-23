// server/config/departmentPermissions.js

/**
 * Định nghĩa các quyền chi tiết cho từng phòng ban
 * Mỗi phòng ban có 2 loại quyền:
 * - staff_permissions: Quyền cho nhân viên thường
 * - manager_permissions: Quyền cho trưởng phòng (manager)
 */

const DEPARTMENT_PERMISSIONS = {
  // ========================================
  // PHÒNG VẬN HÀNH LÂM SÀNG (CLINICAL)
  // ========================================
  clinical: {
    staff_permissions: {
      forum: ['view_questions', 'create_question', 'delete_question', 'hide_question', 'comment_question', 'save_question', 'interact_question', 'report_question', 'search_question'],
      appointments: ['view', 'cancel', 'reject', 'approve', 'verify_payment', 'update_status', 'resend_code', 'view_reviews'],
      consultations: ['view', 'notify_time', 'monitor'],
      medical_records: ['view', 'edit'],
      articles: ['view', 'save', 'share', 'report', 'view_related'],
      medicines: ['view'],
      diseases: ['view'],
      work_shift: ['view_personal', 'view_doctors', 'register_shift', 'register_overtime', 'register_leave'],
      patients: ['view']
    },
    manager_permissions: {
      forum: ['view_questions', 'create_question', 'delete_question', 'hide_question', 'comment_question', 'save_question', 'interact_question', 'report_question', 'search_question', 'moderate_questions'],
      appointments: ['view', 'create', 'edit', 'cancel', 'reject', 'approve', 'verify_payment', 'update_status', 'resend_code', 'view_reviews', 'assign_doctor'],
      consultations: ['view', 'create', 'edit', 'cancel', 'approve', 'assign', 'close', 'notify_time', 'monitor'],
      medical_records: ['view', 'create', 'edit', 'edit_vitals'],
      articles: ['view', 'save', 'share', 'report', 'view_related'],
      medicines: ['view', 'create', 'edit'],
      diseases: ['view', 'create', 'edit'],
      work_shift: ['approve_shift', 'approve_leave', 'approve_overtime', 'register_shift', 'register_leave', 'register_overtime', 'view_personal', 'view_doctors'],
      doctors: ['view', 'edit', 'assign', 'manage_schedule'],
      patients: ['view', 'edit'],
      staff_management: ['view', 'assign_permissions']
    }
  },

  // ========================================
  // PHÒNG HỆ THỐNG & IT (SYSTEM)
  // ========================================
  system: {
    name: 'Hệ thống & IT',
    description: 'Quản lý hệ thống, cấu hình và giám sát sự cố',
    staff_permissions: {
      system_settings: ['view', 'view_audit_logs'],
      consultation_realtime: ['monitor'], 
      video_call: ['monitor'],
      staff_management: ['view', 'view_history']
    },
    manager_permissions: {
      system_settings: ['view', 'view_audit_logs', 'edit_home', 'edit_about', 'edit_facilities', 'edit_equipment', 'edit_header_footer', 'edit_contact', 'edit_privacy', 'edit_terms'],
      consultation_realtime: ['monitor', 'resolve_errors'], 
      video_call: ['monitor', 'resolve_errors'], 
      staff_management: ['view', 'assign_department', 'assign_permissions', 'view_history']
    }
  },

  // ========================================
  // PHÒNG CHĂM SÓC KHÁCH HÀNG (SUPPORT)
  // ========================================
  support: {
    name: 'Chăm sóc khách hàng',
    description: 'Hỗ trợ khách hàng, giải đáp thắc mắc',
    staff_permissions: {
      forum: ['create_topic', 'edit_topic', 'hide_topic', 'delete_topic', 'approve_question', 'hide_question', 'delete_question'],
      community: ['assign_staff'],
      contact: ['reply_message']
    },
    manager_permissions: {
      forum: ['create_topic', 'edit_topic', 'hide_topic', 'delete_topic', 'approve_question', 'hide_question', 'delete_question'],
      community: ['assign_staff'],
      contact: ['reply_message']
    }
  },

  // ========================================
  // PHÒNG TÀI CHÍNH KẾ TOÁN (FINANCE)
  // ========================================
 finance: {
    name: 'Tài chính kế toán',
    description: 'Quản lý thanh toán, doanh thu, báo cáo tài chính',
    staff_permissions: {
      payments: ['view', 'verify'] // Đối soát giao dịch
    },
    manager_permissions: {
      payments: ['view', 'verify', 'approve', 'refund', 'config_refund'], // Xóa config_account
      statistics: ['view', 'revenue', 'export'],
      refund_requests: ['view', 'approve', 'reject'] // Xử lý danh sách hoàn tiền
    }
  },

  // ========================================
  // PHÒNG NỘI DUNG & TRUYỀN THÔNG (CONTENT)
  // ========================================
  content: {
    name: 'Nội dung & Truyền thông',
    description: 'Quản lý bài viết, thuốc, bệnh lý, sự kiện và voucher',
    staff_permissions: {
      articles: ['view', 'save', 'share', 'report', 'view_related', 'create', 'edit', 'duplicate'],
      medicines: ['view', 'propose_create', 'propose_edit'],
      diseases: ['view', 'propose_create', 'propose_edit'],
      events_vouchers: ['create_event', 'export_report', 'create_voucher', 'edit_voucher', 'delete_voucher', 'create_game', 'config_reward_system']
    },
    manager_permissions: {
      articles: ['view', 'save', 'share', 'report', 'view_related', 'create', 'edit', 'duplicate', 'delete', 'publish', 'approve', 'reject'],
      medicines: ['view', 'propose_create', 'propose_edit', 'create', 'edit'],
      diseases: ['view', 'propose_create', 'propose_edit', 'create', 'edit'],
      events_vouchers: ['create_event', 'export_report', 'create_voucher', 'edit_voucher', 'delete_voucher', 'create_game', 'config_reward_system'],
      categories: ['view', 'create', 'edit', 'assign'],
      media: ['view', 'upload', 'delete', 'manage'],
      seo: ['view', 'edit'],
      homepage_content: ['view', 'edit'],
      staff_management: ['view', 'assign_permissions', 'assign_categories']
    }
  }
};

/**
 * Lấy tất cả quyền có thể của một module
 */
const getAllModuleActions = (module) => {
  const allActions = new Set();
  
  Object.values(DEPARTMENT_PERMISSIONS).forEach(dept => {
    const staffPerms = dept.staff_permissions[module] || [];
    const managerPerms = dept.manager_permissions[module] || [];
    
    [...staffPerms, ...managerPerms].forEach(action => allActions.add(action));
  });
  
  return Array.from(allActions);
};

/**
 * Lấy danh sách tất cả modules
 */
const getAllModules = () => {
  const modules = new Set();
  
  Object.values(DEPARTMENT_PERMISSIONS).forEach(dept => {
    Object.keys(dept.staff_permissions).forEach(mod => modules.add(mod));
    Object.keys(dept.manager_permissions).forEach(mod => modules.add(mod));
  });
  
  return Array.from(modules).sort();
};

/**
 * Lấy permissions template theo phòng ban và rank
 */
const getPermissionsTemplate = (departmentCode, rank = 'staff') => {
  const dept = DEPARTMENT_PERMISSIONS[departmentCode];
  if (!dept) return {};
  
  return rank === 'manager' 
    ? dept.manager_permissions 
    : dept.staff_permissions;
};

/**
 * Kiểm tra quyền
 */
const hasPermission = (userPermissions, module, action) => {
  if (!userPermissions || !userPermissions[module]) return false;
  return userPermissions[module].includes(action);
};

/**
 * Merge permissions (kết hợp quyền từ nhiều nguồn)
 */
const mergePermissions = (...permissionObjects) => {
  const merged = {};
  
  permissionObjects.forEach(perms => {
    if (!perms) return;
    
    Object.entries(perms).forEach(([module, actions]) => {
      if (!merged[module]) {
        merged[module] = [];
      }
      merged[module] = [...new Set([...merged[module], ...actions])];
    });
  });
  
  return merged;
};

module.exports = {
  DEPARTMENT_PERMISSIONS,
  getAllModuleActions,
  getAllModules,
  getPermissionsTemplate,
  hasPermission,
  mergePermissions
};
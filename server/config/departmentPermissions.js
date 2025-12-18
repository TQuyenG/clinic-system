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
    name: 'Vận hành lâm sàng',
    description: 'Quản lý bác sĩ, lịch khám, cuộc hẹn',
    staff_permissions: {
      appointments: ['view', 'create', 'edit'],
      doctors: ['view'],
      work_shift: ['register_shift', 'register_leave', 'register_overtime'],
      patients: ['view'],
      medical_records: ['view']
    },
    manager_permissions: {
      appointments: ['view', 'create', 'edit', 'cancel', 'approve'],
      doctors: ['view', 'edit', 'assign', 'manage_schedule'],
      work_shift: ['approve_shift', 'approve_leave', 'approve_overtime', 'register_shift', 'register_leave', 'register_overtime'],
      patients: ['view', 'edit'],
      medical_records: ['view', 'edit'],
      staff_management: ['view', 'assign_permissions']
    }
  },

  // ========================================
  // PHÒNG HỆ THỐNG & IT (SYSTEM)
  // ========================================
  system: {
    name: 'Hệ thống & IT',
    description: 'Quản lý hệ thống, cấu hình, bảo mật',
    staff_permissions: {
      system_settings: ['view'],
      services: ['view'],
      service_categories: ['view'],
      specialties: ['view'],
      categories: ['view'],
      work_shift: ['register_shift', 'register_leave', 'register_overtime']
    },
    manager_permissions: {
      system_settings: ['view', 'edit'],
      services: ['view', 'create', 'edit', 'delete', 'hide'],
      service_categories: ['view', 'create', 'edit', 'delete', 'hide'],
      specialties: ['view', 'create', 'edit', 'delete'],
      categories: ['view', 'create', 'edit', 'delete'],
      users: ['view', 'manage_roles'],
      homepage: ['view', 'edit'],
      about_page: ['view', 'edit'],
      service_pages: ['view', 'edit'],
      work_shift: ['approve_shift', 'approve_leave', 'approve_overtime', 'register_shift', 'register_leave', 'register_overtime'],
      staff_management: ['view', 'assign_permissions'],
      system_logs: ['view']
    }
  },

  // ========================================
  // PHÒNG CHĂM SÓC KHÁCH HÀNG (SUPPORT)
  // ========================================
  support: {
    name: 'Chăm sóc khách hàng',
    description: 'Hỗ trợ khách hàng, giải đáp thắc mắc',
    staff_permissions: {
      consultations: ['view', 'reply'],
      forum: ['moderate_questions'],
      patients: ['view'],
      appointments: ['view'],
      work_shift: ['register_shift', 'register_leave', 'register_overtime']
    },
    manager_permissions: {
      consultations: ['view', 'reply', 'assign', 'close'],
      forum: ['view_topics', 'create_topics', 'edit_topics', 'delete_topics', 'toggle_topics', 'moderate_questions'],
      patients: ['view', 'edit'],
      appointments: ['view', 'edit', 'cancel'],
      feedback: ['view', 'reply', 'analyze'],
      work_shift: ['approve_shift', 'approve_leave', 'approve_overtime', 'register_shift', 'register_leave', 'register_overtime'],
      staff_management: ['view', 'assign_permissions', 'assign_categories']
    }
  },

  // ========================================
  // PHÒNG TÀI CHÍNH KẾ TOÁN (FINANCE)
  // ========================================
  finance: {
    name: 'Tài chính kế toán',
    description: 'Quản lý thanh toán, doanh thu, báo cáo tài chính',
    staff_permissions: {
      payments: ['view'],
      invoices: ['view'],
      reports: ['view'],
      work_shift: ['register_shift', 'register_leave', 'register_overtime']
    },
    manager_permissions: {
      payments: ['view', 'verify', 'approve', 'refund'],
      invoices: ['view', 'create', 'edit'],
      reports: ['view', 'create', 'export'],
      statistics: ['view', 'revenue', 'profit'],
      refund_requests: ['view', 'approve', 'reject'],
      work_shift: ['approve_shift', 'approve_leave', 'approve_overtime', 'register_shift', 'register_leave', 'register_overtime'],
      staff_management: ['view', 'assign_permissions'],
      salary: ['view', 'manage']
    }
  },

  // ========================================
  // PHÒNG NỘI DUNG & TRUYỀN THÔNG (CONTENT)
  // ========================================
  content: {
    name: 'Nội dung & Truyền thông',
    description: 'Quản lý bài viết, nội dung website',
    staff_permissions: {
      articles: ['view', 'create_draft'],
      categories: ['view'],
      media: ['view', 'upload'],
      forum: ['moderate_questions'],
      work_shift: ['register_shift', 'register_leave', 'register_overtime']
    },
    manager_permissions: {
      articles: ['view', 'create', 'edit', 'delete', 'publish', 'approve', 'reject'],
      categories: ['view', 'create', 'edit', 'assign'],
      media: ['view', 'upload', 'delete', 'manage'],
      seo: ['view', 'edit'],
      homepage_content: ['view', 'edit'],
      forum: ['view_topics', 'create_topics', 'edit_topics', 'delete_topics', 'toggle_topics', 'moderate_questions'],
      work_shift: ['approve_shift', 'approve_leave', 'approve_overtime', 'register_shift', 'register_leave', 'register_overtime'],
      staff_management: ['view', 'assign_permissions', 'assign_categories'],
      content_calendar: ['view', 'manage']
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

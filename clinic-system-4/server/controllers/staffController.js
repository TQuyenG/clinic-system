// server/controllers/staffController.js
const { models } = require('../config/db');
const { Op } = require('sequelize');
const { getPermissionsTemplate, DEPARTMENT_PERMISSIONS } = require('../config/departmentPermissions');

/**
 * Lấy danh sách Staff có filter (dùng cho dropdown chọn Manager hoặc Assign)
 * GET /api/staff/list
 */
exports.getStaffList = async (req, res) => {
  try {
  const { rank, department } = req.query;
  const where = {};
  if (rank) where.rank = rank;
  // department chỉ áp dụng cho staff, không áp dụng cho bác sĩ
  if (department) where.department = department;

    const staff = await models.Staff.findAll({
      where,
      include: [
        { 
          model: models.User, 
          attributes: ['id', 'full_name', 'email', 'username'] 
        }
      ]
    });

    // Format dữ liệu gọn gàng
    const formattedData = staff.map(s => ({
      id: s.id,
      username: s.username,
      full_name: s.User?.full_name,
      department: s.department,
      rank: s.rank
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('ERROR getStaffList:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách nhân viên' });
  }
};

/**
 * Lấy danh sách tất cả nhân viên (Trang quản lý chính)
 * GET /api/staff
 */
exports.getAllStaff = async (req, res) => {
  try {
    //  Lấy filter từ query params
    const { department, active } = req.query;
    
    //  Build where condition
    const whereStaff = {};
    if (department) {
      whereStaff.department = department;
    }
    
    const whereUser = {};
    if (active !== undefined) {
      whereUser.is_active = active === 'true' || active === true;
    }
    
    const staffList = await models.Staff.findAll({
      where: whereStaff,
      include: [
        {
          // Quan trọng: Include User để lấy full_name
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url', 'is_active', 'gender'],
          where: Object.keys(whereUser).length > 0 ? whereUser : undefined
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ 
      success: true, 
      data: staffList 
    });
  } catch (error) {
    console.error('ERROR getAllStaff:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * Lấy chi tiết nhân viên theo ID
 * GET /api/staff/:id
 */
exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const staff = await models.Staff.findByPk(id, {
      include: [
        {
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url', 'gender', 'dob', 'address']
        },
        { 
            model: models.Staff, 
            as: 'manager', 
            include: [{ model: models.User, attributes: ['full_name'] }] 
        },
        {
          model: models.Doctor,
          as: 'managedDoctors',
          include: [
            { 
              model: models.User, 
              as: 'user',
              attributes: ['id', 'full_name', 'avatar_url', 'email'] 
            },
            {
              model: models.Specialty,
              as: 'specialty',
              attributes: ['name']
            }
          ]
        }
      ]
    });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' });
    }

    res.status(200).json({ 
      success: true, 
      data: staff 
    });
  } catch (error) {
    console.error('ERROR getStaffById:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy thông tin nhân viên', 
      error: error.message 
    });
  }
};

/**
 * Phân công bác sĩ cho staff (Admin và Staff Manager)
 * PUT /api/staff/:id/assign-doctors
 */
exports.assignDoctorsToStaff = async (req, res) => {
  try {
    const { id } = req.params;
  const { doctor_ids, rank, manager_id, department, permissions, finance_role } = req.body;

    const staff = await models.Staff.findByPk(id, {
      include: [{ model: models.User, attributes: ['full_name'] }]
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });
    }

    // Lưu giá trị cũ cho audit log
    const oldDoctorIds = staff.managed_doctors?.doctor_ids || [];

    // Kiểm tra quyền: Nếu là staff, phải là manager (bỏ kiểm tra phòng ban)
    if (req.user.role === 'staff') {
      const currentStaff = await models.Staff.findOne({
        where: { user_id: req.user.id }
      });
      if (!currentStaff) {
        return res.status(403).json({ 
          success: false, 
          message: 'Không tìm thấy thông tin nhân viên của bạn.' 
        });
      }
      // Chỉ manager mới được phân công
      if (currentStaff.rank !== 'manager') {
        return res.status(403).json({ 
          success: false, 
          message: 'Chỉ trưởng phòng mới có quyền phân công bác sĩ.' 
        });
      }
      // Staff manager không được thay đổi rank
      if (rank !== undefined) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bạn không có quyền thay đổi chức vụ.' 
        });
      }
    }

    // --- BẮT ĐẦU ĐOẠN SỬA ---
    // 1. Cập nhật thông tin cơ bản (Admin hoặc Manager được quyền)
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      if (rank !== undefined) staff.rank = rank;
      if (department !== undefined) staff.department = department;
      if (manager_id !== undefined) staff.manager_id = manager_id || null;
      
      // Xử lý cập nhật Permissions (Quyền hạn)
      if (permissions) {
        staff.permissions = permissions;
      }
      
      // Xử lý lưu tên Vai trò Tài chính vào Mô tả công việc (job_description)
      // Logic: Nếu chọn phòng Finance và có gửi finance_role lên
      if (department === 'finance' && finance_role) {
        const roleNames = {
          cashier: 'Nhân viên Thu ngân',
          accountant: 'Kế toán Tổng hợp',
          manager: 'Quản lý Dịch vụ & Giá'
        };
        // Lưu tên tiếng Việt
        staff.job_description = roleNames[finance_role] || finance_role;
      }
    }
    // --- KẾT THÚC ĐOẠN SỬA ---
    
    // 2. Cập nhật managed_doctors
    // FIX: Chuyển đổi User.id -> Doctor.id nếu cần
    let validDoctorIds = [];
    if (doctor_ids && Array.isArray(doctor_ids) && doctor_ids.length > 0) {
      // Tìm Doctor records dựa trên ID được gửi lên (có thể là Doctor.id hoặc User.id)
      let doctors = await models.Doctor.findAll({
        where: { id: { [Op.in]: doctor_ids } },
        attributes: ['id']
      });
      
      // Nếu không tìm thấy bằng Doctor.id, thử tìm bằng User.id
      if (doctors.length === 0) {
        doctors = await models.Doctor.findAll({
          where: { user_id: { [Op.in]: doctor_ids } },
          attributes: ['id', 'user_id']
        });
      }
      
      validDoctorIds = doctors.map(d => d.id);
      console.log('[assignDoctorsToStaff] Input IDs:', doctor_ids, '-> Valid Doctor IDs:', validDoctorIds);
    }
    
    staff.managed_doctors = { doctor_ids: validDoctorIds };
    await staff.save();

    // 3. Cập nhật ngược lại bảng Doctor (dùng validDoctorIds đã validate)
    // Reset tất cả bác sĩ cũ của staff này
    await models.Doctor.update(
        { assigned_staff_id: null },
        { where: { assigned_staff_id: staff.id } }
    );
    
    // Set mới với ID đã validate
    if (validDoctorIds.length > 0) {
        await models.Doctor.update(
            { assigned_staff_id: staff.id },
            { where: { id: { [Op.in]: validDoctorIds } } }
        );
    }

    // 4. **LƯU AUDIT LOG CHO PHÂN CÔNG BÁC SĨ**
    // Lấy tên bác sĩ để hiển thị
    const oldDoctors = await models.Doctor.findAll({
      where: { id: { [Op.in]: oldDoctorIds } },
      include: [{ model: models.User, as: 'user', attributes: ['full_name'] }]
    });
    const newDoctors = await models.Doctor.findAll({
      where: { id: { [Op.in]: validDoctorIds } },
      include: [{ model: models.User, as: 'user', attributes: ['full_name'] }]
    });

    const oldDoctorNames = oldDoctors.map(d => d.user?.full_name || `BS${d.id}`).join(', ');
    const newDoctorNames = newDoctors.map(d => d.user?.full_name || `BS${d.id}`).join(', ');

    const auditDetails = {
      doctor_assignment: {
        old: oldDoctorNames || 'Chưa có',
        new: newDoctorNames || 'Chưa có',
        old_count: oldDoctorIds.length,
        new_count: validDoctorIds.length
      }
    };

    await models.AuditLog.create({
      user_id: req.user.id,
      action_type: 'doctor_assignment',
      target_type: 'staff',
      target_id: staff.id,
      target_name: staff.User?.full_name || staff.code,
      details: JSON.stringify(auditDetails)
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật phân công thành công.',
      data: staff
    });

  } catch (error) {
    console.error('ERROR in assignDoctorsToStaff:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi phân công bác sĩ.'
    });
  }
};

/**
 * Lấy danh sách bác sĩ được phân công
 * GET /api/staff/:id/doctors
 */
exports.getAssignedDoctors = async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await models.Staff.findByPk(id);
    if (!staff) return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.' });

    const doctorIds = staff.getManagedDoctorIds();

    const doctors = await models.Doctor.findAll({
      where: { id: { [Op.in]: doctorIds } },
      include: [
        { model: models.User, as: 'user', attributes: ['id', 'full_name', 'email', 'phone'] },
        { model: models.Specialty, as: 'specialty', attributes: ['id', 'name'] }
      ]
    });

    console.log('DEBUG getAssignedDoctors - doctors:', doctors.map(d => ({
      id: d.id,
      name: d.user?.full_name,
      specialty_id: d.specialty_id,
      specialty: d.specialty
    })));

    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    console.error('ERROR in getAssignedDoctors:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
};

/**
 * MỚI: Lấy profile của Staff đang đăng nhập
 * GET /api/staff/my-profile
 */
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const staff = await models.Staff.findOne({
      where: { user_id: userId },
      include: [
        {
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url']
        }
      ]
    });
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ nhân viên'
      });
    }
    
    res.json({
      success: true,
      data: staff
    });
    
  } catch (error) {
    console.error('Error in getMyProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin nhân viên',
      error: error.message
    });
  }
};

/**
 * Lấy danh sách tất cả phòng ban
 * GET /api/staff/departments
 */
exports.getDepartments = async (req, res) => {
  try {
    const departments = Object.entries(DEPARTMENT_PERMISSIONS).map(([code, info]) => ({
      code,
      name: info.name,
      description: info.description
    }));

    res.status(200).json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('ERROR getDepartments:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * Lấy danh sách nhân viên theo phòng ban
 * GET /api/staff/by-department/:departmentCode
 */
exports.getStaffByDepartment = async (req, res) => {
  try {
    const { departmentCode } = req.params;
    const { rank } = req.query;

    const where = { department: departmentCode };
    if (rank) where.rank = rank;

    const staffList = await models.Staff.findAll({
      where,
      include: [
        {
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url', 'is_active']
        },
        {
          model: models.Staff,
          as: 'manager',
          include: [{ model: models.User, attributes: ['full_name'] }]
        }
      ],
      order: [
        ['rank', 'DESC'], // Manager trước
        ['created_at', 'ASC']
      ]
    });

    res.status(200).json({
      success: true,
      data: staffList
    });
  } catch (error) {
    console.error('ERROR getStaffByDepartment:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * Cập nhật permissions cho nhân viên (Admin và Staff Manager)
 * PUT /api/staff/:id/permissions
 */
/**
 * Helper: So sánh permissions và tạo chi tiết thay đổi
 */
const getPermissionChanges = (oldPerms, newPerms) => {
  const PERMISSION_MODULES = {
    work_shift: {
      name: 'Quản lý lịch làm việc',
      permissions: {
        approve_shift: 'Phê duyệt lịch làm việc',
        approve_leave: 'Phê duyệt nghỉ phép',
        approve_overtime: 'Phê duyệt tăng ca',
        register_shift: 'Đăng ký lịch làm việc',
        register_leave: 'Đăng ký nghỉ phép',
        register_overtime: 'Đăng ký tăng ca'
      }
    },
    appointments: { name: 'Quản lý lịch hẹn', permissions: { view: 'Xem', create: 'Tạo', edit: 'Sửa', cancel: 'Hủy', approve: 'Xác nhận' } },
    doctors: { name: 'Quản lý bác sĩ', permissions: { view: 'Xem', edit: 'Sửa', assign: 'Phân công', manage_schedule: 'Quản lý lịch' } },
    patients: { name: 'Quản lý bệnh nhân', permissions: { view: 'Xem', edit: 'Sửa' } },
    medical_records: { name: 'Hồ sơ bệnh án', permissions: { view: 'Xem', edit: 'Sửa' } },
    articles: { 
      name: 'Quản lý bài viết', 
      permissions: { 
        view: 'Xem', 
        create: 'Tạo', 
        create_draft: 'Tạo nháp', 
        edit: 'Sửa', 
        delete: 'Xóa', 
        hide: 'Ẩn',
        approve: 'Duyệt', 
        reject: 'Từ chối',
        suggest_medicine: 'Đề xuất thuốc',
        approve_medicine: 'Duyệt thuốc',
        create_medicine: 'Tạo thuốc',
        suggest_disease: 'Đề xuất bệnh lý',
        approve_disease: 'Duyệt bệnh lý',
        create_disease: 'Tạo bệnh lý'
      } 
    },
    forum: { name: 'Diễn đàn', permissions: { view: 'Xem', reply: 'Trả lời', moderate: 'Kiểm duyệt', delete: 'Xóa' } },
    consultations: { 
      name: 'Tư vấn trực tuyến', 
      permissions: { 
        view: 'Xem', 
        reply: 'Trả lời', 
        assign: 'Phân công', 
        close: 'Đóng',
        // Bổ sung các quyền mới bạn yêu cầu:
        create: 'Tạo lịch',
        edit: 'Sửa lịch',
        cancel: 'Hủy lịch',
        approve: 'Xác nhận'
      } 
    },
    payments: { name: 'Thanh toán', permissions: { view: 'Xem', verify: 'Xác minh', approve: 'Duyệt', refund: 'Hoàn tiền' } },
    system_settings: { 
      name: 'Cài đặt hệ thống', 
      permissions: { 
        view: 'Xem',
        view_audit_logs: 'Xem lịch sử chỉnh sửa',
        edit_home: 'Quản lý trang chủ',
        edit_about: 'Quản lý giới thiệu',
        edit_facilities: 'Quản lý cơ sở vật chất',
        edit_equipment: 'Quản lý trang thiết bị',
        edit_header_footer: 'Quản lý Header/Footer',
        edit_contact: 'Quản lý liên hệ',
        edit_privacy: 'Quản lý chính sách bảo mật',
        edit_terms: 'Quản lý điều khoản'
      } 
    },
    services: { 
      name: 'Dịch vụ y tế', 
      permissions: { 
        create: 'Tạo dịch vụ', 
        edit: 'Sửa dịch vụ', 
        delete: 'Xóa dịch vụ', 
        hide: 'Ẩn/Hiện dịch vụ',
        manage_categories: 'Quản lý danh mục' 
      } 
    },
    consultation_pricing: { 
      name: 'Gói tư vấn', 
      permissions: { 
        create: 'Tạo gói', 
        edit: 'Sửa gói', 
        delete: 'Xóa gói', 
        hide: 'Ẩn/Hiện gói',
        set_price: 'Định giá' 
      } 
    },
    staff_management: { name: 'Quản lý nhân sự', permissions: { view: 'Xem', assign_permissions: 'Phân quyền', assign_categories: 'Phân danh mục' } }
  };

  const changes = [];
  
  // Helper: Check if permission is enabled (support both boolean and array formats)
  const hasPermission = (modulePerms, permKey) => {
    if (!modulePerms) return false;
    if (typeof modulePerms === 'boolean') return modulePerms;
    if (Array.isArray(modulePerms)) return modulePerms.includes(permKey);
    if (typeof modulePerms === 'object') return modulePerms[permKey] === true;
    return false;
  };
  
  // So sánh từng module
  for (const [moduleKey, moduleInfo] of Object.entries(PERMISSION_MODULES)) {
    const oldModulePerms = oldPerms?.[moduleKey];
    const newModulePerms = newPerms?.[moduleKey];
    
    // So sánh từng quyền trong module
    for (const [permKey, permLabel] of Object.entries(moduleInfo.permissions)) {
      const oldValue = hasPermission(oldModulePerms, permKey);
      const newValue = hasPermission(newModulePerms, permKey);
      
      if (oldValue !== newValue) {
        const action = newValue ? 'Bật quyền' : 'Tắt quyền';
        changes.push(`${action} "${permLabel}" trong module "${moduleInfo.name}"`);
      }
    }
  }
  
  return changes;
};

/**
 * Cập nhật permissions cho nhân viên
 * PUT /api/staff/:id/permissions
 * Body: { permissions: {...}, department?: '...', rank?: '...' }
 */
exports.updateStaffPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, department, rank } = req.body;

    const staff = await models.Staff.findByPk(id, {
      include: [{ model: models.User, as: 'User' }]
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    // Lưu giá trị cũ để log
    const oldPermissions = JSON.parse(JSON.stringify(staff.permissions || {}));
    const oldDepartment = staff.department;
    const oldRank = staff.rank;

    // Kiểm tra quyền: Nếu là staff, phải là manager và cùng phòng ban
    if (req.user.role === 'staff') {
      const currentStaff = await models.Staff.findOne({
        where: { user_id: req.user.id }
      });

      if (!currentStaff) {
        return res.status(403).json({ 
          success: false, 
          message: 'Không tìm thấy thông tin nhân viên của bạn.' 
        });
      }

      // Chỉ manager mới được phân quyền
      if (currentStaff.rank !== 'manager') {
        return res.status(403).json({ 
          success: false, 
          message: 'Chỉ trưởng phòng mới có quyền phân quyền.' 
        });
      }

      // Chỉ được phân quyền trong phòng ban của mình
      if (staff.department !== currentStaff.department) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bạn chỉ có thể phân quyền cho nhân viên trong phòng ban của mình.' 
        });
      }

      // Staff manager không được thay đổi department hoặc rank
      if (department !== undefined || rank !== undefined) {
        return res.status(403).json({ 
          success: false, 
          message: 'Bạn không có quyền thay đổi phòng ban hoặc chức vụ.' 
        });
      }
    }

    let hasChanges = false;
    const auditDetails = {};

    // Cập nhật permissions
    if (permissions !== undefined) {
      const permissionChanges = getPermissionChanges(oldPermissions, permissions);
      
      console.log('[updateStaffPermissions] Old Permissions:', JSON.stringify(oldPermissions, null, 2));
      console.log('[updateStaffPermissions] New Permissions:', JSON.stringify(permissions, null, 2));
      console.log('[updateStaffPermissions] Permission Changes:', permissionChanges);
      
      staff.permissions = permissions;
      hasChanges = true;
      
      // Lưu chi tiết thay đổi permissions
      if (permissionChanges.length > 0) {
        auditDetails.permission_changes = permissionChanges;
      }
    }

    // Nếu đổi department hoặc rank, apply template mặc định (chỉ admin)
    if (req.user.role === 'admin') {
      if (department && department !== oldDepartment) {
        staff.department = department;
        const template = getPermissionsTemplate(department, rank || staff.rank);
        staff.permissions = template;
        hasChanges = true;
        auditDetails.department = { old: oldDepartment, new: department };
      }

      if (rank && rank !== oldRank) {
        staff.rank = rank;
        const template = getPermissionsTemplate(staff.department, rank);
        staff.permissions = template;
        hasChanges = true;
        auditDetails.rank = { old: oldRank, new: rank };
      }
    }

    await staff.save();

    // Log audit trail nếu có thay đổi
    if (hasChanges) {
      await models.AuditLog.create({
        user_id: req.user.id,
        action_type: 'permission_change',
        target_type: 'staff',
        target_id: staff.id,
        target_name: staff.User?.full_name || staff.code,
        details: JSON.stringify(auditDetails)
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật quyền thành công',
      data: staff
    });
  } catch (error) {
    console.error('ERROR updateStaffPermissions:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


/**
 * Lấy permissions template theo phòng ban
 * GET /api/staff/permissions-template/:departmentCode
 */
exports.getPermissionsTemplate = async (req, res) => {
  try {
    const { departmentCode } = req.params;
    const { rank } = req.query;

    const template = getPermissionsTemplate(departmentCode, rank || 'staff');
    const deptInfo = DEPARTMENT_PERMISSIONS[departmentCode];

    if (!deptInfo) {
      return res.status(404).json({ success: false, message: 'Phòng ban không tồn tại' });
    }

    res.status(200).json({
      success: true,
      data: {
        department: departmentCode,
        name: deptInfo.name,
        description: deptInfo.description,
        rank: rank || 'staff',
        permissions: template
      }
    });
  } catch (error) {
    console.error('ERROR getPermissionsTemplate:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * Lấy thống kê nhân viên theo phòng ban (cho admin)
 * GET /api/staff/statistics/by-department
 */
exports.getDepartmentStatistics = async (req, res) => {
  try {
    const stats = [];

    for (const [code, info] of Object.entries(DEPARTMENT_PERMISSIONS)) {
      const totalStaff = await models.Staff.count({
        where: { department: code }
      });

      const managers = await models.Staff.count({
        where: { department: code, rank: 'manager' }
      });

      const activeStaff = await models.Staff.count({
        where: { department: code, work_status: 'active' }
      });

      stats.push({
        code,
        name: info.name,
        description: info.description,
        total_staff: totalStaff,
        managers,
        active_staff: activeStaff,
        inactive_staff: totalStaff - activeStaff
      });
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('ERROR getDepartmentStatistics:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * Phân chia user vào phòng ban (tạo hoặc cập nhật Staff record)
 * POST /api/staff/assign-department
 */
exports.assignUserToDepartment = async (req, res) => {
  try {
    const { user_id, department, rank } = req.body;

    if (!user_id || !department) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin user_id hoặc department' 
      });
    }

    // Kiểm tra user có tồn tại
    const user = await models.User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy người dùng' 
      });
    }

    // Kiểm tra user đã là staff chưa
    let staff = await models.Staff.findOne({ where: { user_id } });

    const template = getPermissionsTemplate(department, rank || 'staff');

    if (staff) {
      // Cập nhật department và rank
      staff.department = department;
      staff.rank = rank || 'staff';
      staff.permissions = template;
      await staff.save();
    } else {
      // Tạo mới staff record
      staff = await models.Staff.create({
        user_id,
        username: user.username,
        code: `STAFF${user.id}`,
        department,
        rank: rank || 'staff',
        work_status: 'active',
        permissions: template,
        managed_doctors: { doctor_ids: [] }
      });

      // Cập nhật role của user thành 'staff'
      if (user.role !== 'staff' && user.role !== 'admin') {
        user.role = 'staff';
        await user.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Phân chia phòng ban thành công',
      data: staff
    });
  } catch (error) {
    console.error('ERROR assignUserToDepartment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi phân chia phòng ban' 
    });
  }
};
/**
 * L?y T?T C? staff v?i d?y d? th�ng tin User (d�ng cho Overview Dashboard)
 * GET /api/staff/all
 */
exports.getAllStaffForOverview = async (req, res) => {
  try {
    const allStaff = await models.Staff.findAll({
      include: [
        {
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url', 'is_active', 'username']
        }
      ],
      order: [
        ['department', 'ASC'],
        ['rank', 'DESC'],
        ['created_at', 'DESC']
      ]
    });

    res.status(200).json({
      success: true,
      data: allStaff
    });
  } catch (error) {
    console.error('ERROR getAllStaffForOverview:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách staff'
    });
  }
};

/**
 * Cập nhật hàng loạt (bulk update) nhiều nhân viên
 * POST /api/staff/bulk-update
 * Body: { staff_ids: [1,2,3], department?: 'clinical', rank?: 'manager' }
 */
exports.bulkUpdateStaff = async (req, res) => {
  try {
    const { staff_ids, department, rank } = req.body;
    const currentUser = req.user;

    if (!staff_ids || !Array.isArray(staff_ids) || staff_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp danh sách staff_ids'
      });
    }

    if (!department && !rank) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ít nhất department hoặc rank để cập nhật'
      });
    }

    // Build update object
    const updates = {};
    if (department) updates.department = department;
    if (rank) updates.rank = rank;

    // Log audit for each staff TRƯỚC KHI update
    const auditLogs = [];
    for (const staffId of staff_ids) {
      const staff = await models.Staff.findByPk(staffId, {
        include: [{ model: models.User, attributes: ['full_name'] }]
      });

      if (staff) {
        const details = {};
        // Lưu giá trị CŨ trước khi update
        if (department) details.department = { old: staff.department, new: department };
        if (rank) details.rank = { old: staff.rank, new: rank };

        auditLogs.push({
          user_id: currentUser.id,
          action_type: 'staff_update',
          target_type: 'staff',
          target_id: staffId,
          target_name: staff.User?.full_name || `Staff ${staffId}`,
          details: JSON.stringify(details)
        });
      }
    }

    // Perform bulk update
    const [updatedCount] = await models.Staff.update(updates, {
      where: {
        id: { [Op.in]: staff_ids }
      }
    });

    // Lưu audit logs
    if (auditLogs.length > 0) {
      await models.AuditLog.bulkCreate(auditLogs);
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật ${updatedCount} nhân viên`,
      updatedCount
    });
  } catch (error) {
    console.error('ERROR bulkUpdateStaff:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật hàng loạt',
      error: error.message
    });
  }
};

/**
 * Cập nhật thông tin 1 nhân viên (department, rank)
 * PUT /api/staff/:id
 * Body: { department?: 'clinical', rank?: 'manager' }
 */
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { department, rank, job_description } = req.body;
    const currentUser = req.user;

    // Validation
    const staff = await models.Staff.findByPk(id, {
      include: [{ model: models.User, attributes: ['full_name'] }]
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
      });
    }

    // Authorization: only admin or department manager (manager within same department) can update
    if (currentUser.role === 'staff') {
      // get current user's staff record
      const myStaff = await models.Staff.findOne({ where: { user_id: currentUser.id } });
      if (!myStaff || myStaff.rank !== 'manager') {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật nhân viên' });
      }
      if (myStaff.department !== staff.department) {
        return res.status(403).json({ success: false, message: 'Bạn chỉ có thể cập nhật nhân viên trong phòng ban của mình' });
      }
    }

    // **LƯU GIÁ TRỊ CŨ TRƯỚC KHI UPDATE**
    const oldDepartment = staff.department;
    const oldRank = staff.rank;

  // Build update object
  const updates = {};
  if (department !== undefined) updates.department = department;
  if (rank !== undefined) updates.rank = rank;
  if (job_description !== undefined) updates.job_description = job_description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có thông tin nào để cập nhật'
      });
    }

    // Perform update
    await staff.update(updates);

    // Log audit với giá trị cũ và mới chính xác
  const details = {};
  if (department !== undefined) details.department = { old: oldDepartment, new: department };
  if (rank !== undefined) details.rank = { old: oldRank, new: rank };
  if (job_description !== undefined) details.job_description = { old: staff.job_description, new: job_description };

    await models.AuditLog.create({
      user_id: currentUser.id,
      action_type: 'staff_update',
      target_type: 'staff',
      target_id: id,
      target_name: staff.User?.full_name || `Staff ${id}`,
      details: JSON.stringify(details)
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật nhân viên thành công',
      data: staff
    });
  } catch (error) {
    console.error('ERROR updateStaff:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật nhân viên',
      error: error.message
    });
  }
};

/**
 * ============================================
 * AUDIT LOGS FOR STAFF MANAGEMENT
 * ============================================
 */

/**
 * Lấy audit logs của staff management (permissions, department changes, etc.)
 * GET /api/staff/audit-logs
 */
exports.getStaffAuditLogs = async (req, res) => {
  try {
    const { startDate, endDate, action_type, user_id, sortBy = 'created_at', sortOrder = 'DESC', limit = 50, offset = 0 } = req.query;

    console.log('[getStaffAuditLogs] Query params:', req.query);

    // Build where clause
    const where = {
      target_type: ['Staff', 'staff'] // Only staff-related audit logs
    };

    if (action_type) {
      where.action_type = action_type;
    }

    if (user_id) {
      where.user_id = user_id;
    }

    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.created_at = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      where.created_at = {
        [Op.lte]: new Date(endDate)
      };
    }

    // Query audit logs
    const { rows, count } = await models.AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'full_name', 'email', 'avatar_url']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`[getStaffAuditLogs] Found ${count} logs, returning ${rows.length} logs`);

    res.json({
      success: true,
      data: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('[getStaffAuditLogs] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử audit',
      error: error.message
    });
  }
};

/**
 * Lấy thống kê audit logs của staff management
 * GET /api/staff/audit-logs/stats
 */
exports.getStaffAuditStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {
      target_type: ['Staff', 'staff']
    };

    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Group by action_type
    const stats = await models.AuditLog.findAll({
      where,
      attributes: [
        'action_type',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['action_type']
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[getStaffAuditStats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê audit',
      error: error.message
    });
  }

  
};

/**
 * Cập nhật thông tin nhân viên (Phân công phòng ban, cấp bậc, quản lý bác sĩ)
 * PUT /api/staff/:id
 */
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      department, 
      rank, 
      manager_id, 
      managed_doctor_ids, // <--- Nhận mảng ID từ Frontend gửi lên
      scopes,
      permissions
    } = req.body;

    const staff = await models.Staff.findByPk(id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    // 1. Cập nhật thông tin cơ bản
    staff.department = department;
    staff.rank = rank;
    staff.manager_id = manager_id || null;
    staff.scopes = scopes || staff.scopes;
    staff.permissions = permissions || staff.permissions;

    // 2. [QUAN TRỌNG] Xử lý lưu danh sách bác sĩ quản lý
    // Frontend gửi lên mảng [1, 2, 3] -> Backend lưu JSON { "doctor_ids": [1, 2, 3] }
    if (managed_doctor_ids) {
      staff.managed_doctors = { 
        doctor_ids: Array.isArray(managed_doctor_ids) ? managed_doctor_ids : [] 
      };
    }

    await staff.save();

    // Log audit
    await models.AuditLog.create({
      user_id: req.user.id,
      action_type: 'UPDATE',
      target_type: 'Staff',
      target_id: staff.id,
      description: `Cập nhật nhân viên ${staff.code}: rank=${rank}, dept=${department}, managed_docs=${managed_doctor_ids?.length || 0}`
    });

    res.json({
      success: true,
      message: 'Cập nhật nhân viên thành công',
      data: staff
    });

  } catch (error) {
    console.error('ERROR updateStaff:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật nhân viên',
      error: error.message
    });
  }
};

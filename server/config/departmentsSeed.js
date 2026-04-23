// server/config/departmentsSeed.js

/**
 * Seed data cho phòng ban và phân quyền
 * Chạy sau khi đã có users và staff trong DB
 */

const { getPermissionsTemplate } = require('./departmentPermissions');

const departmentsSeedData = [
  {
    code: 'clinical',
    name: 'Vận hành lâm sàng',
    description: 'Quản lý bác sĩ, lịch khám, cuộc hẹn và hoạt động lâm sàng',
    is_active: true
  },
  {
    code: 'system',
    name: 'Hệ thống & IT',
    description: 'Quản lý hệ thống, cấu hình, bảo mật và công nghệ',
    is_active: true
  },
  {
    code: 'support',
    name: 'Chăm sóc khách hàng',
    description: 'Hỗ trợ và chăm sóc khách hàng, giải đáp thắc mắc',
    is_active: true
  },
  {
    code: 'finance',
    name: 'Tài chính kế toán',
    description: 'Quản lý thanh toán, doanh thu, báo cáo tài chính',
    is_active: true
  },
  {
    code: 'content',
    name: 'Nội dung & Truyền thông',
    description: 'Quản lý bài viết, nội dung website và truyền thông',
    is_active: true
  }
];

/**
 * Cập nhật staff với department và permissions
 * Format: { username, department, rank, permissions }
 */
const staffDepartmentAssignments = [
  // CLINICAL DEPARTMENT
  {
    username: 'clinicmanager',
    department: 'clinical',
    rank: 'manager',
    job_description: 'Trưởng phòng vận hành lâm sàng, quản lý đội ngũ bác sĩ và lịch khám',
    permissions: null // Sẽ auto-fill từ template
  },
  {
    username: 'clinicstaff1',
    department: 'clinical',
    rank: 'staff',
    job_description: 'Nhân viên vận hành, hỗ trợ quản lý lịch hẹn và bác sĩ',
    permissions: null
  },
  {
    username: 'clinicstaff2',
    department: 'clinical',
    rank: 'staff',
    job_description: 'Nhân viên vận hành, hỗ trợ quản lý bệnh nhân',
    permissions: null
  },

  // SYSTEM DEPARTMENT
  {
    username: 'systemmanager',
    department: 'system',
    rank: 'manager',
    job_description: 'Trưởng phòng IT, quản lý hệ thống và công nghệ',
    permissions: null
  },
  {
    username: 'systemstaff1',
    department: 'system',
    rank: 'staff',
    job_description: 'Kỹ thuật viên IT, hỗ trợ cấu hình hệ thống',
    permissions: null
  },

  // SUPPORT DEPARTMENT
  {
    username: 'supportmanager',
    department: 'support',
    rank: 'manager',
    job_description: 'Trưởng phòng CSKH, quản lý đội ngũ hỗ trợ khách hàng',
    permissions: null
  },
  {
    username: 'supportstaff1',
    department: 'support',
    rank: 'staff',
    job_description: 'Nhân viên CSKH, giải đáp thắc mắc khách hàng',
    permissions: null
  },
  {
    username: 'supportstaff2',
    department: 'support',
    rank: 'staff',
    job_description: 'Nhân viên CSKH, quản lý tư vấn trực tuyến',
    permissions: null
  },

  // FINANCE DEPARTMENT
  {
    username: 'financemanager',
    department: 'finance',
    rank: 'manager',
    job_description: 'Trưởng phòng tài chính, quản lý doanh thu và chi phí',
    permissions: null
  },
  {
    username: 'financestaff1',
    department: 'finance',
    rank: 'staff',
    job_description: 'Kế toán viên, xử lý thanh toán',
    permissions: null
  },

  // CONTENT DEPARTMENT
  {
    username: 'contentmanager',
    department: 'content',
    rank: 'manager',
    job_description: 'Trưởng phòng nội dung, quản lý bài viết và truyền thông',
    permissions: null
  },
  {
    username: 'contentstaff1',
    department: 'content',
    rank: 'staff',
    job_description: 'Biên tập viên, viết và chỉnh sửa bài viết',
    permissions: null
  },
  {
    username: 'contentstaff2',
    department: 'content',
    rank: 'staff',
    job_description: 'Nhân viên nội dung, quản lý media',
    permissions: null
  }
];

/**
 * Hàm chạy seed departments và cập nhật staff
 */
async function seedDepartmentsAndPermissions(models) {
  try {
    console.log('\n=== BẮT ĐẦU SEED DEPARTMENTS & PERMISSIONS ===\n');

    // 1. Seed departments (nếu có model Department)
    if (models.Department) {
      console.log('📁 Seeding departments...');
      for (const dept of departmentsSeedData) {
        await models.Department.findOrCreate({
          where: { code: dept.code },
          defaults: dept
        });
        console.log(`  ✓ ${dept.name}`);
      }
    }

    // 2. Cập nhật staff với department và permissions
    console.log('\n👥 Cập nhật staff departments và permissions...');
    
    for (const assignment of staffDepartmentAssignments) {
      // Tìm user theo username
      const user = await models.User.findOne({
        where: { username: assignment.username }
      });

      if (!user) {
        console.log(`  ⚠ User ${assignment.username} không tồn tại, bỏ qua...`);
        continue;
      }

      // Tìm staff record
      const staff = await models.Staff.findOne({
        where: { user_id: user.id }
      });

      if (!staff) {
        console.log(`  ⚠ Staff record cho ${assignment.username} không tồn tại, bỏ qua...`);
        continue;
      }

      // Lấy permissions template
      const permissions = assignment.permissions || 
        getPermissionsTemplate(assignment.department, assignment.rank);

      // Cập nhật staff
      await staff.update({
        department: assignment.department,
        rank: assignment.rank,
        job_description: assignment.job_description,
        permissions: permissions
      });

      console.log(`  ✓ ${assignment.username} -> ${assignment.department} (${assignment.rank})`);
    }

    console.log('\n✅ HOÀN THÀNH SEED DEPARTMENTS & PERMISSIONS\n');
    
  } catch (error) {
    console.error('❌ Lỗi khi seed departments:', error);
    throw error;
  }
}

module.exports = {
  departmentsSeedData,
  staffDepartmentAssignments,
  seedDepartmentsAndPermissions
};

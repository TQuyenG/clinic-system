// server/middleware/roleMiddleware.js
const { models } = require('../config/db');

/**
 * ============================================
 * MA TRẬN PHÂN QUYỀN CHI TIẾT
 * ============================================
 * 
 * ROLE: ADMIN
 * - Truy cập: TẤT CẢ trang
 * - Quyền: Toàn quyền quản lý hệ thống
 * 
 * ROLE: DOCTOR (Bác sĩ)
 * - Truy cập:
 *   ✅ Lịch hẹn của mình (/appointments/doctor/my-appointments)
 *   ✅ Tư vấn của mình (/consultations/my-consultations)
 *   ✅ Hồ sơ bệnh nhân được phân công
 *   ✅ Viết/sửa bài viết y khoa (phải chờ duyệt)
 *   ✅ Trả lời câu hỏi diễn đàn
 * - KHÔNG truy cập:
 *   ❌ Quản lý nhân sự (/staff)
 *   ❌ Quản lý bác sĩ khác (/doctors/all)
 *   ❌ Thanh toán (/payments)
 *   ❌ Thống kê hệ thống (/statistics)
 *   ❌ Cài đặt hệ thống (/system-settings)
 * 
 * ROLE: PATIENT (Bệnh nhân)
 * - Truy cập:
 *   ✅ Đặt lịch hẹn (/appointments/create)
 *   ✅ Xem lịch hẹn của mình (/appointments/my-appointments)
 *   ✅ Thanh toán của mình (/payments/my-payments)
 *   ✅ Hồ sơ y tế của mình (/medical-records/my-records)
 *   ✅ Tư vấn trực tuyến (/consultations)
 *   ✅ Đọc bài viết, diễn đàn
 * - KHÔNG truy cập:
 *   ❌ TẤT CẢ trang quản trị
 *   ❌ Xem hồ sơ bệnh nhân khác
 * 
 * ROLE: STAFF (Nhân viên) - Phụ thuộc DEPARTMENT
 * 
 *   A. CLINICAL (Vận hành Lâm sàng):
 *      ✅ Quản lý lịch hẹn (/appointments/admin/all)
 *      ✅ Phân công bác sĩ
 *      ✅ Quản lý lịch làm việc bác sĩ
 *      ❌ Thanh toán, thống kê, cài đặt hệ thống
 * 
 *   B. SYSTEM (Hệ thống & IT):
 *      ✅ Cài đặt hệ thống (/system-settings)
 *      ✅ Quản lý dịch vụ, chuyên khoa
 *      ✅ Backup, bảo mật
 *      ❌ Thanh toán, nội dung
 * 
 *   C. SUPPORT (Chăm sóc Khách hàng):
 *      ✅ Quản lý tư vấn (/consultations/admin)
 *      ✅ Trả lời câu hỏi diễn đàn
 *      ✅ Xem lịch hẹn (chỉ đọc)
 *      ❌ Thanh toán, cài đặt hệ thống
 * 
 *   D. FINANCE (Tài chính Kế toán):
 *      ✅ Quản lý thanh toán (/payments)
 *      ✅ Xác minh, hoàn tiền
 *      ✅ Báo cáo doanh thu
 *      ✅ Xem lịch hẹn (để đối chiếu)
 *      ❌ Cài đặt hệ thống, nội dung
 * 
 *   E. CONTENT (Nội dung & Marketing):
 *      ✅ Quản lý bài viết (/articles/admin)
 *      ✅ Duyệt bài viết bác sĩ
 *      ✅ Quản lý diễn đàn
 *      ❌ Thanh toán, lịch hẹn, cài đặt hệ thống
 */

const roleMiddleware = (requiredPermission = null, allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // 1. Kiểm tra Authentication
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Chưa xác thực.' });
      }

      const user = req.user;

      // 2. ADMIN - Toàn quyền
      if (user.role === 'admin') {
        return next();
      }

      // 2b. MANAGER CSKH/CONTENT - Toàn quyền forum như admin
      if (
        user.role === 'staff' &&
        user.department &&
        user.rank === 'manager' &&
        (user.department === 'support' || user.department === 'content') &&
        requiredPermission === 'SUPPORT_FORUM'
      ) {
        return next();
      }

      // 3. Kiểm tra Role cơ bản (fallback cho các route đơn giản)
      // 3. Kiểm tra Role cơ bản (fallback cho các route đơn giản)
      // SỬA: Nếu requiredPermission trùng với role của user thì cho qua luôn
      if (requiredPermission && requiredPermission === user.role) {
          return next();
      }

      // Logic cũ giữ nguyên
      if (allowedRoles.length > 0 && !requiredPermission) {
        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ 
            success: false, 
            message: 'Không có quyền truy cập.',
            requiredRoles: allowedRoles,
            yourRole: user.role
          });
        }
        return next();
      }

      // 4. KIỂM TRA QUYỀN CHI TIẾT CHO STAFF
      if (user.role === 'staff' && requiredPermission) {
        const staffProfile = await models.Staff.findOne({ 
          where: { user_id: user.id } 
        });

        if (!staffProfile) {
          return res.status(403).json({ 
            success: false, 
            message: 'Không tìm thấy hồ sơ nhân viên.' 
          });
        }

        const { department, rank, permissions } = staffProfile;
        let hasPermission = false;

        // === MA TRẬN PHÂN QUYỀN THEO PERMISSION CODE ===
        
        switch (requiredPermission) {
          // --- WORK_SHIFT GRANULAR PERMISSIONS ---
          case 'work_shift:approve_shift':
            if (permissions && permissions.work_shift && permissions.work_shift.includes('approve_shift')) {
              hasPermission = true;
            }
            break;
          case 'work_shift:approve_leave':
            if (permissions && permissions.work_shift && permissions.work_shift.includes('approve_leave')) {
              hasPermission = true;
            }
            break;
          case 'work_shift:approve_overtime':
            if (permissions && permissions.work_shift && permissions.work_shift.includes('approve_overtime')) {
              hasPermission = true;
            }
            break;
          case 'work_shift:register_shift':
            if (permissions && permissions.work_shift && permissions.work_shift.includes('register_shift')) {
              hasPermission = true;
            }
            break;
          case 'work_shift:register_leave':
            if (permissions && permissions.work_shift && permissions.work_shift.includes('register_leave')) {
              hasPermission = true;
            }
            break;
          case 'work_shift:register_overtime':
            if (permissions && permissions.work_shift && permissions.work_shift.includes('register_overtime')) {
              hasPermission = true;
            }
            break;
          // --- FALLBACK: Check JSON permissions field ---
          default:
            if (permissions && typeof permissions === 'object') {
              const [module, action] = requiredPermission.split(':');
              if (module === 'articles' && department === 'content' && rank === 'manager') {
                hasPermission = true;
              } else if (permissions[module]) {
                if (Array.isArray(permissions[module])) {
                  hasPermission = permissions[module].includes(action);
                } else if (permissions[module] === true) {
                  hasPermission = true;
                }
              }
            }
            if (!hasPermission && allowedRoles.includes(user.role)) {
              hasPermission = true;
            }
            break;
        }

        if (!hasPermission) {
          return res.status(403).json({ 
            success: false, 
            message: 'Bạn không có quyền thực hiện chức năng này.',
            details: {
              required: requiredPermission,
              yourDepartment: department,
              yourRank: rank
            }
          });
        }

        req.staffProfile = staffProfile;
        return next();
      }

      // 5. DOCTOR và PATIENT - Check allowedRoles HOẶC requiredPermission
      if (allowedRoles.includes(user.role) || requiredPermission === user.role) {
        return next();
      }

      // 6. Từ chối truy cập nếu không match
      return res.status(403).json({ 
        success: false, 
        message: 'Quyền hạn không hợp lệ.',
        yourRole: user.role,
        requiredPermission: requiredPermission,
        allowedRoles: allowedRoles
      });

    } catch (error) {
      console.error('ERROR roleMiddleware:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi kiểm tra quyền.' 
      });
    }
  };
};

module.exports = roleMiddleware;

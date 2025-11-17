// server/models/Staff.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Staff = sequelize.define('Staff', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    username: { type: DataTypes.STRING(50), unique: false, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true, allowNull: false },
    department: { type: DataTypes.STRING(255), allowNull: true },
    managed_doctors: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '{ "doctor_ids": [1, 5, 9] } - Danh sách bác sĩ được quản lý'
    },
    work_status: {
      type: DataTypes.ENUM('active', 'on_leave', 'inactive'),
      defaultValue: 'active',
      allowNull: false,
      comment: 'Trạng thái làm việc hiện tại'
    },
    
    // =============================================
    // === BỔ SUNG CHO LỊCH LINH HOẠT ===
    // =============================================
    schedule_preference_type: {
      type: DataTypes.ENUM('fixed', 'flexible'),
      allowNull: false,
      defaultValue: 'fixed',
      comment: 'Loại lịch làm việc: Cố định hoặc Linh hoạt'
    },
    current_schedule_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'schedules', // Tham chiếu đến chính bảng schedule
        key: 'id'
      },
      comment: 'ID của bản ghi đăng ký (flexible_registration) đang active'
    },
    // =============================================
    
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'staff',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['username'] },
      { fields: ['schedule_preference_type'] } // Index mới
    ]
  });

  Staff.associate = (models) => {
    Staff.belongsTo(models.User, { foreignKey: 'user_id' });
    Staff.hasMany(models.Article, { foreignKey: 'author_id', sourceKey: 'user_id' });
    Staff.hasMany(models.Doctor, { foreignKey: 'assigned_staff_id', as: 'managedDoctors' }); 
    Staff.hasMany(models.Appointment, { foreignKey: 'staff_id', as: 'managedAppointments' });
    
    // Association mới
    Staff.belongsTo(models.Schedule, { 
      foreignKey: 'current_schedule_id', 
      as: 'activeScheduleRegistration' 
    });
  };

  // Hooks giữ nguyên
  Staff.addHook('beforeValidate', async (staff, options) => {
    try {
      // (MỚI) Thêm dòng này
      if (!staff.user_id) {
        // Đây là một lệnh update (như đổi lịch) không truyền user_id,
        // bỏ qua hook này.
        return;
      }
      const user = await sequelize.models.User.findOne({
        where: { id: staff.user_id },
        transaction: options.transaction
      });
      if (!user) {
        throw new Error(`Không tìm thấy User với user_id: ${staff.user_id}`);
      }
      staff.username = user.username;
      
      if (!staff.code) {
        // Sửa logic tạo code: Tìm code lớn nhất
        const lastStaff = await Staff.findOne({
          attributes: ['code'],
          order: [['id', 'DESC']],
          transaction: options.transaction,
          paranoid: false
        });
        
        let nextNumber = 1;
        if (lastStaff && lastStaff.code) {
          const match = lastStaff.code.match(/ST(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        staff.code = `ST${String(nextNumber).padStart(5, '0')}`;
      }
    } catch (error) {
      console.error('ERROR trong hook beforeValidate cho Staff:', error.message);
      throw error;
    }
  });

  // (Instance methods giữ nguyên)
  Staff.prototype.getManagedDoctorIds = function() {
    if (!this.managed_doctors || !this.managed_doctors.doctor_ids) {
      return [];
    }
    return this.managed_doctors.doctor_ids;
  };

  Staff.prototype.canManageDoctor = function(doctorId) {
    const ids = this.getManagedDoctorIds();
    return ids.includes(parseInt(doctorId));
  };

  Staff.prototype.isOnLeave = async function(date) {
    const LeaveRequest = sequelize.models.LeaveRequest;
    if (!LeaveRequest) return false;
    
    const leave = await LeaveRequest.findOne({
      where: {
        user_id: this.user_id,
        status: 'approved',
        date_from: { [sequelize.Op.lte]: date },
        [sequelize.Op.or]: [
          { date_to: null, date_from: date },
          { date_to: { [sequelize.Op.gte]: date } }
        ]
      }
    });
    return !!leave;
  };

  console.log('SUCCESS: Model Staff đã được định nghĩa (cập nhật).');
  return Staff;
};
// server/models/Doctor.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Doctor = sequelize.define('Doctor', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, unique: true, allowNull: false },
    username: { type: DataTypes.STRING(50), unique: false, allowNull: false },
    code: { type: DataTypes.STRING(10), unique: true, allowNull: false },
    specialty_id: { type: DataTypes.BIGINT, allowNull: true },
    experience_years: { type: DataTypes.INTEGER, allowNull: true },
    certifications_json: { type: DataTypes.JSON, allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    assigned_staff_id: { 
      type: DataTypes.BIGINT, 
      allowNull: true,
      comment: 'Staff quản lý bác sĩ này'
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
    tableName: 'doctors',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['username'] },
      { fields: ['assigned_staff_id'] },
      { fields: ['schedule_preference_type'] } // Index mới
    ]
  });

  Doctor.associate = (models) => {
    Doctor.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Doctor.belongsTo(models.Specialty, { foreignKey: 'specialty_id', as: 'specialty' });
    Doctor.belongsTo(models.Staff, { foreignKey: 'assigned_staff_id', as: 'assignedStaff' });
    Doctor.hasMany(models.Appointment, { foreignKey: 'doctor_id', as: 'appointments' });
    Doctor.hasMany(models.Consultation, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.MedicalRecord, { foreignKey: 'doctor_id' });
    Doctor.hasMany(models.Discount, { foreignKey: 'doctor_id' });
    
    // Association mới
    Doctor.belongsTo(models.Schedule, { 
      foreignKey: 'current_schedule_id', 
      as: 'activeScheduleRegistration' 
    });
  };

  // Hooks giữ nguyên
  Doctor.addHook('beforeValidate', async (doctor, options) => {
    try {
      // (MỚI) Thêm dòng này
      if (!doctor.user_id) {
        // Đây là một lệnh update (như đổi lịch) không truyền user_id,
        // bỏ qua hook này.
        return;
      }
      const user = await sequelize.models.User.findOne({
        where: { id: doctor.user_id },
        transaction: options.transaction
      });
      if (!user) {
        throw new Error(`Không tìm thấy User với user_id: ${doctor.user_id}`);
      }
      doctor.username = user.username;
      
      if (!doctor.code) {
        // Sửa logic tạo code: Tìm code lớn nhất
        const lastDoctor = await Doctor.findOne({
          attributes: ['code'],
          order: [['id', 'DESC']],
          transaction: options.transaction,
          paranoid: false
        });
        
        let nextNumber = 1;
        if (lastDoctor && lastDoctor.code) {
          const match = lastDoctor.code.match(/DR(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
        doctor.code = `DR${String(nextNumber).padStart(5, '0')}`;
      }
    } catch (error) {
      console.error('ERROR trong hook beforeValidate cho Doctor:', error.message);
      throw error;
    }
  });

  // Instance method (giữ nguyên)
  Doctor.prototype.isOnLeave = async function(date) {
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

  console.log('SUCCESS: Model Doctor đã được định nghĩa (cập nhật).');
  return Doctor;
};
// server/models/Appointment.js
// PHIÊN BẢN MỚI NHẤT:
// 1. Dùng hook 'beforeValidate' để tự sinh mã 'code' (Đã sửa lỗi)
// 2. Thêm trạng thái 'in_progress' vào ENUM 'status' (Mới)
// 3. Thêm trường 'appointment_address' (Mới)

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },
    patient_id: { type: DataTypes.BIGINT, allowNull: true },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    service_id: { type: DataTypes.BIGINT, allowNull: false },
    specialty_id: { type: DataTypes.BIGINT, allowNull: true },
    staff_id: { type: DataTypes.BIGINT, allowNull: true },
    guest_email: { type: DataTypes.STRING, allowNull: true },
    guest_name: { type: DataTypes.STRING, allowNull: true },
    guest_phone: { type: DataTypes.STRING, allowNull: true },
    guest_gender: { type: DataTypes.STRING, allowNull: true },
    guest_dob: { type: DataTypes.DATEONLY, allowNull: true },
    guest_token: { type: DataTypes.STRING, allowNull: true, unique: true },
    appointment_type: { type: DataTypes.ENUM('offline', 'online'), defaultValue: 'offline' },
    appointment_date: { type: DataTypes.DATEONLY, allowNull: false },
    appointment_start_time: { type: DataTypes.TIME, allowNull: false },
    appointment_end_time: { type: DataTypes.TIME, allowNull: false },
    
    // MỚI: Thêm 'in_progress'
    status: { 
      type: DataTypes.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'), 
      defaultValue: 'pending' 
    },
    
    payment_status: { 
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'paid_at_clinic', 'not_required'), 
      defaultValue: 'pending' 
    },
    
    payment_hold_until: { type: DataTypes.DATE, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    cancel_reason: { type: DataTypes.TEXT, allowNull: true },
    cancelled_by: { type: DataTypes.STRING, allowNull: true },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    medical_result: { type: DataTypes.TEXT, allowNull: true },
    prescription: { type: DataTypes.TEXT, allowNull: true },
    next_appointment: { type: DataTypes.TEXT, allowNull: true },
    medical_files: { type: DataTypes.JSON, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    completed_by: { type: DataTypes.INTEGER, allowNull: true },
    code: { type: DataTypes.STRING(20), unique: true, allowNull: false },
    
    // MỚI: Thêm địa chỉ
    appointment_address: { 
      type: DataTypes.STRING, 
      allowNull: true, 
      comment: 'Địa chỉ khám (nếu cần ghi đè địa chỉ mặc định của phòng khám)' 
    },

    reschedule_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Số lần đã đổi lịch (tối đa 3)'
    }
    
  }, {
    tableName: 'appointments',
    timestamps: true,
    indexes: [
      {
        unique: true,
        name: 'uniq_doc_date_start', 
        fields: ['doctor_id', 'appointment_date', 'appointment_start_time']
      },
      { fields: ['patient_id'] },
      { fields: ['status'] },
      { fields: ['guest_token'] }
    ],
    hooks: {
      // Dùng 'beforeValidate' để đảm bảo 'code' được sinh ra
      // TRƯỚC KHI validation 'allowNull: false' chạy
      beforeValidate: async (appointment, options) => {
        if (!appointment.code) {
          const date = new Date();
          const datePart = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          let newCode = '';
          let existing = null;
          let attempts = 0;

          do {
            if (attempts < 5) {
              const randomPart = String(Math.floor(1000 + Math.random() * 9000));
              newCode = `AP-${datePart}-${randomPart}`;
            } else {
              newCode = `AP-${datePart}-${Date.now() % 100000}`;
            }
            
            existing = await sequelize.models.Appointment.findOne({ 
              where: { code: newCode }, 
              transaction: options.transaction 
            });
            
            attempts++;
          } while (existing);

          appointment.code = newCode;
        }
      }
    }
  });

  Appointment.associate = function(models) {
    Appointment.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'Patient' });
    Appointment.belongsTo(models.Doctor, { foreignKey: 'doctor_id', as: 'Doctor' });
    Appointment.belongsTo(models.Service, { foreignKey: 'service_id', as: 'Service' });
    Appointment.belongsTo(models.Specialty, { foreignKey: 'specialty_id', as: 'Specialty' });
    Appointment.hasOne(models.Payment, { foreignKey: 'appointment_id', as: 'Payment' });
    Appointment.hasOne(models.MedicalRecord, { foreignKey: 'appointment_id', as: 'MedicalRecord' });
    Appointment.hasOne(models.Review, { foreignKey: 'appointment_id', as: 'Review' });
  };

  return Appointment;
};
// server/models/User.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), unique: true, allowNull: false },
    username: { type: DataTypes.STRING(50), unique: false, allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    full_name: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
    dob: { type: DataTypes.DATE, allowNull: true },
    avatar_url: { type: DataTypes.STRING(255), allowNull: true },
    role: { type: DataTypes.ENUM('admin', 'patient', 'doctor', 'staff'), allowNull: false },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true },
    verification_token: { type: DataTypes.STRING(255), allowNull: true },
    verification_expires: { type: DataTypes.DATE, allowNull: true },
    reset_token: { type: DataTypes.STRING(255), allowNull: true },
    reset_expires: { type: DataTypes.DATE, allowNull: true },
    last_login: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: false }, // Mặc định FALSE
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['email'] }, { fields: ['username'] }]
  });

  User.associate = (models) => {
    User.hasOne(models.Patient, { foreignKey: 'user_id' });
    User.hasOne(models.Staff, { foreignKey: 'user_id' });
    User.hasOne(models.Doctor, { foreignKey: 'user_id' });
    User.hasOne(models.Admin, { foreignKey: 'user_id' });
    User.hasMany(models.Article, { foreignKey: 'author_id', as: 'articles' });
    User.hasMany(models.Notification, { foreignKey: 'user_id' });
    User.hasMany(models.Question, { foreignKey: 'user_id' });
    User.hasMany(models.Answer, { foreignKey: 'user_id' });
    User.hasMany(models.AuditLog, { foreignKey: 'user_id' });
    User.hasMany(models.Consultation, { foreignKey: 'patient_id' });
    User.hasMany(models.Consultation, { foreignKey: 'doctor_id' });
    User.hasMany(models.Payment, { foreignKey: 'user_id' });
    User.hasMany(models.MedicalRecord, { foreignKey: 'patient_id' });
    User.hasMany(models.MedicalRecord, { foreignKey: 'doctor_id' });
    User.hasMany(models.Interaction, { foreignKey: 'user_id' });
    User.hasMany(models.ChatMessage, { foreignKey: 'sender_id' });
    User.hasMany(models.ChatMessage, { foreignKey: 'receiver_id' });
    User.hasMany(models.Discount, { foreignKey: 'doctor_id' });
    User.hasMany(models.Schedule, { foreignKey: 'doctor_id' });
    User.hasMany(models.SystemSetting, { foreignKey: 'updated_by' });
  };

  // Hook để tự động tạo username từ email
  User.addHook('beforeValidate', async (user, options) => {
    try {
      if (!user.username && user.email) {
        user.username = user.email.split('@')[0];
        console.log(`[Hook beforeValidate] Tạo username ${user.username} từ email ${user.email}`);
      }
    } catch (error) {
      console.error('[Hook beforeValidate] ERROR:', error.message);
      throw error;
    }
  });

  // Hook để tự động tạo bản ghi trong bảng vai trò tương ứng
  // QUAN TRỌNG: Hook này CHỈ tạo bản ghi role, KHÔNG được sửa user
User.addHook('afterCreate', async (user, options) => {
  try {
    console.log(`[Hook afterCreate] Bắt đầu cho user: ${user.email} (role: ${user.role})`);
    
    // LƯU TOKEN TRƯỚC KHI HOOK CHẠY
    const tokenBeforeHook = user.verification_token;
    console.log(`[Hook afterCreate] Token TRƯỚC khi tạo role: ${tokenBeforeHook}`);
    
    const { Patient, Staff, Doctor, Admin, Specialty } = sequelize.models;
    if (!Patient || !Staff || !Doctor || !Admin) {
      throw new Error('Không tìm thấy các model cần thiết (Patient, Staff, Doctor, Admin)');
    }

    const createOptions = { transaction: options.transaction };

    // TẠO ROLE RECORD
    switch (user.role) {
      case 'patient':
        await Patient.create({ user_id: user.id }, createOptions);
        console.log(`[Hook afterCreate] Đã tạo bản ghi Patient cho user ${user.email}`);
        break;

      case 'staff':
        await Staff.create({ 
          user_id: user.id, 
          department: null
        }, createOptions);
        console.log(`[Hook afterCreate] Đã tạo bản ghi Staff cho user ${user.email}`);
        break;

      case 'doctor':
        const specialty = await Specialty.findOne({ 
          where: { slug: 'cardiology' },
          transaction: options.transaction
        });
        await Doctor.create({
          user_id: user.id,
          specialty_id: specialty ? specialty.id : null,
          experience_years: null,
          certifications_json: null,
          bio: null
        }, createOptions);
        console.log(`[Hook afterCreate] Đã tạo bản ghi Doctor cho user ${user.email}`);
        break;

      case 'admin':
        await Admin.create({ 
          user_id: user.id, 
          permissions_json: null 
        }, createOptions);
        console.log(`[Hook afterCreate] Đã tạo bản ghi Admin cho user ${user.email}`);
        break;

      default:
        console.warn(`[Hook afterCreate] Vai trò không hợp lệ: ${user.role}`);
    }

    // KIỂM TRA TOKEN SAU KHI TẠO ROLE
    const tokenAfterHook = user.verification_token;
    console.log(`[Hook afterCreate] Token SAU khi tạo role: ${tokenAfterHook}`);
    
    if (tokenBeforeHook !== tokenAfterHook) {
      console.error('CẢNH BÁO: Token đã bị thay đổi trong hook!');
      console.error('Token trước:', tokenBeforeHook);
      console.error('Token sau:', tokenAfterHook);
    } else {
      console.log('[Hook afterCreate] Token KHÔNG thay đổi - OK');
    }

    console.log(`[Hook afterCreate] Hoàn tất cho user: ${user.email}`);
    
  } catch (error) {
    console.error('[Hook afterCreate] ERROR:', {
      email: user.email,
      role: user.role,
      error: error.message
    });
    throw error;
  }
});

  console.log('SUCCESS: Model User đã được định nghĩa.');

  return User;
};
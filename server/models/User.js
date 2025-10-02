const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), unique: true, allowNull: false },
    username: { type: DataTypes.STRING(50), unique: false, allowNull: false }, // Username bắt buộc
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    full_name: { type: DataTypes.STRING(255), allowNull: true }, // Cho phép null
    phone: { type: DataTypes.STRING(20), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
    dob: { type: DataTypes.DATE, allowNull: true },
    avatar_url: { type: DataTypes.STRING(255), allowNull: true },
    role: { type: DataTypes.ENUM('admin', 'patient', 'doctor', 'staff'), allowNull: false },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true },
    verification_token: { type: DataTypes.STRING(255), allowNull: true },
    reset_token: { type: DataTypes.STRING(255), allowNull: true },
    reset_expires: { type: DataTypes.DATE, allowNull: true },
    last_login: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
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
    User.hasMany(models.Article, { foreignKey: 'author_id' });
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
      console.log('Bắt đầu hook beforeValidate cho User');
      if (!user.username && user.email) {
        user.username = user.email.split('@')[0];
        console.log(`SUCCESS: Tạo username ${user.username} từ email ${user.email}`);
      }
    } catch (error) {
      console.error('ERROR trong hook beforeValidate cho User:', error.message);
      throw error;
    }
  });

  // Hook để tự động tạo bản ghi trong bảng vai trò tương ứng
  User.addHook('afterCreate', async (user, options) => {
    try {
      console.log(`Bắt đầu hook afterCreate cho người dùng: ${user.email} (role: ${user.role})`);

      const { Patient, Staff, Doctor, Admin, Specialty } = sequelize.models;
      if (!Patient || !Staff || !Doctor || !Admin) {
        throw new Error('Không tìm thấy các model cần thiết (Patient, Staff, Doctor, Admin)');
      }

      const createOptions = { transaction: options.transaction };

      switch (user.role) {
        case 'patient':
          await Patient.create({ user_id: user.id }, createOptions);
          console.log(`SUCCESS: Đã tạo bản ghi Patient cho user ${user.email} (user_id: ${user.id})`);
          break;

        case 'staff':
          await Staff.create({ 
            user_id: user.id, 
            department: null // Cho phép null
          }, createOptions);
          console.log(`SUCCESS: Đã tạo bản ghi Staff cho user ${user.email} (user_id: ${user.id})`);
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
          console.log(`SUCCESS: Đã tạo bản ghi Doctor cho user ${user.email} (user_id: ${user.id})`);
          break;

        case 'admin':
          await Admin.create({ 
            user_id: user.id, 
            permissions_json: null 
          }, createOptions);
          console.log(`SUCCESS: Đã tạo bản ghi Admin cho user ${user.email} (user_id: ${user.id})`);
          break;

        default:
          console.warn(`WARNING: Vai trò không hợp lệ: ${user.role} cho user ${user.email}`);
      }

      console.log(`Hoàn tất hook afterCreate cho user: ${user.email}`);
    } catch (error) {
      console.error('ERROR trong hook afterCreate:', {
        email: user.email,
        role: user.role,
        error: error.message
      });
      throw error;
    }
  });

  console.log('SUCCESS: Model User đã được định nghĩa.');
  console.log('Hooks của User model sau khi định nghĩa:', Object.keys(User.hooks || {}));

  return User;
};
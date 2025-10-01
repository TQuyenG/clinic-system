const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    full_name: { type: DataTypes.STRING(255) },
    phone: { type: DataTypes.STRING(20) },
    address: { type: DataTypes.TEXT },
    gender: { type: DataTypes.ENUM('male', 'female', 'other') },
    dob: { type: DataTypes.DATE },
    avatar_url: { type: DataTypes.STRING(255) },
    role: { type: DataTypes.ENUM('admin', 'patient', 'doctor', 'staff'), allowNull: false },
    is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verification_token: { type: DataTypes.STRING(255) },
    reset_token: { type: DataTypes.STRING(255) },
    reset_expires: { type: DataTypes.DATE },
    last_login: { type: DataTypes.DATE },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['email'] }]
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

  // Hook để tự động tạo bản ghi trong bảng vai trò tương ứng
  User.addHook('afterCreate', async (user, options) => {
    try {
      const { Patient, Staff, Doctor, Admin, Specialty } = sequelize.models;
      if (user.role === 'patient') {
        await Patient.create({ user_id: user.id });
        console.log(`SUCCESS: Tạo bản ghi Patient cho user ${user.email}.`);
      } else if (user.role === 'staff') {
        await Staff.create({ user_id: user.id, department: 'General' });
        console.log(`SUCCESS: Tạo bản ghi Staff cho user ${user.email}.`);
      } else if (user.role === 'doctor') {
        const specialty = await Specialty.findOne({ where: { slug: 'cardiology' } });
        await Doctor.create({
          user_id: user.id,
          specialty_id: specialty ? specialty.id : null,
          experience_years: 5,
          certifications_json: ['MD'],
          bio: 'Bác sĩ mới.'
        });
        console.log(`SUCCESS: Tạo bản ghi Doctor cho user ${user.email}.`);
      } else if (user.role === 'admin') {
        await Admin.create({ user_id: user.id, permissions_json: ['manage_users'] });
        console.log(`SUCCESS: Tạo bản ghi Admin cho user ${user.email}.`);
      }
    } catch (error) {
      console.error(`ERROR: Không thể tạo bản ghi vai trò cho user ${user.email}:`, error.message);
      throw error;
    }
  });

  console.log('SUCCESS: Model User đã được định nghĩa.');
  return User;
};
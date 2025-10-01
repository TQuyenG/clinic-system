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
    underscored: true
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

  console.log('SUCCESS: Model User đã được định nghĩa.');
  return User;
};

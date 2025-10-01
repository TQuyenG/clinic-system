
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

// Hàm khởi tạo cơ sở dữ liệu
async function initializeDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`SUCCESS: Cơ sở dữ liệu ${process.env.DB_NAME} đã được tạo hoặc đã tồn tại.`);
    await connection.end();
  } catch (error) {
    console.error(`ERROR: Không thể tạo cơ sở dữ liệu ${process.env.DB_NAME}:`, error.message);
    throw error;
  }
}

// Khởi tạo Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: console.log // In log SQL để debug
});

// Load tất cả model
const models = {
  User: require('../models/User')(sequelize),
  Patient: require('../models/Patient')(sequelize),
  Staff: require('../models/Staff')(sequelize),
  Doctor: require('../models/Doctor')(sequelize),
  Admin: require('../models/Admin')(sequelize),
  Specialty: require('../models/Specialty')(sequelize),
  Category: require('../models/Category')(sequelize),
  Medicine: require('../models/Medicine')(sequelize),
  Disease: require('../models/Disease')(sequelize),
  Article: require('../models/Article')(sequelize),
  Interaction: require('../models/Interaction')(sequelize),
  Appointment: require('../models/Appointment')(sequelize),
  Schedule: require('../models/Schedule')(sequelize),
  Consultation: require('../models/Consultation')(sequelize),
  ChatMessage: require('../models/ChatMessage')(sequelize),
  Discount: require('../models/Discount')(sequelize),
  Payment: require('../models/Payment')(sequelize),
  Notification: require('../models/Notification')(sequelize),
  SystemSetting: require('../models/SystemSetting')(sequelize),
  Question: require('../models/Question')(sequelize),
  Answer: require('../models/Answer')(sequelize),
  MedicalRecord: require('../models/MedicalRecord')(sequelize),
  AuditLog: require('../models/AuditLog')(sequelize)
};

// Thiết lập quan hệ giữa các model
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
    console.log(`SUCCESS: Quan hệ cho model ${model.name} đã được thiết lập.`);
  }
});

// Hàm thêm dữ liệu mẫu (chạy khi SYNC_MODE=force)
// Để thêm dữ liệu mẫu mới: Chỉnh sửa trong hàm này
// Để tắt dữ liệu mẫu: Comment hoặc xóa nội dung hàm seedData
async function seedData() {
  try {
    // Thêm dữ liệu mẫu cho User
    await models.User.bulkCreate([
      { email: 'admin@example.com', password_hash: 'hashed_password_1', first_name: 'Admin', last_name: 'Nguyen', phone: '0901234567', address: '123 Hanoi', gender: 'male', date_of_birth: '1980-01-01', avatar_url: '/avatars/admin.jpg', is_active: true },
      { email: 'patient@example.com', password_hash: 'hashed_password_2', first_name: 'Patient', last_name: 'Tran', phone: '0907654321', address: '456 HCMC', gender: 'female', date_of_birth: '1990-05-15', avatar_url: '/avatars/patient.jpg', is_active: true }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng users.');

    // Thêm dữ liệu mẫu cho Patient
    const users = await models.User.findAll();
    await models.Patient.bulkCreate([
      { user_id: users[1].id, code: 'PT00001', medical_history: { allergies: ['penicillin'], conditions: ['hypertension'] } }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng patients.');

    // Thêm dữ liệu mẫu cho Staff
    await models.Staff.bulkCreate([
      { user_id: users[0].id, code: 'ST00001', position: 'Receptionist' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng staff.');

    // Thêm dữ liệu mẫu cho Doctor
    await models.Doctor.bulkCreate([
      { user_id: users[0].id, code: 'DR00001', specialty_id: null, experience_years: 10, qualification: 'MD' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng doctors.');

    // Thêm dữ liệu mẫu cho Admin
    await models.Admin.bulkCreate([
      { user_id: users[0].id, code: 'AD00001', role: 'Super Admin' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng admins.');

    // Thêm dữ liệu mẫu cho Specialty
    await models.Specialty.bulkCreate([
      { name: 'Cardiology', description: 'Chuyên khoa tim mạch' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng specialties.');

    // Thêm dữ liệu mẫu cho Category
    await models.Category.bulkCreate([
      { name: 'General Health', description: 'Bài viết sức khỏe tổng quát' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng categories.');

    // Thêm dữ liệu mẫu cho Medicine
    await models.Medicine.bulkCreate([
      { name: 'Paracetamol', description: 'Thuốc giảm đau', dosage: '500mg', price: 10000 }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medicines.');

    // Thêm dữ liệu mẫu cho Disease
    await models.Disease.bulkCreate([
      { name: 'Hypertension', description: 'Cao huyết áp', icd10_code: 'I10' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng diseases.');

    // Thêm dữ liệu mẫu cho Article
    await models.Article.bulkCreate([
      { title: 'Cách phòng ngừa cao huyết áp', content: 'Nội dung bài viết...', author_id: users[0].id, category_id: 1, status: 'published' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng articles.');

    // Thêm dữ liệu mẫu cho Interaction
    await models.Interaction.bulkCreate([
      { medicine_id: 1, disease_id: 1, description: 'Không dùng paracetamol cho bệnh nhân cao huyết áp' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng interactions.');

    // Thêm dữ liệu mẫu cho Appointment
    await models.Appointment.bulkCreate([
      { code: 'AP0101240001', patient_id: 1, doctor_id: 1, specialty_id: 1, schedule_id: null, status: 'pending', appointment_date: '2025-10-02 10:00:00', reason: 'Khám tim mạch' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng appointments.');

    // Thêm dữ liệu mẫu cho Schedule
    await models.Schedule.bulkCreate([
      { doctor_id: 1, start_time: '2025-10-02 08:00:00', end_time: '2025-10-02 12:00:00', status: 'available' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng schedules.');

    // Thêm dữ liệu mẫu cho Consultation
    await models.Consultation.bulkCreate([
      { patient_id: 1, doctor_id: 1, appointment_id: 1, status: 'pending', consultation_date: '2025-10-02 10:30:00' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng consultations.');

    // Thêm dữ liệu mẫu cho ChatMessage
    await models.ChatMessage.bulkCreate([
      { consultation_id: 1, sender_id: users[1].id, receiver_id: users[0].id, message: 'Chào bác sĩ, tôi cần tư vấn.', sent_at: '2025-10-02 10:31:00' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng chat_messages.');

    // Thêm dữ liệu mẫu cho Discount
    await models.Discount.bulkCreate([
      { code: 'DISC10', percentage: 10, start_date: '2025-10-01', end_date: '2025-12-31', description: 'Giảm giá 10% khám bệnh' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng discounts.');

    // Thêm dữ liệu mẫu cho Payment
    await models.Payment.bulkCreate([
      { appointment_id: 1, amount: 500000, status: 'completed', payment_method: 'Momo', transaction_id: 'TX123456', payment_date: '2025-10-02 11:00:00' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng payments.');

    // Thêm dữ liệu mẫu cho Notification
    await models.Notification.bulkCreate([
      { user_id: users[1].id, type: 'appointment', message: 'Lịch hẹn của bạn đã được xác nhận.', status: 'unread', created_at: '2025-10-02 10:00:00' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng notifications.');

    // Thêm dữ liệu mẫu cho SystemSetting
    await models.SystemSetting.bulkCreate([
      { key: 'clinic_name', value: 'Phòng khám XYZ' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng system_settings.');

    // Thêm dữ liệu mẫu cho Question
    await models.Question.bulkCreate([
      { user_id: users[1].id, title: 'Cao huyết áp nên ăn gì?', content: 'Tôi bị cao huyết áp, cần tư vấn chế độ ăn.', status: 'open' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng questions.');

    // Thêm dữ liệu mẫu cho Answer
    await models.Answer.bulkCreate([
      { question_id: 1, user_id: users[0].id, content: 'Nên ăn ít muối, nhiều rau xanh.' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng answers.');

    // Thêm dữ liệu mẫu cho MedicalRecord
    await models.MedicalRecord.bulkCreate([
      { patient_id: 1, doctor_id: 1, diagnosis: 'Cao huyết áp', prescription: 'Thuốc hạ huyết áp', record_date: '2025-10-02' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medical_records.');

    // Thêm dữ liệu mẫu cho AuditLog
    await models.AuditLog.bulkCreate([
      { user_id: users[0].id, action: 'create_appointment', description: 'Tạo lịch hẹn AP0101240001', created_at: '2025-10-02 10:00:00' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng audit_logs.');
  } catch (error) {
    console.error('ERROR: Không thể thêm dữ liệu mẫu:', error.message);
    throw error;
  }
}

module.exports = { sequelize, models, initializeDatabase, seedData };

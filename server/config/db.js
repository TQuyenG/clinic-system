const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../../.env') 
});

const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

// Log để kiểm tra biến môi trường được load
console.log('Database Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'
});

// Hàm để kiểm tra kết nối database
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('SUCCESS: Kết nối database thành công.');
    return true;
  } catch (error) {
    console.error('ERROR: Không thể kết nối database:', error.message);
    return false;
  }
}

// Hàm khởi tạo cơ sở dữ liệu
async function initializeDatabase() {
  try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      throw new Error('Thiếu thông tin cấu hình database');
    }

    console.log('Đang kết nối với MySQL...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    console.log('Đang tạo database...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.end();

    // Kiểm tra kết nối Sequelize
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Không thể kết nối với database qua Sequelize');
    }

    return true;
  } catch (error) {
    console.error('ERROR trong initializeDatabase:', error.message);
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
async function seedData() {
  const transaction = await sequelize.transaction();
  try {
    console.log('Bắt đầu seed dữ liệu trong transaction...');
    
    // Kiểm tra kết nối trước khi seed
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Không thể kết nối database trước khi seed');
    }

    // 1. Thêm Specialties (2 data, trước doctors, appointments, discounts, schedules)
    console.log('1. Thêm Specialties...');
    const specialties = await models.Specialty.bulkCreate([
      { 
        name: 'Cardiology', 
        description: 'Chuyên khoa tim mạch', 
        slug: 'cardiology', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        name: 'Neurology', 
        description: 'Chuyên khoa thần kinh', 
        slug: 'neurology', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng specialties.');

    // 2. Thêm Categories (2 data, trước medicines, diseases, articles)
    console.log('2. Thêm Categories...');
    const categories = await models.Category.bulkCreate([
      { 
        parent_id: null, 
        name: 'General Health', 
        slug: 'general-health', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        parent_id: specialties[0].id,  // Giả sử parent_id có thể link, nhưng theo SQL là self-ref
        name: 'Cardiovascular', 
        slug: 'cardiovascular', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng categories.');

    // 3. Thêm Users với loop sequential (8 users: 2 admin, 2 staff, 2 doctor, 2 patient)
    // Hook afterCreate sẽ tự tạo Patients, Staff, Doctors, Admins (mỗi 2 data)
    console.log('3. Thêm Users...');
    const usersData = [
      // 2 Admins
      {
        email: 'admin1@example.com',
        password_hash: 'hashed_password_1',
        full_name: 'Nguyen Van Admin1',
        phone: '0901234567',
        address: '123 Hanoi',
        gender: 'male',
        dob: '1980-01-01',
        role: 'admin',
        avatar_url: '/avatars/admin1.jpg',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 08:00:00',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        email: 'admin2@example.com',
        password_hash: 'hashed_password_2',
        full_name: 'Tran Thi Admin2',
        phone: '0901234568',
        address: '124 Hanoi',
        gender: 'female',
        dob: '1981-02-02',
        role: 'admin',
        avatar_url: '/avatars/admin2.jpg',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-02 08:00:00',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      // 2 Staff
      {
        email: 'staff1@example.com',
        password_hash: 'hashed_password_3',
        full_name: 'Le Van Staff1',
        phone: '0901234569',
        address: '125 HCMC',
        gender: 'male',
        dob: '1985-03-03',
        role: 'staff',
        avatar_url: '/avatars/staff1.jpg',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 09:00:00',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        email: 'staff2@example.com',
        password_hash: 'hashed_password_4',
        full_name: 'Pham Thi Staff2',
        phone: '0901234570',
        address: '126 HCMC',
        gender: 'female',
        dob: '1986-04-04',
        role: 'staff',
        avatar_url: '/avatars/staff2.jpg',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-02 09:00:00',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      // 2 Doctors
      {
        email: 'doctor1@example.com',
        password_hash: 'hashed_password_5',
        full_name: 'Hoang Van Doctor1',
        phone: '0901234571',
        address: '127 Danang',
        gender: 'male',
        dob: '1975-05-05',
        role: 'doctor',
        avatar_url: '/avatars/doctor1.jpg',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 10:00:00',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        email: 'doctor2@example.com',
        password_hash: 'hashed_password_6',
        full_name: 'Nguyen Thi Doctor2',
        phone: '0901234572',
        address: '128 Danang',
        gender: 'female',
        dob: '1976-06-06',
        role: 'doctor',
        avatar_url: '/avatars/doctor2.jpg',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-02 10:00:00',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      // 2 Patients
      {
        email: 'patient1@example.com',
        password_hash: 'hashed_password_7',
        full_name: 'Vo Van Patient1',
        phone: '0901234573',
        address: '129 Hue',
        gender: 'male',
        dob: '1990-07-07',
        role: 'patient',
        avatar_url: '/avatars/patient1.jpg',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 11:00:00',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        email: 'patient2@example.com',
        password_hash: 'hashed_password_8',
        full_name: 'Le Thi Patient2',
        phone: '0901234574',
        address: '130 Hue',
        gender: 'female',
        dob: '1991-08-08',
        role: 'patient',
        avatar_url: '/avatars/patient2.jpg',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-02 11:00:00',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    const users = [];
    for (const userData of usersData) {
      const user = await models.User.create(userData, { transaction });
      console.log(`SUCCESS: Đã tạo User ${user.email} (role: ${user.role})`);
      users.push(user);
    }

    // Lấy instances từ hook (Patients, Staff, Doctors, Admins)
    const admins = await models.Admin.findAll({ transaction });
    const staff = await models.Staff.findAll({ transaction });
    const doctors = await models.Doctor.findAll({ transaction });
    const patients = await models.Patient.findAll({ transaction });

    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng users, patients, staff, doctors, admins qua hook.');

    // 4. Thêm Medicines (2 data, sau categories)
    console.log('4. Thêm Medicines...');
    const medicines = await models.Medicine.bulkCreate([
      { 
        category_id: categories[0].id, 
        name: 'Aspirin', 
        components: 'Acetylsalicylic acid', 
        medicine_usage: 'Pain relief', 
        description: 'Common painkiller', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: categories[1].id, 
        name: 'Ibuprofen', 
        components: 'Ibuprofen', 
        medicine_usage: 'Anti-inflammatory', 
        description: 'For inflammation', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medicines.');

    // 5. Thêm Diseases (2 data, sau categories)
    console.log('5. Thêm Diseases...');
    const diseases = await models.Disease.bulkCreate([
      { 
        category_id: categories[0].id, 
        name: 'Hypertension', 
        symptoms: 'High blood pressure', 
        description: 'Chronic condition', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: categories[1].id, 
        name: 'Diabetes', 
        symptoms: 'High blood sugar', 
        description: 'Metabolic disorder', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng diseases.');

    // 6. Thêm Articles (2 data, sau categories và users - author_id từ staff)
    console.log('6. Thêm Articles...');
    const articles = await models.Article.bulkCreate([
      { 
        title: 'Article 1', 
        content: 'Content 1', 
        author_id: staff[0].user_id, 
        category_id: categories[0].id, 
        status: 'approved', 
        views: 100, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Article 2', 
        content: 'Content 2', 
        author_id: staff[1].user_id, 
        category_id: categories[1].id, 
        status: 'approved', 
        views: 200, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng articles.');

    // 7. Thêm Interactions (2 data, sau users và entities như articles)
    console.log('7. Thêm Interactions...');
    const interactions = await models.Interaction.bulkCreate([
      { 
        user_id: patients[0].user_id, 
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'like', 
        created_at: new Date() 
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'article', 
        entity_id: articles[1].id, 
        interaction_type: 'view', 
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng interactions.');

    // 8. Thêm Appointments (2 data, sau users, specialties)
    console.log('8. Thêm Appointments...');
    const appointments = await models.Appointment.bulkCreate([
      { 
        code: 'AP00001',  // Giả sử hook hoặc trigger set code
        patient_id: patients[0].id, 
        doctor_id: doctors[0].id, 
        specialty_id: specialties[0].id, 
        appointment_time: '2025-10-02 10:00:00', 
        status: 'confirmed', 
        notes: 'Note 1', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        code: 'AP00002', 
        patient_id: patients[1].id, 
        doctor_id: doctors[1].id, 
        specialty_id: specialties[1].id, 
        appointment_time: '2025-10-03 11:00:00', 
        status: 'cancelled', 
        notes: 'Note 2', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng appointments.');

    const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Schedule = sequelize.define('Schedule', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    doctor_id: { type: DataTypes.BIGINT, allowNull: false },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.ENUM('available', 'booked', 'off', 'pending_off'), defaultValue: 'available' },
    off_reason: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'schedules',
    timestamps: true,
    underscored: true
  });

  Schedule.associate = (models) => {
    Schedule.belongsTo(models.User, { foreignKey: 'doctor_id' });
    Schedule.hasOne(models.Appointment, { foreignKey: 'schedule_id' });
  };

  console.log('SUCCESS: Model Schedule đã được định nghĩa.');
  return Schedule;
};
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng schedules.');

        // 10. Thêm Consultations
    console.log('10. Thêm Consultations...');
    const consultations = await models.Consultation.bulkCreate([
      { 
        appointment_id: appointments[0].id,  // Thêm appointment_id
        patient_id: patients[0].id,
        doctor_id: doctors[0].id,
        start_time: new Date('2025-10-02 10:00:00'),
        end_time: new Date('2025-10-02 10:30:00'),
        video_link: 'https://meet.example.com/consultation1',
        notes_json: { note: 'Khám lần đầu' },
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        appointment_id: appointments[1].id,  // Thêm appointment_id
        patient_id: patients[1].id,
        doctor_id: doctors[1].id,
        start_time: new Date('2025-10-03 11:00:00'),
        end_time: new Date('2025-10-03 11:30:00'),
        video_link: 'https://meet.example.com/consultation2',
        notes_json: { note: 'Tái khám' },
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng consultations.');

    // 11. Thêm ChatMessages (2 data, sau consultations)
    console.log('11. Thêm ChatMessages...');
    const chatMessages = await models.ChatMessage.bulkCreate([
      { 
        consultation_id: consultations[0].id, 
        sender_id: patients[0].user_id, 
        receiver_id: doctors[0].user_id, 
        message: 'Hello doctor', 
        created_at: new Date() 
      },
      { 
        consultation_id: consultations[1].id, 
        sender_id: patients[1].user_id, 
        receiver_id: doctors[1].user_id, 
        message: 'Hi doctor', 
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng chat_messages.');

    // 12. Thêm Discounts (2 data, sau specialties, doctors)
    console.log('12. Thêm Discounts...');
    const discounts = await models.Discount.bulkCreate([
      { 
        name: 'Discount 1', 
        type: 'percentage', 
        value: 10.00, 
        start_date: '2025-10-01', 
        end_date: '2025-12-31', 
        specialty_id: specialties[0].id, 
        doctor_id: doctors[0].user_id, 
        apply_count: 0, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        name: 'Discount 2', 
        type: 'fixed', 
        value: 50.00, 
        start_date: '2025-10-01', 
        end_date: '2025-12-31', 
        specialty_id: specialties[1].id, 
        doctor_id: doctors[1].user_id, 
        apply_count: 0, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng discounts.');

    // 13. Thêm Payments (2 data, sau appointments, discounts, users)
    console.log('13. Thêm Payments...');
    const payments = await models.Payment.bulkCreate([
      { 
        code: 'PY00001',  // Trigger set
        appointment_id: appointments[0].id, 
        user_id: patients[0].user_id, 
        amount: 100.00, 
        discount_id: discounts[0].id, 
        status: 'paid', 
        method: 'momo', 
        transaction_id: 'TX123', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        code: 'PY00002', 
        appointment_id: appointments[1].id, 
        user_id: patients[1].user_id, 
        amount: 200.00, 
        discount_id: discounts[1].id, 
        status: 'paid', 
        method: 'zalopay', 
        transaction_id: 'TX456', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng payments.');

    // 14. Thêm Notifications (2 data, sau users)
    console.log('14. Thêm Notifications...');
    const notifications = await models.Notification.bulkCreate([
      { 
        user_id: patients[0].user_id, 
        type: 'appointment', 
        message: 'Appointment confirmed', 
        is_read: false, 
        link: '/appointments/1', 
        created_at: new Date() 
      },
      { 
        user_id: patients[1].user_id, 
        type: 'payment', 
        message: 'Payment received', 
        is_read: false, 
        link: '/payments/1', 
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng notifications.');

    // 15. Thêm SystemSettings (2 data, sau users)
    console.log('15. Thêm SystemSettings...');
    const systemSettings = await models.SystemSetting.bulkCreate([
      { 
        setting_key: 'clinic_name', 
        value_json: { name: 'Clinic XYZ' }, 
        updated_by: admins[0].user_id, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        setting_key: 'banner_text', 
        value_json: { text: 'Welcome' }, 
        updated_by: admins[1].user_id, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng system_settings.');

    // 16. Thêm Questions (2 data, sau users)
    console.log('16. Thêm Questions...');
    const questions = await models.Question.bulkCreate([
      { 
        title: 'Question 1', 
        content: 'Content 1', 
        user_id: patients[0].user_id, 
        tags_json: ['tag1'], 
        status: 'open', 
        views: 10, 
        deleted_at: null, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Question 2', 
        content: 'Content 2', 
        user_id: patients[1].user_id, 
        tags_json: ['tag2'], 
        status: 'open', 
        views: 20, 
        deleted_at: null, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng questions.');

    // 17. Thêm Answers (2 data, sau questions, users)
    console.log('17. Thêm Answers...');
    const answers = await models.Answer.bulkCreate([
      { 
        question_id: questions[0].id, 
        user_id: doctors[0].user_id, 
        content: 'Answer 1', 
        is_pinned: false, 
        is_verified: true, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        question_id: questions[1].id, 
        user_id: doctors[1].user_id, 
        content: 'Answer 2', 
        is_pinned: false, 
        is_verified: true, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng answers.');

    // 18. Thêm MedicalRecords (2 data, sau users, appointments)
    console.log('18. Thêm MedicalRecords...');
    const medicalRecords = await models.MedicalRecord.bulkCreate([
      { 
        patient_id: patients[0].user_id, 
        doctor_id: doctors[0].user_id, 
        appointment_id: appointments[0].id, 
        type: 'consultation', 
        content_json: { diagnosis: 'Healthy' }, 
        shared_with_json: [doctors[0].user_id], 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        patient_id: patients[1].user_id, 
        doctor_id: doctors[1].user_id, 
        appointment_id: appointments[1].id, 
        type: 'exam', 
        content_json: { diagnosis: 'Checkup' }, 
        shared_with_json: [doctors[1].user_id], 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medical_records.');

    // 19. Thêm AuditLogs (2 data, sau users)
    console.log('19. Thêm AuditLogs...');
    const auditLogs = await models.AuditLog.bulkCreate([
      { 
        user_id: admins[0].user_id, 
        action: 'create_user', 
        entity_type: 'user', 
        entity_id: patients[0].user_id, 
        details_json: { note: 'Created patient1' }, 
        created_at: new Date() 
      },
      { 
        user_id: admins[1].user_id, 
        action: 'update_setting', 
        entity_type: 'system_setting', 
        entity_id: systemSettings[0].id, 
        details_json: { note: 'Updated clinic name' }, 
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng audit_logs.');

    await transaction.commit();
    console.log('SUCCESS: Transaction commit thành công. Dữ liệu đã được ghi vào DB.');
  } catch (error) {
    await transaction.rollback();
    console.error('ERROR: Transaction rollback:', error.message);
    console.error('ERROR trong seedData:', {
      name: error.name,
      message: error.message,
      errors: error.errors?.map(e => ({
        message: e.message,
        field: e.path,
        value: e.value
      }))
    });
    throw error;
  }
}

module.exports = { sequelize, models, initializeDatabase, seedData };
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
async function seedData() {
  try {
    // 1. Thêm dữ liệu mẫu cho User
    await models.User.bulkCreate([
      {
        email: 'admin1@example.com',
        password_hash: 'hashed_password_1',
        full_name: 'Nguyen Van Admin',
        phone: '0901234567',
        address: '123 Hanoi',
        gender: 'male',
        dob: '1980-01-01',
        avatar_url: '/avatars/admin1.jpg',
        role: 'admin',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 08:00:00',
        is_active: true
      },
      {
        email: 'patient1@example.com',
        password_hash: 'hashed_password_2',
        full_name: 'Tran Thi Patient',
        phone: '0907654321',
        address: '456 HCMC',
        gender: 'female',
        dob: '1990-05-15',
        avatar_url: '/avatars/patient1.jpg',
        role: 'patient',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 09:00:00',
        is_active: true
      },
      {
        email: 'doctor1@example.com',
        password_hash: 'hashed_password_3',
        full_name: 'Le Van Doctor',
        phone: '0909876543',
        address: '789 Danang',
        gender: 'male',
        dob: '1975-03-20',
        avatar_url: '/avatars/doctor1.jpg',
        role: 'doctor',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 07:30:00',
        is_active: true
      },
      {
        email: 'staff1@example.com',
        password_hash: 'hashed_password_4',
        full_name: 'Pham Thi Staff',
        phone: '0912345678',
        address: '101 Hue',
        gender: 'female',
        dob: '1985-07-10',
        avatar_url: '/avatars/staff1.jpg',
        role: 'staff',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 08:30:00',
        is_active: true
      },
      {
        email: 'patient2@example.com',
        password_hash: 'hashed_password_5',
        full_name: 'Hoang Van Patient',
        phone: '0923456789',
        address: '202 Can Tho',
        gender: 'male',
        dob: '1988-11-25',
        avatar_url: '/avatars/patient2.jpg',
        role: 'patient',
        is_verified: true,
        verification_token: null,
        reset_token: null,
        reset_expires: null,
        last_login: '2025-10-01 10:00:00',
        is_active: true
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng users.');

    // 2. Thêm dữ liệu mẫu cho Specialty
    await models.Specialty.bulkCreate([
      { name: 'Cardiology', description: 'Chuyên khoa tim mạch', slug: 'cardiology' },
      { name: 'Neurology', description: 'Chuyên khoa thần kinh', slug: 'neurology' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng specialties.');

    // 3. Thêm dữ liệu mẫu cho Category
    await models.Category.bulkCreate([
      { name: 'General Health', parent_id: null, slug: 'general-health' },
      { name: 'Cardiovascular', parent_id: 1, slug: 'cardiovascular' }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng categories.');

    // 4. Thêm dữ liệu mẫu cho Medicine
    const categories = await models.Category.findAll();
    await models.Medicine.bulkCreate([
      {
        category_id: categories[0].id,
        name: 'Paracetamol',
        components: 'Acetaminophen',
        medicine_usage: 'Giảm đau, hạ sốt',
        description: 'Thuốc giảm đau không kê đơn.'
      },
      {
        category_id: categories[1].id,
        name: 'Amlodipine',
        components: 'Amlodipine besylate',
        medicine_usage: 'Hạ huyết áp',
        description: 'Thuốc điều trị cao huyết áp.'
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medicines.');

    // 5. Thêm dữ liệu mẫu cho Disease
    await models.Disease.bulkCreate([
      {
        category_id: categories[1].id,
        name: 'Hypertension',
        symptoms: 'Đau đầu, chóng mặt, khó thở',
        treatments: 'Thuốc hạ huyết áp, chế độ ăn ít muối',
        description: 'Tình trạng huyết áp cao mãn tính.'
      },
      {
        category_id: categories[1].id,
        name: 'Arrhythmia',
        symptoms: 'Nhịp tim không đều, mệt mỏi',
        treatments: 'Thuốc điều hòa nhịp tim, theo dõi định kỳ',
        description: 'Rối loạn nhịp tim.'
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng diseases.');

    // 6. Thêm dữ liệu mẫu cho Article
    const users = await models.User.findAll();
    await models.Article.bulkCreate([
      {
        title: 'Cách phòng ngừa cao huyết áp',
        content: 'Ăn uống lành mạnh, tập thể dục đều đặn...',
        category_id: categories[1].id,
        author_id: users.find(u => u.role === 'staff').id,
        tags_json: ['health', 'hypertension', 'prevention'],
        status: 'approved',
        views: 100,
        source_url: 'https://example.com/hypertension',
        deleted_at: null
      },
      {
        title: 'Hiểu biết về rối loạn nhịp tim',
        content: 'Rối loạn nhịp tim có thể gây nguy hiểm nếu không điều trị...',
        category_id: categories[1].id,
        author_id: users.find(u => u.role === 'staff').id,
        tags_json: ['health', 'arrhythmia', 'cardiology'],
        status: 'pending',
        views: 50,
        source_url: 'https://example.com/arrhythmia',
        deleted_at: null
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng articles.');

    // 7. Thêm dữ liệu mẫu cho Interaction
    await models.Interaction.bulkCreate([
      {
        user_id: users.find(u => u.role === 'patient').id,
        entity_type: 'article',
        entity_id: 1,
        type: 'like',
        reason: 'Bài viết rất hữu ích.'
      },
      {
        user_id: users.find(u => u.role === 'patient').id,
        entity_type: 'disease',
        entity_id: 1,
        type: 'bookmark',
        reason: 'Lưu để tham khảo.'
      },
      {
        user_id: users[4].id,
        entity_type: 'article',
        entity_id: 2,
        type: 'share',
        reason: 'Chia sẻ cho bạn bè.'
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng interactions.');

    // 8. Thêm dữ liệu mẫu cho Schedule
    const doctor = users.find(u => u.role === 'doctor');
    await models.Schedule.bulkCreate([
      {
        doctor_id: doctor.id,
        start_time: '2025-10-02 08:00:00',
        end_time: '2025-10-02 12:00:00',
        status: 'available',
        off_reason: null
      },
      {
        doctor_id: doctor.id,
        start_time: '2025-10-03 13:00:00',
        end_time: '2025-10-03 17:00:00',
        status: 'available',
        off_reason: null
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng schedules.');

    // 9. Thêm dữ liệu mẫu cho Appointment
    const specialties = await models.Specialty.findAll();
    await models.Appointment.bulkCreate([
      {
        patient_id: users.find(u => u.role === 'patient').id,
        doctor_id: doctor.id,
        specialty_id: specialties[0].id,
        schedule_id: 1,
        status: 'pending',
        appointment_time: '2025-10-02 10:00:00',
        reason: 'Khám tim mạch định kỳ'
      },
      {
        patient_id: users[4].id,
        doctor_id: doctor.id,
        specialty_id: specialties[0].id,
        schedule_id: 2,
        status: 'confirmed',
        appointment_time: '2025-10-03 14:00:00',
        reason: 'Kiểm tra nhịp tim'
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng appointments.');

    // 10. Thêm dữ liệu mẫu cho Consultation
    await models.Consultation.bulkCreate([
      {
        appointment_id: 1,
        patient_id: users.find(u => u.role === 'patient').id,
        doctor_id: doctor.id,
        start_time: '2025-10-02 10:00:00',
        end_time: '2025-10-02 10:30:00',
        video_link: 'https://meet.example.com/consultation123',
        notes_json: { note: 'Bệnh nhân cần kiểm tra huyết áp.' },
        status: 'pending'
      },
      {
        appointment_id: 2,
        patient_id: users[4].id,
        doctor_id: doctor.id,
        start_time: '2025-10-03 14:00:00',
        end_time: '2025-10-03 14:30:00',
        video_link: 'https://meet.example.com/consultation456',
        notes_json: { note: 'Kiểm tra nhịp tim.' },
        status: 'confirmed'
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng consultations.');

    // 11. Thêm dữ liệu mẫu cho ChatMessage
    await models.ChatMessage.bulkCreate([
      {
        consultation_id: 1,
        sender_id: users.find(u => u.role === 'patient').id,
        receiver_id: doctor.id,
        message: 'Chào bác sĩ, tôi cảm thấy chóng mặt gần đây.'
      },
      {
        consultation_id: 1,
        sender_id: doctor.id,
        receiver_id: users.find(u => u.role === 'patient').id,
        message: 'Chào bạn, hãy mô tả thêm triệu chứng.'
      },
      {
        consultation_id: 2,
        sender_id: users[4].id,
        receiver_id: doctor.id,
        message: 'Bác sĩ ơi, nhịp tim tôi bất thường.'
      },
      {
        consultation_id: 2,
        sender_id: doctor.id,
        receiver_id: users[4].id,
        message: 'Chúng ta sẽ kiểm tra kỹ trong buổi hẹn.'
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng chat_messages.');

    // 12. Thêm dữ liệu mẫu cho Discount
    await models.Discount.bulkCreate([
      {
        name: 'Giảm 10% khám tim mạch',
        type: 'percentage',
        value: 10.00,
        start_date: '2025-10-01',
        end_date: '2025-12-31',
        specialty_id: specialties[0].id,
        doctor_id: doctor.id,
        apply_count: 0
      },
      {
        name: 'Miễn phí lần đầu',
        type: 'free',
        value: 0.00,
        start_date: '2025-10-01',
        end_date: '2025-11-30',
        specialty_id: specialties[0].id,
        doctor_id: doctor.id,
        apply_count: 0
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng discounts.');

    // 13. Thêm dữ liệu mẫu cho Payment
    await models.Payment.bulkCreate([
      {
        appointment_id: 1,
        user_id: users.find(u => u.role === 'patient').id,
        amount: 500000.00,
        discount_id: 1,
        status: 'paid',
        method: 'momo',
        transaction_id: 'TX123456789'
      },
      {
        appointment_id: 2,
        user_id: users[4].id,
        amount: 0.00,
        discount_id: 2,
        status: 'paid',
        method: 'momo',
        transaction_id: 'TX987654321'
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng payments.');

    // 14. Thêm dữ liệu mẫu cho Notification
    await models.Notification.bulkCreate([
      {
        user_id: users.find(u => u.role === 'patient').id,
        type: 'appointment',
        message: 'Lịch hẹn của bạn vào 10:00 02/10/2025 đã được xác nhận.',
        is_read: false,
        link: '/appointments/1'
      },
      {
        user_id: doctor.id,
        type: 'appointment',
        message: 'Bạn có lịch hẹn mới vào 10:00 02/10/2025.',
        is_read: false,
        link: '/appointments/1'
      },
      {
        user_id: users[4].id,
        type: 'appointment',
        message: 'Lịch hẹn của bạn vào 14:00 03/10/2025 đã được xác nhận.',
        is_read: false,
        link: '/appointments/2'
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng notifications.');

    // 15. Thêm dữ liệu mẫu cho SystemSetting
    await models.SystemSetting.bulkCreate([
      {
        setting_key: 'clinic_name',
        value_json: { name: 'Phòng khám XYZ' },
        updated_by: users.find(u => u.role === 'admin').id
      },
      {
        setting_key: 'banner_config',
        value_json: { image: '/banners/welcome.jpg', text: 'Chào mừng đến với phòng khám!' },
        updated_by: users.find(u => u.role === 'admin').id
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng system_settings.');

    // 16. Thêm dữ liệu mẫu cho Question
    await models.Question.bulkCreate([
      {
        title: 'Cao huyết áp nên ăn gì?',
        content: 'Tôi bị cao huyết áp, cần tư vấn chế độ ăn uống phù hợp.',
        user_id: users.find(u => u.role === 'patient').id,
        tags_json: ['hypertension', 'diet', 'health'],
        status: 'open',
        views: 50,
        deleted_at: null
      },
      {
        title: 'Rối loạn nhịp tim có nguy hiểm không?',
        content: 'Tôi hay bị hồi hộp, nhịp tim nhanh. Có nguy hiểm không?',
        user_id: users[4].id,
        tags_json: ['arrhythmia', 'cardiology', 'health'],
        status: 'open',
        views: 30,
        deleted_at: null
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng questions.');

    // 17. Thêm dữ liệu mẫu cho Answer
    await models.Answer.bulkCreate([
      {
        question_id: 1,
        user_id: doctor.id,
        content: 'Nên ăn ít muối, nhiều rau xanh, và tránh thực phẩm chế biến sẵn.',
        is_pinned: false,
        is_verified: true
      },
      {
        question_id: 2,
        user_id: doctor.id,
        content: 'Rối loạn nhịp tim cần được kiểm tra bởi bác sĩ chuyên khoa.',
        is_pinned: false,
        is_verified: true
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng answers.');

    // 18. Thêm dữ liệu mẫu cho MedicalRecord
    await models.MedicalRecord.bulkCreate([
      {
        patient_id: users.find(u => u.role === 'patient').id,
        doctor_id: doctor.id,
        appointment_id: 1,
        type: 'consultation',
        content_json: { diagnosis: 'Cao huyết áp nhẹ', prescription: 'Amlodipine 5mg/ngày' },
        shared_with_json: [doctor.id]
      },
      {
        patient_id: users[4].id,
        doctor_id: doctor.id,
        appointment_id: 2,
        type: 'consultation',
        content_json: { diagnosis: 'Rối loạn nhịp tim', prescription: 'Theo dõi thêm' },
        shared_with_json: [doctor.id]
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medical_records.');

    // 19. Thêm dữ liệu mẫu cho AuditLog
    await models.AuditLog.bulkCreate([
      {
        user_id: users.find(u => u.role === 'admin').id,
        action: 'create_appointment',
        entity_type: 'appointment',
        entity_id: 1,
        details_json: { patient_id: users.find(u => u.role === 'patient').id }
      },
      {
        user_id: users.find(u => u.role === 'admin').id,
        action: 'update_system_setting',
        entity_type: 'system_setting',
        entity_id: 1,
        details_json: { setting_key: 'clinic_name', old_value: null, new_value: 'Phòng khám XYZ' }
      }
    ]);
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng audit_logs.');
  } catch (error) {
    console.error('ERROR: Không thể thêm dữ liệu mẫu:', error.message);
    throw error;
  }
}

module.exports = { sequelize, models, initializeDatabase, seedData };

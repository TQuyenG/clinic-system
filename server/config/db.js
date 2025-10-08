// server/config/db.js - HOÀN CHỈNH
const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../../.env') 
});

const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

// Log để kiểm tra biến môi trường được load
console.log('Database Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'
});

// Khởi tạo Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: console.log
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
    
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Không thể kết nối database trước khi seed');
    }

    // ==================== BƯỚC 1: Specialties ====================
    console.log('1. Thêm Specialties...');
    const specialties = await models.Specialty.bulkCreate([
      { name: 'Cardiology', description: 'Chuyên khoa tim mạch', slug: 'cardiology', created_at: new Date(), updated_at: new Date() },
      { name: 'Neurology', description: 'Chuyên khoa thần kinh', slug: 'neurology', created_at: new Date(), updated_at: new Date() }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng specialties.');

    // ==================== BƯỚC 2: Categories ====================
    console.log('2. Thêm Categories...');
    const categories = await models.Category.bulkCreate([
      // Danh mục THUỐC
      { category_type: 'thuoc', name: 'Thuốc giảm đau', slug: 'thuoc-giam-dau', description: 'Các loại thuốc giảm đau, hạ sốt', created_at: new Date(), updated_at: new Date() },
      { category_type: 'thuoc', name: 'Thuốc kháng sinh', slug: 'thuoc-khang-sinh', description: 'Các loại thuốc kháng sinh', created_at: new Date(), updated_at: new Date() },
      { category_type: 'thuoc', name: 'Thuốc bổ sung', slug: 'thuoc-bo-sung', description: 'Vitamin và khoáng chất', created_at: new Date(), updated_at: new Date() },
      
      // Danh mục BỆNH LÝ
      { category_type: 'benh_ly', name: 'Bệnh tim mạch', slug: 'benh-tim-mach', description: 'Các bệnh liên quan đến tim mạch', created_at: new Date(), updated_at: new Date() },
      { category_type: 'benh_ly', name: 'Bệnh hô hấp', slug: 'benh-ho-hap', description: 'Các bệnh hô hấp', created_at: new Date(), updated_at: new Date() },
      { category_type: 'benh_ly', name: 'Bệnh tiêu hóa', slug: 'benh-tieu-hoa', description: 'Các bệnh tiêu hóa', created_at: new Date(), updated_at: new Date() },
      
      // Danh mục BÀI VIẾT THÔNG THƯỜNG
      { category_type: 'tin_tuc', name: 'Sức khỏe tổng quát', slug: 'suc-khoe-tong-quat', description: 'Bài viết về sức khỏe chung', created_at: new Date(), updated_at: new Date() },
      { category_type: 'tin_tuc', name: 'Dinh dưỡng', slug: 'dinh-duong', description: 'Bài viết về dinh dưỡng', created_at: new Date(), updated_at: new Date() },
      { category_type: 'tin_tuc', name: 'Lối sống lành mạnh', slug: 'loi-song-lanh-manh', description: 'Bài viết về lối sống', created_at: new Date(), updated_at: new Date() }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng categories.');

    // Tìm category cho thuoc, benh_ly, tin_tuc
const thuocCategory = categories.find(c => c.category_type === 'thuoc' && c.name === 'Thuốc giảm đau') || null;
const benhLyCategory = categories.find(c => c.category_type === 'benh_ly' && c.name === 'Bệnh tim mạch') || null;
const tinTucCategory = categories.find(c => c.category_type === 'tin_tuc' && c.name === 'Sức khỏe tổng quát') || null;

console.log('thuocCategory:', thuocCategory ? thuocCategory.toJSON() : 'null');
console.log('benhLyCategory:', benhLyCategory ? benhLyCategory.toJSON() : 'null');
console.log('tinTucCategory:', tinTucCategory ? tinTucCategory.toJSON() : 'null');

if (!thuocCategory || !benhLyCategory || !tinTucCategory) {
  throw new Error('Một hoặc nhiều danh mục không được tìm thấy');
}

    // ==================== BƯỚC 3: Users ====================
    console.log('3. Thêm Users...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);
    
    const users = await models.User.bulkCreate([
      {
        username: 'patient1',
        email: 'patient1@example.com',
        password_hash: hashedPassword,
        full_name: 'Nguyễn Văn A',
        phone: '0123456789',
        role: 'patient',
        avatar_url: '/avatars/patient1.jpg',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'patient2',
        email: 'patient2@example.com',
        password_hash: hashedPassword,
        full_name: 'Trần Thị B',
        phone: '0987654321',
        role: 'patient',
        is_verified: true,
        avatar_url: '/avatars/patient2.jpg',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'staff1',
        email: 'staff1@example.com',
        password_hash: hashedPassword,
        full_name: 'Lê Văn C',
        phone: '0112233445',
        role: 'staff',
        avatar_url: '/avatars/staff1.jpg',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'staff2',
        email: 'staff2@example.com',
        password_hash: hashedPassword,
        full_name: 'Phạm Thị D',
        phone: '0556677889',
        role: 'staff',
        avatar_url: '/avatars/staff2.jpg',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'doctor1',
        email: 'doctor1@example.com',
        password_hash: hashedPassword,
        full_name: 'Bác sĩ Nguyễn E',
        phone: '0334455667',
        role: 'doctor',
        avatar_url: '/avatars/doctor1.jpg',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'doctor2',
        email: 'doctor2@example.com',
        password_hash: hashedPassword,
        full_name: 'Bác sĩ Trần F',
        phone: '0778899001',
        role: 'doctor',
        avatar_url: '/avatars/doctor2.jpg',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'admin1',
        email: 'admin1@example.com',
        password_hash: hashedPassword,
        full_name: 'Quản trị viên G',
        phone: '0990011223',
        role: 'admin',
        avatar_url: '/avatars/admin1.jpg',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'admin2',
        email: 'admin2@example.com',
        password_hash: hashedPassword,
        full_name: 'Quản trị viên H',
        phone: '0445566778',
        role: 'admin',
        avatar_url: '/avatars/admin2.jpg',
        is_active: true,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng users.');

    // ==================== BƯỚC 4: Profiles ====================
    console.log('4. Thêm Profiles...');
    
    // Patients
    const patientCount = await models.Patient.count({ transaction });
    const patientData = [
      { user_id: users[0].id, medical_history: 'Không có', created_at: new Date(), updated_at: new Date() },
      { user_id: users[1].id, medical_history: 'Dị ứng penicillin', created_at: new Date(), updated_at: new Date() }
    ].map((patient, index) => ({
      ...patient,
      username: users[index].username,
      code: `PT${String(patientCount + index + 1).padStart(5, '0')}`
    }));
    
    console.log('Dữ liệu Patient trước khi chèn:', patientData);
    const patients = await models.Patient.bulkCreate(patientData, { transaction, validate: true });
    
    // Staffs
    const staffCount = await models.Staff.count({ transaction });
    const staffData = [
      { user_id: users[2].id, department: 'Hành chính', created_at: new Date(), updated_at: new Date() },
      { user_id: users[3].id, department: 'Chăm sóc khách hàng', created_at: new Date(), updated_at: new Date() }
    ].map((staff, index) => ({
      ...staff,
      username: users[index + 2].username,
      code: `ST${String(staffCount + index + 1).padStart(5, '0')}`
    }));
    
    console.log('Dữ liệu Staff trước khi chèn:', staffData);
    const staffs = await models.Staff.bulkCreate(staffData, { transaction, validate: true });
    
    // Doctors
    const doctorCount = await models.Doctor.count({ transaction });
    const doctorData = [
      { 
        user_id: users[4].id, 
        specialty_id: specialties[0].id, 
        experience_years: 10, 
        bio: 'Chuyên gia tim mạch với 10 năm kinh nghiệm', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        user_id: users[5].id, 
        specialty_id: specialties[1].id, 
        experience_years: 8, 
        bio: 'Chuyên gia thần kinh với 8 năm kinh nghiệm', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ].map((doctor, index) => ({
      ...doctor,
      username: users[index + 4].username,
      code: `DR${String(doctorCount + index + 1).padStart(5, '0')}`
    }));
    
    console.log('Dữ liệu Doctor trước khi chèn:', doctorData);
    const doctors = await models.Doctor.bulkCreate(doctorData, { transaction, validate: true });
    
    // Admins
    const adminCount = await models.Admin.count({ transaction });
    const adminData = [
      { user_id: users[6].id, permissions_json: ['all'], created_at: new Date(), updated_at: new Date() },
      { user_id: users[7].id, permissions_json: ['manage_users', 'manage_content'], created_at: new Date(), updated_at: new Date() }
    ].map((admin, index) => ({
      ...admin,
      username: users[index + 6].username,
      code: `AD${String(adminCount + index + 1).padStart(5, '0')}`
    }));
    
    console.log('Dữ liệu Admin trước khi chèn:', adminData);
    const admins = await models.Admin.bulkCreate(adminData, { transaction, validate: true });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho các bảng profiles.');

    // ==================== BƯỚC 5: Medicines ====================
    console.log('5. Thêm Medicines...');
    const medicines = await models.Medicine.bulkCreate([
      { 
        category_id: thuocCategory.id, 
        name: 'Paracetamol', 
        composition: 'Acetaminophen 500mg', 
        uses: 'Giảm đau, hạ sốt', 
        side_effects: 'Buồn nôn, phát ban', 
        manufacturer: 'Sanofi', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: thuocCategory.id, 
        name: 'Amoxicillin', 
        composition: 'Amoxicillin 500mg', 
        uses: 'Kháng sinh điều trị nhiễm khuẩn', 
        side_effects: 'Tiêu chảy, dị ứng', 
        manufacturer: 'Pfizer', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medicines.');

    // ==================== BƯỚC 6: Diseases ====================
    console.log('6. Thêm Diseases...');
    const diseases = await models.Disease.bulkCreate([
      { 
        category_id: benhLyCategory.id, 
        name: 'Cao huyết áp', 
        symptoms: 'Đau đầu, chóng mặt', 
        treatments: 'Thuốc hạ huyết áp, chế độ ăn', 
        description: 'Tình trạng huyết áp cao kéo dài', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: benhLyCategory.id, 
        name: 'Viêm dạ dày', 
        symptoms: 'Đau bụng, buồn nôn', 
        treatments: 'Thuốc bảo vệ dạ dày, kháng sinh nếu cần', 
        description: 'Viêm niêm mạc dạ dày', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng diseases.');

    // ==================== BƯỚC 7: Articles ====================
    console.log('7. Thêm Articles...');
    const articles = await models.Article.bulkCreate([
      // Bài viết thông thường
      { 
        title: 'Lợi ích của tập thể dục hàng ngày', 
        slug: 'loi-ich-tap-the-duc', 
        content: '<p>Tập thể dục giúp cải thiện sức khỏe tim mạch và tinh thần.</p>', 
        category_id: tinTucCategory.id, 
        author_id: staffs[0].user_id, 
        entity_type: 'article', 
        entity_id: null, 
        tags_json: ['sức khỏe', 'tập luyện'], 
        status: 'approved', 
        views: 150, 
        source: 'https://health.com', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Chế độ ăn lành mạnh', 
        slug: 'che-do-an-lanh-manh', 
        content: '<p>Ăn nhiều rau củ quả và giảm đồ ăn nhanh.</p>', 
        category_id: tinTucCategory.id, 
        author_id: staffs[1].user_id, 
        entity_type: 'article', 
        entity_id: null, 
        tags_json: ['dinh dưỡng', 'ăn uống'], 
        status: 'pending', 
        views: 80, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      
      // Bài viết liên kết với Medicine
      { 
        title: medicines[0].name, 
        slug: 'paracetamol', 
        content: '<p>Chi tiết về thuốc Paracetamol.</p>', 
        category_id: medicines[0].category_id, 
        author_id: doctors[0].user_id, 
        entity_type: 'medicine', 
        entity_id: medicines[0].id, 
        tags_json: ['thuốc giảm đau', 'hạ sốt'], 
        status: 'approved', 
        views: 200, 
        source: 'https://medicine.com/paracetamol', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: medicines[1].name, 
        slug: 'amoxicillin', 
        content: '<p>Chi tiết về thuốc Amoxicillin.</p>', 
        category_id: medicines[1].category_id, 
        author_id: doctors[1].user_id, 
        entity_type: 'medicine', 
        entity_id: medicines[1].id, 
        tags_json: ['kháng sinh', 'nhiễm khuẩn'], 
        status: 'pending', 
        views: 120, 
        source: 'https://medicine.com/amoxicillin', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      
      // Bài viết liên kết với Disease
      { 
        title: diseases[0].name, 
        slug: 'cao-huyet-ap', 
        content: '<p>Chi tiết về bệnh cao huyết áp.</p>', 
        category_id: diseases[0].category_id, 
        author_id: doctors[0].user_id, 
        entity_type: 'disease', 
        entity_id: diseases[0].id, 
        tags_json: ['tim mạch', 'huyết áp'], 
        status: 'approved', 
        views: 300, 
        source: 'https://health.com/hypertension', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: diseases[1].name, 
        slug: 'viem-da-day', 
        content: '<p>Chi tiết về bệnh viêm dạ dày.</p>', 
        category_id: diseases[1].category_id, 
        author_id: doctors[1].user_id, 
        entity_type: 'disease', 
        entity_id: diseases[1].id, 
        tags_json: ['tiêu hóa', 'dạ dày'], 
        status: 'pending', 
        views: 180, 
        source: 'https://health.com/gastritis', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng articles.');

    // ==================== BƯỚC 8: Interactions ====================
    console.log('8. Thêm Interactions...');
    const interactions = await models.Interaction.bulkCreate([
      // Interactions cho Articles thông thường
      { 
        user_id: patients[0].id, 
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.1',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].id, 
        entity_type: 'article', 
        entity_id: articles[1].id, 
        interaction_type: 'like',
        created_at: new Date(),
        updated_at: new Date()
      },
      
      // Interactions cho Medicines (qua entity_type 'medicine')
      { 
        user_id: patients[0].id, 
        entity_type: 'medicine', 
        entity_id: medicines[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.2',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: doctors[0].id, 
        entity_type: 'medicine', 
        entity_id: medicines[1].id, 
        interaction_type: 'share',
        created_at: new Date(),
        updated_at: new Date()
      },
      
      // Interactions cho Diseases (qua entity_type 'disease')
      { 
        user_id: patients[1].id, 
        entity_type: 'disease', 
        entity_id: diseases[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.3',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: doctors[1].id, 
        entity_type: 'disease', 
        entity_id: diseases[1].id, 
        interaction_type: 'bookmark',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng interactions.');

    await transaction.commit();
    console.log('SUCCESS: Transaction commit thành công. Dữ liệu đã được ghi vào DB.');
  } catch (error) {
    await transaction.rollback();
    console.error('ERROR: Transaction rollback:', error.message);
    console.error('ERROR trong seedData:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
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
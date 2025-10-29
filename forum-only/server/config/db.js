// server/config/db.js - HOÀN CHỈNH
const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../../.env') 
});

const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

// Log để kiểm tra biến môi trường được load
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
console.log('Database Config:', {
  host: process.env.DB_HOST,
  port: DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'
});

// Khởi tạo Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: DB_PORT,
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
      port: DB_PORT,
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

async function cleanupDuplicateIndexes(tableName, columns) {
  try {
    if (!tableName || !Array.isArray(columns) || columns.length === 0) {
      return;
    }

    const [indexes] = await sequelize.query(
      `
        SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY INDEX_NAME
      `,
      { replacements: [process.env.DB_NAME, tableName] }
    );

    for (const column of columns) {
      const columnIndexes = indexes.filter((idx) => idx.COLUMN_NAME === column);
      if (columnIndexes.length <= 1) {
        continue;
      }

      const keeper =
        columnIndexes.find((idx) => idx.NON_UNIQUE === 0) || columnIndexes[0];

      for (const index of columnIndexes) {
        if (index.INDEX_NAME === keeper.INDEX_NAME) {
          continue;
        }

        await sequelize.query(
          `ALTER TABLE \`${tableName}\` DROP INDEX \`${index.INDEX_NAME}\``
        );
        console.log(
          `WARN: Đã xóa index trùng ${index.INDEX_NAME} trên ${tableName}.${column}`
        );
      }
    }
  } catch (error) {
    console.warn(
      `WARN: Không thể dọn dẹp index trùng lặp cho bảng ${tableName}:`,
      error.message
    );
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
  Report: require('../models/Report')(sequelize),
  SystemSetting: require('../models/SystemSetting')(sequelize),
  Question: require('../models/Question')(sequelize),
  Answer: require('../models/Answer')(sequelize),
  MedicalRecord: require('../models/MedicalRecord')(sequelize),
  AuditLog: require('../models/AuditLog')(sequelize),
  ArticleReviewHistory: require('../models/ArticleReviewHistory')(sequelize),
  ArticleComment: require('../models/ArticleComment')(sequelize)
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

    // // ==================== BƯỚC 8: Interactions ====================
    // console.log('8. Thêm Interactions...');
    // const interactions = await models.Interaction.bulkCreate([
    //   // Interactions cho Articles thông thường
    //   { 
    //     user_id: patients[0].id, 
    //     entity_type: 'article', 
    //     entity_id: articles[0].id, 
    //     interaction_type: 'view',
    //     ip_address: '192.168.1.1',
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   },
    //   { 
    //     user_id: patients[1].id, 
    //     entity_type: 'article', 
    //     entity_id: articles[1].id, 
    //     interaction_type: 'like',
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   },
      
    //   // Interactions cho Medicines (qua entity_type 'medicine')
    //   { 
    //     user_id: patients[0].id, 
    //     entity_type: 'medicine', 
    //     entity_id: medicines[0].id, 
    //     interaction_type: 'view',
    //     ip_address: '192.168.1.2',
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   },
    //   { 
    //     user_id: doctors[0].id, 
    //     entity_type: 'medicine', 
    //     entity_id: medicines[1].id, 
    //     interaction_type: 'share',
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   },
      
    //   // Interactions cho Diseases (qua entity_type 'disease')
    //   { 
    //     user_id: patients[1].id, 
    //     entity_type: 'disease', 
    //     entity_id: diseases[0].id, 
    //     interaction_type: 'view',
    //     ip_address: '192.168.1.3',
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   },
    //   { 
    //     user_id: doctors[1].id, 
    //     entity_type: 'disease', 
    //     entity_id: diseases[1].id, 
    //     interaction_type: 'bookmark',
    //     created_at: new Date(),
    //     updated_at: new Date()
    //   }
    // ], { transaction });
    // console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng interactions.');

    // ==================== BƯỚC 9: ArticleReviewHistory ====================
    console.log('9. Thêm ArticleReviewHistory...');

    // Tạo lịch sử cho bài viết pending của staff1
    await models.ArticleReviewHistory.create({
      article_id: articles[0].id, // Bài "Lợi ích của tập thể dục"
      reviewer_id: admins[0].user_id,
      author_id: staffs[0].user_id,
      action: 'submit',
      previous_status: 'draft',
      new_status: 'pending',
      created_at: new Date(Date.now() - 86400000 * 2), // 2 ngày trước
      metadata_json: { version: 1 }
    }, { transaction });

    // Admin yêu cầu viết lại
    await models.ArticleReviewHistory.create({
      article_id: articles[0].id,
      reviewer_id: admins[0].user_id,
      author_id: staffs[0].user_id,
      action: 'request_rewrite',
      reason: 'Nội dung cần bổ sung thêm các nghiên cứu khoa học. Hình ảnh minh họa chưa rõ ràng.',
      previous_status: 'pending',
      new_status: 'request_rewrite',
      created_at: new Date(Date.now() - 86400000), // 1 ngày trước
      metadata_json: { version: 1 }
    }, { transaction });

    // Staff gửi lại
    await models.ArticleReviewHistory.create({
      article_id: articles[0].id,
      reviewer_id: staffs[0].user_id,
      author_id: staffs[0].user_id,
      action: 'resubmit',
      previous_status: 'request_rewrite',
      new_status: 'pending',
      created_at: new Date(Date.now() - 3600000 * 12), // 12 giờ trước
      metadata_json: { version: 2, changes: ['Đã thêm 3 nghiên cứu', 'Thay hình ảnh HD'] }
    }, { transaction });

    // Bài viết đã được duyệt
    await models.ArticleReviewHistory.create({
      article_id: articles[2].id, // Bài Paracetamol (medicine)
      reviewer_id: admins[0].user_id,
      author_id: doctors[0].user_id,
      action: 'submit',
      previous_status: 'draft',
      new_status: 'pending',
      created_at: new Date(Date.now() - 86400000 * 5),
      metadata_json: { version: 1 }
    }, { transaction });

    await models.ArticleReviewHistory.create({
      article_id: articles[2].id,
      reviewer_id: admins[0].user_id,
      author_id: doctors[0].user_id,
      action: 'approve',
      reason: 'Nội dung chính xác, đầy đủ thông tin.',
      previous_status: 'pending',
      new_status: 'approved',
      created_at: new Date(Date.now() - 86400000 * 4),
      metadata_json: { version: 1 }
    }, { transaction });

    // Staff yêu cầu chỉnh sửa bài đã duyệt
    await models.ArticleReviewHistory.create({
      article_id: articles[2].id,
      reviewer_id: doctors[0].user_id,
      author_id: doctors[0].user_id,
      action: 'request_edit',
      reason: 'Cần cập nhật liều lượng mới theo hướng dẫn 2024.',
      previous_status: 'approved',
      new_status: 'request_edit',
      created_at: new Date(Date.now() - 86400000),
      metadata_json: { version: 1 }
    }, { transaction });

    // Admin cho phép chỉnh sửa
    await models.ArticleReviewHistory.create({
      article_id: articles[2].id,
      reviewer_id: admins[0].user_id,
      author_id: doctors[0].user_id,
      action: 'allow_edit',
      reason: 'Đồng ý cho phép cập nhật thông tin.',
      previous_status: 'request_edit',
      new_status: 'pending',
      created_at: new Date(Date.now() - 3600000 * 6),
      metadata_json: { version: 1 }
    }, { transaction });

    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng article_review_history.');

    // ==================== BƯỚC 10: ArticleComments ====================
console.log('10. Thêm ArticleComments...');

// Comment cho bài viết pending (articles[1] - "Chế độ ăn lành mạnh")
await models.ArticleComment.bulkCreate([
  {
    article_id: articles[1].id,
    user_id: admins[0].user_id,
    comment_text: 'Bài viết này cần bổ sung thêm nguồn tham khảo khoa học. Bạn có thể thêm links đến các nghiên cứu không?',
    created_at: new Date(Date.now() - 3600000 * 6), // 6 giờ trước
    updated_at: new Date(Date.now() - 3600000 * 6)
  },
  {
    article_id: articles[1].id,
    user_id: staffs[1].user_id,
    comment_text: 'Dạ em đã thêm 3 nguồn từ WHO và Ministry of Health. Anh xem giúp em nhé!',
    created_at: new Date(Date.now() - 3600000 * 4), // 4 giờ trước
    updated_at: new Date(Date.now() - 3600000 * 4)
  },
  {
    article_id: articles[1].id,
    user_id: admins[0].user_id,
    comment_text: 'OK rồi, em làm tốt lắm. Anh sẽ duyệt bài này.',
    created_at: new Date(Date.now() - 3600000 * 2), // 2 giờ trước
    updated_at: new Date(Date.now() - 3600000 * 2)
  }
], { transaction });

// Comment cho bài medicine (articles[3] - Amoxicillin)
await models.ArticleComment.bulkCreate([
  {
    article_id: articles[3].id,
    user_id: admins[0].user_id,
    comment_text: 'Liều lượng cho trẻ em chưa được nêu rõ. Bác sĩ cần bổ sung thêm phần này.',
    created_at: new Date(Date.now() - 86400000 * 3), // 3 ngày trước
    updated_at: new Date(Date.now() - 86400000 * 3)
  },
  {
    article_id: articles[3].id,
    user_id: doctors[1].user_id,
    comment_text: 'Em đã thêm bảng liều lượng theo độ tuổi và cân nặng ạ.',
    created_at: new Date(Date.now() - 86400000 * 2), // 2 ngày trước
    updated_at: new Date(Date.now() - 86400000 * 2)
  }
], { transaction });

console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng article_comments.');

// ==================== BƯỚC 11: Thêm data cho Interactions với view tracking ====================
console.log('11. Cập nhật Interactions với view tracking...');

// Thêm view tracking cho các bài viết (bao gồm IP để tránh spam)
await models.Interaction.bulkCreate([
  // Views cho bài "Lợi ích của tập thể dục"
      { 
        user_id: null, // Anonymous view
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.100',
        created_at: new Date(Date.now() - 86400000 * 5),
        updated_at: new Date(Date.now() - 86400000 * 5)
      },
      { 
        user_id: patients[0].user_id,
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.101',
        created_at: new Date(Date.now() - 86400000 * 4),
        updated_at: new Date(Date.now() - 86400000 * 4)
      },
      { 
        user_id: patients[0].user_id,
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'like',
        created_at: new Date(Date.now() - 86400000 * 4),
        updated_at: new Date(Date.now() - 86400000 * 4)
      },
      { 
        user_id: patients[1].user_id,
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'save',
        created_at: new Date(Date.now() - 86400000 * 3),
        updated_at: new Date(Date.now() - 86400000 * 3)
      },
      // Interactions cho bài Paracetamol
      { 
        user_id: null,
        entity_type: 'article', 
        entity_id: articles[2].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.102',
        created_at: new Date(Date.now() - 86400000 * 2),
        updated_at: new Date(Date.now() - 86400000 * 2)
      },
      { 
        user_id: patients[0].user_id,
        entity_type: 'article', 
        entity_id: articles[2].id, 
        interaction_type: 'like',
        created_at: new Date(Date.now() - 86400000),
        updated_at: new Date(Date.now() - 86400000)
      },
      { 
        user_id: patients[1].user_id,
        entity_type: 'article', 
        entity_id: articles[2].id, 
        interaction_type: 'share',
        metadata_json: { platform: 'facebook' },
        created_at: new Date(Date.now() - 3600000 * 12),
        updated_at: new Date(Date.now() - 3600000 * 12)
      },
      // Report cho bài "Chế độ ăn lành mạnh"
      { 
        user_id: patients[0].user_id,
        entity_type: 'article', 
        entity_id: articles[1].id, 
        interaction_type: 'report',
        reason: 'Nội dung không chính xác, thiếu nguồn tham khảo',
        created_at: new Date(Date.now() - 3600000 * 10),
        updated_at: new Date(Date.now() - 3600000 * 10)
      }
], { transaction });

console.log('SUCCESS: Cập nhật dữ liệu mẫu cho bảng interactions.');

// ==================== BƯỚC 12: Cập nhật views count cho Articles ====================
console.log('12. Cập nhật views count cho Articles...');

// Đếm views từ interactions và cập nhật vào articles
for (const article of articles) {
  const viewCount = await models.Interaction.count({
    where: {
      entity_type: 'article',
      entity_id: article.id,
      interaction_type: 'view'
    },
    transaction
  });

  await article.update({ views: viewCount }, { transaction });
}

console.log('SUCCESS: Đã cập nhật views count cho tất cả bài viết.');

// ==================== BƯỚC 13: Thêm history cho hidden article ====================
console.log('13. Thêm lịch sử ẩn bài viết...');

// Giả lập: Admin ẩn bài viết "Chế độ ăn lành mạnh" do có báo cáo
const articleToHide = articles[1]; // "Chế độ ăn lành mạnh"

await articleToHide.update({ status: 'hidden' }, { transaction });

await models.ArticleReviewHistory.create({
  article_id: articleToHide.id,
  reviewer_id: admins[0].user_id,
  author_id: articleToHide.author_id,
  action: 'hide',
  reason: 'Bài viết có báo cáo vi phạm về nội dung thiếu nguồn tham khảo. Yêu cầu tác giả bổ sung và gửi lại.',
  previous_status: 'pending',
  new_status: 'hidden',
  created_at: new Date(Date.now() - 3600000),
  metadata_json: { report_count: 1 }
}, { transaction });

console.log('SUCCESS: Đã thêm lịch sử ẩn bài viết.');

        // ==================== BƯỚC 14: SystemSetting ====================
    console.log('14. Thêm SystemSettings...');
    await models.SystemSetting.bulkCreate([
      {
        setting_key: 'home',
        value_json: {
          bannerSlides: [
            {
              title: 'Chào mừng đến với Clinic System',
              subtitle: 'Nơi sức khỏe của bạn được đặt lên hàng đầu',
              description: 'Dịch vụ y tế chất lượng cao với đội ngũ bác sĩ tận tâm và chuyên nghiệp',
              image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1920&h=800&fit=crop'
            },
            {
              title: 'Công nghệ y tế hiện đại',
              subtitle: 'Trang thiết bị tiên tiến nhất',
              description: 'Chẩn đoán chính xác với công nghệ y tế hàng đầu thế giới',
              image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1920&h=800&fit=crop'
            },
            {
              title: 'Đội ngũ bác sĩ chuyên nghiệp',
              subtitle: 'Giàu kinh nghiệm và tận tâm',
              description: 'Luôn sẵn sàng chăm sóc sức khỏe của bạn 24/7',
              image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1920&h=800&fit=crop'
            }
          ],
          features: [
            {
              icon: 'FaUserMd',
              title: 'Bác sĩ chuyên nghiệp',
              description: 'Đội ngũ y bác sĩ giàu kinh nghiệm, tận tâm',
              color: '#4ade80'
            },
            {
              icon: 'FaHospital',
              title: 'Cơ sở hiện đại',
              description: 'Trang thiết bị y tế tiên tiến nhất',
              color: '#22c55e'
            },
            {
              icon: 'FaAmbulance',
              title: 'Cấp cứu 24/7',
              description: 'Sẵn sàng phục vụ mọi lúc, mọi nơi',
              color: '#16a34a'
            },
            {
              icon: 'FaShieldAlt',
              title: 'An toàn tuyệt đối',
              description: 'Quy trình khám chữa bệnh chuẩn quốc tế',
              color: '#15803d'
            }
          ],
          stats: [
            { number: '15+', label: 'Năm kinh nghiệm', icon: 'FaAward', color: '#4ade80' },
            { number: '50+', label: 'Bác sĩ chuyên khoa', icon: 'FaUserMd', color: '#22c55e' },
            { number: '100K+', label: 'Bệnh nhân tin tưởng', icon: 'FaHeart', color: '#16a34a' },
            { number: '20+', label: 'Chuyên khoa', icon: 'FaStethoscope', color: '#15803d' }
          ],
          testimonials: [
            {
              name: 'Nguyễn Thị Hương',
              comment: 'Dịch vụ tuyệt vời, bác sĩ rất tận tâm và chu đáo. Tôi rất hài lòng với chất lượng khám chữa bệnh tại đây.',
              rating: 5,
              avatar: 'https://i.pravatar.cc/150?img=1'
            },
            {
              name: 'Trần Văn Nam',
              comment: 'Cơ sở vật chất hiện đại, quy trình khám nhanh chóng. Đội ngũ y bác sĩ chuyên nghiệp và nhiệt tình.',
              rating: 5,
              avatar: 'https://i.pravatar.cc/150?img=2'
            },
            {
              name: 'Lê Thị Mai',
              comment: 'Phòng khám sạch sẽ, thoáng mát. Bác sĩ khám rất kỹ càng và giải thích rõ ràng về tình trạng bệnh.',
              rating: 5,
              avatar: 'https://i.pravatar.cc/150?img=3'
            }
          ]
        }
      },
      {
        setting_key: 'about',
        value_json: {
          milestones: [
            { 
              year: '2009', 
              title: 'Thành lập', 
              description: 'Clinic System được thành lập bởi PGS.TS.BS Trần Văn Minh với tầm nhìn mang đến dịch vụ y tế chất lượng cao cho cộng đồng.',
              image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop'
            },
            { 
              year: '2012', 
              title: 'Mở rộng cơ sở', 
              description: 'Khánh thành tòa nhà mới với 100 giường bệnh và trang thiết bị hiện đại nhất khu vực.',
              image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&h=400&fit=crop'
            },
            { 
              year: '2015', 
              title: 'Chứng nhận ISO', 
              description: 'Đạt chứng nhận ISO 9001:2015 về hệ thống quản lý chất lượng dịch vụ y tế.',
              image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop'
            },
            { 
              year: '2018', 
              title: 'Trung tâm nghiên cứu', 
              description: 'Thành lập Trung tâm Nghiên cứu và Đào tạo Y khoa, hợp tác với các trường đại học hàng đầu.',
              image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=400&fit=crop'
            },
            { 
              year: '2021', 
              title: 'Chuyển đổi số', 
              description: 'Triển khai hệ thống quản lý bệnh viện điện tử toàn diện, ứng dụng AI trong chẩn đoán.',
              image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop'
            },
            { 
              year: '2024', 
              title: 'Mở rộng mạng lưới', 
              description: 'Phát triển 5 chi nhánh tại các thành phố lớn, phục vụ hơn 100,000 bệnh nhân mỗi năm.',
              image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&h=400&fit=crop'
            }
          ],
          values: [
            {
              icon: 'FaHeart',
              title: 'Tận tâm',
              description: 'Đặt sức khỏe và hạnh phúc của bệnh nhân lên hàng đầu trong mọi quyết định.'
            },
            {
              icon: 'FaShieldAlt',
              title: 'Chuyên nghiệp',
              description: 'Tuân thủ nghiêm ngặt các tiêu chuẩn quốc tế về chất lượng và an toàn.'
            },
            {
              icon: 'FaMicroscope',
              title: 'Đổi mới',
              description: 'Không ngừng cập nhật công nghệ và phương pháp điều trị tiên tiến nhất.'
            },
            {
              icon: 'FaHandshake',
              title: 'Tôn trọng',
              description: 'Lắng nghe và tôn trọng mọi ý kiến, quyền lợi của bệnh nhân và gia đình.'
            }
          ],
          achievements: [
            { icon: 'FaTrophy', title: 'Top 10 Bệnh viện tư nhân uy tín', year: '2023' },
            // ... thêm từ code nếu có
          ],
          leadership: [], // Nếu có trong code đầy đủ
          facilities: [] // Nếu có
        }
      },
      {
        setting_key: 'facilities',
        value_json: {
          facilities: [
            {
              icon: 'FaBed',
              title: 'Phòng khám hiện đại',
              description: 'Hệ thống phòng khám được trang bị đầy đủ tiện nghi, không gian rộng rãi, thoáng mát',
              image: 'https://via.placeholder.com/600x400?text=Phong+Kham',
              features: ['15 phòng khám chuyên khoa', 'Hệ thống điều hòa trung tâm', 'Thiết bị y tế hiện đại', 'Không gian riêng tư']
            },
            {
              icon: 'FaBuilding',
              title: 'Khu nội trú 4 tầng',
              description: 'Khu điều trị nội trú với 50 giường bệnh, phòng đơn VIP và phòng tập thể',
              image: 'https://via.placeholder.com/600x400?text=Khu+Noi+Tru',
              features: ['10 phòng VIP đơn', '20 phòng đôi', '5 phòng tập thể', 'Điều dưỡng 24/7']
            },
            {
              icon: 'FaShieldAlt',
              title: 'Phòng cấp cứu',
              description: 'Phòng cấp cứu hoạt động 24/7 với đầy đủ trang thiết bị hồi sức',
              image: 'https://via.placeholder.com/600x400?text=Cap+Cuu',
              features: ['Trực 24/7', '3 giường cấp cứu', 'Xe cứu thương', 'Phòng hồi sức tích cực']
            },
            {
              icon: 'FaLeaf',
              title: 'Khu vực chờ thoáng mát',
              description: 'Sảnh chờ rộng rãi với cây xanh, ghế ngồi êm ái và không gian yên tĩnh',
              image: 'https://via.placeholder.com/600x400?text=Sanh+Cho',
              features: ['Ghế ngồi thoải mái', 'Tivi màn hình lớn', 'Tạp chí & sách báo', 'Cây xanh trang trí']
            },
            {
              icon: 'FaParking',
              title: 'Bãi đỗ xe miễn phí',
              description: 'Bãi đỗ xe rộng 200m² với an ninh 24/7, miễn phí cho bệnh nhân',
              image: 'https://via.placeholder.com/600x400?text=Bai+Do+Xe',
              features: ['50 chỗ xe máy', '20 chỗ ô tô', 'An ninh 24/7', 'Có mái che']
            },
            {
              icon: 'FaCoffee',
              title: 'Quán café & Nhà thuốc',
              description: 'Quán café nhỏ và nhà thuốc tiện lợi ngay trong khuôn viên bệnh viện',
              image: 'https://via.placeholder.com/600x400?text=Cafe+Nha+Thuoc',
              features: ['Đồ uống giá ưu đãi', 'Nhà thuốc đầy đủ', 'Thực phẩm chức năng', 'Phục vụ nhanh chóng']
            }
          ],
          amenities: [
            { icon: 'FaWifi', name: 'WiFi miễn phí' },
            { icon: 'FaSnowflake', name: 'Điều hòa nhiệt độ' },
            { icon: 'FaShieldAlt', name: 'An ninh 24/7' },
            { icon: 'FaCoffee', name: 'Nước uống miễn phí' },
            { icon: 'FaBed', name: 'Ghế nằm thư giãn' },
            { icon: 'FaLeaf', name: 'Không gian xanh' }
          ],
          gallery: [
            { url: 'https://via.placeholder.com/400x300?text=Entrance', title: 'Lối vào chính' },
            { url: 'https://via.placeholder.com/400x300?text=Reception', title: 'Quầy tiếp đón' },
            { url: 'https://via.placeholder.com/400x300?text=Waiting+Area', title: 'Khu vực chờ' },
            { url: 'https://via.placeholder.com/400x300?text=Examination', title: 'Phòng khám' }
            // ... thêm nếu có
          ]
        }
      },
      {
        setting_key: 'equipment',
        value_json: {
          categories: [
            { id: 'all', name: 'Tất cả', icon: 'FaStethoscope' },
            { id: 'imaging', name: 'Chẩn đoán hình ảnh', icon: 'FaXRay' },
            { id: 'lab', name: 'Xét nghiệm', icon: 'FaMicroscope' },
            { id: 'cardio', name: 'Tim mạch', icon: 'FaHeartbeat' },
            { id: 'surgery', name: 'Phẫu thuật', icon: 'FaBone' }
          ],
          equipment: [
            {
              category: 'imaging',
              name: 'Máy CT Scanner 64 lát cắt',
              brand: 'Siemens Somatom',
              origin: 'Đức',
              year: '2023',
              image: 'https://via.placeholder.com/400x300?text=CT+Scanner',
              features: [
                'Chụp cắt lớp vi tính 64 lát cắt',
                'Tốc độ quét nhanh, giảm bức xạ',
                'Hình ảnh 3D chất lượng cao',
                'Chẩn đoán chính xác các bệnh lý'
              ],
              applications: ['Chấn thương', 'Ung thư', 'Bệnh mạch máu', 'Bệnh phổi']
            },
            {
              category: 'imaging',
              name: 'Máy MRI 1.5 Tesla',
              brand: 'GE Signa',
              origin: 'Mỹ',
              year: '2022',
              image: 'https://via.placeholder.com/400x300?text=MRI',
              features: [
                'Từ trường 1.5 Tesla',
                'Không sử dụng tia X',
                'Hình ảnh mô mềm sắc nét',
                'An toàn cho người bệnh'
              ],
              applications: ['Não bộ', 'Cột sống', 'Khớp', 'Ổ bụng']
            },
            // ... thêm các equipment khác từ code
          ],
          stats: [
            { number: '2000m²', label: 'Diện tích' },
            { number: '50', label: 'Giường bệnh' },
            { number: '15', label: 'Phòng khám' },
            { number: '24/7', label: 'Hoạt động' }
          ]
        }
      }
    ], { transaction, ignoreDuplicates: true });

    console.log('SUCCESS: Seed SystemSetting thành công.');

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

module.exports = { sequelize, models, initializeDatabase, seedData, cleanupDuplicateIndexes };

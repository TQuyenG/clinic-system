// server/config/db.js - HOÀN CHỈNH & SỬA LỖI ASSOCIATE
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const { getDefaultSystemSettings } = require('./defaultSystemSettings');


require('dotenv').config({ 
  path: path.join(__dirname, '../../.env') 
});

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

// === LOAD TẤT CẢ MODEL TỪ THƯ MỤC ===
const models = {};
const modelDir = path.join(__dirname, '../models');
const modelFiles = fs.readdirSync(modelDir).filter(file => file.endsWith('.js') && file !== 'index.js');

modelFiles.forEach(file => {
  try {
    const modelPath = path.join(modelDir, file);
    const model = require(modelPath)(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
    console.log(`SUCCESS: Loaded model ${model.name} from ${file}`);
  } catch (error) {
    console.error(`ERROR: Failed to load model from ${file}:`, error.message);
    throw error;
  }
});

// === THÊM REVIEW NẾU THIẾU ===
if (!models.Review) {
  console.warn('WARNING: Model Review không tồn tại, tạo placeholder...');
  models.Review = sequelize.define('Review', {}, { tableName: 'reviews' });
}

// === THIẾT LẬP QUAN HỆ SAU KHI LOAD TẤT CẢ ===
Object.values(models).forEach(model => {
  if (typeof model.associate === 'function') {
    try {
      model.associate(models);
      console.log(`SUCCESS: Quan hệ cho model ${model.name} đã được thiết lập.`);
    } catch (error) {
      console.error(`ERROR in associate for ${model.name}:`, error.message);
      throw error;
    }
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
        uses: 'Kháng sinh', 
        side_effects: 'Tiêu chảy, dị ứng', 
        manufacturer: 'GSK', 
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
        name: 'Tăng huyết áp', 
        symptoms: 'Đau đầu, chóng mặt', 
        causes: 'Di truyền, lối sống', 
        treatments: 'Thuốc hạ huyết áp, chế độ ăn', 
        prevention: 'Ăn mặn ít, tập thể dục', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: benhLyCategory.id, 
        name: 'Đau nửa đầu', 
        symptoms: 'Đau đầu một bên, buồn nôn', 
        causes: 'Stress, hormone', 
        treatments: 'Thuốc giảm đau, nghỉ ngơi', 
        prevention: 'Tránh trigger', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng diseases.');

    // ==================== BƯỚC 7: Articles ====================
    console.log('7. Thêm Articles...');
    const articles = await models.Article.bulkCreate([
      { 
        category_id: tinTucCategory.id, 
        title: 'Cách phòng ngừa bệnh tim mạch', 
        content: 'Nội dung bài viết về phòng ngừa tim mạch', 
        author_id: admins[0].user_id, 
        status: 'approved', 
        slug: 'cach-phong-ngua-benh-tim-mach', 
        meta_description: 'Hướng dẫn phòng ngừa', 
        meta_keywords: 'tim mach, phong ngua', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: tinTucCategory.id, 
        title: 'Dinh dưỡng cho người cao tuổi', 
        content: 'Nội dung bài viết về dinh dưỡng', 
        author_id: admins[1].user_id, 
        status: 'approved', 
        slug: 'dinh-duong-cho-nguoi-cao-tuoi', 
        meta_description: 'Dinh dưỡng người cao tuổi', 
        meta_keywords: 'dinh duong, cao tuoi', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng articles.');

    // ==================== BƯỚC 8: Interactions ====================
    console.log('8. Thêm Interactions...');
    await models.Interaction.bulkCreate([
      { 
        user_id: users[0].id, 
        interaction_type: 'view', 
        content_type: 'article', 
        entity_id: articles[0].id,
        created_at: new Date() 
      },
      { 
        user_id: users[1].id, 
        interaction_type: 'like', 
        content_type: 'article', 
        entity_id: articles[1].id, 
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng interactions.');

    // ==================== BƯỚC 9: ArticleReviewHistory ====================
    console.log('9. Thêm ArticleReviewHistory...');
    await models.ArticleReviewHistory.bulkCreate([
      { 
        article_id: articles[0].id, 
        reviewer_id: admins[0].user_id, 
        author_id: staffs[0].user_id,
        action: 'approve', 
        comments: 'Bài viết tốt', 
        new_status: 'approved',
        created_at: new Date() 
      },
      { 
        article_id: articles[1].id, 
        reviewer_id: admins[1].user_id, 
        author_id: staffs[1].user_id,
        action: 'approve', 
        comments: 'Cần chỉnh sửa', 
        new_status: 'approved',
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng article_review_history.');

    // ==================== BƯỚC 10: ArticleComment ====================
    console.log('10. Thêm ArticleComment...');
    await models.ArticleComment.bulkCreate([
      { 
        article_id: articles[0].id, 
        user_id: users[0].id, 
        comment_text: 'Bài viết hay', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        article_id: articles[1].id, 
        user_id: users[1].id, 
        comment_text: 'Cảm ơn tác giả', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng article_comments.');

    // ==================== BƯỚC 11: SystemSettings ====================
    console.log('11. Thêm SystemSettings...');
    await models.SystemSetting.bulkCreate([
      { 
        setting_key: 'site_name', 
        value_json: 'Clinic System', 
        updated_by: admins[0].user_id, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        setting_key: 'contact_email', 
        value_json: 'support@clinic.com', 
        updated_by: admins[1].user_id, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng system_settings.');

    // ==================== BƯỚC 17: SystemSetting cho Consultation ====================
    console.log('17. Thêm SystemSetting cho Consultation...');

    await models.SystemSetting.create({
      setting_key: 'consultation',
      value_json: {
        enabled: true,
        allow_chat: true,
        allow_video: true,
        allow_offline: true,
        default_chat_duration: 30,
        default_video_duration: 30,
        default_offline_duration: 60,
        platform_fee_percentage: 10,
        min_fee: 100000,
        max_fee: 2000000,
        cancel_before_hours: 24,
        refund_policy: {
          full_refund: 24,
          partial_refund: 12,
          no_refund: 0
        },
        auto_cancel_after_minutes:10,
        reminder_before_minutes: [30, 60],
        working_hours: {
          monday: { start: '08:00', end: '20:00', enabled: true },
          tuesday: { start: '08:00', end: '20:00', enabled: true },
          wednesday: { start: '08:00', end: '20:00', enabled: true },
          thursday: { start: '08:00', end: '20:00', enabled: true },
          friday: { start: '08:00', end: '20:00', enabled: true },
          saturday: { start: '08:00', end: '17:00', enabled: true },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        }
      },
      updated_by: admins[0].user_id,
      created_at: new Date(),
      updated_at: new Date()
    }, { transaction });

    console.log('SUCCESS: Thêm SystemSetting cho consultation.');

    // ==================== BƯỚC 18: Seed SystemSettings cho các trang ====================
    console.log('18. Seed SystemSettings cho các trang...');
    
    const defaultSettings = getDefaultSystemSettings();
    
    for (const setting of defaultSettings) {
      await models.SystemSetting.create({
        setting_key: setting.setting_key,
        value_json: setting.value_json,
        updated_by: admins[0].user_id,
        created_at: new Date(),
        updated_at: new Date()
      }, { transaction });
      
      console.log('Seed setting: ${setting.setting_key}');
    }
    
    console.log('SUCCESS: Đã seed 8 SystemSettings cho các trang.');

    await transaction.commit();
    console.log('SUCCESS: Transaction commit thành công. Dữ liệu đã được ghi vào DB.');
    
    // Cập nhật lại log tổng kết
    console.log('TỔNG KẾT DỮ LIỆU SEED:');
    console.log('   2 Specialties');
    console.log('   9 Categories');
    console.log('   8 Users (2 patients, 2 staff, 2 doctors, 2 admins)');
    console.log('   2 Medicines');
    console.log('   2 Diseases');
    console.log('   2 Articles');
    console.log('   2 Interactions');
    console.log('   2 ArticleReviewHistory');
    console.log('   2 ArticleComments');
    console.log('   2 SystemSettings');
    console.log('   8 SystemSetting (consultation config)');
    
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

module.exports = { sequelize, models, initializeDatabase, seedData, getDefaultSystemSettings };
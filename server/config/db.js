// server/config/db.js - HOÀN CHỈNH & SỬA LỖI ASSOCIATE
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

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

    // ==================== BƯỚC 12: ConsultationPricing ====================
    console.log('12. Thêm ConsultationPricing...');
    await models.ConsultationPricing.bulkCreate([
      { 
        doctor_id: doctors[0].id, 
        type: 'chat', 
        price: 200000, 
        duration: 30, 
        is_active: true, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        doctor_id: doctors[1].id, 
        type: 'video', 
        price: 500000, 
        duration: 45, 
        is_active: true, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng consultation_pricing.');

        // ==================== BƯỚC 13: Consultations ====================
    console.log('13. Thêm Consultations...');
    const now = new Date();

    // Dữ liệu mẫu cho 6 buổi tư vấn (không cần consultation_code - sẽ tự sinh)
    const consultationData = [
      {
        patient_id: patients[0].user_id,
        doctor_id: doctors[0].user_id,
        specialty_id: specialties[0].id,
        consultation_type: 'chat',
        appointment_time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
        status: 'in_progress',
        chief_complaint: 'Đau ngực khi vận động mạnh, khó thở',
        medical_history: 'Tăng huyết áp 3 năm, đang dùng thuốc',
        current_medications: 'Amlodipine 5mg/ngày',
        symptom_duration: '>1 tuần',
        base_fee: 300000,
        platform_fee: 30000,
        total_fee: 330000,
        payment_status: 'paid',
        paid_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        payment_method: 'momo',
        payment_transaction_id: 'MOMO123456789',
        started_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
        metadata: { platform: 'web', ip: '192.168.1.100' },
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000)
      },
      {
        patient_id: patients[1].user_id,
        doctor_id: doctors[1].user_id,
        specialty_id: specialties[1].id,
        consultation_type: 'video',
        appointment_time: new Date(now.getTime() + 30 * 60 * 1000),
        status: 'confirmed',
        chief_complaint: 'Đau đầu dữ dội, chóng mặt, buồn nôn',
        medical_history: 'Tiền sử migraine 5 năm',
        current_medications: 'Paracetamol khi cần',
        symptom_duration: 'Hôm nay',
        base_fee: 500000,
        platform_fee: 50000,
        total_fee: 550000,
        payment_status: 'paid',
        paid_at: new Date(now.getTime() - 5 * 60 * 1000),
        payment_method: 'vnpay',
        payment_transaction_id: 'VNPAY987654321',
        metadata: { platform: 'mobile', device: 'iPhone 14' },
        created_at: new Date(now.getTime() - 10 * 60 * 1000),
        updated_at: new Date(now.getTime() - 5 * 60 * 1000)
      },
      {
        patient_id: patients[0].user_id,
        doctor_id: doctors[0].user_id,
        specialty_id: specialties[0].id,
        consultation_type: 'chat',
        appointment_time: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        status: 'completed',
        chief_complaint: 'Đau ngực nhẹ, hồi hộp',
        medical_history: 'Không có',
        current_medications: 'Không dùng',
        symptom_duration: '2-3 ngày',
        base_fee: 250000,
        platform_fee: 25000,
        total_fee: 275000,
        payment_status: 'paid',
        paid_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000),
        payment_method: 'bank_transfer',
        started_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
        ended_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000),
        diagnosis: 'Rối loạn nhịp tim nhẹ do căng thẳng',
        treatment_plan: 'Nghỉ ngơi, giảm stress, theo dõi huyết áp',
        severity_level: 'normal',
        need_followup: true,
        followup_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        metadata: { platform: 'web' },
        created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 40 * 60 * 1000)
      },
      {
        patient_id: patients[1].user_id,
        doctor_id: doctors[1].user_id,
        specialty_id: specialties[1].id,
        consultation_type: 'offline',
        appointment_time: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        status: 'completed',
        chief_complaint: 'Đau nửa đầu, sợ ánh sáng',
        medical_history: 'Migraine mãn tính',
        current_medications: 'Sumatriptan',
        symptom_duration: '>1 tháng',
        base_fee: 800000,
        platform_fee: 80000,
        total_fee: 880000,
        payment_status: 'paid',
        paid_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        payment_method: 'cash',
        started_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 9 * 60 * 1000),
        ended_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
        diagnosis: 'Migraine có aura',
        treatment_plan: 'Dùng thuốc dự phòng, tránh trigger',
        prescription_data: { medicines: ['Topiramate 25mg'], instructions: 'Uống 1 viên/ngày' },
        severity_level: 'moderate',
        need_followup: false,
        metadata: { platform: 'app', location: 'Bệnh viện Chợ Rẫy' },
        created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000)
      },
      {
        patient_id: patients[0].user_id,
        doctor_id: doctors[0].user_id,
        specialty_id: specialties[0].id,
        consultation_type: 'chat',
        appointment_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'pending',
        chief_complaint: 'Huyết áp cao bất thường',
        medical_history: 'Tăng huyết áp',
        current_medications: 'Losartan 50mg',
        symptom_duration: 'Hôm nay',
        base_fee: 350000,
        platform_fee: 35000,
        total_fee: 385000,
        payment_status: 'pending',
        metadata: { platform: 'web' },
        created_at: new Date(now.getTime() - 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 60 * 60 * 1000)
      },
      {
        patient_id: patients[1].user_id,
        doctor_id: doctors[1].user_id,
        specialty_id: specialties[1].id,
        consultation_type: 'video',
        appointment_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        status: 'cancelled',
        cancelled_by: 'patient',
        cancel_reason: 'Đã khỏe, không cần tư vấn nữa',
        cancelled_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        chief_complaint: 'Đau đầu, chóng mặt',
        medical_history: 'Không có',
        current_medications: 'Không dùng',
        symptom_duration: '2-3 ngày',
        base_fee: 400000,
        platform_fee: 40000,
        total_fee: 440000,
        payment_status: 'refunded',
        refund_amount: 440000,
        refund_reason: 'Hủy trước 24h',
        refunded_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        metadata: { platform: 'mobile' },
        created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)
      }
    ];

    const consultations = await models.Consultation.bulkCreate(consultationData, {
      transaction,
      validate: true,
      individualHooks: true // BẮT BUỘC: để hook beforeValidate chạy → tự sinh consultation_code
    });

    // In ra 6 mã consultation_code đã được sinh tự động (để kiểm tra)
    console.log('SUCCESS: Thêm 6 buổi tư vấn. Mã tự sinh:');
    consultations.forEach((c, i) => {
      console.log(`   [${i + 1}] ${c.consultation_code} (${c.status})`);
    });

    // ==================== BƯỚC 14: ChatMessages ====================
    console.log('14. Thêm ChatMessages...');

    await models.ChatMessage.bulkCreate([
      {
        consultation_id: consultations[0].id,
        sender_id: patients[0].user_id,
        sender_type: 'patient',
        receiver_id: consultations[0].doctor_id,
        message_type: 'text',
        content: 'Xin chào bác sĩ, em bị đau ngực khi vận động mạnh ạ',
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 1000),
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000)
      },
      {
        consultation_id: consultations[0].id,
        sender_id: doctors[0].user_id,
        sender_type: 'doctor',
        receiver_id: consultations[0].patient_id,
        message_type: 'text',
        content: 'Chào bạn! Bác sĩ đã nhận được thông tin. Bạn cho bác sĩ biết triệu chứng này xuất hiện khoảng bao lâu rồi?',
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000),
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 7 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 7 * 60 * 1000)
      },
      {
        consultation_id: consultations[0].id,
        sender_id: patients[0].user_id,
        sender_type: 'patient',
        receiver_id: consultations[0].doctor_id,
        message_type: 'text',
        content: 'Khoảng 1 tuần nay ạ. Em đang uống thuốc cao huyết áp',
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 1000)
      },
      {
        consultation_id: consultations[0].id,
        sender_id: doctors[0].user_id,
        sender_type: 'doctor',
        receiver_id: consultations[0].patient_id,
        message_type: 'text',
        content: 'Bạn có tiền sử bệnh tim mạch trong gia đình không?',
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000),
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 11 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 11 * 60 * 1000)
      },
      {
        consultation_id: consultations[0].id,
        sender_id: patients[0].user_id,
        sender_type: 'patient',
        receiver_id: consultations[0].doctor_id,
        message_type: 'text',
        content: 'Có ạ, bố em cũng bị bệnh tim',
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 1000),
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 1000)
      },
      {
        consultation_id: consultations[0].id,
        sender_id: doctors[0].user_id,
        sender_type: 'doctor',
        receiver_id: consultations[0].patient_id,
        message_type: 'text',
        content: 'Vậy bác sĩ khuyên bạn nên nghỉ ngơi và làm thêm xét nghiệm để chắc chắn. Bác sĩ sẽ kê đơn thuốc giúp bạn.',
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 18 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 18 * 60 * 1000)
      },
      {
        consultation_id: consultations[0].id,
        sender_id: doctors[0].user_id,
        sender_type: 'doctor',
        receiver_id: consultations[0].patient_id,
        message_type: 'file',
        content: 'Đơn thuốc của bạn',
        file_url: '/uploads/prescriptions/cs20250001_prescription.pdf',
        file_name: 'Don_thuoc_20250001.pdf',
        file_type: 'application/pdf',
        file_size: 125000,
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 22 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 22 * 60 * 1000)
      },
      {
        consultation_id: consultations[0].id,
        sender_id: patients[0].user_id,
        sender_type: 'patient',
        receiver_id: consultations[0].doctor_id,
        message_type: 'text',
        content: 'Em cảm ơn bác sĩ nhiều ạ!',
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 28 * 60 * 1000),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 28 * 60 * 1000)
      },
      {
        consultation_id: consultations[1].id,
        sender_id: patients[1].user_id,
        sender_type: 'patient',
        receiver_id: consultations[1].doctor_id,
        message_type: 'text',
        content: 'Bác sĩ ơi, em đau đầu dữ lắm ạ',
        is_read: true,
        read_at: new Date(now.getTime() - 4 * 60 * 1000),
        created_at: new Date(now.getTime() - 5 * 60 * 1000),
        updated_at: new Date(now.getTime() - 5 * 60 * 1000)
      },
      {
        consultation_id: consultations[1].id,
        sender_id: doctors[1].user_id,
        sender_type: 'doctor',
        receiver_id: consultations[1].patient_id,
        message_type: 'text',
        content: 'Chào bạn. Bạn cho bác sĩ biết rõ hơn về triệu chứng được không?',
        is_read: true,
        read_at: new Date(now.getTime() - 3 * 60 * 1000),
        created_at: new Date(now.getTime() - 4 * 60 * 1000),
        updated_at: new Date(now.getTime() - 4 * 60 * 1000)
      },
      {
        consultation_id: consultations[1].id,
        sender_id: patients[1].user_id,
        sender_type: 'patient',
        receiver_id: consultations[1].doctor_id,
        message_type: 'text',
        content: 'Đau đầu, chóng mặt, buồn nôn ạ. Em có tiền sử migraine',
        is_read: true,
        read_at: new Date(now.getTime() - 2 * 60 * 1000),
        created_at: new Date(now.getTime() - 3 * 60 * 1000),
        updated_at: new Date(now.getTime() - 3 * 60 * 1000)
      },
      {
        consultation_id: consultations[1].id,
        sender_id: doctors[1].user_id,
        sender_type: 'doctor',
        receiver_id: consultations[1].patient_id,
        message_type: 'text',
        content: 'Vậy bạn đang typing...',
        is_read: false,
        created_at: new Date(now.getTime() - 1 * 60 * 1000),
        updated_at: new Date(now.getTime() - 1 * 60 * 1000)
      }
    ], { transaction });

    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng chat_messages.');

    // ==================== BƯỚC 15: ConsultationFeedback ====================
    console.log('15. Thêm ConsultationFeedback...');

    await models.ConsultationFeedback.bulkCreate([
      {
        consultation_id: consultations[0].id,
        patient_id: patients[0].user_id,
        doctor_id: doctors[0].user_id,
        rating: 5,
        professionalism_rating: 5,
        communication_rating: 5,
        satisfaction_rating: 5,
        review: 'Bác sĩ tư vấn rất tận tâm và chuyên nghiệp. Giải thích rõ ràng dễ hiểu, em rất hài lòng!',
        suggestions: 'Không có gợi ý gì thêm ạ, mọi thứ đều tốt',
        would_recommend: true,
        status: 'published',
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      }
    ], { transaction });

    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng consultation_feedback.');

    // ==================== BƯỚC 16: Notifications ====================
    console.log('16. Thêm Notifications cho Consultation...');

    await models.Notification.bulkCreate([
      {
        user_id: patients[0].user_id,
        type: 'appointment',
        title: 'Lịch tư vấn đã được xác nhận',
        content: 'Bác sĩ đã xác nhận lịch tư vấn của bạn. Vui lòng chuẩn bị sẵn sàng vào phòng đúng giờ.',
        message: 'Lịch tư vấn đã được xác nhận - Bác sĩ đã xác nhận lịch tư vấn của bạn. Vui lòng chuẩn bị sẵn sàng vào phòng đúng giờ.',
        related_id: consultations[2].id,
        related_type: 'consultation',
        link: `/tu-van/${consultations[2].id}`,
        priority: 'high',
        is_read: false,
        created_at: new Date(now.getTime() - 90 * 60 * 1000),
        updated_at: new Date(now.getTime() - 90 * 60 * 1000)
      },
      {
        user_id: patients[0].user_id,
        type: 'appointment',
        title: '⏰ Sắp đến giờ tư vấn',
        content: 'Buổi tư vấn của bạn sẽ bắt đầu sau 30 phút. Vui lòng chuẩn bị sẵn sàng!',
        message: '⏰ Sắp đến giờ tư vấn - Buổi tư vấn của bạn sẽ bắt đầu sau 30 phút. Vui lòng chuẩn bị sẵn sàng!',
        related_id: consultations[2].id,
        related_type: 'consultation',
        link: `/tu-van/${consultations[2].id}`,
        priority: 'high',
        is_read: false,
        created_at: new Date(now.getTime() + 30 * 60 * 1000),
        updated_at: new Date(now.getTime() + 30 * 60 * 1000)
      },
      {
        user_id: doctors[0].user_id,
        type: 'appointment',
        title: 'Có lịch tư vấn mới',
        content: 'Bạn có lịch tư vấn mới từ bệnh nhân Nguyễn Văn A. Vui lòng xác nhận.',
        message: 'Có lịch tư vấn mới - Bạn có lịch tư vấn mới từ bệnh nhân Nguyễn Văn A. Vui lòng xác nhận.',
        related_id: consultations[2].id,
        related_type: 'consultation',
        link: `/bac-si/tu-van/${consultations[2].id}`,
        priority: 'high',
        is_read: true,
        read_at: new Date(now.getTime() - 100 * 60 * 1000),
        created_at: new Date(now.getTime() - 120 * 60 * 1000),
        updated_at: new Date(now.getTime() - 100 * 60 * 1000)
      },
      {
        user_id: patients[0].user_id,
        type: 'payment',
        title: 'Hoàn tiền thành công',
        content: 'Đã hoàn 550,000đ cho buổi tư vấn CS20250005',
        message: 'Hoàn tiền thành công - Đã hoàn 550,000đ cho buổi tư vấn CS20250005',
        related_id: consultations[4].id,
        related_type: 'consultation',
        priority: 'normal',
        is_read: false,
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
      },
      {
        user_id: patients[1].user_id,
        type: 'appointment',
        title: 'Đánh giá buổi tư vấn',
        content: 'Bạn đã hoàn thành buổi tư vấn. Vui lòng đánh giá để giúp chúng tôi cải thiện dịch vụ.',
        message: 'Đánh giá buổi tư vấn - Bạn đã hoàn thành buổi tư vấn. Vui lòng đánh giá để giúp chúng tôi cải thiện dịch vụ.',
        related_id: consultations[5].id,
        related_type: 'consultation',
        link: `/tu-van/${consultations[5].id}/danh-gia`,
        priority: 'normal',
        is_read: false,
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000)
      }
    ], { transaction });

    console.log('SUCCESS: Thêm dữ liệu mẫu cho notifications về consultation.');

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

    await transaction.commit();
    console.log('SUCCESS: Transaction commit thành công. Dữ liệu đã được ghi vào DB.');
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
    console.log('   2 ConsultationPricing');
    console.log('   6 Consultations (1 in_progress, 1 confirmed, 2 completed, 1 pending, 1 cancelled)');
    console.log('   12 ChatMessages');
    console.log('   1 ConsultationFeedback');
    console.log('   5 Notifications (consultation)');
    console.log('   1 SystemSetting (consultation config)');
    
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
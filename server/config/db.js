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

    // ==================== BƯỚC 2: Categories ====================
    console.log('2. Thêm Categories...');
    const categories = await models.Category.bulkCreate([
      // Danh mục THUỐC
      { 
        category_type: 'thuoc',
        name: 'Thuốc giảm đau', 
        slug: 'thuoc-giam-dau',
        description: 'Các loại thuốc giảm đau, hạ sốt',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_type: 'thuoc',
        name: 'Thuốc kháng sinh', 
        slug: 'thuoc-khang-sinh',
        description: 'Thuốc điều trị nhiễm khuẩn',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_type: 'thuoc',
        name: 'Thuốc tim mạch', 
        slug: 'thuoc-tim-mach',
        description: 'Thuốc điều trị bệnh tim mạch',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_type: 'thuoc',
        name: 'Thuốc tiêu hóa', 
        slug: 'thuoc-tieu-hoa',
        description: 'Thuốc hỗ trợ tiêu hóa',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      
      // Danh mục BỆNH LÝ
      { 
        category_type: 'benh_ly',
        name: 'Bệnh tim mạch', 
        slug: 'benh-tim-mach',
        description: 'Các bệnh lý về tim và mạch máu',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_type: 'benh_ly',
        name: 'Bệnh tiêu hóa', 
        slug: 'benh-tieu-hoa',
        description: 'Các bệnh về đường tiêu hóa',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_type: 'benh_ly',
        name: 'Bệnh hô hấp', 
        slug: 'benh-ho-hap',
        description: 'Các bệnh về đường hô hấp',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_type: 'benh_ly',
        name: 'Bệnh nội tiết', 
        slug: 'benh-noi-tiet',
        description: 'Các bệnh về nội tiết tố',
        created_at: new Date(), 
        updated_at: new Date() 
      },

      // Danh mục TIN TÚC
      { 
        category_type: 'tin_tuc',
        name: 'Tin y tế', 
        slug: 'tin-y-te',
        description: 'Tin tức y tế trong nước',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_type: 'tin_tuc',
        name: 'Tin sức khỏe', 
        slug: 'tin-suc-khoe',
        description: 'Thông tin sức khỏe cộng đồng',
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng categories.');

    // ==================== BƯỚC 3: Users ====================
    console.log('3. Thêm Users...');
    
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const usersData = [
      // 2 Admins
      {
        email: 'admin1@example.com',
        password_hash: hashedPassword,
        full_name: 'Nguyen Van Admin1',
        phone: '0901234567',
        address: '123 Hanoi',
        gender: 'male',
        dob: '1980-01-01',
        role: 'admin',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      },
      {
        email: 'admin2@example.com',
        password_hash: hashedPassword,
        full_name: 'Tran Thi Admin2',
        phone: '0901234568',
        address: '124 Hanoi',
        gender: 'female',
        dob: '1981-02-02',
        role: 'admin',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      },
      // 2 Staff
      {
        email: 'staff1@example.com',
        password_hash: hashedPassword,
        full_name: 'Le Van Staff1',
        phone: '0901234569',
        address: '125 HCMC',
        gender: 'male',
        dob: '1985-03-03',
        role: 'staff',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      },
      {
        email: 'staff2@example.com',
        password_hash: hashedPassword,
        full_name: 'Pham Thi Staff2',
        phone: '0901234570',
        address: '126 HCMC',
        gender: 'female',
        dob: '1986-04-04',
        role: 'staff',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      },
      // 2 Doctors
      {
        email: 'doctor1@example.com',
        password_hash: hashedPassword,
        full_name: 'Hoang Van Doctor1',
        phone: '0901234571',
        address: '127 Danang',
        gender: 'male',
        dob: '1975-05-05',
        role: 'doctor',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      },
      {
        email: 'doctor2@example.com',
        password_hash: hashedPassword,
        full_name: 'Nguyen Thi Doctor2',
        phone: '0901234572',
        address: '128 Danang',
        gender: 'female',
        dob: '1976-06-06',
        role: 'doctor',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      },
      // 2 Patients
      {
        email: 'patient1@example.com',
        password_hash: hashedPassword,
        full_name: 'Vo Van Patient1',
        phone: '0901234573',
        address: '129 Hue',
        gender: 'male',
        dob: '1990-07-07',
        role: 'patient',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      },
      {
        email: 'patient2@example.com',
        password_hash: hashedPassword,
        full_name: 'Le Thi Patient2',
        phone: '0901234574',
        address: '130 Hue',
        gender: 'female',
        dob: '1991-08-08',
        role: 'patient',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      }
    ];

    const users = [];
    for (const userData of usersData) {
      const user = await models.User.create(userData, { transaction });
      console.log(`SUCCESS: Đã tạo User ${user.email} (role: ${user.role})`);
      users.push(user);
    }

    // Lấy instances từ hook
    const admins = await models.Admin.findAll({ transaction });
    const staff = await models.Staff.findAll({ transaction });
    const doctors = await models.Doctor.findAll({ transaction });
    const patients = await models.Patient.findAll({ transaction });

    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng users và các bảng role.');

    // ==================== BƯỚC 4: Medicines ====================
    console.log('4. Thêm Medicines...');
    
    const thuocCategories = categories.filter(cat => cat.category_type === 'thuoc');
    
    const medicines = await models.Medicine.bulkCreate([
      // Thuốc giảm đau
      { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-giam-dau')?.id || thuocCategories[0].id,
      name: 'Paracetamol',
      composition: 'Acetaminophen 500mg',
      uses: 'Giảm đau, hạ sốt',
      side_effects: 'Hiếm gặp: buồn nôn, phát ban. Quá liều gây tổn thương gan.',
      manufacturer: 'Công ty Dược Hà Tây',
      excellent_review_percent: 85.50,
      average_review_percent: 12.30,
      poor_review_percent: 2.20,
      // Giữ lại cột cũ để tương thích
      components: 'Acetaminophen 500mg',
      medicine_usage: 'Uống 1-2 viên mỗi 4-6 giờ khi cần. Không quá 8 viên/ngày',
      description: 'Thuốc giảm đau, hạ sốt phổ biến. An toàn cho cả trẻ em và người lớn.',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-giam-dau')?.id || thuocCategories[0].id,
      name: 'Ibuprofen',
      composition: 'Ibuprofen 400mg',
      uses: 'Chống viêm, giảm đau, hạ sốt',
      side_effects: 'Đau dạ dày, buồn nôn, chóng mặt. Tăng nguy cơ xuất huyết tiêu hóa.',
      manufacturer: 'Sanofi Vietnam',
      excellent_review_percent: 78.90,
      average_review_percent: 18.50,
      poor_review_percent: 2.60,
      components: 'Ibuprofen 400mg',
      medicine_usage: 'Uống 1 viên mỗi 6-8 giờ khi đau. Uống sau ăn',
      description: 'Thuốc chống viêm, giảm đau mạnh. Hiệu quả với đau cơ, đau khớp.',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-giam-dau')?.id || thuocCategories[0].id,
      name: 'Aspirin',
      composition: 'Acetylsalicylic acid 100mg',
      uses: 'Làm loãng máu, phòng ngừa tai biến mạch máu',
      side_effects: 'Xuất huyết dạ dày, phát ban, tăng nguy cơ chảy máu.',
      manufacturer: 'Bayer Vietnam',
      excellent_review_percent: 82.40,
      average_review_percent: 15.20,
      poor_review_percent: 2.40,
      components: 'Acetylsalicylic acid 100mg',
      medicine_usage: 'Uống 1 viên/ngày sau bữa tối',
      description: 'Thuốc làm loãng máu, phòng ngừa tai biến mạch máu não và nhồi máu cơ tim.',
      created_at: new Date(),
      updated_at: new Date()
    },

      // Thuốc kháng sinh
      { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-khang-sinh')?.id || thuocCategories[1].id,
      name: 'Amoxicillin',
      composition: 'Amoxicillin trihydrate 500mg',
      uses: 'Điều trị nhiễm khuẩn đường hô hấp, tai mũi họng',
      side_effects: 'Tiêu chảy, buồn nôn, phát ban. Hiếm: sốc phản vệ.',
      manufacturer: 'DHG Pharma',
      excellent_review_percent: 88.70,
      average_review_percent: 9.80,
      poor_review_percent: 1.50,
      components: 'Amoxicillin trihydrate 500mg',
      medicine_usage: 'Uống 1 viên x 3 lần/ngày. Hoàn thành liệu trình 7-10 ngày',
      description: 'Kháng sinh nhóm Penicillin, điều trị nhiễm khuẩn đường hô hấp, tai mũi họng.',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-khang-sinh')?.id || thuocCategories[1].id,
      name: 'Azithromycin',
      composition: 'Azithromycin 250mg',
      uses: 'Điều trị viêm phổi, viêm họng, viêm phế quản',
      side_effects: 'Buồn nôn, đau bụng, tiêu chảy.',
      manufacturer: 'Teva Vietnam',
      excellent_review_percent: 86.20,
      average_review_percent: 11.50,
      poor_review_percent: 2.30,
      components: 'Azithromycin 250mg',
      medicine_usage: 'Ngày 1: 2 viên. Ngày 2-5: 1 viên/ngày',
      description: 'Kháng sinh nhóm Macrolide, điều trị viêm phổi, viêm họng, viêm phế quản.',
      created_at: new Date(),
      updated_at: new Date()
    },

      // Thuốc tim mạch
      { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-tim-mach')?.id || thuocCategories[2].id,
      name: 'Atorvastatin',
      composition: 'Atorvastatin calcium 20mg',
      uses: 'Giảm cholesterol, phòng ngừa bệnh tim mạch',
      side_effects: 'Đau cơ, mệt mỏi, táo bón, tăng men gan.',
      manufacturer: 'Pfizer Vietnam',
      excellent_review_percent: 83.60,
      average_review_percent: 14.10,
      poor_review_percent: 2.30,
      components: 'Atorvastatin calcium 20mg',
      medicine_usage: 'Uống 1 viên/ngày vào buổi tối',
      description: 'Thuốc giảm cholesterol, phòng ngừa bệnh tim mạch.',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-tim-mach')?.id || thuocCategories[2].id,
      name: 'Losartan',
      composition: 'Losartan potassium 50mg',
      uses: 'Điều trị tăng huyết áp, bảo vệ thận',
      side_effects: 'Chóng mặt, mệt mỏi, ho khan.',
      manufacturer: 'Merck Vietnam',
      excellent_review_percent: 81.50,
      average_review_percent: 16.20,
      poor_review_percent: 2.30,
      components: 'Losartan potassium 50mg',
      medicine_usage: 'Uống 1 viên/ngày vào buổi sáng',
      description: 'Thuốc điều trị tăng huyết áp, bảo vệ thận cho người tiểu đường.',
      created_at: new Date(),
      updated_at: new Date()
    },

      // Thuốc tiêu hóa
      { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-tieu-hoa')?.id || thuocCategories[3]?.id || thuocCategories[0].id,
      name: 'Omeprazole',
      composition: 'Omeprazole 20mg',
      uses: 'Điều trị viêm loét dạ dày, trào ngược dạ dày',
      side_effects: 'Đau đầu, tiêu chảy, đầy hơi.',
      manufacturer: 'AstraZeneca Vietnam',
      excellent_review_percent: 87.30,
      average_review_percent: 10.50,
      poor_review_percent: 2.20,
      components: 'Omeprazole 20mg',
      medicine_usage: 'Uống 1 viên/ngày trước bữa sáng 30 phút',
      description: 'Thuốc ức chế bơm proton, điều trị viêm loét dạ dày, trào ngược dạ dày.',
      created_at: new Date(),
      updated_at: new Date()
    },
    { 
      category_id: thuocCategories.find(c => c.slug === 'thuoc-tieu-hoa')?.id || thuocCategories[3]?.id || thuocCategories[0].id,
      name: 'Domperidone',
      composition: 'Domperidone 10mg',
      uses: 'Chống nôn, tăng nhu động dạ dày',
      side_effects: 'Hiếm gặp: đau đầu, khô miệng, phát ban.',
      manufacturer: 'Janssen Vietnam',
      excellent_review_percent: 84.90,
      average_review_percent: 12.80,
      poor_review_percent: 2.30,
      components: 'Domperidone 10mg',
      medicine_usage: 'Uống 1 viên x 3 lần/ngày trước bữa ăn 15-30 phút',
      description: 'Thuốc chống nôn, tăng nhu động dạ dày, giảm đầy hơi khó tiêu.',
      created_at: new Date(),
      updated_at: new Date()
    }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medicines.');

    // ==================== BƯỚC 5: Diseases ====================
    console.log('5. Thêm Diseases...');
    
    const benhLyCategories = categories.filter(cat => cat.category_type === 'benh_ly');
    
    const diseases = await models.Disease.bulkCreate([
      // Bệnh tim mạch
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-tim-mach')?.id || benhLyCategories[0].id,
        name: 'Tăng huyết áp', 
        symptoms: 'Đau đầu, chóng mặt, ù tai, mệt mỏi, đánh trống ngực, khó thở khi gắng sức', 
        treatments: 'Thuốc hạ huyết áp (ARB, ACE, lợi tiểu), chế độ ăn ít muối, tập thể dục đều đặn, giảm cân nếu thừa cân',
        description: 'Tình trạng huyết áp tâm thu ≥140 mmHg hoặc huyết áp tâm trương ≥90 mmHg. Yếu tố nguy cơ gây đột quỵ, nhồi máu cơ tim.',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-tim-mach')?.id || benhLyCategories[0].id,
        name: 'Nhồi máu cơ tim', 
        symptoms: 'Đau thắt ngực dữ dội lan ra vai trái, cánh tay, hàm dưới, đổ mồ hôi, khó thở, buồn nôn', 
        treatments: 'Cấp cứu ngay: tiêu sợi huyết, can thiệp mạch vành, stent, bypass. Điều trị lâu dài: thuốc chống đông, statin, beta-blocker',
        description: 'Tình trạng động mạch vành bị tắc nghẽn hoàn toàn, cơ tim thiếu máu cục bộ dẫn đến hoại tử. Cấp cứu y khoa.',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-tim-mach')?.id || benhLyCategories[0].id,
        name: 'Rối loạn lipid máu', 
        symptoms: 'Thường không có triệu chứng, phát hiện qua xét nghiệm máu', 
        treatments: 'Thuốc nhóm statin (Atorvastatin, Rosuvastatin), chế độ ăn ít béo bão hòa, tăng cường vận động',
        description: 'Tình trạng cholesterol toàn phần, LDL-C cao hoặc HDL-C thấp. Nguy cơ xơ vữa động mạch, bệnh tim mạch.',
        created_at: new Date(), 
        updated_at: new Date() 
      },

      // Bệnh tiêu hóa
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-tieu-hoa')?.id || benhLyCategories[1].id,
        name: 'Viêm loét dạ dày', 
        symptoms: 'Đau thượng vị, ợ nóng, ợ chua, đầy hơi, chán ăn, buồn nôn, đau sau ăn hoặc đói', 
        treatments: 'Thuốc ức chế bơm proton (PPI), thuốc kháng H. pylori (nếu dương tính), chế độ ăn nhẹ, chia nhỏ bữa',
        description: 'Tổn thương niêm mạc dạ dày do vi khuẩn H. pylori, NSAID, stress. Biến chứng: xuất huyết, thủng dạ dày.',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-tieu-hoa')?.id || benhLyCategories[1].id,
        name: 'Hội chứng ruột kích thích (IBS)', 
        symptoms: 'Đau bụng, đầy hơi, tiêu chảy hoặc táo bón xen kẽ, cải thiện sau đi tiêu', 
        treatments: 'Thay đổi chế độ ăn (FODMAP), thuốc chống co thắt, probiotic, quản lý stress',
        description: 'Rối loạn chức năng đường tiêu hóa mạn tính, không có tổn thương cơ quan. Liên quan đến stress, lo âu.',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-tieu-hoa')?.id || benhLyCategories[1].id,
        name: 'Viêm đại tràng', 
        symptoms: 'Đi ngoài phân lỏng có nhầy máu, đau bụng âm ỉ, sốt nhẹ, mệt mỏi', 
        treatments: 'Kháng sinh (nếu nhiễm khuẩn), thuốc chống viêm, corticosteroid (trường hợp nặng), chế độ ăn dễ tiêu',
        description: 'Viêm niêm mạc đại tràng do nhiễm khuẩn, virus, ký sinh trùng hoặc tự miễn. Cần phân biệt với IBD.',
        created_at: new Date(), 
        updated_at: new Date() 
      },

      // Bệnh hô hấp
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-ho-hap')?.id || benhLyCategories[2]?.id || benhLyCategories[0].id,
        name: 'Hen phế quản', 
        symptoms: 'Khó thở, thở khò khè, tức ngực, ho khan (đặc biệt ban đêm và sáng sớm)', 
        treatments: 'Thuốc dãn phế quản (SABA), corticosteroid dạng hít, thuốc kiểm soát lâu dài (ICS/LABA)',
        description: 'Bệnh viêm mạn tính đường hô hấp, co thắt phế quản. Yếu tố kích thích: dị ứng, khói, không khí lạnh.',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-ho-hap')?.id || benhLyCategories[2]?.id || benhLyCategories[0].id,
        name: 'Viêm phổi', 
        symptoms: 'Sốt cao, ho có đờm, khó thở, đau ngực khi hít sâu, mệt mỏi', 
        treatments: 'Kháng sinh (Amoxicillin, Azithromycin), thuốc hạ sốt, nghỉ ngơi, uống đủ nước',
        description: 'Nhiễm trùng nhu mô phổi do vi khuẩn, virus hoặc nấm. Chẩn đoán qua X-quang phổi.',
        created_at: new Date(), 
        updated_at: new Date() 
      },

      // Bệnh nội tiết
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-noi-tiet')?.id || benhLyCategories[3]?.id || benhLyCategories[0].id,
        name: 'Đái tháo đường type 2', 
        symptoms: 'Khát nước nhiều, tiểu nhiều, mệt mỏi, sụt cân, lành vết thương chậm, nhìn mờ', 
        treatments: 'Thuốc uống hạ đường huyết (Metformin), insulin (nếu cần), chế độ ăn kiêng, vận động',
        description: 'Rối loạn chuyển hóa glucose do kháng insulin. Biến chứng: bệnh thận, mắt, tim mạch, thần kinh.',
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        category_id: benhLyCategories.find(c => c.slug === 'benh-noi-tiet')?.id || benhLyCategories[3]?.id || benhLyCategories[0].id,
        name: 'Cường giáp', 
        symptoms: 'Tim đánh nhanh, run tay, sụt cân, mất ngủ, hay nóng, mắt lồi (Basedow)', 
        treatments: 'Thuốc kháng giáp (Methimazole), phẫu thuật cắt tuyến giáp, điều trị iod phóng xạ',
        description: 'Tuyến giáp tăng tiết hormone T3, T4. Nguyên nhân thường gặp: bệnh Basedow (tự miễn).',
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng diseases.');

    // ==================== BƯỚC 6: Articles ====================
    console.log('6. Thêm Articles...');
    
    const tinTucCategories = categories.filter(cat => cat.category_type === 'tin_tuc');
    
    const articles = await models.Article.bulkCreate([
      { 
        title: 'Hướng dẫn phòng ngừa bệnh tim mạch', 
        slug: 'huong-dan-phong-ngua-benh-tim-mach',
        content: '<p>Bệnh tim mạch là một trong những nguyên nhân gây tử vong hàng đầu. Việc phòng ngừa bao gồm: Ăn uống lành mạnh, tập thể dục đều đặn, kiểm soát huyết áp và cholesterol.</p><p>Nên thăm khám định kỳ 6 tháng/lần để phát hiện sớm các vấn đề về tim mạch.</p>', 
        author_id: staff[0].user_id, 
        category_id: tinTucCategories[0]?.id || categories[0].id,
        tags_json: ['tim mạch', 'phòng ngừa', 'sức khỏe'],
        status: 'approved', 
        views: 150,
        rejection_reason: null,
        deleted_at: null,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Top 10 thực phẩm tốt cho hệ tiêu hóa', 
        slug: 'top-10-thuc-pham-tot-cho-he-tieu-hoa',
        content: '<p>Hệ tiêu hóa khỏe mạnh là nền tảng của sức khỏe tổng thể. Các thực phẩm như sữa chua, chuối, yến mạch, gừng đều rất tốt cho đường ruột.</p><p>Nên bổ sung probiotics hàng ngày để cải thiện hệ vi sinh đường ruột.</p>', 
        author_id: staff[1].user_id, 
        category_id: tinTucCategories[1]?.id || categories[1].id,
        tags_json: ['tiêu hóa', 'dinh dưỡng', 'thực phẩm'],
        status: 'approved', 
        views: 230,
        rejection_reason: null,
        deleted_at: null,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Cách nhận biết triệu chứng COVID-19 mới nhất', 
        slug: 'cach-nhan-biet-trieu-chung-covid-19-moi-nhat',
        content: '<p>Các triệu chứng COVID-19 có thể thay đổi theo biến thể. Triệu chứng phổ biến: sốt, ho, mệt mỏi, mất vị giác/khứu giác.</p><p>Nên test nhanh khi có dấu hiệu nghi ngờ và cách ly đúng quy định.</p>', 
        author_id: doctors[0].user_id, 
        category_id: tinTucCategories[0]?.id || categories[0].id,
        tags_json: ['COVID-19', 'triệu chứng', 'phòng bệnh'],
        status: 'approved', 
        views: 480,
        rejection_reason: null,
        deleted_at: null,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Bài viết đang chờ duyệt - Xu hướng y tế 2025', 
        slug: 'bai-viet-dang-cho-duyet-xu-huong-y-te-2025',
        content: '<p>Năm 2025 đánh dấu sự phát triển mạnh mẽ của AI trong y tế, telemedicine và y học cá nhân hóa...</p>', 
        author_id: staff[0].user_id, 
        category_id: tinTucCategories[0]?.id || categories[0].id,
        tags_json: ['xu hướng', 'y tế', '2025'],
        status: 'pending', 
        views: 0,
        rejection_reason: null,
        deleted_at: null,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Bài viết bị từ chối - Thông tin chưa chính xác', 
        slug: 'bai-viet-bi-tu-choi-thong-tin-chua-chinh-xac',
        content: '<p>Nội dung cần kiểm chứng lại...</p>', 
        author_id: doctors[1].user_id, 
        category_id: tinTucCategories[1]?.id || categories[1].id,
        tags_json: ['draft'],
        status: 'rejected', 
        views: 0,
        rejection_reason: 'Thông tin trong bài viết chưa được kiểm chứng từ nguồn uy tín. Vui lòng bổ sung tài liệu tham khảo.',
        deleted_at: null,
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Bài viết nháp - Hướng dẫn chăm sóc bệnh nhân tại nhà', 
        slug: 'bai-viet-nhap-huong-dan-cham-soc-benh-nhan-tai-nha',
        content: '<p>Nội dung đang soạn thảo...</p>', 
        author_id: staff[1].user_id, 
        category_id: tinTucCategories[0]?.id || categories[0].id,
        tags_json: ['chăm sóc', 'tại nhà'],
        status: 'draft', 
        views: 0,
        rejection_reason: null,
        deleted_at: null,
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng articles.');

    // ==================== BƯỚC 7: Questions ====================
    console.log('7. Thêm Questions...');
    const questions = await models.Question.bulkCreate([
      { 
        title: 'Làm thế nào để giảm đau đầu tự nhiên?', 
        content: 'Tôi thường xuyên bị đau đầu nhẹ, có cách nào giảm đau tự nhiên không dùng thuốc không?', 
        user_id: patients[0].user_id, 
        tags_json: ['đau đầu', 'tự nhiên', 'sức khỏe'], 
        status: 'open', 
        views: 45, 
        deleted_at: null, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        title: 'Triệu chứng viêm dạ dày cần lưu ý gì?', 
        content: 'Gần đây tôi hay bị đau bụng, ợ nóng. Đây có phải triệu chứng viêm dạ dày không?', 
        user_id: patients[1].user_id, 
        tags_json: ['viêm dạ dày', 'triệu chứng', 'tiêu hóa'], 
        status: 'open', 
        views: 67, 
        deleted_at: null, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng questions.');

    // ==================== BƯỚC 8: Answers ====================
    console.log('8. Thêm Answers...');
    const answers = await models.Answer.bulkCreate([
      { 
        question_id: questions[0].id, 
        user_id: doctors[0].user_id, 
        content: 'Để giảm đau đầu tự nhiên, bạn có thể thử: nghỉ ngơi trong phòng tối, massage thái dương, uống nhiều nước, tránh stress. Nếu đau đầu kéo dài hoặc tăng nặng, nên đến bệnh viện khám.', 
        is_pinned: true, 
        is_verified: true, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        question_id: questions[1].id, 
        user_id: doctors[1].user_id, 
        content: 'Các triệu chứng bạn mô tả có thể là viêm dạ dày. Nên đi khám để xác định chính xác nguyên nhân qua nội soi. Trong lúc chờ khám, ăn nhẹ, tránh đồ cay nóng, chia nhỏ bữa ăn.', 
        is_pinned: false, 
        is_verified: true, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng answers.');

    // ==================== BƯỚC 9: Appointments ====================
    console.log('9. Thêm Appointments...');
    const appointments = await models.Appointment.bulkCreate([
      { 
        patient_id: patients[0].id, 
        doctor_id: doctors[0].id, 
        specialty_id: specialties[0].id, 
        appointment_time: '2025-10-06 10:00:00', 
        status: 'confirmed', 
        notes: 'Khám tim mạch định kỳ', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        patient_id: patients[1].id, 
        doctor_id: doctors[1].id, 
        specialty_id: specialties[1].id, 
        appointment_time: '2025-10-07 11:00:00', 
        status: 'pending', 
        notes: 'Khám thần kinh', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng appointments.');

    // ==================== BƯỚC 10: Schedules ====================
    console.log('10. Thêm Schedules...');
    const schedules = await models.Schedule.bulkCreate([
      { 
        doctor_id: doctors[0].user_id, 
        start_time: '2025-10-06 09:00:00', 
        end_time: '2025-10-06 12:00:00', 
        status: 'booked', 
        off_reason: null, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        doctor_id: doctors[1].user_id, 
        start_time: '2025-10-07 14:00:00', 
        end_time: '2025-10-07 17:00:00', 
        status: 'available', 
        off_reason: null, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng schedules.');

    // ==================== BƯỚC 11: Consultations ====================
    console.log('11. Thêm Consultations...');
    const consultations = await models.Consultation.bulkCreate([
      { 
        appointment_id: appointments[0].id,
        patient_id: patients[0].id,
        doctor_id: doctors[0].id,
        start_time: new Date('2025-10-06 10:00:00'),
        end_time: new Date('2025-10-06 10:30:00'),
        video_link: 'https://meet.example.com/consultation1',
        notes_json: { note: 'Khám lần đầu, bệnh nhân có tiền sử huyết áp cao' },
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        appointment_id: appointments[1].id,
        patient_id: patients[1].id,
        doctor_id: doctors[1].id,
        start_time: new Date('2025-10-07 11:00:00'),
        end_time: new Date('2025-10-07 11:30:00'),
        video_link: 'https://meet.example.com/consultation2',
        notes_json: { note: 'Tái khám, kiểm tra kết quả xét nghiệm' },
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng consultations.');

    // ==================== BƯỚC 12: ChatMessages ====================
    console.log('12. Thêm ChatMessages...');
    const chatMessages = await models.ChatMessage.bulkCreate([
      { 
        consultation_id: consultations[0].id, 
        sender_id: patients[0].user_id, 
        receiver_id: doctors[0].user_id, 
        message: 'Xin chào bác sĩ, tôi đã đến phòng khám', 
        created_at: new Date() 
      },
      { 
        consultation_id: consultations[0].id, 
        sender_id: doctors[0].user_id, 
        receiver_id: patients[0].user_id, 
        message: 'Chào bạn, vui lòng chờ trong 5 phút', 
        created_at: new Date() 
      },
      { 
        consultation_id: consultations[1].id, 
        sender_id: patients[1].user_id, 
        receiver_id: doctors[1].user_id, 
        message: 'Bác sĩ ơi, tôi muốn hỏi về kết quả xét nghiệm', 
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng chat_messages.');

    // ==================== BƯỚC 13: Discounts ====================
    console.log('13. Thêm Discounts...');
    const discounts = await models.Discount.bulkCreate([
      { 
        name: 'Giảm giá khám tim mạch', 
        type: 'percentage', 
        value: 15.00, 
        start_date: '2025-10-01', 
        end_date: '2025-12-31', 
        specialty_id: specialties[0].id, 
        doctor_id: doctors[0].user_id, 
        apply_count: 0, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        name: 'Ưu đãi khám thần kinh', 
        type: 'fixed', 
        value: 100000.00, 
        start_date: '2025-10-01', 
        end_date: '2025-11-30', 
        specialty_id: specialties[1].id, 
        doctor_id: doctors[1].user_id, 
        apply_count: 0, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng discounts.');

    // ==================== BƯỚC 14: Payments ====================
    console.log('14. Thêm Payments...');
    const payments = await models.Payment.bulkCreate([
      { 
        code: 'PY00001',
        appointment_id: appointments[0].id, 
        user_id: patients[0].user_id, 
        amount: 500000.00, 
        discount_id: discounts[0].id, 
        status: 'paid', 
        method: 'momo', 
        transaction_id: 'MOMO123456789', 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        code: 'PY00002', 
        appointment_id: appointments[1].id, 
        user_id: patients[1].user_id, 
        amount: 300000.00, 
        discount_id: discounts[1].id, 
        status: 'pending', 
        method: 'zalopay', 
        transaction_id: 'ZALO987654321', 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng payments.');

    // ==================== BƯỚC 15: Notifications ====================
    console.log('15. Thêm Notifications...');
    const notifications = await models.Notification.bulkCreate([
      { 
        user_id: patients[0].user_id, 
        type: 'appointment', 
        message: 'Lịch khám của bạn đã được xác nhận vào 10:00 ngày 06/10/2025', 
        is_read: false, 
        link: '/appointments/1', 
        created_at: new Date() 
      },
      { 
        user_id: patients[1].user_id, 
        type: 'payment', 
        message: 'Thanh toán của bạn đang chờ xác nhận', 
        is_read: false, 
        link: '/payments/2', 
        created_at: new Date() 
      },
      { 
        user_id: doctors[0].user_id, 
        type: 'appointment', 
        message: 'Bạn có lịch khám mới từ bệnh nhân Vo Van Patient1', 
        is_read: true, 
        link: '/appointments/1', 
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng notifications.');

    // ==================== BƯỚC 16: SystemSettings ====================
    console.log('16. Thêm SystemSettings...');
    const systemSettings = await models.SystemSetting.bulkCreate([
      { 
        setting_key: 'clinic_name', 
        value_json: { name: 'Phòng khám Đa khoa Sức Khỏe Vàng' }, 
        updated_by: admins[0].user_id, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        setting_key: 'clinic_address', 
        value_json: { address: '123 Đường ABC, Quận 1, TP.HCM' }, 
        updated_by: admins[0].user_id, 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        setting_key: 'banner_text', 
        value_json: { text: 'Chào mừng đến với hệ thống y tế trực tuyến' }, 
        updated_by: admins[1].user_id, 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng system_settings.');

    // ==================== BƯỚC 17: MedicalRecords ====================
    console.log('17. Thêm MedicalRecords...');
    const medicalRecords = await models.MedicalRecord.bulkCreate([
      { 
        patient_id: patients[0].user_id, 
        doctor_id: doctors[0].user_id, 
        appointment_id: appointments[0].id, 
        type: 'consultation', 
        content_json: { 
          diagnosis: 'Tăng huyết áp nhẹ', 
          prescription: 'Losartan 50mg x 1 viên/ngày',
          note: 'Theo dõi huyết áp tại nhà, tái khám sau 1 tháng'
        }, 
        shared_with_json: [doctors[0].user_id], 
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        patient_id: patients[1].user_id, 
        doctor_id: doctors[1].user_id, 
        appointment_id: appointments[1].id, 
        type: 'exam', 
        content_json: { 
          diagnosis: 'Đau đầu căng thẳng', 
          prescription: 'Paracetamol 500mg khi cần',
          note: 'Nghỉ ngơi đầy đủ, giảm stress'
        }, 
        shared_with_json: [doctors[1].user_id], 
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng medical_records.');

    // ==================== BƯỚC 18: AuditLogs ====================
    console.log('18. Thêm AuditLogs...');
    const auditLogs = await models.AuditLog.bulkCreate([
      { 
        user_id: admins[0].user_id, 
        action: 'create_user', 
        entity_type: 'user', 
        entity_id: patients[0].user_id, 
        details_json: { note: 'Tạo tài khoản bệnh nhân patient1@example.com' }, 
        created_at: new Date() 
      },
      { 
        user_id: admins[1].user_id, 
        action: 'update_setting', 
        entity_type: 'system_setting', 
        entity_id: systemSettings[0].id, 
        details_json: { 
          old_value: 'Phòng khám ABC', 
          new_value: 'Phòng khám Đa khoa Sức Khỏe Vàng' 
        }, 
        created_at: new Date() 
      },
      { 
        user_id: staff[0].user_id, 
        action: 'approve_article', 
        entity_type: 'article', 
        entity_id: articles[0].id, 
        details_json: { note: 'Duyệt bài viết về phòng ngừa bệnh tim mạch' }, 
        created_at: new Date() 
      }
    ], { transaction });
    console.log('SUCCESS: Thêm dữ liệu mẫu cho bảng audit_logs.');

    // ==================== BƯỚC 19: Interactions (CUỐI CÙNG) ====================
    console.log('19. Thêm Interactions...');
    const interactions = await models.Interaction.bulkCreate([
      // View interactions cho articles
      { 
        user_id: patients[0].user_id, 
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        metadata_json: { duration: 180, platform: 'web', referrer: 'google' },
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: null, // Anonymous view
        entity_type: 'article', 
        entity_id: articles[1].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        metadata_json: { duration: 90, platform: 'mobile', referrer: 'facebook' },
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'article', 
        entity_id: articles[2].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.102',
        metadata_json: { duration: 240, platform: 'web' },
        created_at: new Date(),
        updated_at: new Date()
      },

      // Like interactions
      { 
        user_id: patients[0].user_id, 
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'like',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'article', 
        entity_id: articles[1].id, 
        interaction_type: 'like',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: doctors[0].user_id, 
        entity_type: 'article', 
        entity_id: articles[2].id, 
        interaction_type: 'like',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Share interactions
      { 
        user_id: patients[0].user_id, 
        entity_type: 'article', 
        entity_id: articles[2].id, 
        interaction_type: 'share',
        metadata_json: { platform: 'facebook', share_date: new Date(), share_url: 'https://facebook.com/share/123' },
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'share',
        metadata_json: { platform: 'zalo', share_date: new Date() },
        created_at: new Date(),
        updated_at: new Date()
      },

      // Bookmark/Save interactions cho medicines
      { 
        user_id: patients[0].user_id, 
        entity_type: 'medicine', 
        entity_id: medicines[0].id, 
        interaction_type: 'bookmark',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'medicine', 
        entity_id: medicines[1].id, 
        interaction_type: 'save',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[0].user_id, 
        entity_type: 'medicine', 
        entity_id: medicines[6].id, 
        interaction_type: 'bookmark',
        created_at: new Date(),
        updated_at: new Date()
      },

      // View interactions cho medicines
      { 
        user_id: patients[0].user_id, 
        entity_type: 'medicine', 
        entity_id: medicines[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.100',
        metadata_json: { source: 'search', keyword: 'paracetamol', duration: 120 },
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: null, 
        entity_type: 'medicine', 
        entity_id: medicines[3].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.105',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        metadata_json: { source: 'direct', duration: 90 },
        created_at: new Date(),
        updated_at: new Date()
      },

      // Bookmark/Save interactions cho diseases
      { 
        user_id: patients[0].user_id, 
        entity_type: 'disease', 
        entity_id: diseases[0].id, 
        interaction_type: 'save',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'disease', 
        entity_id: diseases[3].id, 
        interaction_type: 'bookmark',
        created_at: new Date(),
        updated_at: new Date()
      },

      // View interactions cho diseases
      { 
        user_id: null, 
        entity_type: 'disease', 
        entity_id: diseases[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.103',
        user_agent: 'Mozilla/5.0 (Android 11; Mobile)',
        metadata_json: { source: 'google', referrer: 'search', keyword: 'tăng huyết áp', duration: 200 },
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'disease', 
        entity_id: diseases[3].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.104',
        metadata_json: { source: 'article_link', duration: 150 },
        created_at: new Date(),
        updated_at: new Date()
      },

      // Interactions cho Questions
      { 
        user_id: patients[1].user_id, 
        entity_type: 'question', 
        entity_id: questions[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.106',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: doctors[0].user_id, 
        entity_type: 'question', 
        entity_id: questions[1].id, 
        interaction_type: 'like',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[0].user_id, 
        entity_type: 'question', 
        entity_id: questions[0].id, 
        interaction_type: 'bookmark',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: null, 
        entity_type: 'question', 
        entity_id: questions[1].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.107',
        user_agent: 'Mozilla/5.0 (Linux; Android 12)',
        metadata_json: { source: 'search', keyword: 'viêm dạ dày' },
        created_at: new Date(),
        updated_at: new Date()
      },

      // Interactions cho Answers
      { 
        user_id: patients[0].user_id, 
        entity_type: 'answer', 
        entity_id: answers[0].id, 
        interaction_type: 'like',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'answer', 
        entity_id: answers[1].id, 
        interaction_type: 'bookmark',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: patients[1].user_id, 
        entity_type: 'answer', 
        entity_id: answers[0].id, 
        interaction_type: 'like',
        created_at: new Date(),
        updated_at: new Date()
      },
      { 
        user_id: doctors[1].user_id, 
        entity_type: 'answer', 
        entity_id: answers[0].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.108',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Report interaction
      { 
        user_id: patients[1].user_id, 
        entity_type: 'article', 
        entity_id: articles[4].id, 
        interaction_type: 'report',
        reason: 'Thông tin không chính xác về liều lượng thuốc. Cần kiểm tra lại nguồn tham khảo.',
        created_at: new Date(),
        updated_at: new Date()
      },

      // Comment interactions
      { 
        user_id: patients[0].user_id, 
        entity_type: 'article', 
        entity_id: articles[0].id, 
        interaction_type: 'comment',
        metadata_json: { comment_id: 1, comment_text: 'Bài viết rất hữu ích!' },
        created_at: new Date(),
        updated_at: new Date()
      },

      // Anonymous views cho diseases
      { 
        user_id: null, 
        entity_type: 'disease', 
        entity_id: diseases[7].id, 
        interaction_type: 'view',
        ip_address: '192.168.1.110',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        metadata_json: { source: 'direct', referrer: null, duration: 300 },
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
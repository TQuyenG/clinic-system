// server/seed-forum-data.js
// Script để tạo dữ liệu mẫu cho forum

require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcrypt');
const { sequelize, models } = require('./config/db');

async function seedForumData() {
  try {
    console.log('🚀 Bắt đầu seed dữ liệu forum...');

    // Kết nối database
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công');

    const { User, Patient, Doctor, Admin, Specialty, Question, Answer } = models;

    // 1. Tạo Admin account
    console.log('\n📝 Tạo tài khoản Admin...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    let adminUser = await User.findOne({ where: { email: 'admin@clinic.com' } });
    
    if (!adminUser) {
      // Hook afterCreate của User model sẽ tự động tạo bản ghi Admin
      adminUser = await User.create({
        email: 'admin@clinic.com',
        username: 'admin',
        password_hash: hashedPassword,
        full_name: 'Quản Trị Viên',
        phone: '0900000001',
        role: 'admin',
        is_verified: true,
        is_active: true,
      });

      console.log('✅ Đã tạo tài khoản admin:');
      console.log('   📧 Email: admin@clinic.com');
      console.log('   🔑 Password: Admin@123');
    } else {
      console.log('ℹ️  Admin đã tồn tại');
    }

    // 2. Tạo các chuyên khoa nếu chưa có
    console.log('\n📝 Tạo chuyên khoa...');
    const specialties = [
      { name: 'Nội khoa', slug: 'noi-khoa', description: 'Chuyên khoa nội tổng hợp' },
      { name: 'Ngoại khoa', slug: 'ngoai-khoa', description: 'Chuyên khoa ngoại tổng hợp' },
      { name: 'Sản phụ khoa', slug: 'san-phu-khoa', description: 'Chăm sóc sức khỏe phụ nữ' },
      { name: 'Nhi khoa', slug: 'nhi-khoa', description: 'Chuyên khoa trẻ em' },
      { name: 'Tim mạch', slug: 'tim-mach', description: 'Chuyên khoa tim mạch' },
      { name: 'Da liễu', slug: 'da-lieu', description: 'Chuyên khoa da liễu' },
    ];

    const specialtyRecords = [];
    for (const spec of specialties) {
      let specialty = await Specialty.findOne({ where: { slug: spec.slug } });
      if (!specialty) {
        specialty = await Specialty.create(spec);
        console.log(`   ✅ Tạo chuyên khoa: ${spec.name}`);
      }
      specialtyRecords.push(specialty);
    }

    // 3. Tạo bác sĩ
    console.log('\n📝 Tạo tài khoản bác sĩ...');
    const doctors = [
      {
        email: 'bs.nguyen@clinic.com',
        username: 'bs_nguyen',
        full_name: 'Bác sĩ Nguyễn Văn A',
        phone: '0901234567',
        specialtyId: specialtyRecords[0].id,
        code: 'BS001',
        experience_years: 10,
        qualifications: 'Bác sĩ chuyên khoa I',
      },
      {
        email: 'bs.tran@clinic.com',
        username: 'bs_tran',
        full_name: 'Bác sĩ Trần Thị B',
        phone: '0901234568',
        specialtyId: specialtyRecords[4].id, // Tim mạch
        code: 'BS002',
        experience_years: 15,
        qualifications: 'Tiến sĩ, Bác sĩ chuyên khoa II',
      },
      {
        email: 'bs.le@clinic.com',
        username: 'bs_le',
        full_name: 'Bác sĩ Lê Văn C',
        phone: '0901234569',
        specialtyId: specialtyRecords[3].id, // Nhi khoa
        code: 'BS003',
        experience_years: 8,
        qualifications: 'Bác sĩ chuyên khoa I',
      },
    ];

    const doctorRecords = [];
    for (const doc of doctors) {
      let doctorUser = await User.findOne({ where: { email: doc.email } });
      if (!doctorUser) {
        // Hook afterCreate sẽ tự động tạo bản ghi Doctor
        doctorUser = await User.create({
          email: doc.email,
          username: doc.username,
          password_hash: await bcrypt.hash('Doctor@123', 10),
          full_name: doc.full_name,
          phone: doc.phone,
          role: 'doctor',
          is_verified: true,
          is_active: true,
        });

        // Cập nhật thông tin Doctor đã được tạo tự động bởi hook
        const doctorRecord = await Doctor.findOne({ where: { user_id: doctorUser.id } });
        if (doctorRecord) {
          await doctorRecord.update({
            specialty_id: doc.specialtyId,
            experience_years: doc.experience_years,
            certifications_json: {
              qualifications: doc.qualifications,
            },
            bio: `${doc.full_name} với ${doc.experience_years} năm kinh nghiệm`,
          });
        }

        console.log(`   ✅ Tạo bác sĩ: ${doc.full_name}`);
        doctorRecords.push(doctorUser);
      } else {
        doctorRecords.push(doctorUser);
      }
    }

    // 4. Tạo bệnh nhân
    console.log('\n📝 Tạo tài khoản bệnh nhân...');
    const patients = [
      {
        email: 'patient1@gmail.com',
        username: 'patient1',
        full_name: 'Nguyễn Thị D',
        phone: '0912345671',
        code: 'BN001',
      },
      {
        email: 'patient2@gmail.com',
        username: 'patient2',
        full_name: 'Trần Văn E',
        phone: '0912345672',
        code: 'BN002',
      },
      {
        email: 'patient3@gmail.com',
        username: 'patient3',
        full_name: 'Lê Thị F',
        phone: '0912345673',
        code: 'BN003',
      },
    ];

    const patientRecords = [];
    for (const pat of patients) {
      let patientUser = await User.findOne({ where: { email: pat.email } });
      if (!patientUser) {
        // Hook afterCreate sẽ tự động tạo bản ghi Patient
        patientUser = await User.create({
          email: pat.email,
          username: pat.username,
          password_hash: await bcrypt.hash('Patient@123', 10),
          full_name: pat.full_name,
          phone: pat.phone,
          role: 'patient',
          is_verified: true,
          is_active: true,
        });

        console.log(`   ✅ Tạo bệnh nhân: ${pat.full_name}`);
        patientRecords.push(patientUser);
      } else {
        patientRecords.push(patientUser);
      }
    }

    // 5. Tạo câu hỏi mẫu
    console.log('\n📝 Tạo câu hỏi mẫu...');
    const questions = [
      {
        title: 'Làm thế nào để phòng ngừa bệnh tim mạch?',
        content: 'Tôi có tiền sử gia đình mắc bệnh tim mạch. Tôi muốn biết những biện pháp phòng ngừa hiệu quả để giảm nguy cơ mắc bệnh. Xin bác sĩ tư vấn giúp tôi.',
        authorId: patientRecords[0].id,
        specialtyId: specialtyRecords[4].id, // Tim mạch
        tags: ['tim mạch', 'phòng ngừa', 'sức khỏe'],
        status: 'closed', // Đã duyệt
        viewsCount: 125,
        answersCount: 2,
        isAnonymous: false,
        isPinned: true,
      },
      {
        title: 'Trẻ bị sốt cao 39 độ có nguy hiểm không?',
        content: 'Con tôi 3 tuổi, sáng nay bị sốt cao 39 độ, có nên đến bệnh viện ngay không? Hiện tại bé đang khóc nhiều và không chịu ăn uống. Xin bác sĩ tư vấn cấp.',
        authorId: patientRecords[1].id,
        specialtyId: specialtyRecords[3].id, // Nhi khoa
        tags: ['sốt cao', 'trẻ em', 'cấp cứu'],
        status: 'closed',
        viewsCount: 89,
        answersCount: 3,
        isAnonymous: false,
        isPinned: false,
      },
      {
        title: 'Bị đau bụng dữ dội, đi ngoài phân lỏng',
        content: 'Tôi bị đau bụng từ tối qua, đi ngoài nhiều lần với phân lỏng. Có nên dùng thuốc gì không? Hay cần đi khám ngay?',
        authorId: patientRecords[2].id,
        specialtyId: specialtyRecords[0].id, // Nội khoa
        tags: ['đau bụng', 'tiêu chảy', 'tiêu hóa'],
        status: 'closed',
        viewsCount: 56,
        answersCount: 1,
        isAnonymous: true,
      },
      {
        title: 'Da bị ngứa và nổi mẩn đỏ sau khi dùng mỹ phẩm mới',
        content: 'Tôi vừa dùng loại kem dưỡng da mới thì bị ngứa và nổi mẩn đỏ ở mặt. Có phải do dị ứng không? Cần làm gì để giảm triệu chứng?',
        authorId: patientRecords[0].id,
        specialtyId: specialtyRecords[5].id, // Da liễu
        tags: ['dị ứng', 'mỹ phẩm', 'nổi mẩn'],
        status: 'open', // Chờ duyệt
        viewsCount: 12,
        answersCount: 0,
        isAnonymous: false,
        isPinned: false,
      },
      {
        title: 'Tư vấn về chế độ ăn uống cho bà bầu 3 tháng',
        content: 'Em đang mang thai được 3 tháng, muốn hỏi chế độ ăn uống nên như thế nào? Có những thực phẩm nào nên tránh? Xin bác sĩ tư vấn chi tiết.',
        authorId: patientRecords[1].id,
        specialtyId: specialtyRecords[2].id, // Sản phụ khoa
        tags: ['mang thai', 'dinh dưỡng', 'chế độ ăn'],
        status: 'open',
        viewsCount: 8,
        answersCount: 0,
        isAnonymous: false,
        isPinned: false,
      },
    ];

    const questionRecords = [];
    for (const q of questions) {
      const existingQuestion = await Question.findOne({ 
        where: { title: q.title } 
      });
      
      if (!existingQuestion) {
        const question = await Question.create(q);
        questionRecords.push(question);
        console.log(`   ✅ Tạo câu hỏi: ${q.title.substring(0, 50)}...`);
      }
    }

    // 6. Tạo câu trả lời mẫu
    console.log('\n📝 Tạo câu trả lời mẫu...');
    if (questionRecords.length > 0) {
      const answers = [
        {
          questionId: questionRecords[0].id,
          authorId: doctorRecords[1].id, // BS Tim mạch
          content: `Để phòng ngừa bệnh tim mạch hiệu quả, bạn nên:

1. **Chế độ ăn uống lành mạnh:**
   - Tăng rau xanh, trái cây
   - Giảm muối, đường, chất béo bão hòa
   - Ăn nhiều cá, ngũ cốc nguyên hạt

2. **Tập thể dục đều đặn:**
   - Ít nhất 30 phút/ngày, 5 ngày/tuần
   - Các bài tập aerobic như đi bộ, chạy bộ, bơi lội

3. **Kiểm soát cân nặng:**
   - Duy trì BMI trong khoảng 18.5-24.9

4. **Tránh hút thuốc và uống rượu bia**

5. **Kiểm tra sức khỏe định kỳ:**
   - Đo huyết áp, đường huyết, cholesterol 6 tháng/lần

Với tiền sử gia đình, bạn nên khám sức khỏe định kỳ 6 tháng/lần để phát hiện sớm các vấn đề.`,
          isPinned: false,
          isVerified: true,
          verifiedBy: adminUser.id,
          likesCount: 45,
        },
        {
          questionId: questionRecords[0].id,
          authorId: patientRecords[2].id,
          content: 'Cảm ơn bác sĩ đã tư vấn chi tiết. Tôi sẽ áp dụng các biện pháp phòng ngừa mà bác sĩ đã đề xuất!',
          isPinned: false,
          isVerified: false,
          likesCount: 8,
        },
        {
          questionId: questionRecords[1].id,
          authorId: doctorRecords[2].id, // BS Nhi khoa
          content: `**KHẨN CẤP - Cần đưa bé đến bệnh viện ngay nếu:**

1. Sốt trên 39°C không hạ sau khi uống thuốc hạ sốt
2. Bé li bì, mệt mỏi bất thường
3. Khóc liên tục, không chịu ăn uống
4. Xuất hiện các dấu hiệu: co giật, khó thở, phát ban

**Xử lý tại nhà trong khi chờ:**
- Lau ấm cho bé (không dùng nước lạnh)
- Cho bé uống nhiều nước
- Mặc quần áo mỏng, thoáng mát
- Có thể cho uống thuốc hạ sốt theo hướng dẫn bác sĩ

Với triệu chứng bé đang có, **khuyến cáo nên đến bệnh viện để khám ngay** để loại trừ các nguy cơ nghiêm trọng.`,
          isPinned: true,
          isVerified: true,
          verifiedBy: adminUser.id,
          likesCount: 67,
        },
        {
          questionId: questionRecords[1].id,
          authorId: doctorRecords[0].id,
          content: 'Đồng ý với ý kiến của BS Lê. Với trẻ nhỏ, sốt cao là dấu hiệu cần theo dõi cẩn thận. Hãy đến bệnh viện để bác sĩ thăm khám trực tiếp nhé!',
          isPinned: false,
          isVerified: false,
          likesCount: 23,
        },
        {
          questionId: questionRecords[2].id,
          authorId: doctorRecords[0].id, // BS Nội khoa
          content: `Dựa vào triệu chứng bạn mô tả, có thể bạn đang bị:

**Nhiễm khuẩn đường ruột cấp tính**

**Xử lý:**
1. Bù nước điện giải (Oresol)
2. Ăn nhẹ, dễ tiêu (cháo, súp)
3. Tránh sữa, đồ béo, cay nóng
4. Có thể dùng men tiêu hóa

**Cần đến bệnh viện nếu:**
- Tiêu chảy kéo dài > 2 ngày
- Phân có máu hoặc nhầy
- Đau bụng dữ dội
- Sốt cao
- Có dấu hiệu mất nước (khát nhiều, tiểu ít, choáng váng)

Nếu tình trạng không cải thiện sau 24h, hãy đến khám để được điều trị kịp thời.`,
          isPinned: false,
          isVerified: true,
          verifiedBy: adminUser.id,
          likesCount: 34,
        },
      ];

      for (const ans of answers) {
        const existingAnswer = await Answer.findOne({
          where: { 
            questionId: ans.questionId,
            authorId: ans.authorId
          }
        });

        if (!existingAnswer) {
          await Answer.create(ans);
          console.log(`   ✅ Tạo câu trả lời cho câu hỏi ID: ${ans.questionId}`);
        }
      }
    }

    console.log('\n✅ Hoàn thành seed dữ liệu forum!');
    console.log('\n📋 Tóm tắt:');
    console.log(`   👤 Admin: admin@clinic.com / Admin@123`);
    console.log(`   👨‍⚕️  Bác sĩ: bs.nguyen@clinic.com / Doctor@123`);
    console.log(`   👨‍⚕️  Bác sĩ: bs.tran@clinic.com / Doctor@123`);
    console.log(`   👨‍⚕️  Bác sĩ: bs.le@clinic.com / Doctor@123`);
    console.log(`   🧑 Bệnh nhân: patient1@gmail.com / Patient@123`);
    console.log(`   🧑 Bệnh nhân: patient2@gmail.com / Patient@123`);
    console.log(`   🧑 Bệnh nhân: patient3@gmail.com / Patient@123`);
    console.log(`   ❓ Câu hỏi: ${questionRecords.length} câu hỏi`);
    console.log(`   💬 Câu trả lời: 5 câu trả lời`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    process.exit(1);
  }
}

// Chạy script
seedForumData();

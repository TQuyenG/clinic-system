// server/config/consultationPricingSeed.js
// Seed dữ liệu gói dịch vụ tư vấn

module.exports = async function seedConsultationPricing(models, transaction, context = {}) {
  const ConsultationPricing = models.ConsultationPricing;
  const { doctors } = context;

  if (!doctors || doctors.length === 0) {
    throw new Error('consultationPricingSeed requires doctors in context');
  }

  // Lấy 3 bác sĩ đầu tiên để gán vào gói
  const doctor1Code = doctors[0].code;
  const doctor2Code = doctors[1]?.code;
  const doctor3Code = doctors[2]?.code;

  const packages = [
    // ===== GÓI MIỄN PHÍ =====
    {
      package_name: 'Tư vấn Chat Miễn phí',
      description: 'Gói tư vấn qua chat cơ bản, phù hợp cho các câu hỏi nhanh về sức khỏe',
      package_type: 'chat',
      duration_minutes: 15,
      price: 0.00,
      is_active: true,
      notes: 'Gói miễn phí cho người dùng mới',
      doctor_codes: JSON.stringify([doctor1Code, doctor2Code]) // 2 bác sĩ
    },
    {
      package_name: 'Tư vấn Video Miễn phí',
      description: 'Gói tư vấn video call miễn phí, giới hạn 10 phút',
      package_type: 'video',
      duration_minutes: 10,
      price: 0.00,
      is_active: true,
      notes: 'Gói dùng thử miễn phí',
      doctor_codes: JSON.stringify([doctor1Code])
    },

    // ===== GÓI 50,000 VNĐ =====
    {
      package_name: 'Tư vấn Chat Cơ bản',
      description: 'Tư vấn qua chat với bác sĩ chuyên khoa, thời gian 30 phút',
      package_type: 'chat',
      duration_minutes: 30,
      price: 50000.00,
      is_active: true,
      notes: 'Gói phổ biến nhất',
      doctor_codes: JSON.stringify([doctor1Code, doctor2Code, doctor3Code])
    },
    {
      package_name: 'Tư vấn Video Cơ bản',
      description: 'Tư vấn video call trực tiếp với bác sĩ, thời gian 20 phút',
      package_type: 'video',
      duration_minutes: 20,
      price: 50000.00,
      is_active: true,
      notes: 'Video call 1-1 với bác sĩ',
      doctor_codes: JSON.stringify([doctor2Code, doctor3Code])
    },
    {
      package_name: 'Khám tại phòng khám',
      description: 'Khám trực tiếp tại phòng khám, bao gồm thăm khám và tư vấn chi tiết',
      package_type: 'offline',
      duration_minutes: 30,
      price: 50000.00,
      is_active: true,
      notes: 'Phí khám tại phòng khám',
      doctor_codes: null // Tất cả bác sĩ
    },

    // ===== GÓI 100,000 VNĐ =====
    {
      package_name: 'Tư vấn Chat Nâng cao',
      description: 'Gói tư vấn chat chuyên sâu với bác sĩ giàu kinh nghiệm, 45 phút',
      package_type: 'chat',
      duration_minutes: 45,
      price: 100000.00,
      is_active: true,
      notes: 'Bao gồm kê đơn thuốc điện tử',
      doctor_codes: JSON.stringify([doctor2Code])
    },
    {
      package_name: 'Tư vấn Video Nâng cao',
      description: 'Video call chuyên sâu với bác sĩ chuyên khoa, 30 phút',
      package_type: 'video',
      duration_minutes: 30,
      price: 100000.00,
      is_active: true,
      notes: 'Hỗ trợ chia sẻ màn hình, xem kết quả xét nghiệm',
      doctor_codes: JSON.stringify([doctor1Code, doctor3Code])
    },

    // ===== GÓI 200,000 VNĐ =====
    {
      package_name: 'Tư vấn Video Premium',
      description: 'Gói video call cao cấp với bác sĩ chuyên gia, thời gian 60 phút',
      package_type: 'video',
      duration_minutes: 60,
      price: 200000.00,
      is_active: true,
      notes: 'Bao gồm tư vấn chi tiết, kê đơn, và theo dõi sau điều trị',
      doctor_codes: JSON.stringify([doctor3Code])
    },
    {
      package_name: 'Khám tổng quát tại phòng khám',
      description: 'Gói khám tổng quát toàn diện tại phòng khám',
      package_type: 'offline',
      duration_minutes: 60,
      price: 200000.00,
      is_active: true,
      notes: 'Bao gồm các xét nghiệm cơ bản',
      doctor_codes: null
    },

    // ===== GÓI TẠM NGƯNG =====
    {
      package_name: 'Tư vấn Chat VIP (Tạm ngưng)',
      description: 'Gói VIP không giới hạn thời gian (đang bảo trì)',
      package_type: 'chat',
      duration_minutes: 120,
      price: 500000.00,
      is_active: false,
      notes: 'Tạm ngưng do đang nâng cấp hệ thống',
      doctor_codes: null
    }
  ];

  const created = [];
  for (const pkg of packages) {
    const existing = await ConsultationPricing.findOne({
      where: { package_name: pkg.package_name },
      transaction
    });

    if (!existing) {
      const newPkg = await ConsultationPricing.create(pkg, { transaction });
      created.push(newPkg);
    }
  }

  console.log(`✅ ConsultationPricing seed: created ${created.length}/${packages.length} packages`);
  return created;
};

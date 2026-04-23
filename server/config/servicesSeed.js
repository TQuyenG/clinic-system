// server/config/servicesSeed.js
module.exports = async function seedServices(models, transaction, opts = {}) {
  const ServiceCategory = models.ServiceCategory;
  const Specialty = models.Specialty;
  const Doctor = models.Doctor;

  const categories = await ServiceCategory.findAll({ transaction });
  const specialties = await Specialty.findAll({ transaction });
  const doctors = await Doctor.findAll({ limit: 30, transaction });
  const doctorCodes = doctors.map(d => d.code).filter(Boolean);

  // helper to pick random elements
  const pick = (arr, n) => {
    const copy = Array.from(arr);
    const res = [];
    while (copy.length && res.length < n) {
      const idx = Math.floor(Math.random() * copy.length);
      res.push(copy.splice(idx,1)[0]);
    }
    return res;
  };

  const servicesToCreate = [];

  // For each category, create 3-7 services
  for (const cat of categories) {
    const count = 3 + Math.floor(Math.random() * 5); // 3..7
    for (let i = 0; i < count; i++) {
      const specialty = specialties[Math.floor(Math.random() * specialties.length)] || null;
      const assignedDoctors = pick(doctorCodes, Math.min(3, doctorCodes.length));
      const baseName = cat.name.replace(/Gói Khám /, '').trim();
      servicesToCreate.push({
        name: `${baseName} - Dịch vụ ${i+1}`,
        category_id: cat.id,
        specialty_id: specialty ? specialty.id : null,
        price: 200000 + Math.floor(Math.random() * 800000),
        duration: 20 + Math.floor(Math.random() * 60),
        short_description: `Dịch vụ ${i+1} trong ${cat.name}`,
        detailed_content: `Mô tả chi tiết cho dịch vụ ${i+1} của ${cat.name}. Bao gồm khám lâm sàng, xét nghiệm cơ bản, tư vấn và kê đơn nếu cần.`,
        image_url: null,
        doctor_codes: assignedDoctors,
        allow_doctor_choice: true,
        status: 'active'
      });
    }
  }

  try {
    await models.Service.bulkCreate(servicesToCreate.map(s => ({
      name: s.name,
      category_id: s.category_id,
      specialty_id: s.specialty_id,
      price: s.price,
      duration: s.duration,
      short_description: s.short_description,
      detailed_content: s.detailed_content,
      image_url: s.image_url,
      doctor_codes: s.doctor_codes,
      allow_doctor_choice: s.allow_doctor_choice,
      status: s.status
    })), { transaction, ignoreDuplicates: true });
  } catch (err) {
    // ignore duplicates
    console.error('servicesSeed bulkCreate error', err.message);
  }

  const names = servicesToCreate.map(s => s.name);
  const created = await models.Service.findAll({ where: { name: names }, transaction });
  return created;
};

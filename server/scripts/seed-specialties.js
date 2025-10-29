// server/scripts/seed-specialties.js
// Script to populate core specialties into the database.

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../../.env'),
});

const slugify = require('slugify');
const { sequelize, models } = require('../config/db');

const SPECIALTIES = [
  {
    name: 'Nội khoa',
    description: 'Chẩn đoán và điều trị các bệnh lý bên trong cơ thể bằng thuốc và phương pháp không phẫu thuật.',
  },
  {
    name: 'Ngoại khoa',
    description: 'Điều trị các bệnh lý cần can thiệp phẫu thuật hoặc thủ thuật ngoại khoa.',
  },
  {
    name: 'Tim mạch',
    description: 'Chăm sóc và điều trị các bệnh lý liên quan đến tim và hệ thống tuần hoàn.',
  },
  {
    name: 'Tiêu hoá',
    description: 'Điều trị các vấn đề về dạ dày, ruột, gan, tụy và hệ tiêu hoá.',
  },
  {
    name: 'Da liễu',
    description: 'Chẩn đoán và điều trị các bệnh về da, tóc, móng và thẩm mỹ da.',
  },
  {
    name: 'Nhi khoa',
    description: 'Chăm sóc sức khỏe cho trẻ sơ sinh, trẻ em và thanh thiếu niên.',
  },
  {
    name: 'Sản phụ khoa',
    description: 'Chăm sóc sức khỏe sinh sản, thai kỳ và các bệnh lý phụ khoa.',
  },
  {
    name: 'Thần kinh',
    description: 'Điều trị các bệnh về não, tủy sống, hệ thần kinh trung ương và ngoại vi.',
  },
  {
    name: 'Định dưỡng',
    description: 'Tư vấn chế độ dinh dưỡng, xây dựng thực đơn và điều trị bệnh bằng dinh dưỡng.',
  },
  {
    name: 'Sức khỏe tinh thần',
    description: 'Chăm sóc tâm lý, điều trị lo âu, trầm cảm và các rối loạn hành vi.',
  },
  {
    name: 'Phòng bệnh',
    description: 'Tư vấn phòng ngừa bệnh tật, tiêm chủng và nâng cao sức khỏe cộng đồng.',
  },
  {
    name: 'Xét nghiệm',
    description: 'Thực hiện các xét nghiệm cận lâm sàng phục vụ chẩn đoán và theo dõi điều trị.',
  },
];

const makeSlug = async (Specialty, base) => {
  const normalized = slugify(base, { lower: true, strict: true });
  let slug = normalized;
  let suffix = 2;

  // Ensure slug uniqueness.
  while (await Specialty.findOne({ where: { slug } })) {
    slug = `${normalized}-${suffix++}`;
  }

  return slug;
};

async function seedSpecialties() {
  await sequelize.authenticate();
  console.log('Kết nối database thành công.');

  const { Specialty } = models;

  await sequelize.transaction(async (transaction) => {
    for (const specialty of SPECIALTIES) {
      const existing = await Specialty.findOne({
        where: { name: specialty.name },
        transaction,
      });

      if (existing) {
        const updates = {};
        if (specialty.description && existing.description !== specialty.description) {
          updates.description = specialty.description;
        }
        if (!existing.slug) {
          updates.slug = await makeSlug(Specialty, specialty.name);
        }

        if (Object.keys(updates).length > 0) {
          await existing.update(updates, { transaction });
          console.log(`- Cập nhật chuyên khoa: ${specialty.name}`);
        } else {
          console.log(`- Bỏ qua (đã tồn tại): ${specialty.name}`);
        }
        continue;
      }

      const slug = await makeSlug(Specialty, specialty.name);
      await Specialty.create(
        {
          name: specialty.name,
          description: specialty.description,
          slug,
        },
        { transaction }
      );

      console.log(`+ Đã thêm chuyên khoa: ${specialty.name}`);
    }
  });

  console.log('Hoàn tất seed dữ liệu chuyên khoa.');
  await sequelize.close();
}

seedSpecialties().catch((error) => {
  console.error('Đã xảy ra lỗi khi seed chuyên khoa:', error.message);
  sequelize.close();
  process.exit(1);
});

// server/scripts/create-users.js
// Script tạo nhanh các tài khoản mặc định (ví dụ admin & user thường)

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../../.env')
});

const bcrypt = require('bcrypt');
const { sequelize, models } = require('../config/db');

async function upsertUser({ email, password, role, fullName }, transaction) {
  const existing = await models.User.findOne({ where: { email }, transaction });
  if (existing) {
    console.log(`- Bỏ qua ${email} (đã tồn tại với role ${existing.role})`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await models.User.create({
    email,
    password_hash: passwordHash,
    full_name: fullName || null,
    role,
    is_verified: true,
    is_active: true,
    verification_token: null,
    verification_expires: null,
    reset_token: null,
    reset_expires: null
  }, { transaction });

  console.log(`✓ Đã tạo ${role} ${email}`);
  return user;
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Kết nối database thành công.\n');

    await sequelize.transaction(async (tx) => {
      const users = [
        {
          email: 'quytai@gmail.com',
          password: 'quytai@gmail.com',
          role: 'admin',
          fullName: 'Quy Tai'
        },
        {
          email: 'user_demo@gmail.com',
          password: 'user_demo',
          role: 'patient',
          fullName: 'Demo User'
        }
      ];

      for (const userData of users) {
        await upsertUser(userData, tx);
      }
    });

    console.log('\nHoàn tất.');
  } catch (error) {
    console.error('Lỗi khi tạo user:', error.message);
  } finally {
    await sequelize.close();
  }
}

main();

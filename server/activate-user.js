#!/usr/bin/env node
/**
 * Active user script
 * Usage: node activate-user.js <userId or email>
 */
require('dotenv').config({ path: '../.env' });
const { sequelize, models } = require('./config/db');

async function activateUser(identifier) {
  try {
    if (!identifier) {
      console.error('Vui lòng cung cấp userId hoặc email. Ví dụ: node activate-user.js 13');
      process.exit(1);
    }

    let user;
    if (Number.isInteger(Number(identifier))) {
      user = await models.User.findByPk(Number(identifier));
    } else {
      user = await models.User.findOne({ where: { email: identifier } });
    }

    if (!user) {
      console.error('Không tìm thấy user với giá trị:', identifier);
      process.exit(1);
    }

    user.is_verified = true;
    user.is_active = true;
    user.verification_token = null;
    user.verification_expires = null;
    await user.save();

    console.log(`Đã kích hoạt user ${user.email} (ID: ${user.id}).`);
  } catch (error) {
    console.error('Lỗi khi kích hoạt user:', error.message);
  } finally {
    await sequelize.close();
  }
}

const identifier = process.argv[2];
activateUser(identifier);

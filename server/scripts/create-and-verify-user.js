// server/scripts/create-and-verify-user.js
// Tạo nhanh 1 tài khoản và kích hoạt ngay (dùng cho môi trường dev/test)

require('dotenv').config({ path: process.cwd().endsWith('/server') ? '.env' : '../.env' });
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sequelize, models } = require('../config/db');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const part = argv[i];
    if (part.startsWith('--')) {
      const [key, ...rest] = part.replace(/^--/, '').split('=');
      if (rest.length > 0) args[key] = rest.join('=');
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) { args[key] = argv[++i]; }
      else args[key] = true;
    }
  }
  return args;
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    const email = args.email || args.e || `tester_${Date.now()}@example.com`;
    const password = args.password || args.p || 'P@ssw0rd!';
    const fullName = args.name || args.n || 'Tester Auto';

    await sequelize.authenticate();
    console.log('✓ Kết nối database thành công');

    // Nếu đã tồn tại, kích hoạt luôn và đặt lại mật khẩu
    let user = await models.User.findOne({ where: { email } });
    const password_hash = await bcrypt.hash(password, 10);

    if (!user) {
      user = await models.User.create({
        email,
        password_hash,
        full_name: fullName,
        role: 'patient',
        is_verified: true,
        is_active: true,
        verification_token: null,
        verification_expires: null
      });
    } else {
      user.password_hash = password_hash;
      user.is_verified = true;
      user.is_active = true;
      user.verification_token = null;
      user.verification_expires = null;
      await user.save();
    }

    console.log('\n=== TÀI KHOẢN DEV ĐÃ SẴN SÀNG ===');
    console.log('Email:', email);
    console.log('Mật khẩu:', password);
    console.log('User ID:', user.id);
    console.log('is_verified:', user.is_verified, 'is_active:', user.is_active);

    process.exit(0);
  } catch (err) {
    console.error('✗ Lỗi:', err.message);
    process.exit(1);
  }
}

main();



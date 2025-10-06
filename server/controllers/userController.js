// server/controllers/userController.js
// Controller xử lý logic cho quản lý người dùng, đăng ký, đăng nhập, OTP, phân quyền

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op, Sequelize } = require('sequelize');
const { models, sequelize } = require('../config/db');
const { sendVerificationEmail, sendOTPEmail, sendPasswordResetEmail } = require('../utils/emailSender');

// Lưu trữ tạm thời số lần đăng nhập sai
const loginAttempts = new Map();
const LOCK_TIME = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

// Hàm đăng ký người dùng mới
exports.register = async (req, res) => {
  try {
    const { email, password, full_name, phone, address, gender, dob } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email và mật khẩu là bắt buộc' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email không hợp lệ' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mật khẩu phải có ít nhất 6 ký tự' 
      });
    }

    const existingUser = await models.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã được sử dụng' 
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const verification_token = crypto.randomBytes(32).toString('hex');
    const verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log('\n========== BẮT ĐẦU TẠO USER ==========');
    console.log('Email:', email);
    console.log('Token được tạo:', verification_token);
    console.log('Token expires:', verification_expires);

    const newUser = await models.User.create({
      email,
      password_hash,
      full_name: full_name || null,
      phone: phone || null,
      address: address || null,
      gender: gender || null,
      dob: dob || null,
      role: 'patient',
      is_verified: false,
      verification_token,
      verification_expires,
      is_active: false
    });

    console.log('\n--- USER SAU KHI TẠO (trước khi reload) ---');
    console.log('User ID:', newUser.id);
    console.log('is_verified:', newUser.is_verified);
    console.log('is_active:', newUser.is_active);
    console.log('verification_token:', newUser.verification_token);
    console.log('verification_expires:', newUser.verification_expires);

    const userFromDB = await models.User.findByPk(newUser.id);
    
    console.log('\n--- USER TỪ DB (sau hook afterCreate) ---');
    console.log('is_verified:', userFromDB.is_verified);
    console.log('is_active:', userFromDB.is_active);
    console.log('verification_token:', userFromDB.verification_token);
    console.log('verification_expires:', userFromDB.verification_expires);
    
    if (userFromDB.is_active === true) {
      console.log('⚠️ CẢNH BÁO: is_active đã bị đổi thành TRUE sau hook!');
    }
    
    if (!userFromDB.verification_token) {
      console.log('⚠️ CẢNH BÁO: verification_token đã bị XÓA sau hook!');
    }
    
    console.log('========== KẾT THÚC TẠO USER ==========\n');

    try {
      const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verification_token}`;
      await sendVerificationEmail(email, full_name || email, verificationLink);
      console.log('SUCCESS: Email xác thực đã gửi đến:', email);
    } catch (emailError) {
      console.error('ERROR: Không thể gửi email xác thực:', emailError.message);
      return res.status(201).json({
        success: true,
        message: 'Đăng ký thành công nhưng không thể gửi email xác thực. Vui lòng liên hệ admin để kích hoạt tài khoản.',
        userId: newUser.id,
        emailError: true
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
      userId: newUser.id
    });

  } catch (error) {
    console.error('ERROR trong register:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Dữ liệu không hợp lệ',
        error: error.errors.map(e => e.message).join(', ')
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Email đã tồn tại trong hệ thống',
        error: error.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi đăng ký người dùng', 
      error: error.message 
    });
  }
};

// Hàm xác thực email qua link
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    console.log('\n========== BẮT ĐẦU XÁC THỰC EMAIL ==========');
    console.log('Token nhận từ URL:', token);

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token xác thực không hợp lệ' 
      });
    }

    const allUsers = await models.User.findAll({
      attributes: ['id', 'email', 'verification_token', 'is_verified', 'is_active'],
      limit: 10
    });
    
    console.log('\n--- Danh sách user trong DB ---');
    allUsers.forEach(u => {
      console.log(`ID: ${u.id}, Email: ${u.email}`);
      console.log(`  Token: ${u.verification_token ? u.verification_token.substring(0, 20) + '...' : 'NULL'}`);
      console.log(`  is_verified: ${u.is_verified}, is_active: ${u.is_active}`);
    });

    const user = await models.User.findOne({ 
      where: { verification_token: token } 
    });

    console.log('\n--- Kết quả tìm kiếm ---');
    console.log('User tìm được:', user ? user.email : 'KHÔNG TÌM THẤY');

    if (!user) {
      const anyUserWithToken = await models.User.findOne({
        where: { 
          verification_token: { [Op.ne]: null }
        }
      });
      
      if (anyUserWithToken) {
        console.log('\n--- So sánh token ---');
        console.log('Token từ URL:', token);
        console.log('Token trong DB:', anyUserWithToken.verification_token);
        console.log('Độ dài token URL:', token.length);
        console.log('Độ dài token DB:', anyUserWithToken.verification_token.length);
        console.log('Token khớp?', anyUserWithToken.verification_token === token);
      } else {
        console.log('⚠️ KHÔNG CÓ USER NÀO CÓ TOKEN trong DB!');
      }

      return res.status(400).json({ 
        success: false, 
        message: 'Token xác thực không tồn tại hoặc đã được sử dụng' 
      });
    }

    if (user.verification_expires && new Date() > user.verification_expires) {
      console.log('Token đã hết hạn:', user.verification_expires);
      return res.status(400).json({ 
        success: false, 
        message: 'Token xác thực đã hết hạn. Vui lòng đăng ký lại hoặc yêu cầu gửi lại email xác thực.' 
      });
    }

    console.log('\n--- Kích hoạt user ---');
    console.log('Trước khi update:');
    console.log('  is_verified:', user.is_verified);
    console.log('  is_active:', user.is_active);

    user.is_verified = true;
    user.is_active = true;
    user.verification_token = null;
    user.verification_expires = null;
    await user.save();

    console.log('Sau khi update:');
    console.log('  is_verified:', user.is_verified);
    console.log('  is_active:', user.is_active);
    console.log('========== KẾT THÚC XÁC THỰC EMAIL ==========\n');

    res.status(200).json({
      success: true,
      message: 'Xác thực email thành công. Tài khoản đã được kích hoạt.'
    });

  } catch (error) {
    console.error('ERROR trong verifyEmail:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xác thực email', 
      error: error.message 
    });
  }
};

// Hàm đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email và mật khẩu là bắt buộc' 
      });
    }

    const attemptInfo = loginAttempts.get(email);
    if (attemptInfo && attemptInfo.lockedUntil > Date.now()) {
      const remainingTime = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({ 
        success: false, 
        message: `Tài khoản đã bị khóa do nhập sai mật khẩu quá ${MAX_ATTEMPTS} lần. Vui lòng thử lại sau ${remainingTime} phút.` 
      });
    }

    const user = await models.User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }

    console.log('\n--- DEBUG ĐĂNG NHẬP ---');
    console.log('Email:', user.email);
    console.log('is_verified:', user.is_verified);
    console.log('is_active:', user.is_active);

    if (!user.is_verified || !user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để kích hoạt tài khoản.' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      const currentAttempt = attemptInfo || { count: 0, lockedUntil: null };
      currentAttempt.count += 1;

      if (currentAttempt.count >= MAX_ATTEMPTS) {
        currentAttempt.lockedUntil = Date.now() + LOCK_TIME;
        currentAttempt.count = 0;
        loginAttempts.set(email, currentAttempt);
        
        return res.status(423).json({ 
          success: false, 
          message: `Bạn đã nhập sai mật khẩu ${MAX_ATTEMPTS} lần. Tài khoản bị khóa trong 15 phút.` 
        });
      }

      loginAttempts.set(email, currentAttempt);
      
      return res.status(401).json({ 
        success: false, 
        message: `Email hoặc mật khẩu không đúng. Còn ${MAX_ATTEMPTS - currentAttempt.count} lần thử.` 
      });
    }

    loginAttempts.delete(email);
    user.last_login = new Date();
    await user.save();

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('ERROR trong login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi đăng nhập', 
      error: error.message 
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email là bắt buộc' });
    }
    const user = await models.User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email không tồn tại trong hệ thống' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.reset_token = await bcrypt.hash(otp, 10);
    user.reset_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOTPEmail(email, user.full_name || email, otp);
    res.status(200).json({ success: true, message: 'Mã OTP đã được gửi đến email của bạn. Mã có hiệu lực trong 10 phút.' });
  } catch (error) {
    console.error('ERROR trong forgotPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi gửi OTP', error: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email và OTP là bắt buộc' });
    }
    const user = await models.User.findOne({ where: { email } });
    if (!user || !user.reset_token || !user.reset_expires) {
      return res.status(400).json({ success: false, message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }
    if (new Date() > user.reset_expires) {
      return res.status(400).json({ success: false, message: 'OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }
    const isOTPValid = await bcrypt.compare(otp, user.reset_token);
    if (!isOTPValid) {
      return res.status(400).json({ success: false, message: 'OTP không đúng' });
    }
    res.status(200).json({ success: true, message: 'Xác thực OTP thành công. Bạn có thể đặt lại mật khẩu.' });
  } catch (error) {
    console.error('ERROR trong verifyOTP:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xác thực OTP', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP và mật khẩu mới là bắt buộc' });
    }
    const user = await models.User.findOne({ where: { email } });
    if (!user || !user.reset_token || !user.reset_expires) {
      return res.status(400).json({ success: false, message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }
    if (new Date() > user.reset_expires) {
      return res.status(400).json({ success: false, message: 'OTP đã hết hạn' });
    }
    const isOTPValid = await bcrypt.compare(otp, user.reset_token);
    if (!isOTPValid) {
      return res.status(400).json({ success: false, message: 'OTP không đúng' });
    }
    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.reset_token = null;
    user.reset_expires = null;
    await user.save();
    res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('ERROR trong resetPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi đặt lại mật khẩu', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await models.User.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'reset_token', 'verification_token'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('ERROR trong getProfile:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin người dùng', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone, address, gender, dob, avatar_url } = req.body;
    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }
    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (gender !== undefined) user.gender = gender;
    if (dob !== undefined) user.dob = dob;
    if (avatar_url !== undefined) user.avatar_url = avatar_url;
    await user.save();
    res.status(200).json({ success: true, message: 'Cập nhật thông tin thành công', user: { id: user.id, email: user.email, full_name: user.full_name, phone: user.phone, address: user.address, gender: user.gender, dob: user.dob, avatar_url: user.avatar_url } });
  } catch (error) {
    console.error('ERROR trong updateProfile:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
    }
    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    }
    user.password_hash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('ERROR trong changePassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi đổi mật khẩu', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await models.User.findAll({
      attributes: { exclude: ['password_hash', 'reset_token', 'verification_token'] }
    });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('ERROR trong getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng', error: error.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;
    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }
    user.is_active = is_active;
    await user.save();
    res.status(200).json({ success: true, message: `Tài khoản đã được ${is_active ? 'mở khóa' : 'khóa'}`, user: { id: user.id, email: user.email, is_active: user.is_active } });
  } catch (error) {
    console.error('ERROR trong toggleUserStatus:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái tài khoản', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await models.User.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'reset_token', 'verification_token'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    let roleData = null;
    if (user.role === 'patient') {
      roleData = await models.Patient.findOne({ where: { user_id: userId } });
    } else if (user.role === 'staff') {
      roleData = await models.Staff.findOne({ where: { user_id: userId } });
    } else if (user.role === 'doctor') {
      roleData = await models.Doctor.findOne({ 
        where: { user_id: userId },
        include: [{ model: models.Specialty, required: false }]
      });
    } else if (user.role === 'admin') {
      roleData = await models.Admin.findOne({ where: { user_id: userId } });
    }

    const userData = user.toJSON();
    userData.roleData = roleData;

    res.status(200).json({ success: true, user: userData });
  } catch (error) {
    console.error('ERROR trong getUserById:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin người dùng', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, phone, address, gender, dob, role, specialty_id } = req.body;

    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Người dùng không tồn tại' 
      });
    }

    // Cập nhật thông tin cơ bản
    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (gender !== undefined) user.gender = gender;
    if (dob !== undefined) user.dob = dob;

    // Nếu đổi role
    if (role !== undefined && role !== user.role) {
      // Xóa record role cũ
      if (user.role === 'patient') await models.Patient.destroy({ where: { user_id: userId } });
      if (user.role === 'staff') await models.Staff.destroy({ where: { user_id: userId } });
      if (user.role === 'doctor') await models.Doctor.destroy({ where: { user_id: userId } });
      if (user.role === 'admin') await models.Admin.destroy({ where: { user_id: userId } });

      user.role = role;

      // Tạo record role mới
      if (role === 'patient') await models.Patient.create({ user_id: userId });
      if (role === 'staff') await models.Staff.create({ user_id: userId, department: null });
      if (role === 'doctor') {
        // THÊM: Cho phép chọn specialty_id khi tạo doctor
        await models.Doctor.create({ 
          user_id: userId, 
          specialty_id: specialty_id || null 
        });
      }
      if (role === 'admin') await models.Admin.create({ user_id: userId, permissions_json: null });
    }

    // CẬP NHẬT: Nếu user đã là doctor, cho phép cập nhật specialty_id
    if (user.role === 'doctor' && specialty_id !== undefined) {
      const doctor = await models.Doctor.findOne({ where: { user_id: userId } });
      if (doctor) {
        doctor.specialty_id = specialty_id;
        await doctor.save();
      }
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: 'Cập nhật thông tin thành công', 
      user: { 
        id: user.id, 
        email: user.email, 
        full_name: user.full_name, 
        role: user.role,
        is_active: user.is_active 
      } 
    });
  } catch (error) {
    console.error('ERROR trong updateUser:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi cập nhật người dùng', 
      error: error.message 
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    if (user.role === 'patient') await models.Patient.destroy({ where: { user_id: userId } });
    if (user.role === 'staff') await models.Staff.destroy({ where: { user_id: userId } });
    if (user.role === 'doctor') await models.Doctor.destroy({ where: { user_id: userId } });
    if (user.role === 'admin') await models.Admin.destroy({ where: { user_id: userId } });

    await user.destroy();

    res.status(200).json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('ERROR trong deleteUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa người dùng', error: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { keyword, role, is_active, is_verified, page = 1, limit = 10 } = req.query;
    
    const where = {};
    
    if (keyword) {
      where[Op.or] = [
        { email: { [Op.like]: `%${keyword}%` } },
        { full_name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } }
      ];
    }

    if (role) where.role = role;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (is_verified !== undefined) where.is_verified = is_verified === 'true';

    const offset = (page - 1) * limit;

    const { count, rows } = await models.User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash', 'reset_token', 'verification_token'] },
      limit: parseInt(limit),
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      users: rows
    });
  } catch (error) {
    console.error('ERROR trong searchUsers:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tìm kiếm người dùng', error: error.message });
  }
};

// ... (tiếp theo từ getUserStats)

exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await models.User.count();
    const activeUsers = await models.User.count({ where: { is_active: true } });
    const verifiedUsers = await models.User.count({ where: { is_verified: true } });
    
    const usersByRole = await models.User.findAll({
      attributes: [
        'role',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['role']
    });

    const stats = {
      total: totalUsers,
      active: activeUsers,
      verified: verifiedUsers,
      inactive: totalUsers - activeUsers,
      unverified: totalUsers - verifiedUsers,
      byRole: usersByRole.reduce((acc, curr) => {
        acc[curr.role] = parseInt(curr.get('count'));
        return acc;
      }, {})
    };

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('ERROR trong getUserStats:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thống kê', error: error.message });
  }
};

// Lấy danh sách bác sĩ (public - cho homepage)
exports.getDoctors = async (req, res) => {
  try {
    const { limit = 10, random = false } = req.query;
    
    const whereCondition = {
      role: 'doctor',
      is_active: true,
      is_verified: true
    };

    let orderClause;
    
    if (random === 'true') {
      // Dùng RAND() trực tiếp - không dùng sequelize.random()
      orderClause = Sequelize.literal('RAND()');
    } else {
      orderClause = [['created_at', 'DESC']];
    }

    const doctors = await models.User.findAll({
      where: whereCondition,
      attributes: ['id', 'email', 'full_name', 'phone', 'avatar_url'],
      limit: parseInt(limit),
      order: orderClause
    });

    if (doctors.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        doctors: []
      });
    }

    const doctorIds = doctors.map(d => d.id);
    const doctorDetails = await models.Doctor.findAll({
      where: { user_id: doctorIds },
      include: [{
        model: models.Specialty,
        attributes: ['id', 'name', 'slug'],
        required: false
      }]
    });

    const formattedDoctors = doctors.map(user => {
      const doctorDetail = doctorDetails.find(d => d.user_id === user.id);
      return {
        id: user.id,
        code: doctorDetail?.code || `BS${String(user.id).padStart(3, '0')}`,
        full_name: user.full_name || 'Chưa cập nhật',
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url || 'https://via.placeholder.com/400?text=Doctor',
        specialty_id: doctorDetail?.specialty_id,
        specialty_name: doctorDetail?.Specialty?.name || 'Chưa phân chuyên khoa',
        specialty_slug: doctorDetail?.Specialty?.slug,
        experience_years: doctorDetail?.experience_years || 0,
        bio: doctorDetail?.bio,
        certifications: doctorDetail?.certifications_json
      };
    });

    res.status(200).json({
      success: true,
      count: formattedDoctors.length,
      doctors: formattedDoctors
    });

  } catch (error) {
    console.error('ERROR trong getDoctors:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bác sĩ',
      error: error.message
    });
  }
};

// Lấy chi tiết 1 bác sĩ
exports.getDoctorById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await models.User.findOne({
      where: { 
        id: userId,
        role: 'doctor'
      },
      attributes: ['id', 'email', 'full_name', 'phone', 'avatar_url', 'gender', 'dob']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bác sĩ'
      });
    }

    const doctorDetail = await models.Doctor.findOne({
      where: { user_id: userId },
      include: [{
        model: models.Specialty,
        attributes: ['id', 'name', 'slug', 'description']
      }]
    });

    const formattedDoctor = {
      id: user.id,
      code: doctorDetail?.code || `BS${String(user.id).padStart(3, '0')}`,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url || 'https://via.placeholder.com/400?text=Doctor',
      gender: user.gender,
      dob: user.dob,
      specialty: doctorDetail?.Specialty,
      experience_years: doctorDetail?.experience_years || 0,
      bio: doctorDetail?.bio,
      certifications: doctorDetail?.certifications_json
    };

    res.status(200).json({
      success: true,
      doctor: formattedDoctor
    });

  } catch (error) {
    console.error('ERROR trong getDoctorById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin bác sĩ',
      error: error.message
    });
  }
};

// Hàm lấy thống kê người dùng (sửa lỗi Sequelize.fn)
exports.getUserStats = async (req, res) => {
  try {
    // Đảm bảo sử dụng Sequelize.fn đúng cách
    const stats = await models.User.findAll({
      attributes: [
        'role',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'] // Đếm số người dùng theo role
      ],
      group: ['role']
    });

    // Format kết quả
    const formattedStats = stats.map(stat => ({
      role: stat.role,
      count: stat.get('count')
    }));

    res.status(200).json({
      success: true,
      stats: formattedStats
    });
  } catch (error) {
    console.error('ERROR trong getUserStats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê người dùng',
      error: error.message
    });
  }
};

// ============================================
// PUBLIC API - Lấy danh sách bác sĩ công khai
// ============================================

// GET /api/users/doctors/public
exports.getAllDoctorsPublic = async (req, res) => {
  try {
    const { 
      specialty_id, 
      min_experience, 
      search, 
      page = 1, 
      limit = 12 
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where condition cho User
    const userWhere = {
      role: 'doctor',
      is_active: true,
      is_verified: true
    };

    if (search) {
      userWhere[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Build where condition cho Doctor
    const doctorWhere = {};
    if (specialty_id) {
      doctorWhere.specialty_id = specialty_id;
    }
    if (min_experience) {
      doctorWhere.experience_years = { [Op.gte]: parseInt(min_experience) };
    }

    const { count, rows: doctors } = await models.User.findAndCountAll({
      where: userWhere,
      attributes: ['id', 'email', 'full_name', 'phone', 'avatar_url', 'gender'],
      include: [{
        model: models.Doctor,
        where: doctorWhere,
        required: true,
        include: [{
          model: models.Specialty,
          attributes: ['id', 'name', 'slug'],
          required: false
        }]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    const formattedDoctors = doctors.map(user => {
      const doctor = user.Doctor;
      return {
        id: user.id,
        code: doctor?.code || `BS${String(user.id).padStart(5, '0')}`,
        full_name: user.full_name || 'Chưa cập nhật',
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        avatar_url: user.avatar_url || 'https://via.placeholder.com/400?text=Doctor',
        specialty_id: doctor?.specialty_id,
        specialty_name: doctor?.Specialty?.name || 'Chưa phân chuyên khoa',
        specialty_slug: doctor?.Specialty?.slug,
        experience_years: doctor?.experience_years || 0,
        bio: doctor?.bio
      };
    });

    res.status(200).json({
      success: true,
      doctors: formattedDoctors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    });

  } catch (error) {
    console.error('ERROR trong getAllDoctorsPublic:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bác sĩ',
      error: error.message
    });
  }
};

// GET /api/users/doctors/:code
exports.getDoctorByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const doctor = await models.Doctor.findOne({
      where: { code },
      include: [
        {
          model: models.User,
          attributes: ['id', 'email', 'full_name', 'phone', 'avatar_url', 'gender', 'dob']
        },
        {
          model: models.Specialty,
          attributes: ['id', 'name', 'slug', 'description']
        }
      ]
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bác sĩ'
      });
    }

    const user = doctor.User;

    const formattedDoctor = {
      id: user.id,
      code: doctor.code,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url || 'https://via.placeholder.com/400?text=Doctor',
      gender: user.gender,
      dob: user.dob,
      specialty: doctor.Specialty,
      experience_years: doctor.experience_years || 0,
      bio: doctor.bio,
      certifications: doctor.certifications_json
    };

    res.status(200).json({
      success: true,
      doctor: formattedDoctor
    });

  } catch (error) {
    console.error('ERROR trong getDoctorByCode:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin bác sĩ',
      error: error.message
    });
  }
};
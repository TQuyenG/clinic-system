// server/controllers/userController.js
// Controller xử lý logic cho quản lý người dùng, đăng ký, đăng nhập, OTP, phân quyền

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op, Sequelize } = require('sequelize');
const { models, sequelize } = require('../config/db');
const { sendVerificationEmail, sendOTPEmail, sendPasswordResetEmail, sendPasswordResetRequestEmail } = require('../utils/emailSender');
// Lưu trữ tạm thời số lần đăng nhập sai
const loginAttempts = new Map();
const LOCK_TIME = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

// ============================================
// HELPER FUNCTIONS - Bổ sung từ articleController để nhất quán
// ============================================

/**
 * Tạo thông báo cho 1 user
 */
const createNotification = async (userId, type, title, message, metadata_json) => {
  try {
    await models.Notification.create({
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
      link
    });
    console.log(`Đã tạo thông báo cho user ${userId}`);
  } catch (error) {
    console.error('Lỗi khi tạo thông báo:', error.message);
    throw error;
  }
};

/**
 * Gửi thông báo đến tất cả admin
 */
const notifyAllAdmins = async (type, title, message, metadata_json) => {
  try {
    const admins = await models.User.findAll({
      where: { role: 'admin' },
      include: [{
        model: models.Admin,
        required: true
      }]
    });

    for (const admin of admins) {
      await createNotification(
        admin.id, 
        type, 
        title, 
        message,
        link
      );
    }
    console.log(`Đã gửi thông báo tới ${admins.length} admin`);
  } catch (error) {
    console.error('Lỗi khi gửi thông báo tới admin:', error.message);
    throw error;
  }
};

// ============================================
// AUTHENTICATION - Đăng ký, đăng nhập, xác thực
// ============================================

// Hàm đăng ký người dùng mới
exports.register = async (req, res) => {
  const transaction = await sequelize.transaction();
  
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

    // Tạo user trong transaction
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
    }, { transaction });

    await transaction.commit();

    // Gửi email xác thực
    try {
      const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verification_token}`;
      await sendVerificationEmail(email, full_name || email, verificationLink);
      console.log('Email xác thực đã gửi đến:', email);
    } catch (emailError) {
      console.error('Không thể gửi email xác thực:', emailError.message);
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
    await transaction.rollback();
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

// Hàm xác thực email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    const user = await models.User.findOne({
      where: {
        verification_token: token,
        verification_expires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    await user.update({
      is_verified: true,
      verification_token: null,
      verification_expires: null
    });

    // ✅ BỔ SUNG: Gửi thông báo đến admin về xác thực thành công
    await notifyAllAdmins(
      'email_verified',
      `Người dùng ${user.email} vừa xác thực email thành công.`,
      `/admin/users/${user.id}` // Giả sử link dẫn đến profile user
    );

    res.status(200).json({
      success: true,
      message: 'Xác thực email thành công. Bạn có thể đăng nhập ngay.'
    });
  } catch (error) {
    console.error('ERROR trong verifyEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xác thực email'
    });
  }
};

// Hàm đăng nhập
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ email và mật khẩu' 
      });
    }

    // Tìm user
    const user = await models.User.findOne({ 
      where: { email },
      attributes: ['id', 'email', 'username', 'password_hash', 'full_name', 'role', 
                   'is_verified', 'is_active', 'avatar_url', 'last_login']
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không chính xác' 
      });
    }

    // Kiểm tra mật khẩu
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Email hoặc mật khẩu không chính xác' 
      });
    }

    // Kiểm tra xác thực email
    if (!user.is_verified) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản chưa được xác thực email. Vui lòng kiểm tra email để xác thực.' 
      });
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' 
      });
    }

    //  TẠO JWT TOKEN VỚI THỜI GIAN HẾT HẠN RÕ RÀNG
    // Token hết hạn sau 7 ngày (có thể thay đổi: '1d', '12h', '30d')
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '7d', //  Token hết hạn sau 7 ngày
        issuer: 'your-app-name', // Tùy chọn
        audience: 'your-app-users' // Tùy chọn
      }
    );

    // Cập nhật last_login
    await user.update({ last_login: new Date() });

    // Trả về thông tin user (không trả password_hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      is_active: user.is_active
    };

    console.log(` User ${email} đăng nhập thành công với role ${user.role}`);

    res.status(200).json({ 
      success: true, 
      message: 'Đăng nhập thành công',
      token,
      user: userResponse,
      expiresIn: '7d' //  Gửi thông tin thời gian hết hạn cho client
    });

  } catch (error) {
    console.error('ERROR trong login:', error);
    next(error);
  }
};


// Thêm hàm gửi lại email xác thực
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }

    const user = await models.User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được xác thực'
      });
    }

    // Tạo token mới nếu token cũ hết hạn
    let verification_token = user.verification_token;
    let verification_expires = user.verification_expires;

    if (!verification_token || new Date() > verification_expires) {
      verification_token = crypto.randomBytes(32).toString('hex');
      verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await user.update({
        verification_token,
        verification_expires
      });
    }

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verification_token}`;

    await sendVerificationEmail(email, user.full_name || user.username, verificationLink);

    res.status(200).json({
      success: true,
      message: 'Email xác thực đã được gửi lại thành công. Vui lòng kiểm tra hộp thư.'
    });
  } catch (error) {
    console.error('ERROR trong resendVerification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi lại email xác thực',
      error: error.message
    });
  }
};

// Thêm hàm yêu cầu admin xác thực thủ công
exports.requestManualVerification = async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }

    const user = await models.User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được xác thực'
      });
    }

    // Sử dụng notifyAllAdmins để gửi thông báo, nhất quán với articleController
    await notifyAllAdmins(
      'verification_request',
      `Người dùng ${user.email} yêu cầu xác thực email với lý do: "${reason || 'Không thấy email xác thực gửi về'}". Vui lòng kiểm tra và xác thực.`,
      `/admin/users/${user.id}/verify` // Giả sử link dẫn đến action xác thực
    );

    res.status(200).json({
      success: true,
      message: 'Yêu cầu đã được gửi đến admin. Chúng tôi sẽ xử lý sớm.'
    });
  } catch (error) {
    console.error('ERROR trong requestManualVerification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi yêu cầu đến admin',
      error: error.message
    });
  }
};

// // ============================================
// PASSWORD RESET - Quên mật khẩu, đặt lại mật khẩu
// ============================================

// Gửi email xác thực reset password
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email là bắt buộc' 
      });
    }

    console.log('[requestPasswordReset] Email nhận được:', email);

    const user = await models.User.findOne({ where: { email } });
    
    if (!user) {
      // Không tiết lộ email có tồn tại hay không vì lý do bảo mật
      console.log('[requestPasswordReset] Email không tồn tại:', email);
      return res.status(200).json({ 
        success: true, 
        message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu.' 
      });
    }

    // Tạo reset token
    const reset_token = crypto.randomBytes(32).toString('hex');
    const reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    console.log('[requestPasswordReset] Token tạo ra:', reset_token);
    console.log('[requestPasswordReset] Expires:', reset_expires);

    // Lưu token vào database
    user.reset_token = reset_token;
    user.reset_expires = reset_expires;
    await user.save();

    console.log('[requestPasswordReset] Đã lưu token vào DB');

    // Gửi email xác thực reset password
    try {
      const resetLink = `${process.env.CLIENT_URL}/xac-thuc-dat-lai-mat-khau?token=${reset_token}`;
      
      console.log('[requestPasswordReset] Reset link:', resetLink);
      
      // Gọi hàm gửi email - SỬA TÊN HÀM CHO ĐÚNG
      await sendPasswordResetRequestEmail(email, user.full_name || email, resetLink);
      
      console.log('[requestPasswordReset] Email đã gửi thành công đến:', email);
      
      return res.status(200).json({
        success: true,
        message: 'Chúng tôi đã gửi email xác thực đến địa chỉ của bạn. Vui lòng kiểm tra hộp thư.'
      });
      
    } catch (emailError) {
      console.error('[requestPasswordReset] Lỗi gửi email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi email. Vui lòng thử lại sau.',
        error: emailError.message
      });
    }
    
  } catch (error) {
    console.error('[requestPasswordReset] ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xử lý yêu cầu đặt lại mật khẩu', 
      error: error.message 
    });
  }
};

// Xác thực token reset password
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    console.log('[verifyResetToken] Token nhận được:', token);

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token không hợp lệ' 
      });
    }

    const user = await models.User.findOne({ 
      where: { reset_token: token } 
    });

    if (!user) {
      console.log('[verifyResetToken] Token không tồn tại');
      return res.status(400).json({ 
        success: false, 
        message: 'Token không tồn tại hoặc đã được sử dụng' 
      });
    }

    if (user.reset_expires && new Date() > user.reset_expires) {
      console.log('[verifyResetToken] Token đã hết hạn');
      return res.status(400).json({ 
        success: false, 
        message: 'Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.' 
      });
    }

    console.log('[verifyResetToken] Token hợp lệ cho user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Token hợp lệ. Bạn có thể đặt lại mật khẩu.',
      email: user.email
    });

  } catch (error) {
    console.error('[verifyResetToken] ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xác thực token', 
      error: error.message 
    });
  }
};

// Đặt lại mật khẩu mới (sau khi xác thực token)
exports.resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    console.log('[resetPasswordWithToken] Token:', token);

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token và mật khẩu mới là bắt buộc' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mật khẩu phải có ít nhất 6 ký tự' 
      });
    }

    const user = await models.User.findOne({ 
      where: { reset_token: token } 
    });

    if (!user) {
      console.log('[resetPasswordWithToken] Token không hợp lệ');
      return res.status(400).json({ 
        success: false, 
        message: 'Token không hợp lệ hoặc đã được sử dụng' 
      });
    }

    if (user.reset_expires && new Date() > user.reset_expires) {
      console.log('[resetPasswordWithToken] Token đã hết hạn');
      return res.status(400).json({ 
        success: false, 
        message: 'Token đã hết hạn' 
      });
    }

    // Cập nhật mật khẩu mới
    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.reset_token = null;
    user.reset_expires = null;
    await user.save();

    console.log('[resetPasswordWithToken] Đã đổi mật khẩu cho user:', user.email);

    // Gửi email thông báo
    try {
      await sendPasswordResetEmail(user.email, user.full_name || user.email);
      console.log('[resetPasswordWithToken] Đã gửi email thông báo');
    } catch (emailError) {
      console.error('[resetPasswordWithToken] Lỗi gửi email thông báo:', emailError);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.' 
    });

  } catch (error) {
    console.error('[resetPasswordWithToken] ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi đặt lại mật khẩu', 
      error: error.message 
    });
  }
};

// ============================================
// USER PROFILE - Quản lý thông tin cá nhân
// ============================================

// Lấy thông tin profile của chính mình
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

// Lấy thông tin role của chính mình (bao gồm cả code và specialty cho doctor)
exports.getMyRoleInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    
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
    console.error('ERROR trong getMyRoleInfo:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin role', error: error.message });
  }
};

// Cập nhật thông tin profile của chính mình (bao gồm cả thông tin doctor)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      full_name, 
      phone, 
      address, 
      gender, 
      dob, 
      avatar_url,
      // Các trường dành cho doctor
      specialty_id,
      experience_years,
      bio
    } = req.body;

    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    // Cập nhật thông tin cơ bản
    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (gender !== undefined) user.gender = gender;
    if (dob !== undefined) user.dob = dob;
    if (avatar_url !== undefined) user.avatar_url = avatar_url;

    await user.save();

    // Nếu là bác sĩ - Cho phép cập nhật thông tin chuyên môn
    if (user.role === 'doctor') {
      const doctor = await models.Doctor.findOne({ where: { user_id: userId } });
      
      if (doctor) {
        if (specialty_id !== undefined) doctor.specialty_id = specialty_id;
        if (experience_years !== undefined) doctor.experience_years = experience_years;
        if (bio !== undefined) doctor.bio = bio;
        
        await doctor.save();
        console.log(`Đã cập nhật thông tin bác sĩ cho user ${userId}`);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Cập nhật thông tin thành công', 
      user: { 
        id: user.id, 
        email: user.email, 
        full_name: user.full_name, 
        phone: user.phone, 
        address: user.address, 
        gender: user.gender, 
        dob: user.dob, 
        avatar_url: user.avatar_url 
      } 
    });
  } catch (error) {
    console.error('ERROR trong updateProfile:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin', error: error.message });
  }
};

// Đổi mật khẩu
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

// ============================================
// USER MANAGEMENT - Quản lý người dùng (Admin only)
// ============================================

// Lấy tất cả người dùng
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

// Lấy thông tin người dùng theo ID (Admin only)
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

// Cập nhật thông tin người dùng (Admin only)
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
        await models.Doctor.create({ 
          user_id: userId, 
          specialty_id: specialty_id || null 
        });
      }
      if (role === 'admin') await models.Admin.create({ user_id: userId, permissions_json: null });
    }

    // Nếu user đã là doctor, cho phép cập nhật specialty_id
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

// Xóa người dùng (Admin only)
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

// Tìm kiếm người dùng
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

// Lấy thống kê người dùng
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await models.User.count();
    const activeUsers = await models.User.count({ where: { is_active: true } });
    const verifiedUsers = await models.User.count({ where: { is_verified: true } });
    
    const usersByRole = await models.User.findAll({
      attributes: [
        'role',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
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

// Toggle trạng thái hoạt động của user
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

// Toggle xác thực người dùng (Admin only)
exports.toggleUserVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_verified } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    // Cập nhật trạng thái xác thực
    user.is_verified = is_verified;
    
    // Nếu xác thực thì cũng kích hoạt tài khoản
    if (is_verified && !user.is_active) {
      user.is_active = true;
    }
    
    await user.save();

    res.status(200).json({
      success: true,
      message: `Tài khoản đã được ${is_verified ? 'xác thực' : 'hủy xác thực'}`,
      user: {
        id: user.id,
        email: user.email,
        is_verified: user.is_verified,
        is_active: user.is_active
      }
    });

  } catch (error) {
    console.error('ERROR trong toggleUserVerification:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thay đổi trạng thái xác thực',
      error: error.message
    });
  }
};

// Đặt lại mật khẩu bởi Admin (không cần OTP)
exports.resetPasswordByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { new_password } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    const user = await models.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    user.password_hash = await bcrypt.hash(new_password, 10);
    user.reset_token = null;
    user.reset_expires = null;
    
    await user.save();

    console.log(`[Admin Reset Password] Admin ${req.user.email} đã đặt lại mật khẩu cho user ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công'
    });

  } catch (error) {
    console.error('ERROR trong resetPasswordByAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đặt lại mật khẩu',
      error: error.message
    });
  }
};

// ============================================
// DOCTOR PUBLIC API - Lấy danh sách bác sĩ công khai
// ============================================

// Lấy danh sách bác sĩ (public - cho homepage)
exports.getDoctors = async (req, res) => {
  try {
    const { limit = 10, random = false, specialty_id, min_experience } = req.query;
    
    const userWhere = {
      role: 'doctor',
      is_active: true,
      is_verified: true
    };

    const doctorWhere = {};
    if (specialty_id) {
      doctorWhere.specialty_id = specialty_id;
    }
    if (min_experience) {
      doctorWhere.experience_years = { [Op.gte]: parseInt(min_experience) };
    }

    // Order clause
    let orderClause;
    if (random === 'true') {
      orderClause = Sequelize.literal('RAND()');
    } else {
      orderClause = [['created_at', 'DESC']];
    }

    // Lấy danh sách users với role doctor
    const users = await models.User.findAll({
      where: userWhere,
      attributes: ['id', 'email', 'full_name', 'phone', 'avatar_url', 'gender'],
      limit: parseInt(limit),
      order: orderClause
    });

    if (users.length === 0) {
      return res.status(200).json({
        success: true,
        doctors: [],
        total: 0
      });
    }

    // Lấy thông tin chi tiết doctor
    const userIds = users.map(u => u.id);
    const doctors = await models.Doctor.findAll({
      where: { 
        user_id: { [Op.in]: userIds },
        ...doctorWhere
      },
      include: [{
        model: models.Specialty,
        attributes: ['id', 'name', 'slug', 'description'],
        required: false
      }]
    });

    // Format response
    const formattedDoctors = users
      .map(user => {
        const doctor = doctors.find(d => d.user_id === user.id);
        if (!doctor) return null;
        
        return {
          id: user.id,
          code: doctor.code || `BS${String(user.id).padStart(5, '0')}`,
          full_name: user.full_name || 'Chưa cập nhật',
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          avatar_url: user.avatar_url || 'https://via.placeholder.com/400?text=Doctor',
          specialty_id: doctor.specialty_id,
          specialty_name: doctor.Specialty?.name || 'Chưa phân chuyên khoa',
          specialty_slug: doctor.Specialty?.slug,
          experience_years: doctor.experience_years || 0,
          bio: doctor.bio
        };
      })
      .filter(d => d !== null);

    res.status(200).json({
      success: true,
      doctors: formattedDoctors,
      total: formattedDoctors.length
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

// Lấy danh sách bác sĩ với phân trang
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

// Lấy chi tiết bác sĩ theo code
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

// Lấy chi tiết bác sĩ theo ID
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
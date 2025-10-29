// server/utils/emailSender.js
// Utility để gửi email xác thực, OTP và các thông báo khác qua Gmail

const nodemailer = require('nodemailer');

// Cấu hình transporter cho Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Hàm gửi email xác thực khi đăng ký
const sendVerificationEmail = async (toEmail, userName, verificationLink) => {
  try {
    const mailOptions = {
      from: `"Clinic System" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Xác thực tài khoản - Clinic System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background-color: #4CAF50; 
              color: white; 
              padding: 20px; 
              text-align: center; 
              border-radius: 5px 5px 0 0;
            }
            .content { 
              background-color: #f9f9f9; 
              padding: 30px; 
              border: 1px solid #ddd;
            }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background-color: #4CAF50; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              font-size: 12px; 
              color: #666; 
            }
            .link-text {
              word-break: break-all;
              color: #0066cc;
              padding: 10px;
              background-color: #f0f0f0;
              border-radius: 3px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Chào mừng đến với Clinic System!</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${userName}</strong>,</p>
              <p>Cảm ơn bạn đã đăng ký tài khoản tại Clinic System.</p>
              <p>Để hoàn tất quá trình đăng ký và kích hoạt tài khoản, vui lòng nhấp vào nút bên dưới:</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Xác thực tài khoản</a>
              </div>
              <p>Hoặc bạn có thể copy link sau vào trình duyệt:</p>
              <div class="link-text">${verificationLink}</div>
              <p><strong>Lưu ý:</strong> Link này sẽ hết hiệu lực sau 24 giờ.</p>
              <p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
            </div>
            <div class="footer">
              <p>Trân trọng,<br>Đội ngũ Clinic System</p>
              <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('SUCCESS: Email xác thực đã được gửi:', info.messageId);
    return true;
  } catch (error) {
    console.error('ERROR khi gửi email xác thực:', error.message);
    throw error;
  }
};

// Hàm gửi OTP qua email
const sendOTPEmail = async (toEmail, userName, otp) => {
  try {
    const mailOptions = {
      from: `"Clinic System" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Mã OTP đặt lại mật khẩu - Clinic System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background-color: #2196F3; 
              color: white; 
              padding: 20px; 
              text-align: center; 
              border-radius: 5px 5px 0 0;
            }
            .content { 
              background-color: #f9f9f9; 
              padding: 30px; 
              border: 1px solid #ddd;
            }
            .otp-box { 
              background-color: #fff; 
              border: 2px dashed #2196F3; 
              padding: 20px; 
              text-align: center; 
              margin: 20px 0;
              border-radius: 5px;
            }
            .otp-code { 
              font-size: 36px; 
              font-weight: bold; 
              color: #2196F3; 
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              font-size: 12px; 
              color: #666; 
            }
            .warning { 
              color: #ff5722; 
              font-weight: bold; 
            }
            ul {
              text-align: left;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Đặt lại mật khẩu</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${userName}</strong>,</p>
              <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình tại Clinic System.</p>
              <p>Mã OTP của bạn là:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p><strong>Lưu ý quan trọng:</strong></p>
              <ul>
                <li>Mã OTP này có hiệu lực trong <span class="warning">10 phút</span></li>
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
              </ul>
            </div>
            <div class="footer">
              <p>Trân trọng,<br>Đội ngũ Clinic System</p>
              <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('SUCCESS: Email OTP đã được gửi:', info.messageId);
    return true;
  } catch (error) {
    console.error('ERROR khi gửi email OTP:', error.message);
    throw error;
  }
};

// Hàm gửi email thông báo đặt lại mật khẩu thành công
const sendPasswordResetEmail = async (toEmail, userName) => {
  try {
    const mailOptions = {
      from: `"Clinic System" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Mật khẩu đã được đặt lại - Clinic System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background-color: #4CAF50; 
              color: white; 
              padding: 20px; 
              text-align: center; 
              border-radius: 5px 5px 0 0;
            }
            .content { 
              background-color: #f9f9f9; 
              padding: 30px; 
              border: 1px solid #ddd;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              font-size: 12px; 
              color: #666; 
            }
            .warning { 
              color: #ff5722; 
              font-weight: bold; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Mật khẩu đã được đặt lại</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${userName}</strong>,</p>
              <p>Mật khẩu của bạn đã được đặt lại thành công.</p>
              <p>Bạn có thể đăng nhập với mật khẩu mới ngay bây giờ.</p>
              <p class="warning">Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.</p>
            </div>
            <div class="footer">
              <p>Trân trọng,<br>Đội ngũ Clinic System</p>
              <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('SUCCESS: Email thông báo đặt lại mật khẩu đã được gửi:', info.messageId);
    return true;
  } catch (error) {
    console.error('ERROR khi gửi email thông báo:', error.message);
    throw error;
  }
};

// Hàm gửi email chào mừng sau khi xác thực thành công
const sendWelcomeEmail = async (toEmail, userName) => {
  try {
    const mailOptions = {
      from: `"Clinic System" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Chào mừng đến với Clinic System!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background-color: #4CAF50; 
              color: white; 
              padding: 20px; 
              text-align: center; 
              border-radius: 5px 5px 0 0;
            }
            .content { 
              background-color: #f9f9f9; 
              padding: 30px; 
              border: 1px solid #ddd;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              font-size: 12px; 
              color: #666; 
            }
            ul {
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Chào mừng bạn!</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${userName}</strong>,</p>
              <p>Chúc mừng! Tài khoản của bạn đã được kích hoạt thành công.</p>
              <p>Bây giờ bạn có thể:</p>
              <ul>
                <li>Đặt lịch khám bệnh</li>
                <li>Tư vấn trực tuyến với bác sĩ</li>
                <li>Xem hồ sơ y tế cá nhân</li>
                <li>Và nhiều dịch vụ khác</li>
              </ul>
              <p>Chúng tôi rất vui được phục vụ bạn!</p>
            </div>
            <div class="footer">
              <p>Trân trọng,<br>Đội ngũ Clinic System</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('SUCCESS: Email chào mừng đã được gửi:', info.messageId);
    return true;
  } catch (error) {
    console.error('ERROR khi gửi email chào mừng:', error.message);
    throw error;
  }
};

// Export tất cả các hàm
module.exports = {
  sendVerificationEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
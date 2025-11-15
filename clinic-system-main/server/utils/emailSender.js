// server/utils/emailSender.js
// PHIÊN BẢN HOÀN CHỈNH
// 1. SỬA: Sử dụng đúng biến GMAIL_USER/GMAIL_PASS
// 2. SỬA: Loại bỏ 100% Emoji và Icon khỏi template
// 3. SỬA: Tổng hợp đầy đủ các template (Auth + Appointment + MedicalRecord)

const nodemailer = require('nodemailer');

// Cấu hình email transporter
const createTransporter = () => {
  // SỬA: Sử dụng environment variables cho Gmail
  const config = {
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, //
      pass: process.env.GMAIL_PASS  //
    }
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email: Using development mode (emails will be logged, not sent)');
  }

  return nodemailer.createTransport(config);
};

/**
 * Gửi email
 *
 */
const sendEmail = async (emailData) => {
  try {
    const { to, subject, template, data, html, text } = emailData;

    if (!to || !subject) {
      throw new Error('Email address and subject are required');
    }

    let emailContent = {
      html: html || generateHTMLFromTemplate(template, data),
      text: text || generateTextFromTemplate(template, data)
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('📧 EMAIL DEBUG:');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Template:', template);
      console.log('Content Preview:', emailContent.html.substring(0, 200) + '...');
      
      return {
        success: true,
        messageId: 'dev-mode-' + Date.now(),
        message: 'Email logged in development mode'
      };
    }

    const transporter = createTransporter();

    const mailOptions = {
      // SỬA: Dùng đúng GMAIL_USER từ .env
      from: `"${process.env.HOSPITAL_NAME || 'Clinic System'}" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to send email'
    };
  }
};

/**
 * Tạo HTML từ Template
 * SỬA: Tinh chỉnh CSS và loại bỏ tất cả EMOJI/ICONS
 *
 */
const generateHTMLFromTemplate = (templateName, data = {}) => {
  const baseStyle = `
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
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      }
      .header { 
        background-color: #a0d9b5; /* SỬA: Dùng màu Pastel */
        color: #1f2937; /* SỬA: Dùng màu text đậm */
        padding: 30px; 
        text-align: center; 
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
      }
      .content { 
        background-color: #ffffff; 
        padding: 30px; 
      }
      .content p {
        margin-bottom: 20px;
      }
      .footer { 
        text-align: center; 
        padding: 20px; 
        font-size: 12px; 
        color: #666; 
        background-color: #f9fafb;
      }
      .button { 
        display: inline-block; 
        padding: 12px 30px; 
        background-color: #81b997; /* SỬA: Màu nút đậm hơn */
        color: #ffffff !important; /* SỬA: Chữ trắng */
        text-decoration: none; 
        border-radius: 5px; 
        margin: 20px 0;
        font-weight: bold;
      }
      .link-text {
        word-break: break-all;
        color: #333;
        padding: 10px;
        background-color: #f0f0f0;
        border-radius: 3px;
        font-family: 'Courier New', Courier, monospace;
      }
      .warning { 
        color: #D9534F; /* Màu đỏ cảnh báo */
        font-weight: bold; 
      }
      .info-box {
        background-color: #f9fafb;
        border-left: 4px solid #a0d9b5; /* SỬA: Dùng màu Pastel */
        padding: 15px;
        margin: 20px 0;
        border-radius: 0 4px 4px 0;
      }
      .info-box p {
        margin: 8px 0;
        font-size: 0.95rem;
      }
      .info-box strong {
        color: #333;
        min-width: 100px;
        display: inline-block;
      }
      .info-row { 
        display: block; 
        padding: 10px 0; 
        border-bottom: 1px solid #eee; 
      }
      .info-row:last-child { border-bottom: none; }
      .label { font-weight: bold; color: #666; }
      .value { color: #333; }
    </style>
  `;

  const templates = {
    // === TEMPLATE XÁC THỰC ===
    verification_email: `
      <!DOCTYPE html>
      <html><head>${baseStyle}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Chào mừng đến với Clinic System!</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.userName || 'Quý khách'}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại Clinic System.</p>
            <p>Để hoàn tất quá trình đăng ký và kích hoạt tài khoản, vui lòng nhấp vào nút bên dưới:</p>
            <div style="text-align: center;">
              <a href="${data.verificationLink || '#'}" class="button">Xác thực tài khoản</a>
            </div>
            <p>Hoặc bạn có thể copy link sau vào trình duyệt:</p>
            <div class="link-text">${data.verificationLink || '#'}</div>
            <p><strong>Lưu ý:</strong> Link này sẽ hết hiệu lực sau 24 giờ.</p>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

    password_reset_request: `
      <!DOCTYPE html>
      <html><head>${baseStyle}
        <style>.header{background-color: #fde68a;} .button{background-color: #f6d057; color: #333 !important;}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Đặt lại mật khẩu</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.userName || 'Quý khách'}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại Clinic System.</p>
            <div style="text-align: center;">
              <a href="${data.resetLink || '#'}" class="button">Xác thực và đặt lại mật khẩu</a>
            </div>
            <p>Hoặc bạn có thể copy link sau vào trình duyệt:</p>
            <div class="link-text">${data.resetLink || '#'}</div>
            <p class="warning">Lưu ý: Link này sẽ hết hiệu lực sau 1 giờ.</p>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

    password_reset_success: `
      <!DOCTYPE html>
      <html><head>${baseStyle}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Mật khẩu đã được đặt lại</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.userName || 'Quý khách'}</strong>,</p>
            <p>Mật khẩu của bạn đã được đặt lại thành công vào lúc ${data.dateTime || new Date().toLocaleString('vi-VN')}.</p>
            <p class="warning">Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức để bảo mật tài khoản.</p>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

    account_verified: `
      <!DOCTYPE html>
      <html><head>${baseStyle}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Tài khoản đã được xác thực!</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.userName || 'Quý khách'}</strong>,</p>
            <p>Chúng tôi vui mừng thông báo rằng tài khoản của bạn đã được xác thực và kích hoạt thành công!</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">${data.email || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Thời gian xác thực:</span>
                <span class="value">${data.verifiedAt || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
              </div>
              <div class="info-row">
                <span class="label">Phương thức:</span>
                <span class="value">${data.verifiedBy === 'admin' ? 'Được xác thực bởi Admin' : 'Tự xác thực qua email'}</span>
              </div>
            </div>
            
            <p>Bây giờ bạn có thể đăng nhập và sử dụng đầy đủ các tính năng của hệ thống:</p>
            <ul style="line-height: 2;">
              <li>Đặt lịch khám với các bác sĩ</li>
              <li>Quản lý hồ sơ bệnh án</li>
              <li>Xem lịch sử khám bệnh</li>
              <li>Tư vấn trực tuyến</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" class="button">Đăng nhập ngay</a>
            </div>
            
            <p>Nếu bạn có bất kỳ thắc mắc nào, đừng ngần ngại liên hệ với chúng tôi!</p>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

    welcome_email: `
      <!DOCTYPE html>
      <html><head>${baseStyle}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Tài khoản đã được kích hoạt!</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.userName || 'Quý khách'}</strong>,</p>
            <p>Chúc mừng! Tài khoản của bạn đã được kích hoạt thành công.</p>
            <p>Bây giờ bạn có thể đăng nhập để:</p>
            <ul>
              <li>Đặt lịch khám bệnh nhanh chóng</li>
              <li>Tư vấn trực tuyến với bác sĩ</li>
              <li>Xem và quản lý hồ sơ y tế cá nhân</li>
            </ul>
            <p>Chúng tôi rất vui được phục vụ bạn!</p>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

    // === TEMPLATE LỊCH HẸN ===

    appointment_confirmation: `
      <!DOCTYPE html>
      <html><head>${baseStyle}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Xác nhận lịch hẹn</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName || 'Quý khách'}</strong>,</p>
            <p>Cảm ơn bạn đã đặt lịch khám tại Clinic System. Lịch hẹn của bạn đã được ${data.price > 0 ? 'ghi nhận và đang chờ thanh toán' : 'XÁC NHẬN'}.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="label">Mã lịch hẹn:</span>
                <span class="value">${data.appointmentCode || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Dịch vụ:</span>
                <span class="value">${data.serviceName || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Thời gian:</span>
                <span class="value">${data.appointmentTime || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Bác sĩ:</span>
                <span class="value">${data.doctorName || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Chi phí:</span>
                <span class="value">${data.price ? new Intl.NumberFormat('vi-VN').format(data.price) + ' VNĐ' : 'Miễn phí'}</span>
              </div>
            </div>
            
            <p><strong>Lưu ý quan trọng:</strong></p>
            <ul>
              <li>Vui lòng có mặt trước 15 phút so với giờ hẹn</li>
              <li>Mang theo CMND/CCCD và thẻ BHYT (nếu có)</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${data.appointmentLink || '#'}" class="button">Xem chi tiết lịch hẹn</a>
            </div>
          </div>
          <div class="footer">
            <p>Clinic System - Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</p>
            <p>Điện thoại: (028) 1234 5678 | Email: contact@clinic.com</p>
          </div>
        </div>
      </body></html>
    `,

    appointment_reminder: `
      <!DOCTYPE html>
      <html><head>${baseStyle}
        <style>.header{background-color: #fde68a;} .button{background-color: #f6d057; color: #333 !important;}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nhắc nhở lịch hẹn</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName || 'Quý khách'}</strong>,</p>
            <p>Đây là email nhắc nhở về lịch hẹn của bạn vào ngày mai:</p>
            
            <div class="info-box" style="background-color: #fffbeb; border-left-color: #f6d057;">
              <div class="info-row">
                <span class="label">Mã lịch hẹn:</span>
                <span class="value">${data.appointmentCode || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Thời gian:</span>
                <span class="value">${data.appointmentTime || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Dịch vụ:</span>
                <span class="value">${data.serviceName || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Bác sĩ:</span>
                <span class="value">${data.doctorName || 'Sẽ được thông báo'}</span>
              </div>
            </div>
            
            <p>Vui lòng chuẩn bị và có mặt đúng giờ. Cảm ơn!</p>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

    appointment_cancelled: `
      <!DOCTYPE html>
      <html><head>${baseStyle}
        <style>.header{background-color: #f4b6b6;} .button{background-color: #D9534F;}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thông báo hủy lịch hẹn</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName || 'Quý khách'}</strong>,</p>
            <p>Chúng tôi rất tiếc phải thông báo lịch hẹn của bạn đã bị hủy.</p>
            
            <div class="info-box" style="background-color: #ffeeee; border-left-color: #D9534F;">
              <div class="info-row">
                <span class="label">Mã lịch hẹn:</span>
                <span class="value">${data.appointmentCode || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Lý do hủy:</span>
                <span class="value">${data.cancelReason || 'Không có lý do cụ thể'}</span>
              </div>
              <div class="info-row">
                <span class="label">Thời gian hủy:</span>
                <span class="value">${data.cancelledAt || 'N/A'}</span>
              </div>
            </div>
            
            <p>Nếu bạn muốn đặt lịch hẹn mới, vui lòng truy cập website của chúng tôi.</p>
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL || '#'}" class="button">Đặt lịch mới</a>
            </div>
            <p>Xin lỗi vì sự bất tiện này!</p>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

    review_reminder: `
      <!DOCTYPE html>
      <html><head>${baseStyle}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Đánh giá dịch vụ</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName || 'Quý khách'}</strong>,</p>
            <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi. Ý kiến của bạn rất quan trọng để chúng tôi cải thiện chất lượng phục vụ!</p>
            
            <div class="info-box">
              <p><strong>Lịch hẹn:</strong> ${data.appointmentCode || 'N/A'}</p>
              <p><strong>Dịch vụ:</strong> ${data.serviceName || 'N/A'}</p>
            </div>
            
            <p>Vui lòng dành vài phút để đánh giá chất lượng dịch vụ:</p>
            <div style="text-align: center;">
              <a href="${data.reviewLink || '#'}" class="button">Đánh giá ngay</a>
            </div>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

    // === TEMPLATE KHÔI PHỤC MÃ LỊCH HẸN ===
    appointment_code_recovery: `
      <!DOCTYPE html>
      <html><head>${baseStyle}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Khôi phục Mã Lịch hẹn</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName || 'Quý khách'}</strong>,</p>
            <p>Chúng tôi tìm thấy ${data.appointments?.length || 0} lịch hẹn vào ngày <strong>${data.appointmentDate}</strong> liên kết với ${data.contact} của bạn:</p>
            
            <div class="info-box">
              ${(data.appointments || []).map(apt => `
                <div class="info-row">
                  <span class="label">${apt.time} - ${apt.serviceName}</span>
                  <span class="value" style="font-weight: bold; color: #D9534F;">Mã: ${apt.code}</span>
                </div>
              `).join('')}
            </div>
            
            <p>Vui lòng sử dụng các mã này (cùng với Mã tra cứu đã nhận trước đó) để tra cứu kết quả.</p>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,
    
    // === BỔ SUNG TEMPLATE HỒ SƠ Y TẾ ===

    medical_record_created: `
      <!DOCTYPE html>
      <html><head>${baseStyle}
        <style>.header{background-color: #dbeafe;} .button{background-color: #3b82f6;}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thông tin Tra cứu Kết quả Khám bệnh</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName || 'Quý khách'}</strong>,</p>
            <p>Bác sĩ <strong>${data.doctorName || 'phụ trách'}</strong> đã hoàn tất hồ sơ khám bệnh cho lịch hẹn <strong>${data.appointmentCode}</strong>.</p>
            <p>Đây là thông tin <span class="warning">BẢO MẬT</span> để bạn tra cứu kết quả. Vui lòng lưu trữ cẩn thận và không chia sẻ cho người khác:</p>
            
            <div class="info-box" style="background-color: #f9fafb; border-left-color: #D9534F;">
              <div class="info-row">
                <span class="label">Mã lịch hẹn:</span>
                <span class="value">${data.appointmentCode || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Mã tra cứu (Bí mật):</span>
                <span class="value" style="font-weight: bold; color: #D9534F; font-size: 1.1rem; letter-spacing: 1px;">
                  ${data.lookupCode || 'N/A'}
                </span>
              </div>
            </div>
            
            <p>Bạn có thể sử dụng hai mã này để tra cứu kết quả bất cứ lúc nào tại trang tra cứu của chúng tôi:</p>
            <div style="text-align: center;">
              <a href="${data.lookupUrl || '#'}" class="button">Đến trang tra cứu</a>
            </div>
            <p>Hoặc bạn có thể copy link sau vào trình duyệt:</p>
            <div class="link-text">${data.lookupUrl || '#'}</div>
          </div>
          <div class="footer">
            <p>Trân trọng,<br>Đội ngũ Clinic System</p>
          </div>
        </div>
      </body></html>
    `,

  };

  return templates[templateName] || templates.default;
};

/**
 * Tạo phiên bản Text
 *
 */
const generateTextFromTemplate = (templateName, data = {}) => {
  const templates = {
    verification_email: `
XÁC THỰC TÀI KHOẢN
Xin chào ${data.userName || 'Quý khách'},
Cảm ơn bạn đã đăng ký tại Clinic System. Vui lòng truy cập link sau để kích hoạt tài khoản:
${data.verificationLink || '#'}
(Link hết hạn sau 24 giờ)
    `,

    password_reset_request: `
ĐẶT LẠI MẬT KHẨU
Xin chào ${data.userName || 'Quý khách'},
Chúng tôi nhận được yêu cầu đặt lại mật khẩu. Truy cập link sau để tiếp tục:
${data.resetLink || '#'}
(Link hết hạn sau 1 giờ)
    `,

    password_reset_success: `
ĐẶT LẠI MẬT KHẨU THÀNH CÔNG
Xin chào ${data.userName || 'Quý khách'},
Mật khẩu của bạn đã được đặt lại thành công. Nếu không phải bạn, hãy liên hệ chúng tôi ngay.
    `,
    
    account_verified: `
TÀI KHOẢN ĐÃ ĐƯỢC XÁC THỰC
Xin chào ${data.userName || 'Quý khách'},
Tài khoản của bạn đã được xác thực và kích hoạt thành công vào lúc ${data.verifiedAt || new Date().toLocaleString('vi-VN')}.
${data.verifiedBy === 'admin' ? 'Tài khoản được xác thực bởi Admin.' : 'Bạn đã tự xác thực qua email.'}
Bạn có thể đăng nhập ngay tại: ${process.env.CLIENT_URL || 'http://localhost:3000'}/login
    `,
    
    welcome_email: `
CHÀO MỪNG ĐẾN VỚI CLINIC SYSTEM
Xin chào ${data.userName || 'Quý khách'},
Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập ngay để đặt lịch và quản lý hồ sơ.
    `,

    // MỚI
    appointment_confirmation: `
XÁC NHẬN LỊCH HẸN
Xin chào ${data.patientName || 'Quý khách'},
Lịch hẹn của bạn đã được tạo thành công.
- Mã lịch hẹn: ${data.appointmentCode || 'N/A'}
- Dịch vụ: ${data.serviceName || 'N/A'}
- Thời gian: ${data.appointmentTime || 'N/A'}
- Bác sĩ: ${data.doctorName || 'N/A'}
- Chi phí: ${data.price ? new Intl.NumberFormat('vi-VN').format(data.price) + ' VNĐ' : 'Miễn phí'}
- Xem chi tiết: ${data.appointmentLink || '#'}
Vui lòng có mặt trước 15 phút.
    `,

    // MỚI
    appointment_reminder: `
NHẮC NHỞ LỊCH HẸN
Xin chào ${data.patientName || 'Quý khách'},
Bạn có lịch khám trong 24h tới:
- Mã lịch hẹn: ${data.appointmentCode || 'N/A'}
- Thời gian: ${data.appointmentTime || 'N/A'}
- Dịch vụ: ${data.serviceName || 'N/A'}
Vui lòng chuẩn bị và có mặt đúng giờ.
    `,

    // MỚI
    appointment_cancelled: `
THÔNG BÁO HỦY LỊCH HẸN
Xin chào ${data.patientName || 'Quý khách'},
Lịch hẹn của bạn đã bị hủy.
- Mã lịch hẹn: ${data.appointmentCode || 'N/A'}
- Lý do hủy: ${data.cancelReason || 'Không có lý do cụ thể'}
Xin lỗi vì sự bất tiện này.
    `,
    
    // NHẮC ĐÁNH GIÁ
    review_reminder: `
ĐÁNH GIÁ DỊCH VỤ
Xin chào ${data.patientName || 'Quý khách'},
Cảm ơn bạn đã sử dụng dịch vụ. Vui lòng dành chút thời gian đánh giá trải nghiệm của bạn tại:
${data.reviewLink || '#'}
    `,

    // KHÔI PHỤC MÃ LỊCH HẸN
   appointment_code_recovery: `
KHÔI PHỤC MÃ LỊCH HẸN
Xin chào ${data.patientName || 'Quý khách'},
Chúng tôi tìm thấy ${data.appointments?.length || 0} lịch hẹn vào ngày ${data.appointmentDate} của bạn:
${(data.appointments || []).map(apt => `
- Giờ: ${apt.time} (${apt.serviceName})
  Mã Lịch hẹn: ${apt.code}
`).join('')}
Vui lòng sử dụng mã này để tra cứu.
    `,
    
    // === BỔ SUNG TEXT ===



     // === TEXT NHẮC TƯ VẤN (MỚI) ===
    chat_reminder_otp: `
⏰ SẮP ĐẾN GIỜ TƯ VẤN
Xin chào ${data.patientName || 'Quý khách'},
Buổi tư vấn với BS ${data.doctorName || 'bác sĩ'} sẽ bắt đầu sau 5 phút.

Thời gian: ${data.appointmentTime || 'N/A'}
Mã OTP: ${data.otp || 'N/A'}

Vào phòng chat tại: ${data.chatLink || '#'}

Lưu ý: Mã OTP hết hiệu lực sau 10 phút.
    `,

// // THÊM MỚI: TEMPLATE CHO VIDEO CALL
//     video_reminder: `
//       <!DOCTYPE html>
//       <html><head>${baseStyle}
//         <style>
//           .header{background-color: #D1E5F6;} /* Xanh dương pastel */
//           .button{background-color: #3B82F6;} /* Xanh dương đậm */
//           .otp-code {
//             font-size: 2.5rem;
//             font-weight: bold;
//             color: #1E3A8A; /* Xanh navy */
//             letter-spacing: 5px;
//             text-align: center;
//             padding: 15px;
//             background-color: #F3F4F6;
//             border: 1px dashed #D1D5DB;
//             border-radius: 8px;
//             margin: 25px auto;
//             width: 200px;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>Sắp đến giờ Video Call</h1>
//           </div>
//           <div class="content">
//             <p>Xin chào <strong>${data.patientName || 'Quý khách'}</strong>,</p>
//             <p>Buổi tư vấn Video Call của bạn với <strong>Bác sĩ ${data.doctorName || ''}</strong> sẽ bắt đầu sau 5 phút.</p>
            
//             <div class="info-box" style="border-left-color: #3B82F6;">
//               <div class="info-row">
//                 <span class="label">Thời gian:</span>
//                 <span class="value">${data.appointmentTime || 'N/A'}</span>
//               </div>
//             </div>

//             <p>Vui lòng sử dụng <strong>Mã OTP</strong> dưới đây để vào phòng. Mã này có hiệu lực trong 10 phút:</p>
            
//             <div class="otp-code">
//               ${data.otp || 'N/A'}
//             </div>
            
//             <div style="text-align: center;">
//               <a href="${data.videoLink || '#'}" class="button">Vào phòng Video Call</a>
//             </div>
//           </div>
//           <div class="footer">
//             <p>Trân trọng,<br>Đội ngũ Clinic System</p>
//           </div>
//         </div>
//       </body></html>
//     `,

    // THÊM MỚI: TEXT CHO VIDEO CALL
    video_reminder: `
SẮP ĐẾN GIỜ VIDEO CALL
Xin chào ${data.patientName || 'Quý khách'},
Buổi Video Call với BS ${data.doctorName || 'bác sĩ'} sẽ bắt đầu sau 5 phút.

Thời gian: ${data.appointmentTime || 'N/A'}
Mã OTP: ${data.otp || 'N/A'}

Vào phòng họp tại: ${data.videoLink || '#'}

Lưu ý: Mã OTP hết hiệu lực sau 10 phút.
    `,

    // === BỔ SUNG TEMPLATE HỒ SƠ Y TẾ ===

    medical_record_created: `
THÔNG TIN TRA CỨU KẾT QUẢ KHÁM BỆNH
Xin chào ${data.patientName || 'Quý khách'},
Kết quả khám cho lịch hẹn ${data.appointmentCode} đã có.
Đây là thông tin BẢO MẬT để tra cứu. Vui lòng lưu trữ cẩn thận:

- Mã lịch hẹn: ${data.appointmentCode || 'N/A'}
- Mã tra cứu (Bí mật): ${data.lookupCode || 'N/A'}

Truy cập trang tra cứu tại:
${data.lookupUrl || '#'}
    `,
    
    medical_record_updated: `
CẬP NHẬT KẾT QUẢ KHÁM BỆNH
Xin chào ${data.patientName || 'Quý khách'},
Hồ sơ y tế cho lịch hẹn ${data.appointmentCode} vừa được cập nhật.
Bạn có thể dùng thông tin tra cứu đã nhận (trong email trước) để xem lại kết quả tại:
${data.lookupUrl || '#'}
    `,

  };

  return templates[templateName] || `Thông báo từ Clinic System: ${JSON.stringify(data)}`;
};

// ===================================
// HÀM EXPORT (Giữ nguyên từ file của bạn)
//
// ===================================

const sendVerificationEmail = async (toEmail, userName, verificationLink) => {
  return await sendEmail({
    to: toEmail,
    subject: 'Xác thực tài khoản - Clinic System',
    template: 'verification_email',
    data: { userName, verificationLink }
  });
};

const sendPasswordResetRequestEmail = async (toEmail, userName, resetLink) => {
  return await sendEmail({
    to: toEmail,
    subject: 'Yêu cầu đặt lại mật khẩu - Clinic System',
    template: 'password_reset_request',
    data: { userName, resetLink }
  });
};

const sendPasswordResetEmail = async (toEmail, userName) => {
  const now = new Date();
  const dateTime = now.toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return await sendEmail({
    to: toEmail,
    subject: 'Mật khẩu đã được đặt lại - Clinic System',
    template: 'password_reset_success',
    data: { userName, email: toEmail, dateTime }
  });
};

const sendWelcomeEmail = async (toEmail, userName) => {
  return await sendEmail({
    to: toEmail,
    subject: 'Chào mừng đến với Clinic System!',
    template: 'welcome_email',
    data: { userName }
  });
};

//  Hàm gửi email thông báo tài khoản đã được xác thực
const sendAccountVerifiedEmail = async (toEmail, userName, verifiedBy = 'email') => {
  const now = new Date();
  const verifiedAt = now.toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return await sendEmail({
    to: toEmail,
    subject: 'Tài khoản đã được xác thực - Clinic System',
    template: 'account_verified',
    data: { 
      userName, 
      email: toEmail,
      verifiedAt,
      verifiedBy // 'email' hoặc 'admin'
    }
  });
};

// Hàm này không có trong file gốc, nhưng tôi thêm vào để hỗ trợ OTP
const sendOTPEmail = async (toEmail, otp) => {
   return await sendEmail({
    to: toEmail,
    subject: `Mã OTP của bạn là ${otp}`,
    template: 'default', // Cần tạo template 'otp_email'
    data: { message: `Mã OTP của bạn là: ${otp}` }
  });
};

/**
 * Send bulk emails
 * @param {Array} recipients - Array of email configurations
 * @returns {Promise<Array>} Results array
 */
const sendBulkEmails = async (recipients) => {
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await sendEmail(recipient);
      results.push({
        email: recipient.to,
        success: result.success,
        messageId: result.messageId
      });
    } catch (error) {
      results.push({
        email: recipient.to,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  generateHTMLFromTemplate,
  generateTextFromTemplate,
  
  // Exports từ file
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordResetRequestEmail,
  sendAccountVerifiedEmail, // THÊM MỚI
  // Thêm
  sendOTPEmail
};
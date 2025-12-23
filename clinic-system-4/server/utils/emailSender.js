// server/utils/emailSender.js
// PHIÊN BẢN FULL: GỘP CODE 1 (Kỹ thuật chuẩn) + CODE 2 (Nội dung hay, đầy đủ template)

const nodemailer = require('nodemailer');

// =============================================================================
// 1. CẤU HÌNH STYLE DÙNG CHUNG (GLOBAL) - ĐỂ SỬA LỖI REFERENCE ERROR
// =============================================================================
// Lấy style đẹp từ Code 2 của bạn nhưng đưa ra ngoài để dùng chung
const BASE_STYLE = `
  <style>
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background-color: #ffffff;
      border: 1px solid #e0e0e0; 
      border-radius: 8px; 
      overflow: hidden; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .header { 
      background-color: #4CAF50; /* Màu xanh y tế chủ đạo */
      color: #ffffff; 
      padding: 30px 20px; 
      text-align: center; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 24px; 
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .content { 
      padding: 30px; 
      background-color: #ffffff; 
    }
    .content p { 
      margin-bottom: 20px; 
      font-size: 16px;
    }
    .footer { 
      text-align: center; 
      padding: 20px; 
      font-size: 13px; 
      color: #666; 
      background-color: #f9fafb; 
      border-top: 1px solid #eee;
    }
    .button { 
      display: inline-block; 
      padding: 14px 30px; 
      background-color: #2E7D32; /* Xanh đậm hơn cho nút */
      color: #ffffff !important; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 25px 0; 
      font-weight: bold; 
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: #1B5E20;
    }
    .link-text { 
      word-break: break-all; 
      color: #555; 
      padding: 15px; 
      background-color: #f5f5f5; 
      border-radius: 4px; 
      font-family: 'Courier New', monospace; 
      font-size: 14px;
      border: 1px dashed #ccc;
    }
    .warning { 
      color: #D32F2F; 
      font-weight: bold; 
    }
    .info-box { 
      background-color: #F1F8E9; 
      border-left: 5px solid #4CAF50; 
      padding: 20px; 
      margin: 20px 0; 
      border-radius: 4px; 
    }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 10px 0; 
      border-bottom: 1px dashed #c8e6c9; 
    }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: bold; color: #555; }
    .value { font-weight: 600; color: #222; text-align: right; }
    
    .otp-code { 
      font-size: 32px; 
      font-weight: 800; 
      color: #1565C0; 
      text-align: center; 
      padding: 20px; 
      background: #E3F2FD; 
      border-radius: 8px; 
      margin: 25px 0; 
      letter-spacing: 8px; 
      border: 2px dashed #90CAF9;
    }
  </style>
`;

// =============================================================================
// 2. CẤU HÌNH MAILER (TỪ CODE 1)
// =============================================================================
const createTransporter = () => {
  const config = {
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('📧 [Email System] Running in development mode');
  }

  return nodemailer.createTransport(config);
};

/**
 * Hàm gửi email chính (Kết hợp logic kiểm tra lỗi của Code 1)
 */
const sendEmail = async (emailData) => {
  try {
    const { to, subject, template, data, html, text } = emailData;

    if (!to || !subject) {
      throw new Error('Email address and subject are required');
    }

    // Tạo nội dung email từ template
    let emailContent = {
      html: html || generateHTMLFromTemplate(template, data),
      text: text || generateTextFromTemplate(template, data)
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('---------------------------------------------------');
      console.log('📧 [DEV EMAIL LOG]');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Template: ${template}`);
      console.log('---------------------------------------------------');
      // Trong dev mode vẫn cho gửi thật để test, hoặc return tại đây nếu muốn chặn
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.HOSPITAL_NAME || 'Clinic System'}" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}. MessageID: ${result.messageId}`);
    
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

// =============================================================================
// 3. TEMPLATE HTML (NỘI DUNG ĐẦY ĐỦ TỪ CODE 2)
// =============================================================================
const generateHTMLFromTemplate = (templateName, data = {}) => {
  
  // Các biến màu sắc bổ trợ
  const headerColors = {
    warning: '#D32F2F', // Đỏ
    info: '#0288D1',    // Xanh dương
    success: '#4CAF50', // Xanh lá
    alert: '#FBC02D'    // Vàng
  };

  const templates = {
    
    // --- 1. XÁC THỰC TÀI KHOẢN (Code 2) ---
    verification_email: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header"><h1>Kích hoạt tài khoản</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.userName || 'Quý khách'}</strong>,</p>
            <p>Cảm ơn bạn đã tin tưởng và đăng ký tài khoản tại hệ thống <strong>Clinic System</strong>. Để đảm bảo tính bảo mật và bắt đầu sử dụng các dịch vụ y tế trực tuyến, vui lòng xác thực địa chỉ email của bạn.</p>
            
            <div class="info-box">
              <p style="margin:0"><strong>Lưu ý:</strong> Link xác thực này chỉ có hiệu lực trong vòng <strong>24 giờ</strong>.</p>
            </div>

            <div style="text-align: center;">
              <a href="${data.verificationLink}" class="button">XÁC THỰC TÀI KHOẢN NGAY</a>
            </div>

            <p>Nếu nút trên không hoạt động, bạn hãy copy và dán đường dẫn sau vào trình duyệt:</p>
            <div class="link-text">${data.verificationLink}</div>
            
            <p style="margin-top: 20px; font-size: 0.9rem; color: #666;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          </div>
          <div class="footer">
            <p><strong>Clinic System</strong> - Nền tảng Y tế Thông minh<br/>Hotline: 1900 1234 | Email: support@clinicsystem.vn</p>
          </div>
        </div></body></html>`,

    // --- 2. YÊU CẦU RESET PASS (Code 2) ---
    password_reset_request: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header" style="background-color: ${headerColors.alert}; color: #333;"><h1>Đặt lại mật khẩu</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.userName}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nếu bạn thực hiện yêu cầu này, vui lòng nhấn vào nút bên dưới:</p>
            
            <div style="text-align: center;">
              <a href="${data.resetLink}" class="button" style="background-color: #F57F17;">ĐẶT LẠI MẬT KHẨU</a>
            </div>
            
            <p>Hoặc copy link sau:</p>
            <div class="link-text">${data.resetLink}</div>

            <p class="warning">Lưu ý: Link này sẽ hết hạn sau 1 giờ.</p>
            <p style="font-size:0.9rem; color:#666">Nếu bạn không yêu cầu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
          </div>
          <div class="footer"><p>Clinic System Security Team</p></div>
        </div></body></html>`,

    // --- 3. THÔNG BÁO RESET PASS THÀNH CÔNG (Code 2) ---
    password_reset_success: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header"><h1>Mật khẩu đã thay đổi</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.userName}</strong>,</p>
            <p>Mật khẩu tài khoản của bạn đã được thay đổi thành công vào lúc:</p>
            <p style="font-size: 1.2rem; font-weight: bold; color: #2E7D32; text-align: center;">${data.dateTime || new Date().toLocaleString('vi-VN')}</p>
            <p>Bây giờ bạn có thể đăng nhập vào hệ thống bằng mật khẩu mới.</p>
            <p class="warning">Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức!</p>
          </div>
          <div class="footer"><p>Clinic System</p></div>
        </div></body></html>`,

    // --- 4. TÀI KHOẢN ĐÃ KÍCH HOẠT (Code 2) ---
    account_verified: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header"><h1>Tài khoản đã kích hoạt!</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.userName}</strong>,</p>
            <p>Chúc mừng! Tài khoản của bạn đã được xác thực và kích hoạt thành công.</p>
            
            <div class="info-box">
              <div class="info-row"><span class="label">Email:</span><span class="value">${data.email}</span></div>
              <div class="info-row"><span class="label">Thời gian:</span><span class="value">${data.verifiedAt || new Date().toLocaleString('vi-VN')}</span></div>
              <div class="info-row"><span class="label">Phương thức:</span><span class="value">${data.verifiedBy === 'admin' ? 'Admin phê duyệt' : 'Xác thực qua Email'}</span></div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/login" class="button">ĐĂNG NHẬP NGAY</a>
            </div>
          </div>
          <div class="footer"><p>Chào mừng bạn đến với Clinic System</p></div>
        </div></body></html>`,

    // --- 5. WELCOME EMAIL (Code 2) ---
    welcome_email: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header"><h1>Chào mừng đến với Clinic System!</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.userName}</strong>,</p>
            <p>Cảm ơn bạn đã tham gia cùng chúng tôi. Giờ đây bạn có thể:</p>
            <ul>
              <li>Đặt lịch khám nhanh chóng với các bác sĩ hàng đầu</li>
              <li>Tư vấn trực tuyến qua Chat/Video</li>
              <li>Quản lý hồ sơ sức khỏe cá nhân bảo mật</li>
              <li>Tra cứu kết quả khám bệnh mọi lúc mọi nơi</li>
            </ul>
            <p>Chúng tôi cam kết mang lại trải nghiệm chăm sóc sức khỏe tốt nhất cho bạn.</p>
          </div>
          <div class="footer"><p>Clinic System</p></div>
        </div></body></html>`,

    // --- 6. XÁC NHẬN LỊCH HẸN (Chi tiết từ Code 2) ---
    appointment_confirmation: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header"><h1>Xác nhận đặt lịch thành công</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Hệ thống đã ghi nhận lịch hẹn khám bệnh của bạn. Dưới đây là thông tin chi tiết:</p>
            
            <div class="info-box">
              <div style="text-align:center; margin-bottom:15px; border-bottom:1px dashed #ccc; padding-bottom:10px;">
                <span style="font-size:1.4rem; font-weight:800; color:#2E7D32; letter-spacing: 1px;">MÃ SỐ: ${data.appointmentCode}</span>
              </div>
              <div class="info-row"><span class="label">Bệnh nhân:</span><span class="value">${data.patientName}</span></div>
              <div class="info-row"><span class="label">Dịch vụ:</span><span class="value">${data.serviceName}</span></div>
              <div class="info-row"><span class="label">Bác sĩ phụ trách:</span><span class="value">${data.doctorName}</span></div>
              <div class="info-row"><span class="label">Thời gian khám:</span><span class="value" style="color:#D32F2F; font-weight:bold;">${data.appointmentTime}</span></div>
              <div class="info-row"><span class="label">Chi phí dự kiến:</span><span class="value">${data.price ? new Intl.NumberFormat('vi-VN').format(data.price) + ' VNĐ' : 'Miễn phí'}</span></div>
              <div class="info-row"><span class="label">Địa điểm:</span><span class="value">Tầng 2, Phòng khám Clinic System</span></div>
            </div>

            <p><strong>📝 Lưu ý quan trọng:</strong></p>
            <ul>
              <li>Vui lòng đến sớm <strong>15 phút</strong> để làm thủ tục tiếp đón.</li>
              <li>Mang theo CMND/CCCD và thẻ BHYT (nếu có).</li>
              <li>Đưa mã số <strong>${data.appointmentCode}</strong> cho lễ tân khi đến nơi.</li>
            </ul>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${data.appointmentLink}" class="button">QUẢN LÝ LỊCH HẸN</a>
            </div>
          </div>
          <div class="footer">
            <p>Cần hỗ trợ? Liên hệ Hotline <strong>1900 1234</strong> (7:00 - 17:00)</p>
          </div>
        </div></body></html>`,

    // --- 7. NHẮC NHỞ LỊCH HẸN (Code 2) ---
    appointment_reminder: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header" style="background-color: ${headerColors.alert}; color: #333;"><h1>Nhắc nhở lịch hẹn</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Bạn có lịch hẹn khám vào <strong>NGÀY MAI</strong>. Đừng quên nhé!</p>
            
            <div class="info-box" style="border-left-color: ${headerColors.alert}; background-color: #FFFDE7;">
              <div class="info-row"><span class="label">Mã lịch hẹn:</span><span class="value">${data.appointmentCode}</span></div>
              <div class="info-row"><span class="label">Thời gian:</span><span class="value" style="font-weight:bold;">${data.appointmentTime}</span></div>
              <div class="info-row"><span class="label">Dịch vụ:</span><span class="value">${data.serviceName}</span></div>
              <div class="info-row"><span class="label">Bác sĩ:</span><span class="value">${data.doctorName}</span></div>
            </div>
            
            <p>Vui lòng chuẩn bị giấy tờ và có mặt đúng giờ để được phục vụ tốt nhất.</p>
          </div>
          <div class="footer"><p>Clinic System</p></div>
        </div></body></html>`,

    // --- 8. THÔNG BÁO HỦY LỊCH (Code 2) ---
    appointment_cancelled: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header" style="background-color: ${headerColors.warning};"><h1>Thông báo hủy lịch hẹn</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Chúng tôi rất tiếc phải thông báo lịch hẹn của bạn đã bị hủy.</p>
            
            <div class="info-box" style="border-left-color: ${headerColors.warning}; background-color: #FFEBEE;">
              <div class="info-row"><span class="label">Mã lịch hẹn:</span><span class="value">${data.appointmentCode}</span></div>
              <div class="info-row"><span class="label">Lý do hủy:</span><span class="value" style="color:#D32F2F">${data.cancelReason || 'Không có lý do cụ thể'}</span></div>
              <div class="info-row"><span class="label">Thời gian hủy:</span><span class="value">${data.cancelledAt}</span></div>
            </div>
            
            <p>Nếu bạn muốn đặt lịch hẹn mới, vui lòng truy cập website của chúng tôi.</p>
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/dat-lich-hen" class="button" style="background-color: #C62828;">ĐẶT LỊCH MỚI</a>
            </div>
            <p>Thành thật xin lỗi vì sự bất tiện này!</p>
          </div>
          <div class="footer"><p>Trân trọng, Clinic System</p></div>
        </div></body></html>`,

    // --- 9. HÓA ĐƠN THANH TOÁN (Đầy đủ, đẹp) ---
    payment_success_invoice: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header"><h1>Thanh Toán Thành Công!</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Lịch hẹn của bạn đã được thanh toán thành công và hệ thống đã <strong>TỰ ĐỘNG XÁC NHẬN</strong>.</p>
            
            <div class="info-box">
              <div style="text-align:center; margin-bottom:15px; color:#2E7D32; font-weight:bold; font-size:1.2rem;">HÓA ĐƠN ĐIỆN TỬ</div>
              <div class="info-row"><span class="label">Mã hồ sơ:</span><span class="value">${data.appointmentCode}</span></div>
              <div class="info-row"><span class="label">Dịch vụ:</span><span class="value">${data.serviceName}</span></div>
              <div class="info-row"><span class="label">Bác sĩ:</span><span class="value">${data.doctorName}</span></div>
              <div class="info-row"><span class="label">Thời gian khám:</span><span class="value">${data.appointmentTime}</span></div>
              <div class="info-row"><span class="label">Phương thức:</span><span class="value text-uppercase">${data.paymentMethod || 'Chuyển khoản'}</span></div>
              
              <div class="info-row" style="border-top:2px solid #ccc; margin-top:10px; padding-top:10px;">
                <span class="label" style="font-size:1.1rem;">TỔNG THANH TOÁN:</span>
                <span class="value" style="color:#D32F2F; font-size:1.2rem; font-weight:bold;">${new Intl.NumberFormat('vi-VN').format(data.amount)} đ</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${data.link}" class="button">XEM CHI TIẾT LỊCH HẸN</a>
            </div>
          </div>
          <div class="footer"><p>Cảm ơn quý khách đã sử dụng dịch vụ.</p></div>
        </div></body></html>`,

    // --- 10. OTP TƯ VẤN ONLINE (Code 2) ---
    chat_reminder_otp: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header" style="background-color: ${headerColors.info};"><h1>Sắp đến giờ tư vấn</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Buổi tư vấn trực tuyến với <strong>BS. ${data.doctorName}</strong> sẽ bắt đầu sau 5 phút.</p>
            
            <div class="info-box" style="border-left-color: ${headerColors.info}; background-color: #E1F5FE;">
              <div class="info-row"><span class="label">Thời gian:</span><span class="value">${data.appointmentTime}</span></div>
            </div>

            <p>Đây là mã OTP để vào phòng chat (Hiệu lực 10 phút):</p>
            <div class="otp-code">${data.otp}</div>

            <div style="text-align: center;">
              <a href="${data.chatLink}" class="button" style="background-color: ${headerColors.info};">VÀO PHÒNG CHAT NGAY</a>
            </div>
          </div>
          <div class="footer"><p>Clinic System Telehealth</p></div>
        </div></body></html>`,

    // --- 11. OTP VIDEO CALL (Code 2) ---
    video_reminder: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header" style="background-color: ${headerColors.info};"><h1>Sắp đến giờ Video Call</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Buổi tư vấn Video với <strong>BS. ${data.doctorName}</strong> sẽ bắt đầu sau 5 phút.</p>
            
            <div class="info-box" style="border-left-color: ${headerColors.info}; background-color: #E1F5FE;">
              <div class="info-row"><span class="label">Thời gian:</span><span class="value">${data.appointmentTime}</span></div>
            </div>

            <p>Mã xác thực vào phòng (OTP):</p>
            <div class="otp-code">${data.otp}</div>

            <div style="text-align: center;">
              <a href="${data.videoLink}" class="button" style="background-color: ${headerColors.info};">THAM GIA CUỘC GỌI</a>
            </div>
          </div>
          <div class="footer"><p>Vui lòng kiểm tra Camera và Micro trước khi vào.</p></div>
        </div></body></html>`,

    // --- 12. KHÔI PHỤC MÃ LỊCH HẸN (Code 2) ---
    appointment_code_recovery: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header"><h1>Khôi phục Mã Lịch hẹn</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Chúng tôi tìm thấy các lịch hẹn sau của bạn vào ngày <strong>${data.appointmentDate}</strong>:</p>
            <div class="info-box">
              ${(data.appointments || []).map(apt => `
                <div class="info-row">
                  <span class="label">${apt.time} - ${apt.serviceName}</span>
                  <span class="value" style="color:#D32F2F; font-weight:bold;">${apt.code}</span>
                </div>
              `).join('')}
            </div>
            <p>Vui lòng sử dụng mã này để tra cứu kết quả.</p>
          </div>
          <div class="footer"><p>Clinic System</p></div>
        </div></body></html>`,

    // --- 13. THÔNG BÁO KẾT QUẢ KHÁM (MỚI - QUAN TRỌNG) ---
    medical_record_created: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header" style="background-color:#0288D1;"><h1>Kết quả khám bệnh đã có</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Bác sĩ <strong>${data.doctorName}</strong> đã hoàn tất hồ sơ khám bệnh cho lịch hẹn <strong>${data.appointmentCode}</strong>.</p>
            
            <div class="info-box" style="border-left-color:#0288D1; background-color:#E1F5FE;">
              <p style="color:#0288D1; font-weight:bold; text-align:center; margin-top:0;">THÔNG TIN TRA CỨU BẢO MẬT</p>
              <div class="info-row"><span class="label">Mã lịch hẹn:</span><span class="value">${data.appointmentCode}</span></div>
              <div class="info-row"><span class="label">Mã tra cứu (Bí mật):</span><span class="value" style="color:#D32F2F; font-weight:bold; font-size:1.2rem;">${data.lookupCode}</span></div>
            </div>

            <p class="warning">Vui lòng giữ bí mật mã tra cứu này.</p>

            <div style="text-align: center;">
              <a href="${data.lookupUrl}" class="button" style="background-color:#0288D1;">XEM KẾT QUẢ NGAY</a>
            </div>
          </div>
          <div class="footer"><p>Clinic System</p></div>
        </div></body></html>`,
        
    // --- 14. NHẮC ĐÁNH GIÁ ---
    review_reminder: `
      <!DOCTYPE html><html><head>${BASE_STYLE}</head><body>
        <div class="container">
          <div class="header"><h1>Đánh giá dịch vụ</h1></div>
          <div class="content">
            <p>Xin chào <strong>${data.patientName}</strong>,</p>
            <p>Cảm ơn bạn đã sử dụng dịch vụ. Ý kiến của bạn rất quan trọng với chúng tôi.</p>
            <div class="info-box">
              <div class="info-row"><span class="label">Lịch hẹn:</span><span class="value">${data.appointmentCode}</span></div>
              <div class="info-row"><span class="label">Dịch vụ:</span><span class="value">${data.serviceName}</span></div>
            </div>
            <div style="text-align: center;">
              <a href="${data.reviewLink}" class="button">ĐÁNH GIÁ NGAY</a>
            </div>
          </div>
          <div class="footer"><p>Clinic System</p></div>
        </div></body></html>`
  };

  return templates[templateName] || templates.default || '<p>Email Content Not Found</p>';
};

// =============================================================================
// 4. TEMPLATE TEXT (DỰ PHÒNG KHI KHÔNG CÓ HTML)
// =============================================================================
const generateTextFromTemplate = (templateName, data = {}) => {
  const templates = {
    verification_email: `XÁC THỰC TÀI KHOẢN\nXin chào ${data.userName},\nVui lòng truy cập link sau để kích hoạt tài khoản:\n${data.verificationLink}\n(Link hết hạn sau 24 giờ)`,
    
    password_reset_request: `ĐẶT LẠI MẬT KHẨU\nXin chào ${data.userName},\nTruy cập link sau để đổi mật khẩu:\n${data.resetLink}\n(Link hết hạn sau 1 giờ)`,
    
    password_reset_success: `ĐẶT LẠI MẬT KHẨU THÀNH CÔNG\nXin chào ${data.userName},\nMật khẩu của bạn đã được đặt lại thành công vào lúc ${data.dateTime}.`,
    
    account_verified: `TÀI KHOẢN ĐÃ ĐƯỢC XÁC THỰC\nXin chào ${data.userName},\nTài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập ngay.`,
    
    welcome_email: `CHÀO MỪNG ĐẾN VỚI CLINIC SYSTEM\nXin chào ${data.userName},\nCảm ơn bạn đã tham gia hệ thống.`,
    
    appointment_confirmation: `XÁC NHẬN LỊCH HẸN\nMã: ${data.appointmentCode}\nBệnh nhân: ${data.patientName}\nDịch vụ: ${data.serviceName}\nThời gian: ${data.appointmentTime}\nChi phí: ${data.price ? new Intl.NumberFormat('vi-VN').format(data.price) + ' VNĐ' : 'Miễn phí'}\nVui lòng đến trước 15 phút.`,
    
    appointment_reminder: `NHẮC NHỞ LỊCH HẸN\nBạn có lịch hẹn ${data.appointmentCode} vào ngày mai lúc ${data.appointmentTime}.`,
    
    appointment_cancelled: `HỦY LỊCH HẸN\nLịch hẹn ${data.appointmentCode} đã bị hủy.\nLý do: ${data.cancelReason}`,
    
    payment_success_invoice: `THANH TOÁN THÀNH CÔNG\nLịch hẹn ${data.appointmentCode} đã được xác nhận.\nSố tiền: ${new Intl.NumberFormat('vi-VN').format(data.amount)} đ\nXem chi tiết tại: ${data.link}`,
    
    chat_reminder_otp: `SẮP ĐẾN GIỜ TƯ VẤN\nThời gian: ${data.appointmentTime}\nMã OTP: ${data.otp}\nVào phòng chat tại: ${data.chatLink}`,
    
    video_reminder: `SẮP ĐẾN GIỜ VIDEO CALL\nThời gian: ${data.appointmentTime}\nMã OTP: ${data.otp}\nVào phòng họp tại: ${data.videoLink}`,
    
    medical_record_created: `KẾT QUẢ KHÁM BỆNH\nMã lịch hẹn: ${data.appointmentCode}\nMã tra cứu: ${data.lookupCode}\nTra cứu tại: ${data.lookupUrl}`,
    
    review_reminder: `ĐÁNH GIÁ DỊCH VỤ\nVui lòng đánh giá trải nghiệm của bạn tại: ${data.reviewLink}`,
    
    appointment_code_recovery: `KHÔI PHỤC MÃ LỊCH HẸN\nCác mã lịch hẹn của bạn: ${(data.appointments || []).map(a => a.code).join(', ')}`
  };
  return templates[templateName] || `Thông báo từ Clinic System.`;
};

// =============================================================================
// 5. EXPORT FUNCTIONS (GIỮ NGUYÊN TÊN HÀM ĐỂ KHÔNG LỖI CONTROLLER KHÁC)
// =============================================================================

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
  const dateTime = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return await sendEmail({
    to: toEmail,
    subject: 'Mật khẩu đã được thay đổi',
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

const sendAccountVerifiedEmail = async (toEmail, userName, verifiedBy = 'email') => {
  const now = new Date();
  const verifiedAt = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  return await sendEmail({
    to: toEmail,
    subject: 'Tài khoản đã được xác thực',
    template: 'account_verified',
    data: { userName, email: toEmail, verifiedAt, verifiedBy }
  });
};

const sendOTPEmail = async (toEmail, otp) => {
   return await sendEmail({
    to: toEmail,
    subject: `Mã OTP: ${otp}`,
    html: `<div style="font-family:Arial; padding:20px; border:1px solid #ccc;"><h2>Mã OTP xác thực</h2><p>Mã của bạn là:</p><h1 style="color:#1565C0; letter-spacing:5px;">${otp}</h1><p>Hiệu lực trong 10 phút.</p></div>`,
    text: `Mã OTP của bạn là: ${otp}`
  });
};

const sendBulkEmails = async (recipients) => {
  const results = [];
  for (const recipient of recipients) {
    try {
      const result = await sendEmail(recipient);
      results.push({ email: recipient.to, success: result.success, messageId: result.messageId });
    } catch (error) {
      results.push({ email: recipient.to, success: false, error: error.message });
    }
  }
  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  generateHTMLFromTemplate,
  generateTextFromTemplate,
  
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordResetRequestEmail,
  sendAccountVerifiedEmail,
  sendOTPEmail
};
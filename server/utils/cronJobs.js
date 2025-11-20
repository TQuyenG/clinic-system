// server/utils/cronJobs.js - HỆ THỐNG TỰ ĐỘNG HÓA TÁC VỤ
const cron = require('node-cron');
const { Op } = require('sequelize');
const { sendEmail } = require('./emailSender');
const { createNotification } = require('./notificationHelper');
const emailSender = require('./emailSender');

// Import models (với fallback handling)
let models;
try {
  const db = require('../config/db');
  models = db.models;
} catch (error) {
  console.log('  Database not configured for cron jobs');
  models = null;
}

// =================================================================
// ======================= APPOINTMENT REMINDERS ==================
// =================================================================

/**
 * Gửi nhắc nhở lịch hẹn trước 24 giờ
 * Chạy mỗi giờ để kiểm tra
 */
const sendAppointmentReminders = cron.schedule('0 * * * *', async () => {
  if (!models) return;
  
  try {
    console.log(' [CRON] Checking appointment reminders...');
    
    // Tìm lịch hẹn trong vòng 24-25 giờ tới (để tránh gửi trùng)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(Date.now() + 25 * 60 * 60 * 1000);
    
    const appointments = await models.Appointment.findAll({
      where: {
        appointment_time: {
          [Op.between]: [tomorrow, dayAfterTomorrow]
        },
        status: 'confirmed',
        reminder_sent: false
      },
      include: [
        { 
          model: models.Patient, 
          as: 'Patient',
          include: [{ model: models.User, attributes: ['full_name', 'email'] }]
        },
        { 
          model: models.Doctor, 
          as: 'Doctor',
          include: [{ model: models.User, attributes: ['full_name'] }]
        },
        { model: models.Service, as: 'Service' }
      ]
    });

    let remindersSent = 0;

    for (const appointment of appointments) {
      try {
        // Gửi email reminder
        await sendEmail({
          to: appointment.Patient.User.email,
          subject: 'Nhắc nhở lịch hẹn - Clinic System',
          template: 'appointment_reminder',
          data: {
            patientName: appointment.Patient.User.full_name,
            appointmentCode: appointment.code,
            serviceName: appointment.Service.name,
            doctorName: appointment.Doctor?.User?.full_name || 'Sẽ được thông báo',
            appointmentTime: appointment.appointment_time.toLocaleString('vi-VN')
          }
        });

        // Tạo notification
        await createNotification({
          user_id: appointment.Patient.User.id,
          type: 'appointment_reminder',
          title: 'Nhắc nhở lịch hẹn',
          message: `Bạn có lịch khám vào ${appointment.appointment_time.toLocaleString('vi-VN')}`,
          data: { appointment_id: appointment.id }
        });

        // Đánh dấu đã gửi reminder
        await appointment.update({ reminder_sent: true });
        
        remindersSent++;
      } catch (error) {
        console.error(` Error sending reminder for appointment ${appointment.code}:`, error);
      }
    }

    console.log(` [CRON] Sent ${remindersSent} appointment reminders`);

  } catch (error) {
    console.error(' [CRON] Error in appointment reminders:', error);
  }
}, {
  scheduled: false // Start manually
});

/**
 * Gửi nhắc nhở tư vấn (Chat/Video) trước 5 phút
 * Chạy mỗi phút
 */
const sendConsultationReminders = cron.schedule('* * * * *', async () => {
  if (!models) return;
    try {
    const now = new Date();
    //  SỬA LOGIC: Chỉ tìm các cuộc hẹn bắt đầu sau 4-5 phút nữa
    // (Để cron job 1 phút chỉ chạy 1 lần cho mỗi cuộc hẹn)
    const fourMinutesFromNow = new Date(now.getTime() + 4 * 60000);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);

    const consultations = await models.Consultation.findAll({
      where: {
        appointment_time: {
          [Op.gt]: fourMinutesFromNow,   // Sửa: Lớn hơn 4 phút
          [Op.lte]: fiveMinutesFromNow  // Sửa: Nhỏ hơn hoặc bằng 5 phút
        },
        status: { [Op.in]: ['confirmed', 'in_progress'] },
        reminder_sent: false // Chỉ gửi 1 lần

      },
      include: [
        { 
          model: models.User, 
          as: 'patient',
          attributes: ['id', 'full_name', 'email']
        },
        { 
          model: models.User, 
          as: 'doctor',
          attributes: ['id', 'full_name', 'email']
        }
      ]
    });

    if (consultations.length > 0) {
      console.log(` [CRON] Sending ${consultations.length} consultation reminders...`);
    }

    for (const consultation of consultations) {
      try {
        // ==========================================
        // === SỬA LỖI: TÁCH LOGIC CHO VIDEO VÀ CHAT ===
        // ==========================================
        
        if (consultation.consultation_type === 'video') {
          
          // --- LOGIC GỬI VIDEO REMINDER ---
          const videoLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/tu-van/video/${consultation.id}`;

          // SỬA: Thêm logic tạo OTP (copy từ block 'chat')
          const videoOtp = Math.floor(100000 + Math.random() * 900000).toString();
          const expiry = new Date(now.getTime() + 10 * 60000); // Hết hạn sau 10 phút

          // 1. Gửi Email cho Bệnh nhân (THÊM OTP)
          await emailSender.sendEmail({
              to: consultation.patient.email,
              subject: `Sắp đến giờ Video Call`, // SỬA: Thêm OTP vào tiêu đề
              template: 'video_reminder', // Template mới (sẽ tạo ở bước 3)
              data: {
                  patientName: consultation.patient.full_name,
                  doctorName: consultation.doctor.full_name,
                  appointmentTime: consultation.appointment_time.toLocaleString('vi-VN'),
                  videoLink: videoLink,
                  otp: videoOtp // SỬA: Thêm OTP vào data
              }
          });

          // 2. Gửi Email cho BÁC SĨ (THÊM OTP)
          await emailSender.sendEmail({
              to: consultation.doctor.email,
              subject: `Sắp đến giờ Video Call`, // SỬA: Thêm OTP vào tiêu đề
              template: 'video_reminder',
              data: {
                  patientName: `Bác sĩ ${consultation.doctor.full_name}`,
                  doctorName: consultation.patient.full_name,
                  appointmentTime: consultation.appointment_time.toLocaleString('vi-VN'),
                  videoLink: videoLink,
                  otp: videoOtp // SỬA: Thêm OTP vào data
              }
          });
          
          // 3. Thông báo (chuông) cho Bác sĩ
          await models.Notification.create({
            user_id: consultation.doctor_id,
            type: 'appointment', //  SỬA: Dùng giá trị có trong ENUM
            message: ` Sắp đến giờ Video Call với BN ${consultation.patient.full_name || 'bệnh nhân'} sau 5 phút.`, //  SỬA: Thêm fallback cho null
            link: `/bac-si/tu-van`,
            is_read: false
          });

          // 4. Thông báo (chuông) cho Bệnh nhân
          await models.Notification.create({
            user_id: consultation.patient_id,
            type: 'consultation_reminder',
            title: ' Sắp đến giờ Video Call',
            message: `Bạn có lịch Video Call với BS ${consultation.doctor.full_name} sau 5 phút.`,
            content: `Bạn có lịch Video Call với BS ${consultation.doctor.full_name} sau 5 phút.`,
            link: videoLink
          });

          // 5. Cập nhật CSDL
          // SỬA: Lưu video_otp và reminder_sent
          await consultation.update({ 
            video_otp: videoOtp,
            video_otp_expires_at: expiry,
            reminder_sent: true 
          });

          
        } else {
          
          // --- LOGIC GỬI CHAT REMINDER (CODE CŨ CỦA BẠN) ---
          
          // 1. Tạo OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const expiry = new Date(now.getTime() + 10 * 60000); // Hết hạn sau 10 phút

          // 2. Gửi Email cho Bệnh nhân (chứa OTP)
          const chatLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/tu-van/${consultation.id}/chat`;
          
          await emailSender.sendEmail({
              to: consultation.patient.email,
              subject: `Sắp đến giờ tư vấn (Mã OTP: ${otp})`,
              template: 'chat_reminder_otp',
              data: {
                  patientName: consultation.patient.full_name,
                  doctorName: consultation.doctor.full_name,
                  appointmentTime: consultation.appointment_time.toLocaleString('vi-VN'),
                  chatLink: chatLink,
                  otp: otp
              }
          });

          // 3. Gửi Email cho BÁC SĨ
          await emailSender.sendEmail({
              to: consultation.doctor.email,
              subject: `Sắp đến giờ tư vấn (Mã OTP: ${otp})`,
              template: 'chat_reminder_otp',
              data: {
                  patientName: `Bác sĩ ${consultation.doctor.full_name}`, 
                  doctorName: consultation.patient.full_name, 
                  appointmentTime: consultation.appointment_time.toLocaleString('vi-VN'),
                  chatLink: chatLink,
                  otp: otp
              }
          });

          // 4. Tạo thông báo (chuông) cho Bác sĩ
          await models.Notification.create({
            user_id: consultation.doctor_id,
            type: 'consultation_reminder',
            title: ' Sắp đến giờ tư vấn',
            message: `Bạn có lịch tư vấn với BN ${consultation.patient.full_name} sau 5 phút.`,
            content: `Bạn có lịch tư vấn với BN ${consultation.patient.full_name} sau 5 phút.`,
            link: `/bac-si/tu-van`
          });

          // 5. Tạo thông báo (chuông) cho Bệnh nhân
          await models.Notification.create({
            user_id: consultation.patient_id,
            type: 'consultation_reminder',
            title: ' Sắp đến giờ tư vấn',
            message: `Bạn có lịch tư vấn với BS ${consultation.doctor.full_name} sau 5 phút.`,
            content: `Bạn có lịch tư vấn với BS ${consultation.doctor.full_name} sau 5 phút.`,
            link: chatLink
          });

          // 6. Cập nhật CSDL
          await consultation.update({ 
            chat_otp: otp, 
            otp_expires_at: expiry, 
            reminder_sent: true 
          });
        }

      } catch (err) {
        console.error(` [CRON] Error processing consultation ${consultation.id}:`, err);
      }
    }

  } catch (error) {
    console.error(' [CRON] Error in consultation reminders:', error);
  }
}, {
  scheduled: true // Tự động chạy
});


// =================================================================
// =================== AUTO-COMPLETE CONSULTATIONS (MỚI) ===========
// =================================================================

/**
 * Tự động hoàn thành các buổi tư vấn bị "kẹt" ở trạng thái 'in_progress'
 * Chạy mỗi 15 phút
 */
const autoCompleteConsultations = cron.schedule('*/15 * * * *', async () => {
  if (!models) return;

  try {
    console.log(' [CRON] Checking for stuck "in_progress" consultations...');
    
    // Định nghĩa thời gian ân hạn (grace period)
    // Ví dụ: Bác sĩ có 60 phút 'thêm' sau khi hết giờ dự kiến
    const gracePeriodMinutes = 60; 
    
    const stuckConsultations = await models.Consultation.findAll({
      where: {
        status: 'in_progress',
        started_at: { [Op.not]: null } // Phải có thời gian bắt đầu
      },
      include: [{
        model: models.ConsultationPricing,
        as: 'package', // Dùng alias 'package' như trong model Consultation.js
        attributes: ['duration_minutes'],
        required: true // Chỉ lấy ca có gói (để biết thời lượng)
      }]
    });
    
    let completedCount = 0;
    const now = new Date();

    for (const consultation of stuckConsultations) {
      const startTime = new Date(consultation.started_at);
      
      // Lấy thời lượng từ gói (hoặc 30 phút mặc định nếu gói không có)
      const duration = consultation.package?.duration_minutes || 30; 
      
      const expectedEndTime = new Date(startTime.getTime() + duration * 60000);
      const timeoutTime = new Date(expectedEndTime.getTime() + gracePeriodMinutes * 60000);

      // Nếu thời gian hiện tại đã vượt qua thời gian timeout
      if (now > timeoutTime) {
        console.log(`  -> Found stuck consultation [${consultation.consultation_code}]. Auto-completing...`);
        
        await consultation.update({
          status: 'completed',
          ended_at: expectedEndTime, // Ghi nhận giờ kết thúc dự kiến
          metadata: {
            ...consultation.metadata,
            auto_completed: true,
            auto_complete_reason: `Session timed out ${gracePeriodMinutes} minutes after expected end time.`
          }
        });
        completedCount++;
      }
    }
    
    if (completedCount > 0) {
      console.log(` [CRON] Auto-completed ${completedCount} stuck consultations.`);
    }

  } catch (error) {
        console.error(' [CRON] Error in auto-completing consultations:', error);
      }
    } // <-- THÊM DẤU NGOẶC NHỌN NÀY ĐỂ ĐÓNG async () => { ... }
    , {
      scheduled: true // Tự động chạy
    });


// =================================================================
// =================== AUTO-EXPIRE PENDING CONSULTATIONS ==========
// =================================================================

/**
 * Tự động cập nhật trạng thái "Hết hạn" cho các tư vấn 'pending' đã qua giờ
 * Chạy mỗi 5 phút
 */
const autoExpirePendingConsultations = cron.schedule('*/5 * * * *', async () => {
  if (!models) return;

  try {
    const now = new Date();
    console.log(' [CRON] Checking for expired pending consultations...');

    const expiredConsultations = await models.Consultation.findAll({
      where: {
        status: 'pending', // Chỉ kiểm tra các lịch "Chờ duyệt"
        appointment_time: { [Op.lt]: now } // Thời gian hẹn đã ở trong quá khứ
      },
      include: [
        { model: models.User, as: 'patient', attributes: ['id', 'full_name'] },
        { model: models.User, as: 'doctor', attributes: ['id', 'full_name'] }
      ]
    });

    let expiredCount = 0;

    for (const consultation of expiredConsultations) {
      await consultation.update({
        status: 'expired',
        cancel_reason: 'Tự động hết hạn do không được duyệt trước giờ hẹn',
        cancelled_by: 'system',
        cancelled_at: now
      });

      // Thông báo cho bệnh nhân
      await models.Notification.create({
        user_id: consultation.patient_id,
        type: 'consultation_status',
        title: 'Tư vấn đã hết hạn',
        content: `Lịch tư vấn ${consultation.consultation_code} với BS ${consultation.doctor.full_name} đã hết hạn do không được phê duyệt kịp thời.`,
        link: `/tu-van/lich-su`,
        priority: 'normal'
      });

      // Thông báo cho bác sĩ
      await models.Notification.create({
        user_id: consultation.doctor_id,
        type: 'consultation_status',
        title: 'Tư vấn đã hết hạn',
        content: `Lịch tư vấn ${consultation.consultation_code} với BN ${consultation.patient.full_name} đã tự động hết hạn do chưa được duyệt.`,
        link: `/bac-si/tu-van`,
        priority: 'normal'
      });

      expiredCount++;
    }

    if (expiredCount > 0) {
      console.log(` [CRON] Auto-expired ${expiredCount} pending consultations.`);
    }

  } catch (error) {
    console.error(' [CRON] Error in auto-expiring consultations:', error);
  }
}, {
  scheduled: true // Tự động chạy
});



// =================================================================
// ======================= PAYMENT TIMEOUT =========================
// =================================================================

/**
 * Hủy lịch hẹn chưa thanh toán sau 24h
 * Chạy mỗi 30 phút
 */
const cancelUnpaidAppointments = cron.schedule('*/30 * * * *', async () => {
  if (!models) return;
  
  try {
    console.log(' [CRON] Checking unpaid appointments...');
    
    // Tìm lịch hẹn chưa thanh toán quá hạn
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
    
    const expiredAppointments = await models.Appointment.findAll({
  where: {
    status: 'pending',
    //  BỎ điều kiện payment_method vì column không tồn tại
    createdAt: { [Op.lt]: expiredDate },
    payment_hold_until: { [Op.lt]: new Date() }
  },
      include: [
        { 
          model: models.Patient, 
          as: 'Patient',
          include: [{ model: models.User, attributes: ['full_name', 'email'] }]
        },
        { model: models.Service, as: 'Service' }
      ]
    });

    let cancelledCount = 0;

    for (const appointment of expiredAppointments) {
      try {
        // Cập nhật trạng thái
        await appointment.update({
          status: 'cancelled',
          cancel_reason: 'Tự động hủy do không thanh toán trong thời hạn 24h',
          cancelled_by: 'system',
          cancelled_at: new Date()
        });

        // Gửi email thông báo
        await sendEmail({
          to: appointment.Patient.User.email,
          subject: 'Lịch hẹn đã bị hủy - Clinic System',
          template: 'appointment_cancelled',
          data: {
            patientName: appointment.Patient.User.full_name,
            appointmentCode: appointment.code,
            cancelReason: 'Không thanh toán trong thời hạn 24h',
            cancelledAt: new Date().toLocaleString('vi-VN')
          }
        });

        // Tạo notification
        await createNotification({
          user_id: appointment.Patient.User.id,
          type: 'appointment_cancelled',
          title: 'Lịch hẹn đã bị hủy',
          message: `Lịch hẹn ${appointment.code} đã bị hủy do không thanh toán`,
          data: { appointment_id: appointment.id }
        });

        cancelledCount++;
      } catch (error) {
        console.error(` Error cancelling appointment ${appointment.code}:`, error);
      }
    }

    console.log(` [CRON] Cancelled ${cancelledCount} unpaid appointments`);

  } catch (error) {
    console.error(' [CRON] Error in cancel unpaid appointments:', error);
  }
}, {
  scheduled: false
});

// =================================================================
// ======================= DATA CLEANUP ============================
// =================================================================

/**
 * Dọn dẹp notification cũ (trên 30 ngày và đã đọc)
 * Chạy hàng ngày lúc 2:00 AM
 */
const cleanupOldNotifications = cron.schedule('0 2 * * *', async () => {
  if (!models) return;
  
  try {
    console.log(' [CRON] Cleaning up old notifications...');
    
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const deletedCount = await models.Notification.destroy({
      where: {
        created_at: { [Op.lt]: cutoffDate },
        read: true
      }
    });

    console.log(` [CRON] Cleaned up ${deletedCount} old notifications`);

  } catch (error) {
    console.error(' [CRON] Error in cleanup notifications:', error);
  }
}, {
  scheduled: false
});

/**
 * Dọn dẹp file uploads cũ (trên 90 ngày, không được reference)
 * Chạy hàng tuần vào Chủ nhật 3:00 AM
 */
const cleanupOldFiles = cron.schedule('0 3 * * 0', async () => {
  if (!models) return;
  
  try {
    console.log(' [CRON] Cleaning up old files...');
    
    const fs = require('fs').promises;
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Logic dọn dẹp file có thể implement sau
    // Cần kiểm tra file nào không được reference trong database
    
    console.log(' [CRON] File cleanup completed');

  } catch (error) {
    console.error(' [CRON] Error in file cleanup:', error);
  }
}, {
  scheduled: false
});

// =================================================================
// ======================= SYSTEM HEALTH ===========================
// =================================================================

/**
 * Kiểm tra sức khỏe hệ thống và gửi báo cáo
 * Chạy hàng ngày lúc 8:00 AM
 */
const systemHealthCheck = cron.schedule('0 8 * * *', async () => {
  if (!models) return;
  
  try {
    console.log(' [CRON] Running system health check...');
    
    // Thống kê cơ bản
    const stats = {
      totalAppointments: await models.Appointment.count(),
      pendingAppointments: await models.Appointment.count({ where: { status: 'pending' } }),
      confirmedAppointments: await models.Appointment.count({ where: { status: 'confirmed' } }),
      completedAppointments: await models.Appointment.count({ where: { status: 'completed' } }),
      cancelledAppointments: await models.Appointment.count({ where: { status: 'cancelled' } }),
      totalUsers: await models.User.count(),
      activeUsers: await models.User.count({ where: { status: 'active' } }),
      unreadNotifications: await models.Notification.count({ where: { read: false } })
    };

    // Log thống kê
    console.log(' [SYSTEM STATS]:', stats);

    // Kiểm tra cảnh báo
    const warnings = [];
    
    if (stats.pendingAppointments > 50) {
      warnings.push(`High pending appointments: ${stats.pendingAppointments}`);
    }
    
    if (stats.unreadNotifications > 1000) {
      warnings.push(`High unread notifications: ${stats.unreadNotifications}`);
    }

    if (warnings.length > 0) {
      console.log('  [SYSTEM WARNINGS]:', warnings);
      // Có thể gửi email cảnh báo cho admin
    }

    console.log(' [CRON] System health check completed');

  } catch (error) {
    console.error(' [CRON] Error in system health check:', error);
  }
}, {
  scheduled: false
});

// =================================================================
// ======================= APPOINTMENT STATUS UPDATE ===============
// =================================================================

/**
 * Tự động cập nhật trạng thái lịch hẹn đã qua
 * Chạy mỗi giờ
 */
const updatePassedAppointments = cron.schedule('0 * * * *', async () => {
  if (!models) return;
  
  try {
    console.log(' [CRON] Updating passed appointments...');
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];
    
    // Tìm lịch hẹn đã qua mà vẫn ở trạng thái confirmed
    const passedAppointments = await models.Appointment.findAll({
      where: {
        [Op.or]: [
          // Trường hợp 1: Ngày hẹn đã qua (trước hôm nay)
          {
            appointment_date: {
              [Op.lt]: currentDate
            }
          },
          // Trường hợp 2: Cùng ngày hôm nay nhưng giờ kết thúc đã qua hơn 1 tiếng
          {
            [Op.and]: [
              {
                appointment_date: currentDate
              },
              {
                appointment_end_time: {
                  [Op.lt]: currentTime
                }
              }
            ]
          }
        ],
        status: 'confirmed'
      }
    });

    let updatedCount = 0;

    for (const appointment of passedAppointments) {
      try {
        // Cập nhật thành completed hoặc missed
        await appointment.update({
          status: 'missed', // Có thể đổi thành 'completed' tùy logic
          updated_at: new Date()
        });
        
        updatedCount++;
      } catch (error) {
        console.error(` Error updating appointment ${appointment.code}:`, error);
      }
    }

    console.log(` [CRON] Updated ${updatedCount} passed appointments`);

  } catch (error) {
    console.error(' [CRON] Error in update passed appointments:', error);
  }
}, {
  scheduled: false
});

// =================================================================
// ======================= REVIEW REMINDERS ========================
// =================================================================

/**
 * Nhắc nhở đánh giá sau khi hoàn thành lịch hẹn
 * Chạy hàng ngày lúc 6:00 PM
 */
const sendReviewReminders = cron.schedule('0 18 * * *', async () => {
  if (!models) return;
  
  try {
    console.log(' [CRON] Sending review reminders...');
    
    // Tìm lịch hẹn hoàn thành 1-2 ngày trước, chưa có review
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    
    const appointmentsToReview = await models.Appointment.findAll({
      where: {
        status: 'completed',
        completed_at: { [Op.between]: [twoDaysAgo, oneDayAgo] },
        review_reminder_sent: false
      },
      include: [
        { 
          model: models.Patient, 
          as: 'Patient',
          include: [{ model: models.User, attributes: ['full_name', 'email'] }]
        },
        { model: models.Service, as: 'Service' },
        { 
          model: models.Review, 
          as: 'Review',
          required: false
        }
      ]
    });

    let remindersSent = 0;

    for (const appointment of appointmentsToReview) {
      try {
        // Skip nếu đã có review
        if (appointment.Review) continue;

        // Gửi email nhắc nhở đánh giá
        await sendEmail({
          to: appointment.Patient.User.email,
          subject: 'Đánh giá dịch vụ - Clinic System',
          template: 'review_reminder',
          data: {
            patientName: appointment.Patient.User.full_name,
            serviceName: appointment.Service.name,
            appointmentCode: appointment.code,
            reviewLink: `${process.env.CLIENT_URL}/appointments/${appointment.id}/review`
          }
        });

        // Tạo notification
        await createNotification({
          user_id: appointment.Patient.User.id,
          type: 'review_request',
          title: 'Đánh giá dịch vụ',
          message: `Vui lòng đánh giá dịch vụ ${appointment.Service.name}`,
          data: { appointment_id: appointment.id }
        });

        // Đánh dấu đã gửi reminder
        await appointment.update({ review_reminder_sent: true });
        
        remindersSent++;
      } catch (error) {
        console.error(` Error sending review reminder for appointment ${appointment.code}:`, error);
      }
    }

    console.log(` [CRON] Sent ${remindersSent} review reminders`);

  } catch (error) {
    console.error(' [CRON] Error in review reminders:', error);
  }
}, {
  scheduled: false
});

// =================================================================
// ======================= CRON MANAGEMENT =========================
// =================================================================

/**
 * Start all cron jobs
 */
const startAllCronJobs = () => {
  console.log('🚀 Starting all cron jobs...');
  
  sendAppointmentReminders.start();
  sendConsultationReminders.start();
  autoCompleteConsultations.start();
  autoExpirePendingConsultations.start();
  cancelUnpaidAppointments.start();
  cleanupOldNotifications.start();
  cleanupOldFiles.start();
  systemHealthCheck.start();
  updatePassedAppointments.start();
  sendReviewReminders.start();
  
  console.log(' All cron jobs started successfully');
};

/**
 * Stop all cron jobs
 */
const stopAllCronJobs = () => {
  console.log('🛑 Stopping all cron jobs...');
  
  sendAppointmentReminders.stop();
  sendConsultationReminders.stop();
  autoCompleteConsultations.stop();
  autoExpirePendingConsultations.stop();
  cancelUnpaidAppointments.stop();
  cleanupOldNotifications.stop();
  cleanupOldFiles.stop();
  systemHealthCheck.stop();
  updatePassedAppointments.stop();
  sendReviewReminders.stop();
  
  console.log(' All cron jobs stopped');
};

/**
 * Get status of all cron jobs
 */
const getCronJobStatus = () => {
  return {
    appointmentReminders: sendAppointmentReminders.getStatus(),
    cancelUnpaid: cancelUnpaidAppointments.getStatus(),
    cleanupNotifications: cleanupOldNotifications.getStatus(),
    cleanupFiles: cleanupOldFiles.getStatus(),
    healthCheck: systemHealthCheck.getStatus(),
    updatePassed: updatePassedAppointments.getStatus(),
    reviewReminders: sendReviewReminders.getStatus(),
    autoComplete: autoCompleteConsultations.getStatus(),
    autoExpire: autoExpirePendingConsultations.getStatus()
  };
};

/**
 * Manual trigger functions (for testing)
 */
const manualTriggers = {
  async sendAppointmentReminders() {
    console.log('🔧 Manual trigger: Appointment reminders');
    await sendAppointmentReminders._callbacks[0]();
  },
  
  async cancelUnpaidAppointments() {
    console.log('🔧 Manual trigger: Cancel unpaid appointments');
    await cancelUnpaidAppointments._callbacks[0]();
  },
  
  async cleanupOldNotifications() {
    console.log('🔧 Manual trigger: Cleanup notifications');
    await cleanupOldNotifications._callbacks[0]();
  },
  
  async systemHealthCheck() {
    console.log('🔧 Manual trigger: System health check');
    await systemHealthCheck._callbacks[0]();
  }
};

module.exports = {
  startAllCronJobs,
  stopAllCronJobs,
  getCronJobStatus,
  manualTriggers,
  
  // Individual cron jobs
  sendAppointmentReminders,
  cancelUnpaidAppointments,
  cleanupOldNotifications,
  cleanupOldFiles,
  systemHealthCheck,
  updatePassedAppointments,
  sendReviewReminders
};
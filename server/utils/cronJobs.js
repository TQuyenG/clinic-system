// server/utils/cronJobs.js - HỆ THỐNG TỰ ĐỘNG HÓA TÁC VỤ
const cron = require('node-cron');
const { Op } = require('sequelize');
const { sendEmail } = require('./emailSender');
const { createNotification } = require('./notificationHelper');

// Import models (với fallback handling)
let models;
try {
  const db = require('../config/db');
  models = db.models;
} catch (error) {
  console.log('⚠️  Database not configured for cron jobs');
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
    console.log('🔄 [CRON] Checking appointment reminders...');
    
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
        console.error(`❌ Error sending reminder for appointment ${appointment.code}:`, error);
      }
    }

    console.log(`✅ [CRON] Sent ${remindersSent} appointment reminders`);

  } catch (error) {
    console.error('❌ [CRON] Error in appointment reminders:', error);
  }
}, {
  scheduled: false // Start manually
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
    console.log('🔄 [CRON] Checking unpaid appointments...');
    
    // Tìm lịch hẹn chưa thanh toán quá hạn
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
    
    const expiredAppointments = await models.Appointment.findAll({
      where: {
        status: 'pending',
        payment_method: { [Op.ne]: 'cash' }, // Chỉ hủy những lịch cần thanh toán online
        created_at: { [Op.lt]: expiredDate },
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
        console.error(`❌ Error cancelling appointment ${appointment.code}:`, error);
      }
    }

    console.log(`✅ [CRON] Cancelled ${cancelledCount} unpaid appointments`);

  } catch (error) {
    console.error('❌ [CRON] Error in cancel unpaid appointments:', error);
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
    console.log('🔄 [CRON] Cleaning up old notifications...');
    
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const deletedCount = await models.Notification.destroy({
      where: {
        created_at: { [Op.lt]: cutoffDate },
        read: true
      }
    });

    console.log(`✅ [CRON] Cleaned up ${deletedCount} old notifications`);

  } catch (error) {
    console.error('❌ [CRON] Error in cleanup notifications:', error);
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
    console.log('🔄 [CRON] Cleaning up old files...');
    
    const fs = require('fs').promises;
    const path = require('path');
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Logic dọn dẹp file có thể implement sau
    // Cần kiểm tra file nào không được reference trong database
    
    console.log('✅ [CRON] File cleanup completed');

  } catch (error) {
    console.error('❌ [CRON] Error in file cleanup:', error);
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
    console.log('🔄 [CRON] Running system health check...');
    
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
    console.log('📊 [SYSTEM STATS]:', stats);

    // Kiểm tra cảnh báo
    const warnings = [];
    
    if (stats.pendingAppointments > 50) {
      warnings.push(`High pending appointments: ${stats.pendingAppointments}`);
    }
    
    if (stats.unreadNotifications > 1000) {
      warnings.push(`High unread notifications: ${stats.unreadNotifications}`);
    }

    if (warnings.length > 0) {
      console.log('⚠️  [SYSTEM WARNINGS]:', warnings);
      // Có thể gửi email cảnh báo cho admin
    }

    console.log('✅ [CRON] System health check completed');

  } catch (error) {
    console.error('❌ [CRON] Error in system health check:', error);
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
    console.log('🔄 [CRON] Updating passed appointments...');
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Tìm lịch hẹn đã qua mà vẫn ở trạng thái confirmed
    const passedAppointments = await models.Appointment.findAll({
      where: {
        appointment_time: { [Op.lt]: oneHourAgo },
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
        console.error(`❌ Error updating appointment ${appointment.code}:`, error);
      }
    }

    console.log(`✅ [CRON] Updated ${updatedCount} passed appointments`);

  } catch (error) {
    console.error('❌ [CRON] Error in update passed appointments:', error);
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
    console.log('🔄 [CRON] Sending review reminders...');
    
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
        console.error(`❌ Error sending review reminder for appointment ${appointment.code}:`, error);
      }
    }

    console.log(`✅ [CRON] Sent ${remindersSent} review reminders`);

  } catch (error) {
    console.error('❌ [CRON] Error in review reminders:', error);
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
  cancelUnpaidAppointments.start();
  cleanupOldNotifications.start();
  cleanupOldFiles.start();
  systemHealthCheck.start();
  updatePassedAppointments.start();
  sendReviewReminders.start();
  
  console.log('✅ All cron jobs started successfully');
};

/**
 * Stop all cron jobs
 */
const stopAllCronJobs = () => {
  console.log('🛑 Stopping all cron jobs...');
  
  sendAppointmentReminders.stop();
  cancelUnpaidAppointments.stop();
  cleanupOldNotifications.stop();
  cleanupOldFiles.stop();
  systemHealthCheck.stop();
  updatePassedAppointments.stop();
  sendReviewReminders.stop();
  
  console.log('✅ All cron jobs stopped');
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
    reviewReminders: sendReviewReminders.getStatus()
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
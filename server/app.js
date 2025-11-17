// server/app.js - PHIÊN BẢN ĐÃ GỘP HOÀN CHỈNH
// Mô tả: Thiết lập server Express, kết nối DB, cấu hình WebSocket và cron job

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, initializeDatabase, seedData, models } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const WebSocket = require('ws');
const cron = require('node-cron');
const path = require('path');
const { Op } = require('sequelize'); // THÊM TỪ FILE 1
const http = require('http');

// ========== IMPORT ROUTES ==========
const userRoutes = require('./routes/userRoutes');
const specialtyRoutes = require('./routes/specialtyRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const articleRoutes = require('./routes/articleRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const calendarRoutes = require('./routes/calendarRoutes'); // Giữ lại từ file 2
const serviceRoutes = require('./routes/serviceRoutes');
const serviceCategoryRoutes = require('./routes/serviceCategoryRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const workShiftRoutes = require('./routes/workShiftRoutes');
const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
const staffRoutes = require('./routes/staffRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const systemRoutes = require('./routes/systemRoutes');
const forumRoutes = require('./routes/forumRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Khởi tạo ứng dụng Express
const app = express();
const server = http.createServer(app);

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true,
  parameterLimit: 50000
}));

// Serve static files cho ảnh đã upload
app.use('/uploads/article', express.static(path.join(__dirname, 'uploads')));
// MỚI: Serve static files cho Hồ sơ y tế
app.use('/uploads/medical-files', express.static(path.join(__dirname, 'uploads/medical-files')));
// THÊM TỪ FILE 1: Serve static files cho chat (images, files)
app.use('/uploads/images', express.static(path.join(__dirname, 'uploads/images')));


// ========== MOUNT ROUTES ==========
app.use('/api/users', userRoutes);
app.use('/api/specialties', specialtyRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/service-categories', serviceCategoryRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/work-shifts', workShiftRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/calendar', calendarRoutes); // Giữ lại từ file 2
app.use('/api/staff', staffRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', systemRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/chat', chatRoutes);

// ========== HEALTH CHECK ENDPOINT ==========
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ========== ERROR HANDLER MIDDLEWARE ==========
app.use(errorHandler);

// ========== WEBSOCKET SERVER FOR REAL-TIME CHAT ==========
const wss = new WebSocket.Server({ server });

// Lưu trữ connections theo user_id và consultation_id
const connections = new Map(); // user_id -> WebSocket
const consultationRooms = new Map(); // consultation_id -> Set of user_ids

wss.on('connection', (ws, req) => {
  console.log(' WebSocket client đã kết nối');
  
  let userId = null;
  let currentConsultationId = null;

  // Xử lý tin nhắn từ client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        // Client đăng ký với user_id
        case 'register':
          userId = payload.user_id;
          connections.set(userId, ws);
          console.log(`👤 User ${userId} đã đăng ký WebSocket`);
          ws.send(JSON.stringify({
            type: 'registered',
            payload: { user_id: userId }
          }));
          break;

        // Client tham gia phòng consultation
        case 'join_consultation':
          currentConsultationId = payload.consultation_id;
          if (!consultationRooms.has(currentConsultationId)) {
            consultationRooms.set(currentConsultationId, new Set());
          }
          consultationRooms.get(currentConsultationId).add(userId);
          console.log(` User ${userId} vào phòng consultation ${currentConsultationId}`);
          
          // Thông báo cho người khác trong phòng
          broadcastToConsultation(currentConsultationId, {
            type: 'user_joined',
            payload: { user_id: userId }
          }, userId);
          break;

        // Client rời phòng consultation
        case 'leave_consultation':
          if (currentConsultationId && consultationRooms.has(currentConsultationId)) {
            consultationRooms.get(currentConsultationId).delete(userId);
            console.log(` User ${userId} rời phòng consultation ${currentConsultationId}`);
            
            // Thông báo cho người khác
            broadcastToConsultation(currentConsultationId, {
              type: 'user_left',
              payload: { user_id: userId }
            }, userId);
            
            currentConsultationId = null;
          }
          break;

        // Tin nhắn mới
        case 'new_message':
          if (currentConsultationId) {
            broadcastToConsultation(currentConsultationId, {
              type: 'new_message',
              payload: payload
            }, userId);
          }
          break;

        // Đang gõ
        case 'typing':
          if (currentConsultationId) {
            broadcastToConsultation(currentConsultationId, {
              type: 'typing',
              payload: {
                user_id: userId,
                is_typing: payload.is_typing
              }
            }, userId);
          }
          break;

        // Đã đọc tin nhắn
        case 'message_read':
          if (currentConsultationId) {
            broadcastToConsultation(currentConsultationId, {
              type: 'message_read',
              payload: {
                message_id: payload.message_id,
                read_by: userId
              }
            }, userId);
          }
          break;

        // ========== BẮT ĐẦU THÊM MỚI: XỬ LÝ TÍN HIỆU VIDEO CALL (TỪ FILE 1) ==========
        case 'webrtc_offer':
          console.log(`[WSS] User ${userId} gửi tín hiệu OFFER đến phòng ${currentConsultationId}`);
          broadcastToConsultation(currentConsultationId, {
            type: 'webrtc_offer',
            payload: payload
          }, userId); // Gửi cho người còn lại
          break;

        case 'webrtc_answer':
          console.log(`[WSS] User ${userId} gửi tín hiệu ANSWER đến phòng ${currentConsultationId}`);
          broadcastToConsultation(currentConsultationId, {
            type: 'webrtc_answer',
            payload: payload
          }, userId); // Gửi cho người còn lại
          break;

        case 'webrtc_ice_candidate':
          // console.log(`[WSS] User ${userId} gửi tín hiệu ICE Candidate`); // (Log này hơi nhiều, có thể tắt đi)
          broadcastToConsultation(currentConsultationId, {
            type: 'webrtc_ice_candidate',
            payload: payload
          }, userId); // Gửi cho người còn lại
          break;
        // ========== KẾT THÚC THÊM MỚI ==========

        default:
          console.log(` Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  // Xử lý khi client ngắt kết nối
  ws.on('close', () => {
    console.log(`🔌 WebSocket client đã ngắt kết nối (User: ${userId})`);
    
    if (userId) {
      connections.delete(userId);
      
      // Xóa khỏi phòng consultation
      if (currentConsultationId && consultationRooms.has(currentConsultationId)) {
        consultationRooms.get(currentConsultationId).delete(userId);
        
        // Thông báo cho người khác
        broadcastToConsultation(currentConsultationId, {
          type: 'user_left',
          payload: { user_id: userId }
        }, userId);
      }
    }
  });

  // Xử lý lỗi
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Hàm broadcast tin nhắn đến tất cả users trong consultation
function broadcastToConsultation(consultationId, message, excludeUserId = null) {
  if (!consultationRooms.has(consultationId)) return;

  const userIds = consultationRooms.get(consultationId);
  userIds.forEach(userId => {
    if (userId !== excludeUserId) {
      const ws = connections.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  });
}

// Hàm gửi tin nhắn đến một user cụ thể
function sendToUser(userId, message) {
  const ws = connections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Export các hàm WebSocket để sử dụng trong controllers
global.wsConnections = connections;
global.wsConsultationRooms = consultationRooms;
global.wsBroadcastToConsultation = broadcastToConsultation;
global.wsSendToUser = sendToUser;



// ========== CRON JOBS ==========
// SỬA: Thay thế toàn bộ Cron Jobs inline của file 2 bằng import và start từ file 1

/**
 * CRON JOB 1: Gửi thông báo nhắc lịch hẹn (8h sáng mỗi ngày)
 */
cron.schedule('0 8 * * *', async () => {
  console.log(' [CRON] Chạy job gửi thông báo nhắc lịch hẹn (8:00 AM)');

  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await models.Appointment.findAll({
      where: {
        appointment_date: today,
        status: 'confirmed'
      },
      include: [
        {
          model: models.Patient,
          include: [{ model: models.User }]
        },
        {
          model: models.Service
        }
      ]
    });

    console.log(` Tìm thấy ${appointments.length} lịch hẹn hôm nay`);

    for (const appointment of appointments) {
      if (appointment.Patient?.User) {
        await models.Notification.create({
          user_id: appointment.Patient.User.id,
          type: 'appointment',
          title: ' Nhắc lịch hẹn hôm nay',
          content: `Bạn có lịch hẹn khám hôm nay lúc ${appointment.appointment_time} tại phòng khám. Vui lòng đến đúng giờ!`,
          related_id: appointment.id,
          related_type: 'appointment',
          link: `/lich-hen/${appointment.id}`,
          priority: 'high',
          is_read: false
        });
      }
    }

    console.log(` Đã gửi ${appointments.length} thông báo nhắc lịch hẹn`);

  } catch (error) {
    console.error('ERROR trong cron job nhắc lịch hẹn:', error);
  }
});

/**
 *  CRON JOB 2: Nhắc lịch tư vấn (30 phút trước giờ hẹn)
 */
cron.schedule('*/30 * * * *', async () => {
  console.log(' [CRON] Kiểm tra lịch tư vấn sắp diễn ra');

  try {
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60000);
    const in35Minutes = new Date(now.getTime() + 35 * 60000);

    const upcomingConsultations = await models.Consultation.findAll({
      where: {
        status: 'confirmed',
        appointment_time: {
          [Op.between]: [in30Minutes, in35Minutes] // SỬA: Dùng Op
        }
      }
    });

    console.log(` Tìm thấy ${upcomingConsultations.length} buổi tư vấn sắp diễn ra`);

    for (const consultation of upcomingConsultations) {
      // Thông báo cho bệnh nhân
      await models.Notification.create({
        user_id: consultation.patient_id,
        type: 'consultation',
        title: ' Sắp đến giờ tư vấn',
        content: 'Buổi tư vấn của bạn sẽ bắt đầu sau 30 phút. Vui lòng chuẩn bị sẵn sàng!',
        related_id: consultation.id,
        related_type: 'consultation',
        link: `/tu-van/${consultation.id}`,
        priority: 'high',
        is_read: false
      });

      // Thông báo cho bác sĩ
      await models.Notification.create({
        user_id: consultation.doctor_id,
        type: 'consultation',
        title: ' Sắp đến giờ tư vấn',
        content: 'Bạn có buổi tư vấn sau 30 phút. Vui lòng chuẩn bị!',
        related_id: consultation.id,
        related_type: 'consultation',
        link: `/tu-van/${consultation.id}`,
        priority: 'high',
        is_read: false
      });
    }

  } catch (error) {
    console.error('ERROR trong cron job nhắc tư vấn:', error);
  }
});

/**
 * CRON JOB 3: Gửi thông báo nhắc lịch làm việc (18h chiều mỗi ngày)
 */
cron.schedule('0 18 * * *', async () => {
  console.log(' [CRON] Chạy job gửi thông báo nhắc lịch làm việc ngày mai (18:00 PM)');

  try {
    const notifications = await models.Notification.createScheduleReminders();
    console.log(` Đã gửi ${notifications.length} thông báo nhắc lịch làm việc ngày mai`);

  } catch (error) {
    console.error('ERROR trong cron job nhắc lịch làm việc:', error);
  }
});

/**
 * CRON JOB 4: Dọn dẹp thông báo cũ (2h sáng mỗi ngày)
 */
cron.schedule('0 2 * * *', async () => {
  console.log(' [CRON] Chạy job dọn dẹp thông báo cũ (02:00 AM)');

  try {
    const deleted = await models.Notification.cleanupOldNotifications(30);
    console.log(` Đã xóa ${deleted} thông báo cũ`);

  } catch (error) {
    console.error('ERROR trong cron job dọn dẹp thông báo:', error);
  }
});

/**
 * CRON JOB 5: Tự động hủy appointment quá hạn (mỗi giờ)
 */
cron.schedule('0 * * * *', async () => {
  console.log(' [CRON] Chạy job tự động hủy appointment quá hạn');

  try {
    // const { Op } = require('sequelize'); // Đã import ở đầu file
    const moment = require('moment');
    
    const cutoffDate = moment().subtract(24, 'hours').toDate();
    
    const expiredAppointments = await models.Appointment.findAll({
      where: {
        status: 'pending',
        created_at: { [Op.lt]: cutoffDate }
      }
    });

    console.log(` Tìm thấy ${expiredAppointments.length} appointment quá hạn`);

    for (const appointment of expiredAppointments) {
      appointment.status = 'cancelled';
      appointment.metadata = {
        ...appointment.metadata,
        cancel_reason: 'Tự động hủy do quá 24h chưa xác nhận',
        cancelled_by: 'system',
        cancelled_at: new Date()
      };
      await appointment.save();

      if (appointment.patient_id) {
        const patient = await models.Patient.findByPk(appointment.patient_id, {
          include: [{ model: models.User }]
        });
        
        if (patient?.User) {
          await models.Notification.create({
            user_id: patient.User.id,
            type: 'appointment',
            title: 'Lịch hẹn đã bị hủy',
            content: `Lịch hẹn của bạn đã bị tự động hủy do quá 24h chưa được xác nhận. Vui lòng đặt lịch mới nếu vẫn muốn khám.`,
            related_id: appointment.id,
            related_type: 'appointment',
            priority: 'normal',
            is_read: false
          });
        }
      }
    }

    console.log(` Đã hủy ${expiredAppointments.length} appointment quá hạn`);

  } catch (error) {
    console.error('ERROR trong cron job hủy appointment:', error);
  }
});

/**
 *  CRON JOB 6: Tự động hủy consultation quá hạn (mỗi 10 phút)
 */
cron.schedule('*/10 * * * *', async () => {
  console.log(' [CRON] Kiểm tra consultation quá hạn');

  try {
    const cancelledCount = await models.Consultation.autoCancel();
    if (cancelledCount > 0) {
      console.log(` Đã tự động hủy ${cancelledCount} consultation quá hạn`);
    }
  } catch (error) {
    console.error('ERROR trong cron job hủy consultation:', error);
  }
});

/**
 * CRON JOB 7: Tự động cập nhật work_status cho Doctor/Staff (1:00 AM mỗi ngày)
 */
cron.schedule('0 1 * * *', async () => {
  console.log(' [CRON] Chạy job cập nhật work_status (01:00 AM)');
  const transaction = await sequelize.transaction();
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Tìm tất cả user_id đang nghỉ phép hôm nay
    const usersOnLeave = await models.LeaveRequest.findAll({
      where: {
        status: 'approved',
        date_from: { [Op.lte]: today }, // SỬA: Dùng Op
        [Op.or]: [ // SỬA: Dùng Op
          { date_to: { [Op.gte]: today } }, // SỬA: Dùng Op
          { date_to: null, date_from: today } // Xử lý trường hợp nghỉ 1 ngày (date_to=null)
        ]
      },
      attributes: ['user_id'],
      raw: true,
      transaction
    });
    
    const userIdsOnLeave = usersOnLeave.map(leave => leave.user_id);
    console.log(` Tìm thấy ${userIdsOnLeave.length} user đang nghỉ phép hôm nay.`);

    // 2. Cập nhật 'on_leave' cho những ai có trong danh sách
    if (userIdsOnLeave.length > 0) {
      await models.Doctor.update(
        { work_status: 'on_leave' },
        { where: { user_id: { [Op.in]: userIdsOnLeave } }, transaction }
      );
      await models.Staff.update(
        { work_status: 'on_leave' },
        { where: { user_id: { [Op.in]: userIdsOnLeave } }, transaction }
      );
    }

    // 3. Cập nhật 'active' cho TẤT CẢ những người còn lại
    await models.Doctor.update(
      { work_status: 'active' },
      { where: { user_id: { [Op.notIn]: userIdsOnLeave } }, transaction }
    );
    await models.Staff.update(
      { work_status: 'active' },
      { where: { user_id: { [Op.notIn]: userIdsOnLeave } }, transaction }
    );

    await transaction.commit();
    console.log(' [CRON] SUCCESS: Đã cập nhật work_status cho Doctors và Staff.');

  } catch (error) {
    await transaction.rollback();
    console.error(' [CRON] ERROR trong cron job cập nhật work_status:', error);
  }
});

// ========== KHỞI ĐỘNG SERVER ==========
const PORT = process.env.PORT || 3001;
// THÊM TỪ FILE 1: Import cron job
const { startAllCronJobs } = require('./utils/cronJobs');

async function startServer() {
  try {
    console.log('Đang khởi tạo cơ sở dữ liệu...');
    await initializeDatabase();

    if (process.env.SYNC_MODE === 'force') {
      console.log('Đang đồng bộ force: Xóa và tạo lại toàn bộ bảng...');
      await sequelize.sync({ force: true, logging: console.log });
      console.log('SUCCESS: Tất cả bảng đã được xóa và tạo lại thành công.');

      console.log('Đang thêm dữ liệu mẫu...');
      await seedData();
      console.log('SUCCESS: Dữ liệu mẫu đã được thêm vào tất cả bảng.');
    } else if (process.env.SYNC_MODE === 'alter') {
      console.log('Đang đồng bộ alter: Cập nhật bảng để khớp với model...');
      await sequelize.sync({ alter: true, logging: console.log });
      console.log('SUCCESS: Cập nhật bảng thành công, dữ liệu được giữ nguyên.');

      const userCount = await models.User.count();
      console.log(`Số lượng user hiện tại: ${userCount}`);

      if (userCount === 0) {
        console.log(' Database trống! Đang thêm dữ liệu mẫu...');
        await seedData();
        console.log('SUCCESS: Dữ liệu mẫu đã được thêm.');
      } else {
        console.log('ℹ️ Database đã có dữ liệu, bỏ qua seed.');
      }
    } else {
      console.log('Đang đồng bộ normal: Tạo bảng nếu chưa tồn tại...');
      await sequelize.sync({ logging: console.log });
      console.log('SUCCESS: Tất cả bảng đã được tạo hoặc đã tồn tại.');

      const userCount = await models.User.count();
      console.log(`Số lượng user hiện tại: ${userCount}`);

      if (userCount === 0) {
        console.log(' Database trống! Đang thêm dữ liệu mẫu...');
        await seedData();
        console.log('SUCCESS: Dữ liệu mẫu đã được thêm.');
      } else {
        console.log('ℹ️ Database đã có dữ liệu, bỏ qua seed.');
      }
    }

    server.listen(PORT, () => {
      console.log(`SUCCESS: Server đang chạy trên cổng ${PORT}`);
      
      // THÊM TỪ FILE 1: Gọi hàm start cron jobs từ file ngoài
      startAllCronJobs();

      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('📌 THÔNG TIN ĐĂNG NHẬP:');
      console.log('   Admin: admin1@example.com / 123456');
      console.log('   Doctor: doctor1@example.com / 123456');
      console.log('   Patient: patient1@example.com / 123456');
      console.log('─────────────────────────────────────────────────────────');
      console.log('🔗 API ENDPOINTS:');
      console.log('   Users:         http://localhost:3001/api/users');
     console.log('   Schedules:     http://localhost:3001/api/schedules');
      console.log('   Calendar:     http://localhost:3001/api/calendar'); // THÊM MỚI
      console.log('   Articles:      http://localhost:3001/api/articles');
      console.log('   Services:      http://localhost:3001/api/services');
      console.log('   Appointments:  http://localhost:3001/api/appointments');
      console.log('   MedicalRecords:http://localhost:3001/api/medical-records');
      console.log('   Payments:      http://localhost:3001/api/payments');
      console.log('    Consultations: http://localhost:3001/api/consultations');
      console.log('    Chat:          http://localhost:3001/api/chat');
      console.log('─────────────────────────────────────────────────────────');
      console.log('📡 WEBSOCKET:');
      console.log(`   WebSocket Server: ws://localhost:${PORT}`);
      console.log('─────────────────────────────────────────────────────────');
      console.log(' CRON JOBS ACTIVE:');
      console.log('    (Cron jobs được quản lý trong ./utils/cronJobs.js)'); // SỬA: Thông báo
      console.log('╚═══════════════════════════════════════════════════════╝');
    });
  } catch (error) {
    console.error('ERROR: Không thể khởi động server:', error.message);
    console.error(error.stack); // SỬA: In ra stack trace đầy đủ
    process.exit(1);
  }
}

startServer();

module.exports = app;
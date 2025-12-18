// server/controllers/consultationController.js
// ✅ FIXED VERSION - Sửa tất cả lỗi

const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');
const moment = require('moment'); // Thêm Moment.js
const emailSender = require('../utils/emailSender');

// Helper (Copy từ appointmentController)
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * ==================== PATIENT METHODS ====================
 */

/**
 * Tạo tư vấn mới (Đặt lịch tư vấn)
 * POST /api/consultations
 */
exports.createConsultation = async (req, res) => {
  try {
    const { 
      doctor_id, 
      consultation_pricing_id, // <-- MỚI
      specialty_id, // <-- MỚI
      appointment_time,
      chief_complaint,
      medical_history,
      current_medications,
      symptom_duration,
      attachments,
      notes
    } = req.body;

    const patient_id = req.user.id;

    // Validate
    if (!doctor_id || !consultation_pricing_id || !appointment_time || !chief_complaint) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc (bác sĩ, gói dịch vụ, thời gian, triệu chứng)'
      });
    }

    // 1. Kiểm tra Gói dịch vụ (Package)
    const pkg = await models.ConsultationPricing.findOne({
      where: { id: consultation_pricing_id, is_active: true }
    });
    
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Gói dịch vụ không tồn tại hoặc đã bị khóa'
      });
    }
    
    // 2. Kiểm tra bác sĩ
    const doctor = await models.User.findOne({
      where: { id: doctor_id, role: 'doctor', is_active: true },
      include: [{ model: models.Doctor, attributes: ['id'] }] // Lấy Doctor.id để check Appointment
    });

    if (!doctor || !doctor.Doctor) {
      return res.status(404).json({
        success: false,
        message: 'Bác sĩ không tồn tại, đã bị khóa, hoặc chưa có hồ sơ Doctor'
      });
    }

    // Lấy thông tin Patient
    const patient = await models.Patient.findOne({ 
        where: { user_id: patient_id }, 
        attributes: ['id'],
        raw: true 
    });
    // Gán vào req.user để dùng cho Quy tắc 3
    if (patient) req.user.Patient = patient;

    // 3. Lấy thông tin Gói
const consultation_type = pkg.package_type;
const duration_minutes = pkg.duration_minutes || 30; // Mặc định 30 phút nếu gói không set

// 4. Tính toán thời gian
const appointmentStartTime = moment(appointment_time);
const appointmentEndTime = moment(appointment_time).add(duration_minutes, 'minutes');
const appointmentDate = appointmentStartTime.format('YYYY-MM-DD');
const startTimeStr = appointmentStartTime.format('HH:mm:ss');
const endTimeStr = appointmentEndTime.format('HH:mm:ss');

// === BẮT ĐẦU KIỂM TRA XUNG ĐỘT ===
const transaction = await sequelize.transaction();
try {

  // QUY TẮC 1: Bác sĩ có lịch làm việc không?
  // (Chúng ta dùng logic tương tự getAvailableSlotsLogic của appointmentController)
  const doctorSchedules = await models.Schedule.findAll({ 
      where: {
          user_id: doctor_id,
          date: appointmentDate,
          status: 'available' // Chỉ kiểm tra lịch 'available'
      },
      transaction
  });

  const doctorShifts = await models.WorkShiftConfig.findAll({ 
      where: { is_active: true }, 
      transaction 
  });
  const dayOfWeek = appointmentStartTime.day(); // 0=Chủ Nhật, 1=Thứ Hai, ..., 6=Thứ Bảy
  // Nguồn lịch: Lịch cố định (Schedule) ưu tiên, nếu không có thì dùng Lịch Mặc định (WorkShift)
  const sourceShifts = doctorSchedules.length > 0 
    ? doctorSchedules 
    : doctorShifts.filter(s => {
        // Đảm bảo days_of_week là mảng
        const daysArray = Array.isArray(s.days_of_week) ? s.days_of_week : JSON.parse(s.days_of_week || '[]');
        // Kiểm tra cả dạng SỐ và dạng CHUỖI
        return daysArray.includes(dayOfWeek) || daysArray.includes(String(dayOfWeek));
      });

// THÊM LOG ĐỂ DEBUG
console.log('📅 DEBUG getAvailableSlots:', {
    selectedDate: appointmentDate,
    dayOfWeek,
    doctorSchedulesCount: doctorSchedules.length,
    doctorShiftsCount: doctorShifts.length,
    sourceShiftsCount: sourceShifts.length,
    sourceShifts: sourceShifts.map(s => ({ start: s.start_time, end: s.end_time, days: s.days_of_week }))
});
  const slotStartMinutes = appointmentStartTime.hours() * 60 + appointmentStartTime.minutes();
  const slotEndMinutes = slotStartMinutes + duration_minutes;

  const isDoctorAvailable = sourceShifts.some(shift => {
      const shiftStart = timeToMinutes(shift.start_time);
      const shiftEnd = timeToMinutes(shift.end_time);
      return slotStartMinutes >= shiftStart && slotEndMinutes <= shiftEnd;
  });

  if (!isDoctorAvailable) {
      await transaction.rollback();
      return res.status(400).json({
          success: false,
          message: 'Bác sĩ không có lịch làm việc hoặc lịch đã kín vào thời gian này.'
      });
  }

  // QUY TẮC 2: Bác sĩ có bận không?
  // 2a. Kiểm tra Appointment (khám tại quầy)
  const doctorApptConflict = await models.Appointment.findOne({
      where: {
          doctor_id: doctor.Doctor.id, // Appointment dùng doctor_id (từ model Doctor)
          status: { [Op.notIn]: ['cancelled', 'completed'] },
          appointment_date: appointmentDate,
          [Op.or]: [ // Check overlap
              { appointment_start_time: { [Op.lt]: endTimeStr }, appointment_end_time: { [Op.gt]: startTimeStr } }
          ]
      }, transaction
  });

  // 2b. Kiểm tra Consultation (tư vấn)
  // EndB = appointment_time + duration_minutes
  // Overlap if (StartA < EndB) AND (EndA > StartB)
  const doctorConsultConflict = await models.Consultation.findOne({
      where: {
          doctor_id: doctor_id,
          status: { [Op.notIn]: ['cancelled', 'rejected', 'expired', 'completed'] },
          // StartB < EndA
          appointment_time: { [Op.lt]: appointmentEndTime.toISOString() },
          // EndB > StartA
          [Op.and]: sequelize.literal(`TIMESTAMPADD(MINUTE, COALESCE(duration_minutes, 30), \`Consultation\`.\`appointment_time\`) > '${appointmentStartTime.toISOString()}'`)
      }, 
      transaction
  });

  if (doctorApptConflict || doctorConsultConflict) {
      await transaction.rollback();
      return res.status(400).json({
          success: false,
          message: 'Bác sĩ đã có lịch hẹn/tư vấn khác trùng với thời gian này.'
      });
  }

  // QUY TẮC 3: Bệnh nhân có bận không?
  if (req.user.Patient) { // Chỉ check nếu patient có hồ sơ
    // 3a. Kiểm tra Appointment
    const patientApptConflict = await models.Appointment.findOne({
        where: {
            patient_id: req.user.Patient.id, 
            status: { [Op.notIn]: ['cancelled', 'completed'] },
            appointment_date: appointmentDate,
            [Op.or]: [
                { appointment_start_time: { [Op.lt]: endTimeStr }, appointment_end_time: { [Op.gt]: startTimeStr } }
            ]
        }, transaction
    });

    // 3b. Kiểm tra Consultation
    const patientConsultConflict = await models.Consultation.findOne({
        where: {
            patient_id: patient_id,
            status: { [Op.notIn]: ['cancelled', 'rejected', 'expired', 'completed'] },
            appointment_time: { [Op.lt]: appointmentEndTime.toISOString() },
            [Op.and]: sequelize.literal(`TIMESTAMPADD(MINUTE, COALESCE(duration_minutes, 30), \`Consultation\`.\`appointment_time\`) > '${appointmentStartTime.toISOString()}'`)

        }, 
        transaction
    });

    if (patientApptConflict || patientConsultConflict) {
        await transaction.rollback();
        return res.status(400).json({
            success: false,
            message: 'Bạn đã có một lịch hẹn/tư vấn khác trùng với thời gian này.'
        });
    }
  }
  // === KẾT THÚC KIỂM TRA XUNG ĐỘT ===

  // 5. Tính phí
  const baseFee = pkg.price;
  const platformFee = Math.round(baseFee * 0.1); // 10% platform fee
  const totalFee = parseFloat(baseFee) + parseFloat(platformFee);

  // 6. Xác định trạng thái dựa trên phí và phương thức thanh toán
  let initialStatus = 'pending'; // ✅ Luôn là pending - chờ admin duyệt
  
  // Payment status dựa trên phương thức thanh toán
  let initialPaymentStatus = 'unpaid'; // Mặc định chưa thanh toán
  if (totalFee <= 0) {
    initialPaymentStatus = 'not_required'; // Miễn phí không cần thanh toán
  }
  // Nếu có payment_method từ req.body, set theo phương thức
  const { payment_method } = req.body;
  if (payment_method === 'vnpay' || payment_method === 'momo') {
    // Sau khi thanh toán online thành công sẽ update thành paid_online
    initialPaymentStatus = 'unpaid'; // Tạm thời unpaid, đợi callback từ gateway
  }


  // 7. Tạo mã tư vấn
  const consultationCode = `CS${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // 8. Tạo consultation
  const consultation = await models.Consultation.create({
    consultation_code: consultationCode,
    patient_id,
    doctor_id,
    specialty_id: specialty_id || null,
    consultation_pricing_id: pkg.id, 

    consultation_type, 
    duration_minutes, 

    appointment_time,
    chief_complaint,
    medical_history: medical_history || null,
    current_medications: current_medications || null,
    symptom_duration: symptom_duration || null,
    attachments: attachments || null, 
    notes: notes || null,

    status: initialStatus,

    base_fee: baseFee,
    platform_fee: platformFee,
    total_fee: totalFee,
    payment_status: initialPaymentStatus,
    payment_method: payment_method || null // Lưu phương thức thanh toán
  }, { transaction }); // <-- Thêm transaction

  // 9. ✅ SỬA LỖI: Gửi thông báo cho BÁC SĨ (THÊM LẠI)
  await models.Notification.create({
    user_id: doctor_id,
    type: 'appointment',
    message: '🔔 Bạn có lịch tư vấn mới cần xác nhận',
    link: `/lich-tu-van-cua-toi`,
    is_read: false
  }, { transaction });
// 10. ✅ THÊM MỚI: Gửi thông báo cho TẤT CẢ ADMIN
const admins = await models.User.findAll({
  where: { role: 'admin', is_active: true },
  attributes: ['id'],
  transaction
});

// Tạo thông báo cho từng admin
for (const admin of admins) {
  await models.Notification.create({
    user_id: admin.id,
    type: 'appointment',
    message: `📋 Lịch tư vấn mới ${consultation.consultation_code} cần phê duyệt`,
    link: `/admin/tu-van/realtime/all`, // Link đến trang quản lý admin
    is_read: false
  }, { transaction });
}

await transaction.commit(); 

  res.status(201).json({
    success: true,
    message: 'Đặt lịch tư vấn thành công',
    data: consultation
  });

} catch (error) { // <-- Catch của transaction
  if (transaction) await transaction.rollback();
  console.error('Error during consultation creation transaction:', error);
  res.status(500).json({
    success: false,
    message: error.message || 'Lỗi khi tạo lịch tư vấn (transaction failed)',
    error: error.message
  });
  }
  } catch (error) {
    console.error('Error creating consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo lịch tư vấn',
      error: error.message
    });
  }
};
/**
 * ✅ FIX: Lấy danh sách tư vấn của bệnh nhân
 * GET /api/consultations/my-consultations
 */
exports.getMyConsultations = async (req, res) => {
  try {
    const patient_id = req.user.id;
    const { status, type, page = 1, limit = 10 } = req.query;

    const where = { patient_id };
    if (status && status !== 'all') where.status = status; // <-- SỬA DÒNG NÀY
    if (type && type !== 'all') where.consultation_type = type; // <-- SỬA DÒNG NÀY

    const offset = (page - 1) * limit;

    const { count, rows } = await models.Consultation.findAndCountAll({
      where,
      include: [
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'avatar_url', 'phone'],
          include: [{
            model: models.Doctor,
            include: [{
              model: models.Specialty,
              as: 'specialty',
              attributes: ['id', 'name']
            }]
          }]
        }
      ],
      order: [['appointment_time', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting my consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách tư vấn',
      error: error.message
    });
  }
};

/**
 * Đánh giá buổi tư vấn
 * PUT /api/consultations/:id/rate
 */
exports.rateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const patient_id = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Đánh giá phải từ 1-5 sao'
      });
    }

    const consultation = await models.Consultation.findOne({
      where: { id, patient_id, status: 'completed' }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn hoặc chưa hoàn thành'
      });
    }

    if (consultation.rating) {
      return res.status(400).json({
        success: false,
        message: 'Đã đánh giá buổi tư vấn này rồi'
      });
    }

    consultation.rating = rating;
    consultation.review = review;
    await consultation.save();

    // Cập nhật rating trung bình của bác sĩ
    const doctor = await models.Doctor.findOne({
      where: { user_id: consultation.doctor_id }
    });

    if (doctor) {
      const avgRating = await models.Consultation.findOne({
        where: {
          doctor_id: consultation.doctor_id,
          rating: { [Op.ne]: null }
        },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']
        ],
        raw: true
      });

      doctor.rating = parseFloat(avgRating.avg_rating || 0).toFixed(2);
      await doctor.save();
    }

    res.json({
      success: true,
      message: 'Đánh giá thành công',
      data: consultation
    });

  } catch (error) {
    console.error('Error rating consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi đánh giá tư vấn',
      error: error.message
    });
  }
};

/**
 * (MỚI) Bệnh nhân gửi Đánh giá
 * POST /api/consultations/feedback
 *
 * ✅ SỬA LỖI: Lưu đánh giá trực tiếp vào bảng 'consultations'
 * vì đã có sẵn cột 'rating' và 'review'.
 */
exports.submitConsultationFeedback = async (req, res) => {
  try {
    const patient_id = req.user.id;
    const { consultation_id, rating, review } = req.body;

    if (!consultation_id || !rating) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin ID hoặc xếp hạng' });
    }

    // 1. Tìm buổi tư vấn
    const consultation = await models.Consultation.findByPk(consultation_id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy buổi tư vấn' });
    }

    // 2. Kiểm tra quyền
    if (consultation.patient_id !== patient_id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền đánh giá buổi tư vấn này' });
    }

    // 3. Kiểm tra xem đã đánh giá CHƯA (ngay trên bảng Consultation)
    if (consultation.rating) {
      return res.status(400).json({ success: false, message: 'Bạn đã đánh giá buổi tư vấn này rồi' });
    }
    
    // 4. Lưu trực tiếp vào bảng Consultation
    consultation.rating = parseInt(rating);
    consultation.review = review || null;
    consultation.reviewed_at = new Date(); // Thêm thời gian đánh giá
    await consultation.save();

    // 5. Cập nhật rating trung bình của bác sĩ (logic từ hàm rateConsultation cũ)
    const doctor = await models.Doctor.findOne({
      where: { user_id: consultation.doctor_id }
    });

    if (doctor) {
      const avgRating = await models.Consultation.findOne({
        where: {
          doctor_id: consultation.doctor_id,
          rating: { [Op.ne]: null } // Op đã được import ở đầu file
        },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']
        ],
        raw: true
      });

      doctor.rating = parseFloat(avgRating.avg_rating || 0).toFixed(2);
      await doctor.save();
    }

    // Trả về chính consultation đã được cập nhật
    res.status(201).json({ success: true, message: 'Gửi đánh giá thành công', data: consultation });

  } catch (error) {
    console.error('Error submitConsultationFeedback:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi đánh giá',
      error: error.message
    });
  }
};

/**
 * ✅ FIX: Thống kê tư vấn của bệnh nhân
 * GET /api/consultations/patient/stats
 */
exports.getPatientStats = async (req, res) => {
  try {
    const patient_id = req.user.id;

    const stats = await models.Consultation.findOne({
      where: { patient_id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_consultations'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "completed" THEN 1 END')), 'completed'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "cancelled" THEN 1 END')), 'cancelled'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN payment_status = "paid" THEN total_fee ELSE 0 END')), 'total_spent']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        stats: stats || {
          total_consultations: 0,
          completed: 0,
          cancelled: 0,
          total_spent: 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting patient stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê',
      error: error.message
    });
  }
};

/**
 * ==================== DOCTOR METHODS ====================
 */

/**
 * ✅ FIX: Lấy danh sách tư vấn của bác sĩ
 * GET /api/consultations/doctor/my-consultations
 */
exports.getDoctorConsultations = async (req, res) => {
  try {
    const doctor_id = req.user.id;
    const { status, type, date, page = 1, limit = 20 } = req.query;

    const where = { doctor_id };
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.consultation_type = type;
    if (date) {
      where.appointment_time = {
        [Op.between]: [
          new Date(date + ' 00:00:00'),
          new Date(date + ' 23:59:59')
        ]
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await models.Consultation.findAndCountAll({
      where,
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'avatar_url', 'phone', 'dob', 'gender'],
          include: [{
            model: models.Patient
          }]
        }
      ],
      order: [['appointment_time', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting doctor consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách tư vấn',
      error: error.message
    });
  }
};

/**
 * ✅ FIX: Xác nhận tư vấn (Bác sĩ chấp nhận)
 * PUT /api/consultations/:id/confirm
 */
exports.confirmConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor_id = req.user.id;

    const consultation = await models.Consultation.findOne({
      where: { id, doctor_id, status: 'pending' }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn hoặc không thể xác nhận'
      });
    }

    consultation.status = 'confirmed';
    consultation.confirmed_at = new Date();
    await consultation.save();

    // ✅ FIX: Tạo thông báo cho bệnh nhân
    await models.Notification.create({
      user_id: consultation.patient_id,
      type: 'appointment', // ✅ ĐỔI 'consultation' → 'appointment'
      message: '✅ Bác sĩ đã xác nhận lịch tư vấn của bạn',
      link: `/tu-van/${consultation.id}`,
      is_read: false
    });

    res.json({
      success: true,
      message: 'Xác nhận thành công',
      data: consultation
    });

  } catch (error) {
    console.error('Error confirming consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xác nhận tư vấn',
      error: error.message
    });
  }
};

/**
 * Kết thúc tư vấn và điền kết quả
 * PUT /api/consultations/:id/complete
 */
exports.completeConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, prescription, notes } = req.body;
    const doctor_id = req.user.id;

    if (!diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập chẩn đoán'
      });
    }

    const consultation = await models.Consultation.findOne({
      where: { id, doctor_id, status: 'in_progress' }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn hoặc chưa bắt đầu'
      });
    }

    consultation.status = 'completed';
    consultation.diagnosis = diagnosis;
    consultation.prescription = prescription;
    consultation.notes = notes;
    consultation.ended_at = new Date();
    consultation.completed_at = new Date();
    await consultation.save();

    // ✅ FIX: Tạo thông báo cho bệnh nhân
    await models.Notification.create({
      user_id: consultation.patient_id,
      type: 'appointment',
      message: '✅ Buổi tư vấn đã hoàn thành. Bác sĩ đã gửi kết quả',
      link: `/tu-van/${consultation.id}`,
      is_read: false
    });

    res.json({
      success: true,
      message: 'Hoàn thành tư vấn thành công',
      data: consultation
    });

  } catch (error) {
    console.error('Error completing consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hoàn thành tư vấn',
      error: error.message
    });
  }
};

/**
 * Thống kê tư vấn của bác sĩ
 * GET /api/consultations/doctor/stats
 */
exports.getDoctorStats = async (req, res) => {
  try {
    const doctor_id = req.user.id;

    const stats = await models.Consultation.findOne({
      where: { doctor_id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_consultations'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "completed" THEN 1 END')), 'completed'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT patient_id')), 'total_patients']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        stats: stats || {
          total_consultations: 0,
          completed: 0,
          avg_rating: 0,
          total_patients: 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting doctor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê',
      error: error.message
    });
  }
};

/**
 * ==================== COMMON METHODS ====================
 */

/**
 * ✅ FIX: Lấy chi tiết một tư vấn
 * GET /api/consultations/:id
 */
exports.getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // ✅ THÊM: Log để debug
    console.log('🔍 [getConsultationById] Tìm kiếm:', {
      id,
      idType: typeof id,
      userId,
      userRole: req.user.role
    });

    let consultation = await models.Consultation.findByPk(id, {
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'avatar_url', 'phone', 'dob', 'gender'],
          include: [{ model: models.Patient }]
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'avatar_url', 'phone'],
          include: [{
            model: models.Doctor,
            include: [{
              model: models.Specialty,
              as: 'specialty',
              attributes: ['id', 'name']
            }]
          }]
        },
        {
          model: models.ConsultationPricing,
          as: 'package',
          attributes: ['package_name', 'duration_minutes', 'price']
        }
      ]
    });

    // ✅ THÊM: Nếu không tìm thấy theo ID, thử tìm theo consultation_code
    if (!consultation && isNaN(id)) {
      console.log('⚠️ [getConsultationById] Không tìm thấy theo ID, thử tìm theo code:', id);
      consultation = await models.Consultation.findOne({
        where: { consultation_code: id },
        include: [
          {
            model: models.User,
            as: 'patient',
            attributes: ['id', 'full_name', 'avatar_url', 'phone', 'dob', 'gender'],
            include: [{ model: models.Patient }]
          },
          {
            model: models.User,
            as: 'doctor',
            attributes: ['id', 'full_name', 'avatar_url', 'phone'],
            include: [{
              model: models.Doctor,
              include: [{
                model: models.Specialty,
                as: 'specialty',
                attributes: ['id', 'name']
              }]
            }]
          },
          {
            model: models.ConsultationPricing,
            as: 'package',
            attributes: ['package_name', 'duration_minutes', 'price']
          }
        ]
      });
    }

    if (!consultation) {
      console.log('❌ [getConsultationById] Không tìm thấy consultation:', id);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    console.log('✅ [getConsultationById] Tìm thấy consultation:', {
      id: consultation.id,
      code: consultation.consultation_code,
      status: consultation.status
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền xem
    const allowedRoles = ['admin', 'staff'];
    if (!allowedRoles.includes(req.user.role)) {
      if (consultation.patient_id !== userId && consultation.doctor_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem buổi tư vấn này'
        });
      }
    }

    res.json({
      success: true,
      data: consultation
    });

  } catch (error) {
    console.error('Error getting consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin tư vấn',
      error: error.message
    });
  }
};

/**
 * Bắt đầu tư vấn (Vào phòng chat)
 * PUT /api/consultations/:id/start
 */
exports.startConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const consultation = await models.Consultation.findOne({
      where: {
        id,
        status: 'confirmed',
        [Op.or]: [
          { patient_id: userId },
          { doctor_id: userId }
        ]
      }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn hoặc chưa được xác nhận'
      });
    }

    // Kiểm tra thời gian có hợp lệ không (có thể vào trước 15 phút)
    const now = new Date();
    const appointmentTime = new Date(consultation.appointment_time);
    const timeDiff = (now - appointmentTime) / 60000; // phút

    if (timeDiff < -15) {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể vào phòng tư vấn trước 15 phút'
      });
    }

    if (timeDiff > 30) {
      return res.status(400).json({
        success: false,
        message: 'Đã quá thời gian vào phòng tư vấn'
      });
    }

    consultation.status = 'in_progress';
    consultation.started_at = new Date();
    await consultation.save();

    res.json({
      success: true,
      message: 'Bắt đầu tư vấn thành công',
      data: consultation
    });

  } catch (error) {
    console.error('Error starting consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi bắt đầu tư vấn',
      error: error.message
    });
  }
};

/**
 * ✅ FIX: Hủy tư vấn
 * PUT /api/consultations/:id/cancel
 */
exports.cancelConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const consultation = await models.Consultation.findOne({
      where: {
        id,
        [Op.or]: [
          { patient_id: userId },
          { doctor_id: userId }
        ],
        status: { [Op.in]: ['pending', 'confirmed'] }
      }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn hoặc không thể hủy'
      });
    }

    // Tính % hoàn tiền
    const now = new Date();
    const appointmentTime = new Date(consultation.appointment_time);
    const hoursBeforeAppointment = (appointmentTime - now) / 3600000;

    let refundPercent = 0;
    if (userRole === 'doctor') {
      refundPercent = 100; // Bác sĩ hủy -> hoàn 100%
    } else if (hoursBeforeAppointment >= 24) {
      refundPercent = 100;
    } else if (hoursBeforeAppointment >= 6) {
      refundPercent = 50;
    } else {
      refundPercent = 0;
    }

    consultation.status = 'cancelled';
    consultation.cancelled_at = new Date();
    consultation.cancelled_by = userId;
    consultation.cancellation_reason = reason;
    consultation.refund_percent = refundPercent;
    await consultation.save();

    // ✅ FIX: Tạo thông báo cho người còn lại
    const recipientId = userId === consultation.patient_id 
      ? consultation.doctor_id 
      : consultation.patient_id;

    await models.Notification.create({
      user_id: recipientId,
      type: 'system',
      message: `❌ Buổi tư vấn đã bị hủy. Lý do: ${reason || 'Không có lý do'}`,
      link: `/tu-van/${consultation.id}`,
      is_read: false
    });

    res.json({
      success: true,
      message: 'Hủy tư vấn thành công',
      data: {
        ...consultation.toJSON(),
        refund_amount: Math.round(consultation.total_fee * refundPercent / 100)
      }
    });

  } catch (error) {
    console.error('Error cancelling consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hủy tư vấn',
      error: error.message
    });
  }
};

/**
 * ==================== ADMIN METHODS ====================
 */

/**
 * ✅ FIX: Lấy tất cả tư vấn (Admin)
 * GET /api/consultations/admin/all
 */
exports.getAllConsultations = async (req, res) => {
  try {
    const { status, type, doctor_id, patient_id, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.consultation_type = type;
    if (doctor_id) where.doctor_id = doctor_id;
    if (patient_id) where.patient_id = patient_id;

    const offset = (page - 1) * limit;

    const { count, rows } = await models.Consultation.findAndCountAll({
      where,
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'phone']
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'phone'],
          include: [{
            model: models.Doctor,
            include: [{
              model: models.Specialty,
              as: 'specialty',
              attributes: ['id', 'name']
            }]
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting all consultations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách tư vấn',
      error: error.message
    });
  }
};

/**
 * Thống kê tổng quan hệ thống (Admin)
 * GET /api/consultations/admin/stats
 */
exports.getSystemStats = async (req, res) => {
  try {
    const stats = await models.Consultation.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "completed" THEN 1 END')), 'completed'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "cancelled" THEN 1 END')), 'cancelled'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN payment_status = "paid" THEN total_fee ELSE 0 END')), 'total_revenue'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        stats: stats || {
          total: 0,
          completed: 0,
          cancelled: 0,
          total_revenue: 0,
          avg_rating: 0
        }
      }
    });

  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê hệ thống',
      error: error.message
    });
  }
};

/**
 * ==================== PRICING METHODS ====================
 */

/**
 * Lấy bảng giá tư vấn của bác sĩ
 * GET /api/consultations/pricing/:doctor_id
 */
exports.getDoctorPricing = async (req, res) => {
  try {
    // Bỏ qua doctor_id, lấy tất cả các gói đang hoạt động
    const packages = await models.ConsultationPricing.findAll({
      where: { is_active: true },
      order: [['price', 'ASC']]
    });

    if (!packages || packages.length === 0) {
      // Trả về mảng rỗng với status 200 để Frontend không báo lỗi
      return res.json({ 
        success: true,
        data: [] 
      });
    }
    
    // Trả về data.data (thay vì data) để khớp với code cũ của frontend
    res.json({
      success: true,
      data: packages // Trả về MẢNG các gói
    });

  } catch (error) {
    console.error('Error getting packages (Logic B):', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách gói dịch vụ',
      error: error.message
    });
  }
};

/**
 * Tính phí tư vấn
 * POST /api/consultations/calculate-fee
 */
exports.calculateConsultationFee = async (req, res) => {
  try {
    const { doctor_id, consultation_type } = req.body;

    if (!doctor_id || !consultation_type) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin'
      });
    }

    const pricing = await models.ConsultationPricing.findOne({
      where: { doctor_id }
    });

    let baseFee;
    if (pricing) {
      baseFee = consultation_type === 'chat' ? pricing.chat_fee :
                consultation_type === 'video' ? pricing.video_fee :
                pricing.offline_fee;
    } else {
      baseFee = consultation_type === 'chat' ? 100000 :
                consultation_type === 'video' ? 300000 : 500000;
    }

    const platformFee = Math.round(baseFee * 0.1);
    const totalFee = baseFee + platformFee;

    res.json({
      success: true,
      data: {
        base_fee: baseFee,
        platform_fee: platformFee,
        total_fee: totalFee
      }
    });

  } catch (error) {
    console.error('Error calculating fee:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tính phí',
      error: error.message
    });
  }
};

// Export thêm các methods khác nếu cần...
exports.getDoctorRevenue = async (req, res) => {
  res.json({ success: true, message: 'Feature coming soon' });
};

exports.processRefund = async (req, res) => {
  res.json({ success: true, message: 'Feature coming soon' });
};

exports.updateDoctorPricing = async (req, res) => {
  res.json({ success: true, message: 'Feature coming soon' });
};

exports.bookConsultationForPatient = async (req, res) => {
  res.json({ success: true, message: 'Feature coming soon' });
};

exports.confirmCashPayment = async (req, res) => {
  res.json({ success: true, message: 'Feature coming soon' });
};

exports.searchConsultations = async (req, res) => {
  res.json({ success: true, message: 'Feature coming soon' });
};

exports.exportConsultations = async (req, res) => {
  res.json({ success: true, message: 'Feature coming soon' });
};

/**
 * Lấy danh sách bác sĩ có thể đặt lịch tư vấn
 * GET /api/consultations/chon-bac-si
 */
exports.getAvailableDoctors = async (req, res) => {
  try {
    const { specialty_id, consultation_type } = req.query;

    const where = {};
    if (specialty_id) {
      where.specialty_id = specialty_id;
    }

    const doctors = await models.Doctor.findAll({
      where,
      include: [
        {
          model: models.User,
          as: 'user', // ✅ THÊM ALIAS
          attributes: ['id', 'full_name', 'avatar_url', 'email', 'phone'],
          where: { 
            is_active: true,
            is_verified: true,
            role: 'doctor'
          }
        },
        {
          model: models.Specialty,
          as: 'specialty',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    res.json({
      success: true,
      data: doctors
    });

  } catch (error) {
    console.error('Error getting available doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách bác sĩ',
      error: error.message
    });
  }
};



/**
 * LẤY KHUNG GIỜ KHẢ DỤNG CHO TƯ VẤN
 * GET /api/consultations/available-slots
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctor_id, date, consultation_pricing_id } = req.query;
    
    // ✅ LOG ĐẦU TIÊN - Xem API có được gọi không
    console.log('🔔 [getAvailableSlots] API ĐƯỢC GỌI:', {
      doctor_id,
      date,
      consultation_pricing_id,
      rawQuery: req.query
    });
    if (!doctor_id || !date || !consultation_pricing_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin doctor_id, date, hoặc consultation_pricing_id' 
      });
    }

    // 1. Lấy thông tin gói để biết duration
    const pkg = await models.ConsultationPricing.findByPk(consultation_pricing_id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy gói dịch vụ' });
    }
    const duration_minutes = pkg.duration_minutes || 30; // Lấy duration từ gói

    // 2. Lấy thông tin bác sĩ (cần Doctor.id cho Appointment)
    const doctor = await models.User.findOne({
      where: { id: doctor_id, role: 'doctor' },
      include: [{ model: models.Doctor, attributes: ['id'] }]
    });
    if (!doctor || !doctor.Doctor) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ bác sĩ' });
    }

    const appointmentDate = moment(date).format('YYYY-MM-DD');
    const dayOfWeek = moment(date).day();

    // 3. QUY TẮC 1: Lấy lịch làm việc của bác sĩ (Copy từ createConsultation)
    const doctorSchedules = await models.Schedule.findAll({ 
        where: { 
          [Op.or]: [
            { user_id: doctor_id },    // Lịch cá nhân bác sĩ
            { doctor_id: doctor.Doctor.id }  // Hoặc lịch theo doctor_id
          ],
          date: appointmentDate, 
          status: 'available' 
        }
    });
    const doctorShifts = await models.WorkShiftConfig.findAll({ 
        where: { is_active: true } 
    });
    const sourceShifts = doctorSchedules.length > 0 
        ? doctorSchedules 
        : doctorShifts.filter(s => 
            // SỬA Ở ĐÂY: Kiểm tra cả dạng SỐ và dạng CHUỖI
            s.days_of_week.includes(dayOfWeek) || s.days_of_week.includes(String(dayOfWeek))
          );

    if (sourceShifts.length === 0) {
      // Bác sĩ không làm việc ngày này
      return res.json({ success: true, data: { availableSlots: [] } }); 
    }

    // 4. QUY TẮC 2: Lấy các lịch đã bận
    // 2a. Appointments (khám tại quầy)
    const busyAppointments = await models.Appointment.findAll({
        where: {
            doctor_id: doctor.Doctor.id,
            status: { [Op.notIn]: ['cancelled', 'completed'] },
            appointment_date: appointmentDate,
        },
        attributes: ['appointment_start_time', 'appointment_end_time'],
        raw: true
    });
    // 2b. Consultations (tư vấn)
    const busyConsultations = await models.Consultation.findAll({
        where: {
            doctor_id: doctor_id,
            status: { [Op.notIn]: ['cancelled', 'rejected', 'expired', 'completed'] },
            appointment_time: {
                [Op.between]: [
                    moment(date).startOf('day').toISOString(), 
                    moment(date).endOf('day').toISOString()
                ]
            }
        },
        attributes: ['appointment_time', 'duration_minutes'],
        raw: true
    });

    // 5. Chuyển đổi lịch bận sang phút
    const busySlotsInMinutes = [];
    busyAppointments.forEach(appt => {
        busySlotsInMinutes.push({
            start: timeToMinutes(appt.appointment_start_time),
            end: timeToMinutes(appt.appointment_end_time)
        });
    });
        
    // ✅ THÊM LOG DEBUG Ở ĐÂY
    console.log('🔍 [getAvailableSlots] Busy Slots:', {
        date: date,
        doctorId: doctor.user_id,
        busyAppointmentsCount: busyAppointments.length,
        busyConsultationsCount: busyConsultations.length,
        totalBusySlotsInMinutes: busySlotsInMinutes.length,
        busyAppointments: busyAppointments,
        busyConsultations: busyConsultations,
        busySlotsInMinutes: busySlotsInMinutes
    });

    busyConsultations.forEach(consult => {
        const start = moment(consult.appointment_time);
        const startMinutes = start.hours() * 60 + start.minutes();
        const endMinutes = startMinutes + (consult.duration_minutes || 30);
        busySlotsInMinutes.push({ start: startMinutes, end: endMinutes });
    });
    
    // 6. Tạo ra các slot tiềm năng và kiểm tra
    const availableSlots = [];
    const slotInterval = 30; // Tạo slot mỗi 30 phút

    for (const shift of sourceShifts) {
        const shiftStart = timeToMinutes(shift.start_time);
        const shiftEnd = timeToMinutes(shift.end_time);
        
        for (let slotStartMinutes = shiftStart; slotStartMinutes < shiftEnd; slotStartMinutes += slotInterval) {
            const slotEndMinutes = slotStartMinutes + duration_minutes;

            // Slot phải nằm trọn trong ca làm việc
            if (slotEndMinutes > shiftEnd) continue;

            // Kiểm tra xung đột với lịch bận
            const isBusy = busySlotsInMinutes.some(busy => {
                // (StartA < EndB) AND (EndA > StartB)
                return (slotStartMinutes < busy.end) && (slotEndMinutes > busy.start);
            });

            const timeStr = `${String(Math.floor(slotStartMinutes / 60)).padStart(2, '0')}:${String(slotStartMinutes % 60).padStart(2, '0')}`;
            
            availableSlots.push({
                time: timeStr,
                isBusy: isBusy
            });
        }
    }

    // Lọc ra các slot trùng lặp (nếu có 2 ca) và sắp xếp
    const uniqueSlots = Array.from(new Map(availableSlots.map(slot => [slot.time, slot])).values())
                            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    res.json({
        success: true,
        data: { availableSlots: uniqueSlots }
    });

  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy khung giờ',
      error: error.message
    });
  }
};

/**
 * MỚI: Bệnh nhân/Bác sĩ gửi Báo cáo Vấn đề
 * POST /api/consultations/:id/report
 */
exports.createConsultationReport = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id: consultation_id } = req.params;
    const { report_type, description } = req.body;
    const reporter_id = req.user.id;

    if (!report_type || !description) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn loại sự cố và mô tả chi tiết' });
    }

    // 1. Lưu báo cáo vào DB
    const newReport = await models.ConsultationReport.create({
      consultation_id,
      reporter_id,
      report_type,
      description,
      status: 'pending'
    }, { transaction });

    // 2. Lấy thông tin chi tiết để gửi qua WebSocket
    const reportDetails = await models.ConsultationReport.findByPk(newReport.id, {
      include: [
        { 
          model: models.Consultation, 
          as: 'consultation',
          attributes: ['id', 'consultation_code'],
          include: [
            { model: models.User, as: 'patient', attributes: ['id'] },
            { model: models.User, as: 'doctor', attributes: ['id'] }
          ]
        },
        { model: models.User, as: 'reporter', attributes: ['id', 'full_name'] }
      ],
      transaction
    });

    // 3. Gửi thông báo Real-time (WebSocket) và Fallback (Notification)
    const admins = await models.User.findAll({
      where: { role: 'admin', is_active: true },
      attributes: ['id'],
      transaction
    });

    const notificationMessage = `Sự cố ${report_type} tại phiên ${reportDetails.consultation.consultation_code}`;

    for (const admin of admins) {
      // 3a. Gửi WebSocket (Real-time)
      if (global.wsSendToUser) {
        global.wsSendToUser(admin.id, {
          type: 'new_incident', // Event mới
          payload: reportDetails 
        });
      }

      // 3b. Gửi Notification (Fallback)
      await models.Notification.create({
        user_id: admin.id,
        type: 'system', // Hoặc 'other'
        message: notificationMessage, // Trường bắt buộc
        link: '/admin/tu-van/realtime?tab=monitor'
      }, { transaction });
    }

    await transaction.commit();
    res.status(201).json({ success: true, message: 'Gửi báo cáo thành công' });

  } catch (error) {
    await transaction.rollback();
    console.error('Error creating consultation report:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi báo cáo',
      error: error.message
    });
  }
};

/**
 * MỚI: Gửi lại OTP cho phòng chat
 * POST /api/consultations/:id/resend-otp
 */
exports.resendConsultationOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const consultation = await models.Consultation.findOne({
      where: { id },
      include: [
        { model: models.User, as: 'patient', attributes: ['id', 'full_name', 'email'] },
        { model: models.User, as: 'doctor', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy buổi tư vấn' });
    }

    // Kiểm tra quyền (chỉ admin, bệnh nhân, hoặc bác sĩ của ca này)
    if (req.user.role !== 'admin' && 
        consultation.patient_id !== userId && 
        consultation.doctor_id !== userId) {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    // Chỉ áp dụng cho 'chat' và 'confirmed'
    if (consultation.consultation_type !== 'chat') {
      return res.status(400).json({ success: false, message: 'Chỉ áp dụng cho tư vấn Chat' });
    }
    if (consultation.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể gửi lại OTP cho lịch đã xác nhận' });
    }

    // 1. Tạo OTP mới
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); // Hết hạn sau 10 phút

    // 2. Cập nhật CSDL
    await consultation.update({ 
      chat_otp: otp, 
      otp_expires_at: expiry,
      reminder_sent: true // Đánh dấu là đã gửi (để cron job không gửi đè)
    });

    const chatLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/tu-van/${consultation.id}/chat`;
    const appointmentTime = new Date(consultation.appointment_time).toLocaleString('vi-VN');

    // 3. Gửi Email cho Bệnh nhân
    await emailSender.sendEmail({
        to: consultation.patient.email,
        subject: `[Gửi lại] Mã OTP tư vấn: ${otp}`,
        template: 'chat_reminder_otp',
        data: {
            patientName: consultation.patient.full_name,
            doctorName: consultation.doctor.full_name,
            appointmentTime: appointmentTime,
            chatLink: chatLink,
            otp: otp
        }
    });

    // 4. Gửi Email cho BÁC SĨ
    await emailSender.sendEmail({
        to: consultation.doctor.email,
        subject: `[Gửi lại] Mã OTP tư vấn: ${otp}`,
        template: 'chat_reminder_otp',
        data: {
            patientName: `Bác sĩ ${consultation.doctor.full_name}`, 
            doctorName: consultation.patient.full_name, 
            appointmentTime: appointmentTime,
            chatLink: chatLink,
            otp: otp
        }
    });

    res.json({ success: true, message: 'Đã gửi lại OTP thành công' });

  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi lại OTP',
      error: error.message
    });
  }
};

/**
 * MỚI: Bệnh nhân xác thực OTP để vào phòng Video
 * POST /api/consultations/:id/verify-video-otp
 */
exports.verifyVideoOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const patient_id = req.user.id;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập OTP' });
    }

    const consultation = await models.Consultation.findOne({
      where: {
        id: id,
        patient_id: patient_id
      }
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy buổi tư vấn' });
    }
    
    // Kiểm tra OTP
    if (consultation.video_otp !== otp) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
    }
    
    // SỬA LOGIC: Kiểm tra OTP có hiệu lực trong suốt thời gian hẹn
    
    // 1. Lấy thời gian hiện tại
    const now = moment();
    
    // 2. Lấy thời lượng của gói (từ Model Consultation), fallback 30 phút
    // (Model Consultation.js đã định nghĩa 'duration_minutes')
    const duration = consultation.duration_minutes || 30;
    
    // 3. Tính thời điểm KẾT THÚC của phiên hẹn
    const sessionEndTime = moment(consultation.appointment_time).add(duration, 'minutes');

    // 4. So sánh
    // Nếu thời gian hiện tại đã TRỄ HƠN thời gian kết thúc phiên
    if (now.isAfter(sessionEndTime)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phiên tư vấn này đã kết thúc' // Thông báo chính xác hơn
      });
    }
    
    // Nếu logic này được chạy, nghĩa là OTP vẫn còn trong thời gian hợp lệ của phiên
    // (Chúng ta không cần kiểm tra video_otp_expires_at nữa)

    // Xác thực thành công
    res.status(200).json({
      success: true,
      message: 'Xác thực OTP thành công'
    });

  } catch (error) {
    console.error('Error verifying video OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xác thực OTP',
      error: error.message
    });
  }
};

/**
 * MỚI: Gửi lại OTP cho phòng VIDEO
 * POST /api/consultations/:id/resend-video-otp
 */
exports.resendVideoOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Chỉ bệnh nhân mới có thể yêu cầu

    const consultation = await models.Consultation.findOne({
      where: { 
        id,
        patient_id: userId
      },
      include: [
        { model: models.User, as: 'patient', attributes: ['id', 'full_name', 'email'] },
        { model: models.User, as: 'doctor', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy buổi tư vấn' });
    }

    // Chỉ áp dụng cho 'video' và 'confirmed'/'in_progress'
    if (consultation.consultation_type !== 'video') {
      return res.status(400).json({ success: false, message: 'Chỉ áp dụng cho tư vấn Video' });
    }
    if (!['confirmed', 'in_progress'].includes(consultation.status)) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể gửi lại OTP cho lịch đã xác nhận hoặc đang diễn ra' });
    }

    // 1. Tạo OTP mới
    const videoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); // Hết hạn sau 10 phút

    // 2. Cập nhật CSDL
    await consultation.update({ 
      video_otp: videoOtp, 
      video_otp_expires_at: expiry,
      reminder_sent: true 
    });

    const videoLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/tu-van/video/${consultation.id}`;
    const appointmentTime = new Date(consultation.appointment_time).toLocaleString('vi-VN');

    // 3. Gửi Email cho Bệnh nhân
    await emailSender.sendEmail({
        to: consultation.patient.email,
        subject: `[Gửi lại] Mã OTP Video Call: ${videoOtp}`,
        template: 'video_reminder', // Dùng template video đã tạo
        data: {
            patientName: consultation.patient.full_name,
            doctorName: consultation.doctor.full_name,
            appointmentTime: appointmentTime,
            videoLink: videoLink,
            otp: videoOtp
        }
    });

    // 4. (Tùy chọn) Gửi Email cho BÁC SĨ (để họ cũng biết mã)
    await emailSender.sendEmail({
        to: consultation.doctor.email,
        subject: `[Gửi lại] Mã OTP Video Call: ${videoOtp}`,
        template: 'video_reminder',
        data: {
            patientName: `Bác sĩ ${consultation.doctor.full_name}`, 
            doctorName: consultation.patient.full_name, 
            appointmentTime: appointmentTime,
            videoLink: videoLink,
            otp: videoOtp
        }
    });

    res.json({ success: true, message: 'Đã gửi lại OTP thành công' });

  } catch (error) {
    console.error('Error resending Video OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi lại OTP',
      error: error.message
    });
  }
};

/**
 * MỚI: Staff lấy danh sách tư vấn của bác sĩ được phân công
 * GET /api/consultations/staff/managed
 */
exports.getStaffManagedConsultations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type, page = 1, limit = 20 } = req.query;
    
    // 1. Lấy Staff profile
    const staffProfile = await models.Staff.findOne({ 
      where: { user_id: userId } 
    });
    
    if (!staffProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy hồ sơ nhân viên' 
      });
    }
    
    // 2. Lấy danh sách doctor user_id được phân công
    const managedDoctorIds = staffProfile.managed_doctors?.doctor_ids || [];
    
    if (managedDoctorIds.length === 0) {
      return res.status(200).json({ 
        success: true, 
        data: [],
        message: 'Bạn chưa được phân công quản lý bác sĩ nào.'
      });
    }
    
    // 3. Query consultations
    const where = {
      doctor_id: { [Op.in]: managedDoctorIds }
    };
    
    if (status && status !== 'all') where.status = status;
    if (type && type !== 'all') where.consultation_type = type;
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await models.Consultation.findAndCountAll({
      where,
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'avatar_url', 'phone']
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'avatar_url'],
          include: [{
            model: models.Doctor,
            include: [{
              model: models.Specialty,
              as: 'specialty',
              attributes: ['id', 'name']
            }]
          }]
        },
        {
          model: models.ConsultationPricing,
          as: 'package',
          attributes: ['package_name', 'duration_minutes', 'price']
        }
      ],
      order: [['appointment_time', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: rows,
      managedDoctorIds,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('Error in getStaffManagedConsultations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách tư vấn',
      error: error.message
    });
  }
};
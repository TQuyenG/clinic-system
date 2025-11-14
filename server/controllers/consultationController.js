// server/controllers/consultationController.js
// ✅ FIXED VERSION - Sửa tất cả lỗi

const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');

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
      consultation_type, 
      appointment_time,
      chief_complaint,
      medical_history 
    } = req.body;

    const patient_id = req.user.id;

    // Validate
    if (!doctor_id || !consultation_type || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // Kiểm tra bác sĩ có tồn tại
    const doctor = await models.Doctor.findOne({
      where: { user_id: doctor_id }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bác sĩ'
      });
    }

    // Tính phí
    const baseFee = consultation_type === 'chat' ? 100000 : 
                    consultation_type === 'video' ? 300000 : 500000;
    const platformFee = Math.round(baseFee * 0.1); // 10% platform fee
    const totalFee = baseFee + platformFee;

    // Tạo mã tư vấn
    const consultationCode = `CS${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Tạo consultation
    const consultation = await models.Consultation.create({
      consultation_code: consultationCode,
      patient_id,
      doctor_id,
      consultation_type,
      appointment_time,
      chief_complaint: chief_complaint || null,
      medical_history: medical_history || null,
      status: 'pending',
      base_fee: baseFee,
      platform_fee: platformFee,
      total_fee: totalFee,
      payment_status: 'pending'
    });

    // ✅ FIX: Tạo thông báo cho bác sĩ với đúng type
    await models.Notification.create({
      user_id: doctor_id,
      type: 'appointment', // ✅ ĐỔI 'consultation' → 'appointment'
      message: '🔔 Bạn có lịch tư vấn mới cần xác nhận',
      link: `/bac-si/tu-van`,
      is_read: false
    });

    res.status(201).json({
      success: true,
      message: 'Đặt lịch tư vấn thành công',
      data: consultation
    });

  } catch (error) {
    console.error('Error creating consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo lịch tư vấn',
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
    if (status) where.status = status;
    if (type) where.consultation_type = type;

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
    if (status) where.status = status;
    if (type) where.consultation_type = type;
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

    const consultation = await models.Consultation.findByPk(id, {
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
              attributes: ['id', 'name']
            }]
          }]
        }
      ]
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

    if (timeDiff > 10) {
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
    const { doctor_id } = req.params;

    const pricing = await models.ConsultationPricing.findOne({
      where: { doctor_id }
    });

    if (!pricing) {
      // Trả về giá mặc định
      return res.json({
        success: true,
        data: {
          chat_fee: 100000,
          video_fee: 300000,
          offline_fee: 500000
        }
      });
    }

    res.json({
      success: true,
      data: pricing
    });

  } catch (error) {
    console.error('Error getting doctor pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy bảng giá',
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
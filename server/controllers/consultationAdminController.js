// server/controllers/consultationAdminController.js
// ✅ Controller xử lý các chức năng quản lý tư vấn cho Admin

const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');
const momoService = require('../utils/momoService');
const vnpayService = require('../utils/vnpayService');

// ==================== 1. DANH SÁCH TƯ VẤN REALTIME ====================

/**
 * Lấy danh sách tất cả tư vấn (Admin) với filters nâng cao
 * GET /api/consultations/admin/realtime/all
 */
exports.getAllConsultationsRealtime = async (req, res) => {
  try {
    const {
      status,
      type,
      doctor_id,
      patient_id,
      specialty_id,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      order = 'DESC'
    } = req.query;

    const whereClause = {};
    
    // Filters
    if (status && status !== 'all') whereClause.status = status;
    if (type && type !== 'all') whereClause.consultation_type = type;
    if (doctor_id) whereClause.doctor_id = doctor_id;
    if (patient_id) whereClause.patient_id = patient_id;
    
    // Date range
    if (date_from || date_to) {
      whereClause.appointment_time = {};
      if (date_from) whereClause.appointment_time[Op.gte] = new Date(date_from);
      if (date_to) whereClause.appointment_time[Op.lte] = new Date(date_to);
    }
    
    // Search
    if (search) {
      whereClause[Op.or] = [
        { consultation_code: { [Op.like]: `%${search}%` } },
        { chief_complaint: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: consultations } = await models.Consultation.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'phone', 'email', 'avatar_url'],
          include: [
            {
              model: models.Patient,
              attributes: ['id', 'code']
            }
          ]
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'phone', 'email', 'avatar_url'],
          include: [
            {
              model: models.Doctor,
              attributes: ['id', 'code', 'specialty_id'],
              include: [
                {
                  model: models.Specialty,
                  attributes: ['id', 'name', 'slug']
                }
              ]
            }
          ]
        },
        {
        model: models.ConsultationPricing,
        as: 'pricing', // ← THÊM DÒNG NÀY
        attributes: ['id', 'chat_fee', 'video_fee', 'offline_fee'],
        required: false // ← THÊM DÒNG NÀY
        }
      ],
      order: [[sort_by, order]],
      limit: parseInt(limit),
      offset: offset
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách tư vấn thành công',
      data: {
        consultations,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error in getAllConsultationsRealtime:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách tư vấn',
      error: error.message
    });
  }
};

// ==================== 2. GIÁM SÁT PHIÊN REALTIME ====================

/**
 * Lấy danh sách phiên đang hoạt động
 * GET /api/consultations/admin/realtime/active
 */
exports.getActiveConsultations = async (req, res) => {
  try {
    const activeConsultations = await models.Consultation.findAll({
      where: {
        status: 'in_progress'
      },
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'avatar_url']
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'avatar_url'],
          include: [
            {
              model: models.Doctor,
              attributes: ['specialty_id'],
              include: [
                {
                  model: models.Specialty,
                  attributes: ['name']
                }
              ]
            }
          ]
        },
        {
          model: models.ChatMessage,
          as: 'messages',
          attributes: ['id', 'message_type', 'created_at'],
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ],
      order: [['started_at', 'ASC']]
    });

    // Tính thời gian còn lại cho mỗi phiên
    const consultationsWithTimeLeft = activeConsultations.map(consultation => {
      const now = new Date();
      const startedAt = new Date(consultation.started_at);
      const duration = consultation.duration || 30; // phút
      const endTime = new Date(startedAt.getTime() + duration * 60000);
      const timeLeft = Math.max(0, Math.floor((endTime - now) / 60000)); // phút

      return {
        ...consultation.toJSON(),
        time_left_minutes: timeLeft,
        is_overtime: timeLeft === 0
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách phiên hoạt động thành công',
      data: {
        active_consultations: consultationsWithTimeLeft,
        total: consultationsWithTimeLeft.length
      }
    });

  } catch (error) {
    console.error('Error in getActiveConsultations:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phiên hoạt động',
      error: error.message
    });
  }
};

/**
 * Xem nội dung chat của một phiên (read-only)
 * GET /api/consultations/admin/realtime/:id/messages
 */
exports.getConsultationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const consultation = await models.Consultation.findByPk(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: messages } = await models.ChatMessage.findAndCountAll({
      where: {
        consultation_id: id,
        is_deleted: false
      },
      include: [
        {
          model: models.User,
          as: 'sender',
          attributes: ['id', 'full_name', 'avatar_url']
        }
      ],
      order: [['created_at', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy tin nhắn thành công',
      data: {
        messages,
        consultation: {
          id: consultation.id,
          code: consultation.consultation_code,
          status: consultation.status
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error in getConsultationMessages:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tin nhắn',
      error: error.message
    });
  }
};

/**
 * Gửi tin nhắn hệ thống vào phiên tư vấn
 * POST /api/consultations/admin/realtime/:id/system-message
 */
exports.sendSystemMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, type = 'warning' } = req.body;
    const adminId = req.user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập nội dung tin nhắn'
      });
    }

    const consultation = await models.Consultation.findByPk(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Tạo system message
    const systemMessage = await models.ChatMessage.createSystemMessage(
      id,
      message,
      {
        sent_by_admin: adminId,
        message_type: type
      }
    );

    // Broadcast qua WebSocket
    if (global.wsBroadcastToConsultation) {
      global.wsBroadcastToConsultation(id, {
        type: 'system_message',
        payload: systemMessage
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Gửi tin nhắn hệ thống thành công',
      data: systemMessage
    });

  } catch (error) {
    console.error('Error in sendSystemMessage:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi tin nhắn hệ thống',
      error: error.message
    });
  }
};

/**
 * Kết thúc phiên thủ công (emergency)
 * PUT /api/consultations/admin/realtime/:id/force-end
 */
exports.forceEndConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    const consultation = await models.Consultation.findByPk(id);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    if (consultation.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể kết thúc phiên đang hoạt động'
      });
    }

    // Cập nhật trạng thái
    consultation.status = 'completed';
    consultation.ended_at = new Date();
    consultation.metadata = {
      ...consultation.metadata,
      force_ended_by_admin: adminId,
      force_end_reason: reason,
      force_ended_at: new Date()
    };
    await consultation.save();

    // Gửi thông báo
    await models.ChatMessage.createSystemMessage(
      id,
      `Buổi tư vấn đã được kết thúc bởi quản trị viên. Lý do: ${reason || 'Không rõ'}`,
      { admin_action: true }
    );

    // Thông báo qua WebSocket
    if (global.wsBroadcastToConsultation) {
      global.wsBroadcastToConsultation(id, {
        type: 'consultation_ended',
        payload: { 
          ended_by: 'admin',
          reason 
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Kết thúc phiên tư vấn thành công',
      data: consultation
    });

  } catch (error) {
    console.error('Error in forceEndConsultation:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi kết thúc phiên tư vấn',
      error: error.message
    });
  }
};

// ==================== 3. QUẢN LÝ GÓI DỊCH VỤ ====================

/**
 * Lấy danh sách gói dịch vụ của tất cả bác sĩ
 * GET /api/consultations/admin/packages
 */
exports.getAllPackages = async (req, res) => {
  try {
    const { 
      is_active, 
      allow_chat, 
      allow_video,
      page = 1,
      limit = 20
    } = req.query;

    const whereClause = {};
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';
    if (allow_chat !== undefined) whereClause.allow_chat = allow_chat === 'true';
    if (allow_video !== undefined) whereClause.allow_video = allow_video === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: packages } = await models.ConsultationPricing.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'avatar_url'],
          include: [
            {
              model: models.Doctor,
              attributes: ['id', 'specialty_id', 'experience_years'],
              include: [
                {
                  model: models.Specialty,
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách gói dịch vụ thành công',
      data: {
        packages,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error in getAllPackages:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách gói dịch vụ',
      error: error.message
    });
  }
};

/**
 * Cập nhật gói dịch vụ của bác sĩ (Admin)
 * PUT /api/consultations/admin/packages/:doctorId
 */
exports.updateDoctorPackage = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const updateData = req.body;

    let pricing = await models.ConsultationPricing.findOne({
      where: { doctor_id: doctorId }
    });

    if (!pricing) {
      // Tạo mới nếu chưa có
      pricing = await models.ConsultationPricing.create({
        doctor_id: doctorId,
        ...updateData
      });
    } else {
      // Cập nhật
      await pricing.update(updateData);
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật gói dịch vụ thành công',
      data: pricing
    });

  } catch (error) {
    console.error('Error in updateDoctorPackage:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật gói dịch vụ',
      error: error.message
    });
  }
};

// ==================== 4. QUẢN LÝ HOÀN TIỀN ====================

/**
 * Lấy danh sách giao dịch cần hoàn tiền
 * GET /api/consultations/admin/refunds
 */
exports.getRefundList = async (req, res) => {
  try {
    const {
      status = 'pending',
      payment_method,
      date_from,
      date_to,
      page = 1,
      limit = 20
    } = req.query;

    const whereClause = {
      status: 'cancelled'
    };

    // Chỉ lấy những consultation đã thanh toán và cần hoàn tiền
    const consultations = await models.Consultation.findAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'phone', 'email']
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name']
        },
        {
        model: models.Payment,
        as: 'payments', // ← THÊM DÒNG NÀY
        where: {
            status: status === 'refunded' ? 'refunded' : ['paid', 'refunded']
        },
        required: true
        }
      ],
      order: [['cancelled_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách hoàn tiền thành công',
      data: {
        refunds: consultations
      }
    });

  } catch (error) {
    console.error('Error in getRefundList:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách hoàn tiền',
      error: error.message
    });
  }
};

/**
 * Xử lý hoàn tiền (Admin)
 * POST /api/consultations/admin/refunds/:id/process
 */
exports.processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { refund_amount, refund_reason } = req.body;
    const adminId = req.user.id;

    const consultation = await models.Consultation.findByPk(id, {
      include: [
        {
          model: models.Payment,
          where: { status: 'paid' },
          required: true
        }
      ]
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn hoặc chưa thanh toán'
      });
    }

    const payment = consultation.Payment;
    
    // Xác định số tiền hoàn
    const amountToRefund = refund_amount || payment.amount;

    let refundResult;

    // Gọi API hoàn tiền theo phương thức thanh toán
    if (payment.method === 'momo') {
      refundResult = await momoService.createRefund({
        orderId: payment.code,
        transId: payment.transaction_id,
        amount: amountToRefund,
        description: refund_reason || 'Hoàn tiền tư vấn'
      });
    } else if (payment.method === 'vnpay') {
      refundResult = await vnpayService.createRefund({
        orderId: payment.code,
        transactionNo: payment.transaction_id,
        amount: amountToRefund,
        refundAmount: amountToRefund,
        transactionType: '02', // Hoàn toàn bộ
        user: req.user.username || 'admin'
      });
    } else {
      // Thanh toán tiền mặt - chỉ cập nhật trạng thái
      refundResult = { success: true };
    }

    if (refundResult.success) {
      // Cập nhật trạng thái payment
      payment.status = 'refunded';
      payment.metadata = {
        ...payment.metadata,
        refund_amount: amountToRefund,
        refund_reason,
        refunded_by: adminId,
        refunded_at: new Date(),
        refund_result: refundResult
      };
      await payment.save();

      // Cập nhật consultation
      consultation.metadata = {
        ...consultation.metadata,
        refund_processed: true,
        refund_amount: amountToRefund
      };
      await consultation.save();

      // Tạo thông báo cho bệnh nhân
      await models.Notification.create({
        user_id: consultation.patient_id,
        type: 'payment',
        title: '💰 Hoàn tiền thành công',
        content: `Đã hoàn ${amountToRefund.toLocaleString()}đ cho buổi tư vấn ${consultation.consultation_code}`,
        related_id: consultation.id,
        related_type: 'consultation',
        priority: 'high'
      });

      return res.status(200).json({
        success: true,
        message: 'Hoàn tiền thành công',
        data: {
          consultation,
          payment,
          refund_amount: amountToRefund
        }
      });
    } else {
      throw new Error(refundResult.message || 'Hoàn tiền thất bại');
    }

  } catch (error) {
    console.error('Error in processRefund:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xử lý hoàn tiền',
      error: error.message
    });
  }
};

// ==================== 5. QUẢN LÝ PHẢN HỒI & ĐÁNH GIÁ ====================

/**
 * Lấy danh sách đánh giá
 * GET /api/consultations/admin/feedbacks
 */
exports.getAllFeedbacks = async (req, res) => {
  try {
    const {
      doctor_id,
      rating,
      status = 'all',
      page = 1,
      limit = 20
    } = req.query;

    const whereClause = {};
    if (doctor_id) whereClause.doctor_id = doctor_id;
    if (rating) whereClause.rating = parseInt(rating);
    if (status !== 'all') whereClause.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: feedbacks } = await models.ConsultationFeedback.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'avatar_url']
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name', 'avatar_url'],
          include: [
            {
              model: models.Doctor,
              attributes: ['specialty_id'],
              include: [
                {
                  model: models.Specialty,
                  attributes: ['name']
                }
              ]
            }
          ]
        },
        {
          model: models.Consultation,
          attributes: ['id', 'consultation_code', 'consultation_type']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đánh giá thành công',
      data: {
        feedbacks,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error in getAllFeedbacks:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá',
      error: error.message
    });
  }
};

/**
 * Ẩn/hiện đánh giá
 * PUT /api/consultations/admin/feedbacks/:id/toggle-status
 */
exports.toggleFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    const adminId = req.user.id;

    const feedback = await models.ConsultationFeedback.findByPk(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    feedback.status = status;
    feedback.admin_note = admin_note;
    feedback.reviewed_by = adminId;
    feedback.reviewed_at = new Date();
    await feedback.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái đánh giá thành công',
      data: feedback
    });

  } catch (error) {
    console.error('Error in toggleFeedbackStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái đánh giá',
      error: error.message
    });
  }
};

// ==================== 6. BÁO CÁO & THỐNG KÊ ====================

/**
 * Thống kê tổng quan hệ thống
 * GET /api/consultations/admin/statistics/overview
 */
exports.getSystemStatistics = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    const whereClause = {};
    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at[Op.gte] = new Date(date_from);
      if (date_to) whereClause.created_at[Op.lte] = new Date(date_to);
    }

    // Tổng số tư vấn
    const totalConsultations = await models.Consultation.count({ where: whereClause });

    // Theo trạng thái
    const byStatus = await models.Consultation.findAll({
      where: whereClause,
      attributes: [
        'status',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Theo loại
    const byType = await models.Consultation.findAll({
      where: whereClause,
      attributes: [
        'consultation_type',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['consultation_type'],
      raw: true
    });

    // Doanh thu
    const revenue = await models.Payment.sum('amount', {
      where: {
        status: 'paid',
        ...whereClause
      }
    });

    // Tỷ lệ hoàn tiền
    const totalRefunded = await models.Payment.count({
      where: {
        status: 'refunded',
        ...whereClause
      }
    });
    
    const totalPaid = await models.Payment.count({
      where: {
        status: ['paid', 'refunded'],
        ...whereClause
      }
    });

    const refundRate = totalPaid > 0 ? ((totalRefunded / totalPaid) * 100).toFixed(2) : 0;

    // Đánh giá trung bình
    const avgRating = await models.ConsultationFeedback.findOne({
      where: whereClause,
      attributes: [
        [models.sequelize.fn('AVG', models.sequelize.col('rating')), 'avg_rating'],
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'total_reviews']
      ],
      raw: true
    });

    // Gói được đặt nhiều nhất
    const topPackage = await models.Consultation.findAll({
      where: whereClause,
      attributes: [
        'consultation_type',
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: ['consultation_type'],
      order: [[models.sequelize.literal('count'), 'DESC']],
      limit: 1,
      raw: true
    });

    // Thời gian cao điểm
    const peakHours = await models.Consultation.findAll({
      where: whereClause,
      attributes: [
        [models.sequelize.fn('HOUR', models.sequelize.col('appointment_time')), 'hour'],
        [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
      ],
      group: [models.sequelize.fn('HOUR', models.sequelize.col('appointment_time'))],
      order: [[models.sequelize.literal('count'), 'DESC']],
      limit: 3,
      raw: true
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy thống kê thành công',
      data: {
        total_consultations: totalConsultations,
        by_status: byStatus,
        by_type: byType,
        total_revenue: revenue || 0,
        refund_rate: parseFloat(refundRate),
        avg_rating: parseFloat(avgRating?.avg_rating || 0).toFixed(1),
        total_reviews: avgRating?.total_reviews || 0,
        top_package: topPackage[0] || null,
        peak_hours: peakHours
      }
    });

  } catch (error) {
    console.error('Error in getSystemStatistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
    });
  }
};

/**
 * Thống kê theo bác sĩ
 * GET /api/consultations/admin/statistics/by-doctor
 */
exports.getDoctorStatistics = async (req, res) => {
  try {
    const { date_from, date_to, page = 1, limit = 10 } = req.query;

    const whereClause = {};
    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at[Op.gte] = new Date(date_from);
      if (date_to) whereClause.created_at[Op.lte] = new Date(date_to);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await models.User.findAll({
      where: { role: 'doctor' },
      attributes: ['id', 'full_name', 'avatar_url'],
      include: [
        {
          model: models.Doctor,
          attributes: ['specialty_id'],
          include: [
            {
              model: models.Specialty,
              attributes: ['name']
            }
          ]
        },
        {
          model: models.Consultation,
          as: 'doctor_consultations',
          where: whereClause,
          required: false,
          attributes: []
        }
      ],
      group: ['User.id'],
      subQuery: false,
      limit: parseInt(limit),
      offset: offset
    });

    // Lấy thống kê chi tiết cho từng bác sĩ
    const doctorStats = await Promise.all(
      doctors.map(async (doctor) => {
        const [consultations, feedbackStats] = await Promise.all([
          models.Consultation.findAll({
            where: {
              doctor_id: doctor.id,
              ...whereClause
            },
            attributes: [
              'status',
              [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
          }),
          models.ConsultationFeedback.getDoctorStats(doctor.id)
        ]);

        const totalConsultations = consultations.reduce((sum, item) => sum + parseInt(item.count), 0);
        const completed = consultations.find(c => c.status === 'completed')?.count || 0;
        const cancelled = consultations.find(c => c.status === 'cancelled')?.count || 0;

        return {
          doctor: doctor.toJSON(),
          total_consultations: totalConsultations,
          completed: parseInt(completed),
          cancelled: parseInt(cancelled),
          completion_rate: totalConsultations > 0 ? ((completed / totalConsultations) * 100).toFixed(2) : 0,
          avg_rating: parseFloat(feedbackStats.avg_rating || 0).toFixed(1),
          total_reviews: feedbackStats.total_reviews || 0
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy thống kê bác sĩ thành công',
      data: {
        doctors: doctorStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error in getDoctorStatistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê bác sĩ',
      error: error.message
    });
  }
};

/**
 * Thống kê theo bệnh nhân
 * GET /api/consultations/admin/statistics/by-patient
 */
exports.getPatientStatistics = async (req, res) => {
  try {
    const { date_from, date_to, page = 1, limit = 10 } = req.query;

    const whereClause = {};
    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at[Op.gte] = new Date(date_from);
      if (date_to) whereClause.created_at[Op.lte] = new Date(date_to);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const patients = await models.Consultation.findAll({
      where: whereClause,
      attributes: [
        'patient_id',
        [models.sequelize.fn('COUNT', models.sequelize.col('Consultation.id')), 'total_consultations'],
        [models.sequelize.fn('SUM', models.sequelize.col('fee')), 'total_spent']
      ],
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'phone', 'email']
        }
      ],
      group: ['patient_id'],
      order: [[models.sequelize.literal('total_consultations'), 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      subQuery: false
    });

    // Lấy gói phổ biến của mỗi bệnh nhân
    const patientStats = await Promise.all(
      patients.map(async (patient) => {
        const mostUsedPackage = await models.Consultation.findOne({
          where: {
            patient_id: patient.patient_id,
            ...whereClause
          },
          attributes: [
            'consultation_type',
            [models.sequelize.fn('COUNT', models.sequelize.col('id')), 'count']
          ],
          group: ['consultation_type'],
          order: [[models.sequelize.literal('count'), 'DESC']],
          limit: 1,
          raw: true
        });

        return {
          ...patient.toJSON(),
          most_used_package: mostUsedPackage?.consultation_type || 'N/A'
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy thống kê bệnh nhân thành công',
      data: {
        patients: patientStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error in getPatientStatistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê bệnh nhân',
      error: error.message
    });
  }
};

// ==================== 7. EXPORT DỮ LIỆU ====================

/**
 * Export danh sách tư vấn ra Excel
 * GET /api/consultations/admin/export
 */
exports.exportConsultations = async (req, res) => {
  try {
    // TODO: Implement export to Excel using xlsx library
    // Tạm thời trả về JSON

    const consultations = await models.Consultation.findAll({
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['full_name', 'phone', 'email']
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['full_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      message: 'Export dữ liệu thành công',
      data: consultations
    });

  } catch (error) {
    console.error('Error in exportConsultations:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi export dữ liệu',
      error: error.message
    });
  }
};
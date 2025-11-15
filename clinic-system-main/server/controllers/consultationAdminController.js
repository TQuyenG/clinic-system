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
    // ✅ SỬA: Chuyển đổi giá trị query params
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (type && type !== 'all') {
      // ✅ SỬA: Mapping từ UI sang DB
      const typeMapping = {
        'video': 'video',
        'chat': 'chat',
        'offline': 'offline'
      };
      whereClause.consultation_type = typeMapping[type] || type;
    }
    if (doctor_id) whereClause.doctor_id = parseInt(doctor_id);
    if (patient_id) whereClause.patient_id = parseInt(patient_id);
        
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
                  as: 'specialty',
                  attributes: ['id', 'name', 'slug']
                }
              ]
            }
          ]
        },
        {
        model: models.ConsultationPricing,
        as: 'package', // ← SỬA ALIAS
        // SỬA LẠI CÁC CỘT CHO ĐÚNG VỚI MODEL ConsultationPricing.js
        attributes: ['id', 'package_name', 'package_type', 'duration_minutes', 'price'], 
        required: false 
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

    const consultation = await models.Consultation.findOne({
      where: { consultation_code: id }
    });

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

    const consultation = await models.Consultation.findOne({
      where: { consultation_code: id }
    });

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

    const consultation = await models.Consultation.findOne({
      where: { consultation_code: id }
    });

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
/**
 * Lấy danh sách gói dịch vụ (Logic B)
 * GET /api/consultations/admin/packages
 */
exports.getAllPackages = async (req, res) => {
  try {
    const { 
      is_active, 
      package_type,
      search,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      order = 'DESC'
    } = req.query;

    const whereClause = {};
    if (is_active !== undefined) whereClause.is_active = is_active === 'true';
    if (package_type && package_type !== 'all') whereClause.package_type = package_type;
    
    if (search) {
      whereClause[Op.or] = [
        { package_name: { [Op.like]: `%${search}%` } },
        { package_code: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: packages } = await models.ConsultationPricing.findAndCountAll({
      where: whereClause,
      // Đã xóa include: [ models.User ] vì không còn doctor_id
      order: [[sort_by, order]],
      limit: parseInt(limit),
      offset: offset,
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
    console.error('Error in getAllPackages (Logic B):', error);
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

/**
 * Tạo gói dịch vụ mới (Admin)
 * POST /api/consultations/admin/packages
 */
exports.createPackage = async (req, res) => {
  try {
    const {
      package_name,
      description,
      package_type, // <-- MỚI
      duration_minutes, // <-- MỚI
      price, // <-- MỚI
      notes,
      is_active = true
    } = req.body;

    // Validation
    if (!package_name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên gói dịch vụ'
      });
    }

    if (!package_type || !['chat', 'video', 'offline'].includes(package_type)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn hình thức tư vấn hợp lệ'
      });
    }
    
    if (!duration_minutes || parseInt(duration_minutes) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập thời lượng hợp lệ (phút)'
      });
    }
    
    if (price === undefined || parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập giá tiền hợp lệ'
      });
    }

    // Tạo package code tự động
    const packageCode = `PKG${Date.now()}`;

    const newPackage = await models.ConsultationPricing.create({
      package_name,
      package_code: packageCode,
      description,
      package_type,
      duration_minutes: parseInt(duration_minutes),
      price: parseFloat(price),
      notes,
      is_active
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo gói dịch vụ thành công',
      data: newPackage
    });

  } catch (error) {
    console.error('Error in createPackage (Logic B):', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo gói dịch vụ',
      error: error.message
    });
  }
};

/**
 * Cập nhật gói dịch vụ (Admin)
 * PUT /api/consultations/admin/packages/:id
 */
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const pkg = await models.ConsultationPricing.findByPk(id);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy gói dịch vụ'
      });
    }

    // Validation (nếu có)
    if (updateData.package_type && !['chat', 'video', 'offline'].includes(updateData.package_type)) {
      return res.status(400).json({
        success: false,
        message: 'Hình thức tư vấn không hợp lệ'
      });
    }

    await pkg.update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật gói dịch vụ thành công',
      data: pkg
    });

  } catch (error) {
    console.error('Error in updatePackage (Logic B):', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật gói dịch vụ',
      error: error.message
    });
  }
};

/**
 * Xóa gói dịch vụ (Admin)
 * DELETE /api/consultations/admin/packages/:id
 */
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const package = await models.ConsultationPricing.findByPk(id);
    if (!package) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy gói dịch vụ'
      });
    }

    // Kiểm tra xem có consultation nào đang dùng package này không
    let consultationCount = 0;
    
    // Chỉ kiểm tra nếu gói này được gán cho một bác sĩ cụ thể
    if (package.doctor_id) { 
      consultationCount = await models.Consultation.count({
        where: { consultation_pricing_id: id }// <-- SỬA LỖI Ở ĐÂY
      });
    }

    if (consultationCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa gói dịch vụ này vì có ${consultationCount} tư vấn đang sử dụng`
      });
    }

    await package.destroy();

    return res.status(200).json({
      success: true,
      message: 'Xóa gói dịch vụ thành công'
    });

  } catch (error) {
    console.error('Error in deletePackage:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa gói dịch vụ',
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

    // KIỂM TRA BẢO MẬT: Không hoàn tiền cho giao dịch 0đ
  if (!payment || payment.amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Không thể hoàn tiền cho giao dịch miễn phí (0đ) hoặc không tìm thấy thanh toán'
    });
  }
    
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

      // Gửi thông báo cho Bệnh nhân
      await models.Notification.create({
      user_id: consultation.patient_id,
      type: 'system', // Đây là code đã sửa ở lần trước
      title: '✅ Lịch tư vấn đã được xác nhận',
      content: `Lịch tư vấn (Mã: ${consultation.consultation_code}) của bạn đã được quản trị viên phê duyệt.`,
      // THÊM DÒNG NÀY VÀO:
      message: `Lịch tư vấn (Mã: ${consultation.consultation_code}) của bạn đã được quản trị viên phê duyệt.`,
      link: `/tu-van/lich-su/${consultation.id}`
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
      status, 
      type,
      page = 1,
      limit = 20
    } = req.query;

    const whereClause = {
      // CHỈ LẤY CÁC LỊCH HẸN ĐÃ ĐƯỢC ĐÁNH GIÁ
      rating: { [Op.ne]: null } 
    };

    // THÊM MỚI: Lọc theo loại (chat/video)
    if (type && type !== 'all') {
      whereClause.consultation_type = type;
    }
    
    if (doctor_id) whereClause.doctor_id = doctor_id;
    
    // Sửa lỗi 'NaN'
    if (rating && rating !== 'all') {
      whereClause.rating = parseInt(rating);
    }
    
    // Bỏ qua filter 'status' (pending, approved) vì chúng ta đọc từ bảng consultations

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // SỬA LẠI: Đọc trực tiếp từ models.Consultation
    const { count, rows: feedbacks } = await models.Consultation.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: models.User,
          as: 'patient', // Lấy thông tin Bệnh nhân
          attributes: ['id', 'full_name', 'avatar_url']
        },
        {
          model: models.User,
          as: 'doctor', // Lấy thông tin Bác sĩ
          attributes: ['id', 'full_name', 'avatar_url'],
          include: [
            {
              model: models.Doctor,
              attributes: ['specialty_id'],
              include: [
                {
                  model: models.Specialty,
                  as: 'specialty',
                  attributes: ['name']
                }
              ]
            }
          ]
        }
        // Không cần include 'consultation' nữa vì chúng ta đang ở chính nó
      ],
      order: [['updated_at', 'DESC']], // Sắp xếp theo ngày đánh giá (cập nhật)
      limit: parseInt(limit),
      offset: offset
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách đánh giá từ bảng Consultations thành công',
      data: {
        feedbacks, // Dữ liệu bây giờ là danh sách các Consultations đã được đánh giá
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


// ==================== 6. BÁO CÁO & THỐNG KÊ ====================

/**
 * Thống kê tổng quan hệ thống
 * GET /api/consultations/admin/statistics/overview
 */
exports.getSystemStatistics = async (req, res) => {
  try {
    // SỬA: Thêm 'type'
    const { date_from, date_to, type } = req.query;

    const whereClause = {};
    if (date_from || date_to) {
      whereClause.created_at = {};
      if (date_from) whereClause.created_at[Op.gte] = new Date(date_from);
      if (date_to) whereClause.created_at[Op.lte] = new Date(date_to);
    }

    // SỬA: Thêm đoạn này
    if (type && type !== 'all') {
      whereClause.consultation_type = type;
    }

    // Tổng số tư vấn
    const totalConsultations = await models.Consultation.count({ where: whereClause });

    // Theo trạng thái
    const byStatus = await models.Consultation.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Theo loại
    const byType = await models.Consultation.findAll({
      where: whereClause,
      attributes: [
        'consultation_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['consultation_type'],
      raw: true
    });

    // Doanh thu
    // SỬA: Đổi models.Payment -> models.Consultation và các cột tương ứng
    const revenue = await models.Consultation.sum('total_fee', {
      where: {
        payment_status: 'paid', // SỬA: status -> payment_status
        ...whereClause
      }
    });

    // Tỷ lệ hoàn tiền
    // SỬA: Đổi models.Payment -> models.Consultation
    const totalRefunded = await models.Consultation.count({
      where: {
        payment_status: 'refunded', // SỬA: status -> payment_status
        ...whereClause
      }
    });
    
    // SỬA: Đổi models.Payment -> models.Consultation
    const totalPaid = await models.Consultation.count({
      where: {
        payment_status: ['paid', 'refunded'], // SỬA: status -> payment_status
        ...whereClause
      }
    });

    const refundRate = totalPaid > 0 ? ((totalRefunded / totalPaid) * 100).toFixed(2) : 0;

    // Đánh giá trung bình
    const avgRating = await models.Consultation.findOne({
      where: {
        ...whereClause,
        rating: { [Op.ne]: null } // Chỉ tính các tư vấn có đánh giá
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
      ],
      raw: true
    });

    // Gói được đặt nhiều nhất
    const topPackage = await models.Consultation.findAll({
      where: whereClause,
      attributes: [
            'consultation_type',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          group: ['consultation_type'],
          order: [[sequelize.literal('count'), 'DESC']],
          limit: 1,
      raw: true
    });

    // Thời gian cao điểm
    const peakHours = await models.Consultation.findAll({
    where: whereClause,
    attributes: [
      [sequelize.fn('HOUR', sequelize.col('appointment_time')), 'hour'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: [sequelize.fn('HOUR', sequelize.col('appointment_time'))],
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
              as: 'specialty',
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
              [sequelize.fn('COUNT', sequelize.col('id')), 'count']
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
        [sequelize.fn('COUNT', sequelize.col('Consultation.id')), 'total_consultations'],
        [sequelize.fn('SUM', sequelize.col('fee')), 'total_spent']
      ],
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'phone', 'email']
        }
      ],
      group: ['patient_id'],
      order: [[sequelize.literal('total_consultations'), 'DESC']],
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
        [sequelize.fn('HOUR', sequelize.col('appointment_time')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('HOUR', sequelize.col('appointment_time'))],
      order: [[sequelize.literal('count'), 'DESC']],
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

// ==================== 8. HÀNH ĐỘNG CỦA ADMIN (MỚI) ====================

/**
 * Admin phê duyệt lịch tư vấn
 * PUT /api/consultations/admin/realtime/:id/approve
 */
exports.approveConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const consultation = await models.Consultation.findOne({
      where: { consultation_code: id }
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tư vấn' });
    }

    if (consultation.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ có thể phê duyệt tư vấn đang ở trạng thái "Chờ duyệt"' 
      });
    }

    // Cập nhật trạng thái
    consultation.status = 'confirmed';
    consultation.metadata = {
      ...consultation.metadata,
      approved_by_admin: adminId,
      approved_at: new Date()
    };
    await consultation.save();

    // Gửi thông báo cho Bệnh nhân
    await models.Notification.create({
      user_id: consultation.patient_id,
      type: 'system',
      title: '✅ Lịch tư vấn đã được xác nhận',
      content: `Lịch tư vấn (Mã: ${consultation.consultation_code}) của bạn đã được quản trị viên phê duyệt.`,
      link: `/tu-van/lich-su/${consultation.id}`
    });

    // Gửi thông báo cho Bác sĩ
    await models.Notification.create({
      user_id: consultation.doctor_id,
      type: 'appointment',
      title: '🗓️ Bạn có lịch tư vấn mới',
      content: `Bạn có một lịch tư vấn mới (Mã: ${consultation.consultation_code}) đã được admin phê duyệt.`,
      message: `Bạn có một lịch tư vấn mới (Mã: ${consultation.consultation_code}) đã được admin phê duyệt.`, // <-- THÊM DÒNG NÀY
      link: `/bac-si/tu-van`
    });

    return res.status(200).json({
      success: true,
      message: 'Phê duyệt tư vấn thành công',
      data: consultation
    });

  } catch (error) {
    console.error('Error in approveConsultation:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi phê duyệt tư vấn',
      error: error.message
    });
  }
};

/**
 * Admin từ chối lịch tư vấn
 * PUT /api/consultations/admin/realtime/:id/reject
 */
exports.rejectConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối' });
    }

    const consultation = await models.Consultation.findOne({
      where: { consultation_code: id }
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tư vấn' });
    }

    if (consultation.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ có thể từ chối tư vấn đang ở trạng thái "Chờ duyệt"' 
      });
    }

    // Cập nhật trạng thái
    consultation.status = 'rejected';
    consultation.cancel_reason = reason;
    consultation.cancelled_by = 'admin';
    consultation.cancelled_at = new Date();
    consultation.metadata = {
      ...consultation.metadata,
      rejected_by_admin: adminId
    };
    await consultation.save();

    // Gửi thông báo cho Bệnh nhân
    await models.Notification.create({
      user_id: consultation.patient_id,
      type: 'system',
      title: '🚫 Lịch tư vấn đã bị từ chối',
      content: `Lịch tư vấn (Mã: ${consultation.consultation_code}) của bạn đã bị từ chối. Lý do: ${reason}`,
      message: `Lịch tư vấn (Mã: ${consultation.consultation_code}) của bạn đã bị từ chối. Lý do: ${reason}`, // <-- THÊM DÒNG NÀY
      link: `/tu-van/lich-su`
    });

    return res.status(200).json({
      success: true,
      message: 'Từ chối tư vấn thành công',
      data: consultation
    });

  } catch (error) {
    console.error('Error in rejectConsultation:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối tư vấn',
      error: error.message
    });
  }
};

/**
 * Admin hủy lịch hẹn đã xác nhận (MỚI)
 * PUT /api/consultations/admin/realtime/:id/cancel-confirmed
 */
exports.cancelConfirmedConsultation = async (req, res) => {
  try {
    const { id } = req.params; // 'id' này là consultation_code (ví dụ: CS176...)
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do hủy lịch' });
    }

    const consultation = await models.Consultation.findOne({
      where: { consultation_code: id }
    });

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tư vấn' });
    }

    if (consultation.status !== 'confirmed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ có thể hủy lịch hẹn đang ở trạng thái "Đã xác nhận"' 
      });
    }

    // Kiểm tra điều kiện 24 giờ
    const now = new Date();
    const appointmentTime = new Date(consultation.appointment_time);
    const hoursDifference = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
       return res.status(400).json({ 
        success: false, 
        message: 'Không thể hủy lịch hẹn cận giờ (ít hơn 24 giờ)' 
      });
    }

    // Cập nhật trạng thái
    consultation.status = 'cancelled'; // Chuyển sang "Đã hủy"
    consultation.cancel_reason = reason;
    consultation.cancelled_by = 'admin';
    consultation.cancelled_at = new Date();
    consultation.metadata = {
      ...consultation.metadata,
      cancelled_by_admin: adminId
    };
    await consultation.save();

    // Gửi thông báo cho Bệnh nhân
    await models.Notification.create({
      user_id: consultation.patient_id,
      type: 'system',
      title: '❌ Lịch tư vấn đã bị hủy',
      content: `Lịch tư vấn (Mã: ${consultation.consultation_code}) đã bị Admin hủy. Lý do: ${reason}`,
      message: `Lịch tư vấn (Mã: ${consultation.consultation_code}) đã bị Admin hủy. Lý do: ${reason}`,
      link: `/tu-van/lich-su`
    });

    // Gửi thông báo cho Bác sĩ
    await models.Notification.create({
      user_id: consultation.doctor_id,
      type: 'system',
      title: '❌ Lịch tư vấn đã bị hủy',
      content: `Lịch tư vấn (Mã: ${consultation.consultation_code}) của bạn đã bị Admin hủy. Lý do: ${reason}`,
      message: `Lịch tư vấn (Mã: ${consultation.consultation_code}) của bạn đã bị Admin hủy. Lý do: ${reason}`,
      link: `/bac-si/tu-van`
    });

    return res.status(200).json({
      success: true,
      message: 'Hủy lịch hẹn thành công. Nếu lịch có phí, nút hoàn tiền sẽ xuất hiện.',
      data: consultation
    });

  } catch (error) {
    console.error('Error in cancelConfirmedConsultation:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy lịch hẹn',
      error: error.message
    });
  }
};

/**
 * MỚI: Admin lấy danh sách Sự cố đang chờ xử lý
 * GET /api/consultations/admin/realtime/incidents
 */
exports.getPendingIncidents = async (req, res) => {
  try {
    const incidents = await models.ConsultationReport.findAll({
      where: { status: 'pending' },
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
      order: [['created_at', 'ASC']]
    });
    res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    console.error('Error getting pending incidents:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách sự cố' });
  }
};

/**
 * MỚI: Admin xử lý (đóng) một sự cố
 * PUT /api/consultations/admin/realtime/incidents/:id/resolve
 */
exports.resolveIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note, status = 'resolved' } = req.body;
    const adminId = req.user.id;

    const report = await models.ConsultationReport.findByPk(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo' });
    }

    report.status = status; // 'resolved' hoặc 'dismissed'
    report.admin_note = admin_note;
    report.reviewed_by = adminId;
    report.resolved_at = new Date();
    await report.save();

    res.status(200).json({ success: true, message: 'Đã xử lý sự cố', data: report });
  } catch (error) {
    console.error('Error resolving incident:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xử lý sự cố' });
  }
};
// server/controllers/paymentController.js - CẬP NHẬT HOÀN CHỈNH
const { models } = require('../config/db');
const { Op } = require('sequelize');
const vnpayService = require('../utils/vnpayService');
const momoService = require('../utils/momoService');

// ========== 1. TẠO THANH TOÁN CHO TƯ VẤN ==========
exports.createConsultationPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { consultation_id, payment_method } = req.body;

    // Validate
    if (!consultation_id || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin thanh toán'
      });
    }

    // Kiểm tra consultation
    const consultation = await models.Consultation.findByPk(consultation_id, {
      include: [
        {
          model: models.User,
          as: 'patient',
          attributes: ['id', 'full_name', 'email', 'phone']
        },
        {
          model: models.User,
          as: 'doctor',
          attributes: ['id', 'full_name']
        }
      ]
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy buổi tư vấn'
      });
    }

    // Kiểm tra quyền
    if (consultation.patient_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thanh toán buổi tư vấn này'
      });
    }

    // Kiểm tra đã thanh toán chưa
    if (consultation.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Buổi tư vấn này đã được thanh toán'
      });
    }

    const amount = consultation.total_fee;
    const orderId = `CONS_${consultation.consultation_code}_${Date.now()}`;
    const orderInfo = `Thanh toan tu van ${consultation.consultation_code} - BS.${consultation.doctor.full_name}`;

    let paymentUrl = '';
    let paymentData = {};

    // Tạo URL thanh toán theo method
    if (payment_method === 'vnpay') {
      paymentUrl = vnpayService.createPaymentUrl({
        orderId,
        amount,
        orderInfo,
        orderType: 'billpayment',
        locale: 'vn',
        ipAddr: req.ip || '127.0.0.1'
      });
      
      paymentData = { method: 'vnpay', orderId };
      
    } else if (payment_method === 'momo') {
      const momoResult = await momoService.createPayment({
        orderId,
        amount,
        orderInfo,
        extraData: Buffer.from(JSON.stringify({ 
          consultation_id: consultation.id,
          user_id: userId 
        })).toString('base64')
      });

      if (!momoResult.success) {
        return res.status(400).json({
          success: false,
          message: momoResult.message
        });
      }

      paymentUrl = momoResult.payUrl;
      paymentData = {
        method: 'momo',
        orderId,
        deeplink: momoResult.deeplink,
        qrCodeUrl: momoResult.qrCodeUrl
      };
      
    } else {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

    // Lưu thông tin thanh toán vào consultation
    consultation.payment_method = payment_method;
    consultation.payment_transaction_id = orderId;
    await consultation.save();

    // Tạo log payment
    await models.Payment.create({
      user_id: userId,
      consultation_id: consultation.id,
      amount: amount,
      method: payment_method,
      status: 'pending',
      transaction_id: orderId,
      payment_info: JSON.stringify(paymentData)
    });

    res.status(200).json({
      success: true,
      message: 'Tạo thanh toán thành công',
      paymentUrl,
      paymentData
    });

  } catch (error) {
    console.error('❌ ERROR trong createConsultationPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo thanh toán: ' + error.message
    });
  }
};

// ========== 2. CALLBACK VNPAY ==========
exports.vnpayReturn = async (req, res) => {
  try {
    console.log('📥 VNPay callback received:', req.query);

    const vnpParams = req.query;
    const verifyResult = vnpayService.verifyReturnUrl(vnpParams);

    console.log('🔍 VNPay verify result:', verifyResult);

    if (!verifyResult.isValid) {
      return res.redirect(`${process.env.CLIENT_URL}/payment/failure?reason=invalid_signature`);
    }

    const { orderId, amount, transactionNo } = verifyResult.data;

    // Tìm consultation từ orderId
    const consultation = await models.Consultation.findOne({
      where: { payment_transaction_id: orderId }
    });

    if (!consultation) {
      console.error('❌ Consultation not found for orderId:', orderId);
      return res.redirect(`${process.env.CLIENT_URL}/payment/failure?reason=order_not_found`);
    }

    // Update payment
    const payment = await models.Payment.findOne({
      where: {
        consultation_id: consultation.id,
        transaction_id: orderId
      }
    });

    if (verifyResult.isSuccess) {
      // Thanh toán thành công
      consultation.payment_status = 'paid';
      consultation.paid_at = new Date();
      await consultation.save();

      if (payment) {
        payment.status = 'paid';
        payment.transaction_id = transactionNo;
        await payment.save();
      }

      // Tạo thông báo cho bác sĩ
      await models.Notification.create({
        user_id: consultation.doctor_id,
        type: 'consultation',
        title: '💰 Có tư vấn mới cần duyệt',
        content: `Bạn có buổi tư vấn mới từ bệnh nhân đã thanh toán. Mã: ${consultation.consultation_code}`,
        related_id: consultation.id,
        related_type: 'consultation',
        link: `/bac-si/tu-van`,
        priority: 'high',
        is_read: false
      });

      // Tạo thông báo cho bệnh nhân
      await models.Notification.create({
        user_id: consultation.patient_id,
        type: 'consultation',
        title: '✅ Thanh toán thành công',
        content: `Lịch tư vấn ${consultation.consultation_code} đã được thanh toán. Chờ bác sĩ phê duyệt.`,
        related_id: consultation.id,
        related_type: 'consultation',
        link: `/tu-van/${consultation.id}`,
        priority: 'normal',
        is_read: false
      });

      console.log('✅ VNPay payment successful:', orderId);
      return res.redirect(`${process.env.CLIENT_URL}/payment/success?consultation_id=${consultation.id}`);

    } else {
      // Thanh toán thất bại
      consultation.payment_status = 'failed';
      await consultation.save();

      if (payment) {
        payment.status = 'failed';
        await payment.save();
      }

      console.log('❌ VNPay payment failed:', orderId, verifyResult.message);
      return res.redirect(`${process.env.CLIENT_URL}/payment/failure?reason=${verifyResult.responseCode}`);
    }

  } catch (error) {
    console.error('❌ ERROR trong vnpayReturn:', error);
    return res.redirect(`${process.env.CLIENT_URL}/payment/failure?reason=system_error`);
  }
};

// ========== 3. CALLBACK MOMO ==========
exports.momoReturn = async (req, res) => {
  try {
    console.log('📥 MoMo callback received:', req.body || req.query);

    const momoData = req.method === 'POST' ? req.body : req.query;
    const verifyResult = momoService.verifyCallback(momoData);

    console.log('🔍 MoMo verify result:', verifyResult);

    if (!verifyResult.isValid) {
      return res.redirect(`${process.env.CLIENT_URL}/payment/failure?reason=invalid_signature`);
    }

    const { orderId, amount, transId } = verifyResult.data;

    // Tìm consultation
    const consultation = await models.Consultation.findOne({
      where: { payment_transaction_id: orderId }
    });

    if (!consultation) {
      console.error('❌ Consultation not found for orderId:', orderId);
      return res.redirect(`${process.env.CLIENT_URL}/payment/failure?reason=order_not_found`);
    }

    // Update payment
    const payment = await models.Payment.findOne({
      where: {
        consultation_id: consultation.id,
        transaction_id: orderId
      }
    });

    if (verifyResult.isSuccess) {
      // Thanh toán thành công
      consultation.payment_status = 'paid';
      consultation.paid_at = new Date();
      await consultation.save();

      if (payment) {
        payment.status = 'paid';
        payment.transaction_id = transId;
        await payment.save();
      }

      // Tạo thông báo
      await models.Notification.create({
        user_id: consultation.doctor_id,
        type: 'consultation',
        title: '💰 Có tư vấn mới cần duyệt',
        content: `Bạn có buổi tư vấn mới từ bệnh nhân đã thanh toán. Mã: ${consultation.consultation_code}`,
        related_id: consultation.id,
        related_type: 'consultation',
        link: `/bac-si/tu-van`,
        priority: 'high',
        is_read: false
      });

      await models.Notification.create({
        user_id: consultation.patient_id,
        type: 'consultation',
        title: '✅ Thanh toán thành công',
        content: `Lịch tư vấn ${consultation.consultation_code} đã được thanh toán. Chờ bác sĩ phê duyệt.`,
        related_id: consultation.id,
        related_type: 'consultation',
        link: `/tu-van/${consultation.id}`,
        priority: 'normal',
        is_read: false
      });

      console.log('✅ MoMo payment successful:', orderId);
      return res.redirect(`${process.env.CLIENT_URL}/payment/success?consultation_id=${consultation.id}`);

    } else {
      // Thanh toán thất bại
      consultation.payment_status = 'failed';
      await consultation.save();

      if (payment) {
        payment.status = 'failed';
        await payment.save();
      }

      console.log('❌ MoMo payment failed:', orderId, verifyResult.message);
      return res.redirect(`${process.env.CLIENT_URL}/payment/failure?reason=${verifyResult.resultCode}`);
    }

  } catch (error) {
    console.error('❌ ERROR trong momoReturn:', error);
    return res.redirect(`${process.env.CLIENT_URL}/payment/failure?reason=system_error`);
  }
};

// ========== 4. MOMO IPN (Server-to-Server) ==========
exports.momoIPN = async (req, res) => {
  try {
    console.log('📥 MoMo IPN received:', req.body);

    const momoData = req.body;
    const verifyResult = momoService.verifyCallback(momoData);

    if (!verifyResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Xử lý tương tự momoReturn nhưng return JSON thay vì redirect
    const { orderId, transId } = verifyResult.data;

    const consultation = await models.Consultation.findOne({
      where: { payment_transaction_id: orderId }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (verifyResult.isSuccess) {
      consultation.payment_status = 'paid';
      consultation.paid_at = new Date();
      await consultation.save();

      const payment = await models.Payment.findOne({
        where: { consultation_id: consultation.id, transaction_id: orderId }
      });

      if (payment) {
        payment.status = 'paid';
        payment.transaction_id = transId;
        await payment.save();
      }

      console.log('✅ MoMo IPN processed successfully:', orderId);
    }

    // MoMo yêu cầu response có format này
    return res.status(200).json({
      partnerCode: momoData.partnerCode,
      orderId: momoData.orderId,
      requestId: momoData.requestId,
      amount: momoData.amount,
      orderInfo: momoData.orderInfo,
      orderType: momoData.orderType,
      transId: momoData.transId,
      resultCode: 0,
      message: 'Success',
      payType: momoData.payType,
      responseTime: Date.now(),
      extraData: momoData.extraData
    });

  } catch (error) {
    console.error('❌ ERROR trong momoIPN:', error);
    return res.status(500).json({
      success: false,
      message: 'System error'
    });
  }
};

// ========== 5. XỬ LÝ HOÀN TIỀN ==========
exports.processRefund = async (req, res) => {
  try {
    const { consultation_id, reason } = req.body;
    const adminId = req.user.id;

    const consultation = await models.Consultation.findByPk(consultation_id);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tư vấn'
      });
    }

    if (consultation.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Tư vấn chưa được thanh toán hoặc đã hoàn tiền'
      });
    }

    const refundAmount = consultation.total_fee;
    const paymentMethod = consultation.payment_method;

    let refundResult;

    if (paymentMethod === 'vnpay') {
      refundResult = await vnpayService.createRefund({
        orderId: consultation.payment_transaction_id,
        transactionNo: consultation.payment_transaction_id,
        amount: refundAmount,
        refundAmount: refundAmount,
        user: `admin_${adminId}`
      });
    } else if (paymentMethod === 'momo') {
      refundResult = await momoService.createRefund({
        orderId: consultation.payment_transaction_id,
        transId: consultation.payment_transaction_id,
        amount: refundAmount,
        description: reason || 'Hoàn tiền tư vấn'
      });
    }

    // Update consultation
    consultation.payment_status = 'refunded';
    consultation.refund_amount = refundAmount;
    consultation.refund_reason = reason;
    consultation.refunded_at = new Date();
    await consultation.save();

    // Update payment record
    const payment = await models.Payment.findOne({
      where: { consultation_id: consultation.id }
    });

    if (payment) {
      payment.status = 'refunded';
      await payment.save();
    }

    // Thông báo cho bệnh nhân
    await models.Notification.create({
      user_id: consultation.patient_id,
      type: 'payment',
      title: '💰 Đã hoàn tiền',
      content: `Buổi tư vấn ${consultation.consultation_code} đã được hoàn tiền ${refundAmount.toLocaleString('vi-VN')}đ. Lý do: ${reason}`,
      related_id: consultation.id,
      related_type: 'consultation',
      link: `/tu-van/${consultation.id}`,
      priority: 'high',
      is_read: false
    });

    res.json({
      success: true,
      message: 'Hoàn tiền thành công',
      data: refundResult
    });

  } catch (error) {
    console.error('❌ ERROR trong processRefund:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xử lý hoàn tiền: ' + error.message
    });
  }
};


// ========== 1. TẠO THANH TOÁN SAU KHI ĐẶT LỊCH ==========
exports.createPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appointment_id, payment_method, proof_image_url } = req.body;

    // Validate
    if (!appointment_id || !payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Lịch hẹn và phương thức thanh toán là bắt buộc'
      });
    }

    if (!['cash', 'bank_transfer'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

    // Kiểm tra appointment tồn tại
    const appointment = await models.Appointment.findByPk(appointment_id, {
      include: [
        { model: models.Service, as: 'Service' },
        { 
          model: models.Patient, 
          as: 'Patient',
          include: [{ model: models.User }]
        }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn'
      });
    }

    // Kiểm tra quyền thanh toán
    if (req.user.role === 'patient') {
      if (appointment.Patient.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thanh toán lịch hẹn này'
        });
      }
    }

    // Kiểm tra đã thanh toán chưa
    const existingPayment = await models.Payment.findOne({
      where: { 
        appointment_id,
        status: { [Op.in]: ['paid', 'pending'] }
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Lịch hẹn này đã có thanh toán'
      });
    }

    // Tạo payment_info dựa vào method
    let payment_info = {};
    
    if (payment_method === 'cash') {
      // Tiền mặt: cung cấp mã phòng và thời gian
      payment_info = {
        room_code: 'P101', // Có thể dynamic từ settings
        payment_deadline: appointment.appointment_date + ' ' + appointment.appointment_time,
        note: 'Vui lòng thanh toán trước 30 phút khi đến khám'
      };
    } else if (payment_method === 'bank_transfer') {
      // Chuyển khoản: cung cấp thông tin ngân hàng
      payment_info = {
        bank_name: 'Vietcombank',
        account_number: '1234567890',
        account_name: 'PHONG KHAM DA KHOA',
        qr_code_url: 'https://img.vietqr.io/image/970436-1234567890-compact.png', // QR động
        transfer_content: `BK${appointment.code}`,
        note: 'Vui lòng chụp màn hình sau khi chuyển khoản'
      };
    }

    // Tạo payment
    const payment = await models.Payment.create({
      appointment_id,
      user_id: userId,
      amount: appointment.Service.price,
      status: payment_method === 'cash' ? 'pending' : 'pending', // Cả 2 đều pending
      method: payment_method,
      payment_info: JSON.stringify(payment_info),
      proof_image_url: proof_image_url || null
    });

    // Gửi thông báo
    try {
      await models.Notification.create({
        user_id: userId,
        type: 'payment',
        title: 'Thanh toán đang chờ xử lý',
        content: `Thanh toán cho lịch hẹn ${appointment.code} đang được xử lý. ${payment_method === 'cash' ? 'Vui lòng thanh toán tại quầy.' : 'Chờ xác nhận chuyển khoản.'}`,
        related_id: payment.id,
        related_type: 'payment'
      });

      // Gửi cho admin/staff
      await models.Notification.create({
        user_id: null, // All admins
        type: 'payment',
        title: 'Thanh toán mới cần xác nhận',
        content: `Lịch hẹn ${appointment.code} có thanh toán ${payment_method} cần xác nhận`,
        related_id: payment.id,
        related_type: 'payment'
      });
    } catch (notifError) {
      console.warn('⚠️ Không thể tạo thông báo:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Tạo thanh toán thành công',
      data: payment
    });

  } catch (error) {
    console.error('❌ ERROR trong createPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo thanh toán',
      error: error.message
    });
  }
};

// ========== 2. XÁC NHẬN THANH TOÁN (ADMIN/STAFF) ==========
exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_id } = req.body;

    const payment = await models.Payment.findByPk(id, {
      include: [
        {
          model: models.Appointment,
          as: 'Appointment',
          include: [
            { model: models.Patient, as: 'Patient', include: [{ model: models.User }] },
            { model: models.Service, as: 'Service' }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Thanh toán này đã được xử lý'
      });
    }

    // Cập nhật payment
    payment.status = 'paid';
    payment.transaction_id = transaction_id || `PAY${Date.now()}`;
    payment.updated_at = new Date();
    await payment.save();

    // Cập nhật appointment
    const appointment = payment.Appointment;
    appointment.is_payment_completed = true;
    await appointment.save();

    // Gửi thông báo cho patient
    try {
      await models.Notification.create({
        user_id: appointment.Patient.user_id,
        type: 'payment',
        title: 'Thanh toán thành công',
        content: `Thanh toán cho lịch hẹn ${appointment.code} đã được xác nhận. Vui lòng đến khám đúng giờ.`,
        related_id: payment.id,
        related_type: 'payment'
      });
    } catch (notifError) {
      console.warn('⚠️ Không thể tạo thông báo:', notifError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Xác nhận thanh toán thành công',
      data: payment
    });

  } catch (error) {
    console.error('❌ ERROR trong confirmPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận thanh toán',
      error: error.message
    });
  }
};

// ========== 3. TỪ CHỐI THANH TOÁN (ADMIN/STAFF) ==========
exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do từ chối'
      });
    }

    const payment = await models.Payment.findByPk(id, {
      include: [
        {
          model: models.Appointment,
          as: 'Appointment',
          include: [
            { model: models.Patient, as: 'Patient', include: [{ model: models.User }] }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán'
      });
    }

    payment.status = 'failed';
    payment.payment_info = JSON.stringify({
      ...JSON.parse(payment.payment_info),
      reject_reason: reason
    });
    await payment.save();

    // Gửi thông báo
    try {
      await models.Notification.create({
        user_id: payment.Appointment.Patient.user_id,
        type: 'payment',
        title: 'Thanh toán bị từ chối',
        content: `Thanh toán cho lịch hẹn ${payment.Appointment.code} bị từ chối. Lý do: ${reason}`,
        related_id: payment.id,
        related_type: 'payment'
      });
    } catch (notifError) {
      console.warn('⚠️ Không thể tạo thông báo:', notifError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Từ chối thanh toán thành công',
      data: payment
    });

  } catch (error) {
    console.error('❌ ERROR trong rejectPayment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi từ chối thanh toán',
      error: error.message
    });
  }
};

// ========== 4. LẤY DANH SÁCH THANH TOÁN (ADMIN/STAFF) ==========
exports.getAllPayments = async (req, res) => {
  try {
    const { status, method, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== 'all') where.status = status;
    if (method && method !== 'all') where.method = method;

    const { count, rows: payments } = await models.Payment.findAndCountAll({
      where,
      include: [
        {
          model: models.Appointment,
          as: 'Appointment',
          include: [
            {
              model: models.Patient,
              as: 'Patient',
              include: [{ model: models.User, attributes: ['id', 'full_name', 'email', 'phone'] }]
            },
            {
              model: models.Service,
              as: 'Service',
              attributes: ['id', 'name', 'price']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('❌ ERROR trong getAllPayments:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách thanh toán',
      error: error.message
    });
  }
};

// ========== 5. LẤY THANH TOÁN CỦA LỊCH HẸN ==========
exports.getPaymentByAppointment = async (req, res) => {
  try {
    const { appointment_id } = req.params;

    const payment = await models.Payment.findOne({
      where: { appointment_id },
      include: [
        {
          model: models.Appointment,
          as: 'Appointment',
          include: [
            { model: models.Service, as: 'Service' },
            {
              model: models.Patient,
              as: 'Patient',
              include: [{ model: models.User }]
            }
          ]
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có thanh toán cho lịch hẹn này'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('❌ ERROR trong getPaymentByAppointment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin thanh toán',
      error: error.message
    });
  }
};

// ========== 6. LẤY THANH TOÁN CỦA TÔI (PATIENT) ==========
exports.getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await models.Payment.findAll({
      where: { user_id: userId },
      include: [
        {
          model: models.Appointment,
          as: 'Appointment',
          include: [
            { model: models.Service, as: 'Service' },
            {
              model: models.Doctor,
              as: 'Doctor',
              required: false,
              include: [{ model: models.User, attributes: ['id', 'full_name'] }]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('❌ ERROR trong getMyPayments:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử thanh toán',
      error: error.message
    });
  }
};
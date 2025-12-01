// server/controllers/paymentController.js
// PHIÊN BẢN FINAL FIX:
// 1. Xóa code trùng lặp
// 2. Tự động xử lý mã AP thiếu dấu gạch ngang (AP2111... -> AP-2111-...)
// 3. Force Save Payment khi không tìm thấy User
const emailSender = require('../utils/emailSender');
const notificationHelper = require('../utils/notificationHelper');
const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');
const vnpayService = require('../utils/vnpayService');
const momoService = require('../utils/momoService');
const moment = require('moment');

// ========== 1. TẠO THANH TOÁN CHO TƯ VẤN ==========
exports.createConsultationPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { consultation_id, payment_method, proof_image_url } = req.body;

    if (!consultation_id || !payment_method) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin thanh toán' });
    }

    const consultation = await models.Consultation.findByPk(consultation_id, {
      include: [
        { model: models.User, as: 'patient', attributes: ['id', 'full_name', 'email', 'phone'] },
        { model: models.User, as: 'doctor', attributes: ['id', 'full_name'] }
      ]
    });

    if (!consultation) return res.status(404).json({ success: false, message: 'Không tìm thấy buổi tư vấn' });
    if (consultation.patient_id !== userId) return res.status(403).json({ success: false, message: 'Không có quyền' });
    
    // Nếu đã thanh toán rồi thì thôi
    if (consultation.payment_status === 'paid') {
        // return res.status(400).json({ success: false, message: 'Đã thanh toán' });
    }

    const amount = consultation.total_fee;
    const orderId = `CONS_${consultation.consultation_code}_${Date.now()}`;
    
    // Tạo Payment Record (Pending)
    await models.Payment.create({
        user_id: userId,
        consultation_id: consultation.id,
        amount: amount,
        method: payment_method,
        status: 'pending',
        transaction_id: orderId,
        payment_info: JSON.stringify({ method: payment_method }),
        proof_image_url: proof_image_url || null
    });

    consultation.payment_method = payment_method;
    await consultation.save();

    let paymentUrl = null;
    // Logic lấy link thanh toán VNPAY/MOMO (nếu có)
    if (payment_method === 'vnpay') {
        paymentUrl = vnpayService.createPaymentUrl({
            orderId, amount, orderInfo: `Thanh toan ${consultation.consultation_code}`, ipAddr: req.ip || '127.0.0.1'
        });
    } else if (payment_method === 'momo' && !proof_image_url) {
        const momoRes = await momoService.createPayment({
            orderId, amount, orderInfo: `Thanh toan ${consultation.consultation_code}`
        });
        if(momoRes.success) paymentUrl = momoRes.payUrl;
    }

    res.status(200).json({ success: true, message: 'Đã tạo yêu cầu', paymentUrl });

  } catch (error) {
    console.error('❌ CreateConsultationPayment Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== 2. TẠO THANH TOÁN CHO LỊCH HẸN ==========
exports.createPayment = async (req, res) => {
  try {
    const userId = req.user?.id || 1; 
    const { appointment_id, payment_method, proof_image_url } = req.body;

    if (!appointment_id) return res.status(400).json({ success: false, message: 'Thiếu thông tin' });

    // Tìm Appointment
    const appointment = await models.Appointment.findOne({
      where: {
        [Op.or]: [
            { code: appointment_id.toString() },
            ...( !isNaN(appointment_id) ? [{ id: appointment_id }] : [] )
        ]
      },
      include: [{ model: models.Service, as: 'Service' }]
    });

    if (!appointment) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });

    // Kiểm tra/Update Payment cũ
    let payment = await models.Payment.findOne({ where: { appointment_id: appointment.id } });
    
    const paymentData = {
        user_id: userId,
        appointment_id: appointment.id,
        amount: appointment.Service.price,
        status: 'pending',
        method: payment_method,
        payment_info: JSON.stringify({ note: 'Created via UI' }),
        proof_image_url: proof_image_url || null
    };

    if (payment) {
        // Nếu đã thanh toán rồi thì chặn
        if (payment.status === 'paid') return res.status(400).json({ success: false, message: 'Đã thanh toán xong' });
        await payment.update(paymentData);
    } else {
        payment = await models.Payment.create(paymentData);
    }

    // Cập nhật trạng thái appointment
    await appointment.update({ 
      payment_status: payment_method === 'cash' ? 'paid_at_clinic' : 'pending' 
    });

    res.status(201).json({ success: true, message: 'Tạo thanh toán thành công', data: payment });

  } catch (e) { 
    console.error('❌ CreatePayment Error:', e);
    res.status(500).json({ success: false, message: e.message }); 
  }
};

// ========== 3. WEBHOOK SEPAY (QUAN TRỌNG NHẤT) ==========
exports.handleBankWebhook = async (req, res) => {
  try {
    console.log('\n🔥 [WEBHOOK START] -------------------------');
    console.log('💰 Data:', req.body.content, req.body.transferAmount);

    const { id, content, transferType, transferAmount } = req.body;

    if (transferType !== 'in') return res.json({ success: true });

    // 1. Regex tìm mã đơn (Chấp nhận mọi biến thể)
    const regex = /(CS|AP)[-0-9A-Z]+/gi;
    const matches = content ? content.match(regex) : null;
    
    if (!matches) {
        console.log('⚠️ Không tìm thấy mã đơn hàng.');
        return res.json({ success: true });
    }

    let orderCodeRaw = matches[0].toUpperCase(); 
    console.log('🔍 Mã tìm thấy trong nội dung:', orderCodeRaw);

    // --- XỬ LÝ THÔNG MINH: Tự động thêm dấu gạch ngang nếu thiếu ---
    // Ví dụ: AP21117682 -> AP-2111-7682
    if (orderCodeRaw.startsWith('AP') && !orderCodeRaw.includes('-')) {
        // Giả định format AP-DDMM-RANDOM (AP + 4 số ngày + số còn lại)
        // Regex: Lấy AP, lấy 4 số tiếp theo, lấy phần còn lại
        orderCodeRaw = orderCodeRaw.replace(/^(AP)(\d{4})(.+)$/, '$1-$2-$3');
        console.log('✨ Đã chuẩn hóa mã AP thành:', orderCodeRaw);
    }

    // --- A. TƯ VẤN (CS) ---
    if (orderCodeRaw.startsWith('CS')) {
        // Include thêm thông tin để gửi mail
        const consultation = await models.Consultation.findOne({ 
            where: { consultation_code: orderCodeRaw },
            include: [
                { model: models.User, as: 'patient' },
                { model: models.User, as: 'doctor' }
            ]
        });

        if (consultation) {
             console.log('✅ Tìm thấy Consultation ID:', consultation.id);
             
             // 1. Update Consultation: TỰ ĐỘNG DUYỆT (CONFIRMED) + ĐÃ THANH TOÁN
             await consultation.update({ 
                 payment_status: 'paid', 
                 paid_at: new Date(), 
                 payment_method: 'bank_transfer',
                 status: 'confirmed' // <--- QUAN TRỌNG: Tự động chuyển sang trạng thái xác nhận
             });
             
             // 2. Tìm hoặc tạo Payment Record
             const [payment] = await models.Payment.findOrCreate({
                where: { consultation_id: consultation.id },
                defaults: {
                    user_id: consultation.patient_id || 1,
                    consultation_id: consultation.id,
                    amount: transferAmount,
                    method: 'bank_transfer',
                    status: 'paid',
                    transaction_id: `SEPAY_${id}`,
                    payment_info: JSON.stringify(req.body)
                }
             });
             if (payment && payment.status !== 'paid') {
                 await payment.update({ status: 'paid', transaction_id: `SEPAY_${id}` });
             }

             // 3. GỬI EMAIL HÓA ĐƠN & THÔNG BÁO (GIỐNG LỊCH HẸN)
             if (consultation.patient?.email) {
                 const timeStr = new Date(consultation.appointment_time).toLocaleString('vi-VN');
                 
                 // Gửi Email
                 await emailSender.sendEmail({
                     to: consultation.patient.email,
                     subject: `✅ Thanh toán thành công - Tư vấn ${consultation.consultation_code} đã được xác nhận`,
                     template: 'payment_success_invoice', // Dùng chung template hóa đơn
                     data: {
                         patientName: consultation.patient.full_name,
                         appointmentCode: consultation.consultation_code,
                         serviceName: `Tư vấn trực tuyến (${consultation.consultation_type === 'video' ? 'Video Call' : 'Chat'})`,
                         doctorName: `BS. ${consultation.doctor?.full_name || 'Hệ thống'}`,
                         appointmentTime: timeStr,
                         paymentMethod: 'Chuyển khoản Ngân hàng',
                         amount: transferAmount,
                         link: `${process.env.CLIENT_URL || 'http://localhost:3000'}/tu-van/${consultation.id}`
                     }
                 });
             }

             // Gửi Notification
             await notificationHelper.createNotification({
                 user_id: consultation.patient_id,
                 type: 'payment_success',
                 title: 'Thanh toán thành công',
                 message: `Lịch tư vấn ${consultation.consultation_code} đã được thanh toán và tự động xác nhận.`,
                 link: `/tu-van/${consultation.id}`
             });

             console.log('🎉 [CS] Xong: Đã duyệt & Gửi mail/thông báo');
        }
    }

    // --- B. LỊCH HẸN (AP) ---
    else if (orderCodeRaw.startsWith('AP')) {
        const appointment = await models.Appointment.findOne({ where: { code: orderCodeRaw } });

        if (appointment) {
             console.log(`✅ Tìm thấy Appointment ID: ${appointment.id}`);
             
             // 1. Update Appointment: Payment = Paid & Status = CONFIRMED (Tự động duyệt)
             await appointment.update({ 
                 payment_status: 'paid',
                 status: 'confirmed' // <--- TỰ ĐỘNG PHÊ DUYỆT NGAY
             });
             console.log('-> Đã update Appointment: PAID & CONFIRMED');

             // 2. Xử lý Payment Record
             const payment = await models.Payment.findOne({ where: { appointment_id: appointment.id } });
             
             if (payment) {
                await payment.update({
                    status: 'paid',
                    transaction_id: `SEPAY_${id}`,
                    amount: transferAmount,
                    method: 'bank_transfer'
                });
             } else {
                // (Giữ nguyên logic tạo mới payment nếu chưa có - fallback)
                let userId = 1; 
                if (appointment.patient_id) {
                    try {
                         const [results] = await sequelize.query(`SELECT user_id FROM patients WHERE id = ${appointment.patient_id} LIMIT 1`);
                         if (results.length > 0) userId = results[0].user_id;
                    } catch (e) {}
                }
                await models.Payment.create({
                    user_id: userId,
                    appointment_id: appointment.id,
                    amount: transferAmount,
                    method: 'bank_transfer',
                    status: 'paid',
                    transaction_id: `SEPAY_${id}`,
                    payment_info: JSON.stringify(req.body),
                    provider_ref: content
                });
             }

             // 3. LẤY THÔNG TIN CHI TIẾT ĐỂ GỬI MAIL & THÔNG BÁO
             // Cần query lại để lấy tên Bác sĩ, Dịch vụ, Bệnh nhân
             const fullAppt = await models.Appointment.findByPk(appointment.id, {
                 include: [
                     { model: models.Service, as: 'Service' },
                     { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] },
                     { model: models.Patient, as: 'Patient', include: [{ model: models.User }] }
                 ]
             });

             if (fullAppt) {
                 const patientName = fullAppt.Patient?.User?.full_name || fullAppt.guest_name || 'Quý khách';
                 const patientEmail = fullAppt.Patient?.User?.email || fullAppt.guest_email;
                 const doctorName = fullAppt.Doctor?.user?.full_name || 'Bác sĩ';
                 const serviceName = fullAppt.Service?.name || 'Dịch vụ y tế';
                 const timeStr = `${fullAppt.appointment_start_time.slice(0,5)} - ${new Date(fullAppt.appointment_date).toLocaleDateString('vi-VN')}`;

                 // A. GỬI EMAIL HÓA ĐƠN
                 if (patientEmail) {
                     await emailSender.sendEmail({
                         to: patientEmail,
                         subject: `✅ Thanh toán thành công - Lịch hẹn ${fullAppt.code} đã được xác nhận`,
                         template: 'payment_success_invoice', // Template vừa thêm ở bước 1
                         data: {
                             patientName,
                             appointmentCode: fullAppt.code,
                             serviceName,
                             doctorName,
                             appointmentTime: timeStr,
                             paymentMethod: 'Chuyển khoản Ngân hàng',
                             amount: transferAmount,
                             link: `${process.env.CLIENT_URL || 'http://localhost:3000'}/lich-hen/${fullAppt.code}`
                         }
                     });
                     console.log('📧 Đã gửi email hóa đơn');
                 }

                 // B. GỬI THÔNG BÁO (NOTIFICATION)
                 if (fullAppt.Patient?.User?.id) {
                     await notificationHelper.createNotification({
                         user_id: fullAppt.Patient.User.id,
                         type: 'payment_success',
                         title: 'Thanh toán thành công',
                         message: `Lịch hẹn ${fullAppt.code} đã được thanh toán và tự động xác nhận.`,
                         link: `/lich-hen/${fullAppt.code}`
                     });
                 }
             }
        } else {
            console.log(`❌ Không tìm thấy Appointment trong DB với mã: ${orderCodeRaw}`);
        }
    }

    console.log('🔥 [WEBHOOK END] -------------------------');
    return res.json({ success: true });

  } catch (error) {
    console.error('❌ SYSTEM ERROR:', error);
    return res.json({ success: true });
  }
};

// ========== 4. LẤY DANH SÁCH THANH TOÁN (ADMIN - FIX HIỂN THỊ TÊN) ==========
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
        // 1. Include Appointment -> Patient -> User
        {
          model: models.Appointment,
          as: 'Appointment',
          required: false,
          include: [
            {
              model: models.Patient,
              as: 'Patient',
              required: false,
              include: [{ model: models.User, attributes: ['full_name', 'phone', 'email'], required: false }]
            },
            {
              model: models.Doctor,
              as: 'Doctor',
              required: false,
              include: [{ model: models.User, as: 'user', attributes: ['full_name'], required: false }]
            },
            {
               model: models.Service,
               as: 'Service',
               attributes: ['name'],
               required: false
            }
          ]
        },
        // 2. Include Consultation -> Patient(User)
        {
          model: models.Consultation,
          as: 'Consultation',
          required: false,
          include: [
             { model: models.User, as: 'patient', attributes: ['full_name', 'phone'], required: false },
             { model: models.User, as: 'doctor', attributes: ['full_name'], required: false }
          ]
        },
        // 3. Include User (Người thanh toán)
        {
            model: models.User,
            as: 'User',
            attributes: ['full_name', 'email', 'phone'],
            required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Map lại dữ liệu cho Frontend
    const formattedData = payments.map(p => {
        const data = p.toJSON();
        
        let patientName = 'N/A';
        let doctorName = 'N/A';
        let serviceName = 'N/A';
        let type = 'Khác';

        if (data.Appointment) {
            // Ưu tiên lấy tên Guest Name (khách vãng lai) nếu có
            if (data.Appointment.guest_name) {
                patientName = `${data.Appointment.guest_name} (Khách)`;
            } 
            // Nếu không có Guest Name thì lấy tên User đã đăng ký
            else if (data.Appointment.Patient?.User?.full_name) {
                patientName = data.Appointment.Patient.User.full_name;
            }
            
            doctorName = data.Appointment.Doctor?.user?.full_name || 'Chưa phân công';
            serviceName = data.Appointment.Service?.name || 'Lịch khám';
            type = 'Lịch hẹn';
        } else if (data.Consultation) {
            patientName = data.Consultation.patient?.full_name || 'N/A';
            doctorName = data.Consultation.doctor?.full_name || 'N/A';
            serviceName = 'Tư vấn trực tuyến';
            type = 'Tư vấn';
        } else if (data.User) {
            // Fallback lấy tên User thanh toán
            patientName = data.User.full_name;
        }

        return {
            ...data,
            patientName, // Trường này sẽ được Frontend dùng để hiển thị
            doctorName,
            serviceName,
            type
        };
    });

    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('❌ ERROR getAllPayments:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách',
      error: error.message
    });
  }
};


exports.getPaymentConfig = async (req, res) => {
    try {
        const s = await models.SystemSetting.findOne({ where: { setting_key: 'payment_config' } });
        res.json({ success: true, data: s ? s.value_json : {} });
    } catch (e) { res.status(500).json({ success: false }); }
};

exports.updatePaymentConfig = async (req, res) => {
    try {
        const { vnpay, bank, momo, cash } = req.body;
        await models.SystemSetting.upsert({
            setting_key: 'payment_config',
            value_json: { vnpay, bank, momo, cash },
            updated_by: req.user.id
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
};

// Sửa lại hàm duyệt tay để đồng bộ trạng thái Appointment/Consultation
exports.verifyManualPayment = async (req, res) => {
    const t = await sequelize.transaction(); // Dùng transaction cho an toàn
    try {
        const { id } = req.params; // Payment ID
        const { status } = req.body; // 'paid' hoặc 'failed'

        // 1. Tìm Payment
        const payment = await models.Payment.findByPk(id, { transaction: t });
        if (!payment) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
        }

        // 2. Cập nhật trạng thái Payment
        await payment.update({ status }, { transaction: t });

        // 3. Nếu Admin chọn "Đã thanh toán" (paid), cập nhật luôn Lịch hẹn/Tư vấn sang 'confirmed'
        if (status === 'paid') {
            // Trường hợp Lịch hẹn
            if (payment.appointment_id) {
                await models.Appointment.update(
                    { 
                        status: 'confirmed',        // <--- QUAN TRỌNG: Chuyển sang đã xác nhận
                        payment_status: 'paid'      // Đánh dấu đã trả tiền
                    },
                    { where: { id: payment.appointment_id }, transaction: t }
                );
            } 
            // Trường hợp Tư vấn
            else if (payment.consultation_id) {
                await models.Consultation.update(
                    { 
                        status: 'confirmed',        // <--- QUAN TRỌNG
                        payment_status: 'paid',
                        paid_at: new Date()
                    },
                    { where: { id: payment.consultation_id }, transaction: t }
                );
            }
        }

        await t.commit();
        res.json({ success: true, message: 'Đã cập nhật trạng thái và phê duyệt lịch thành công' });

    } catch (e) {
        await t.rollback();
        console.error('Lỗi duyệt tay:', e);
        res.status(500).json({ success: false, message: 'Lỗi khi duyệt thanh toán' });
    }
};

exports.confirmPayment = async (req, res) => {
    try {
        await models.Payment.update({ status: 'paid' }, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
};

exports.rejectPayment = async (req, res) => {
    try {
        await models.Payment.update({ status: 'failed' }, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
};

exports.getRevenueStatistics = async (req, res) => {
    try {
        const total = await models.Payment.sum('amount', { where: { status: 'paid' } });
        res.json({ success: true, data: { chart: [], summary: { total: total || 0 } } });
    } catch (e) { res.json({ success: true, data: { chart: [], summary: { total: 0 } } }); }
};

exports.getPaymentByAppointment = async (req, res) => {
  try {
    const p = await models.Payment.findOne({ where: { appointment_id: req.params.appointment_id } });
    res.json({ success: true, data: p });
  } catch (e) { res.status(500).json({ success: false }); }
};

exports.getMyPayments = async (req, res) => {
  try {
    const p = await models.Payment.findAll({ where: { user_id: req.user.id } });
    res.json({ success: true, data: p });
  } catch (e) { res.status(500).json({ success: false }); }
};

// --- CÁC HÀM CALLBACK (QUAN TRỌNG) ---
exports.vnpayReturn = async (req, res) => res.send('VNPay Return');
exports.momoReturn = async (req, res) => res.send('MoMo Return');
exports.momoIPN = async (req, res) => res.json({});
exports.processRefund = async (req, res) => res.json({ success: true });
exports.adminCheckTransaction = async (req, res) => res.json({ success: true });
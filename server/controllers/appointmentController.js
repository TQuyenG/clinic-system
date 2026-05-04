// server/controllers/appointmentController.js
// PHIÊN BẢN SỬA LỖI HOÀN CHỈNH
// 1. SỬA: Tất cả các hàm (getById, cancel, reschedule...) đều tìm bằng 'code' thay vì 'id'.
// 2. SỬA: Cập nhật link email/thông báo thành '/lich-hen/:code'.

const { Op } = require('sequelize');
const crypto = require('crypto');
const emailSender = require('../utils/emailSender');
const notificationHelper = require('../utils/notificationHelper');
const vnpayService = require('../utils/vnpayService');
const momoService = require('../utils/momoService');
const moment = require('moment'); 

// =================================================================
// ======================= FALLBACK IMPORTS =========================
// =================================================================
let models, sequelize;
try {
  const db = require('../config/db');
  models = db.models;
  sequelize = db.sequelize;
} catch (error) {
  console.log('Warning: Database not configured, using mock data mode');
  models = null;
  sequelize = null;
}
let uploadFile, deleteFile;
try {
  const fileUpload = require('../utils/fileUpload');
  uploadFile = fileUpload.uploadFile;
  deleteFile = fileUpload.deleteFile;
} catch (error) {
  console.log('Warning: File upload not configured, using mock functions');
  uploadFile = async (data, name, category) => ({ url: `/mock-uploads/${name}`, success: true });
  deleteFile = async (path) => true;
}

// =================================================================
// ======================= HELPER FUNCTIONS (NỘI BỘ) =================
// =================================================================

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const createInternalNotification = async (data, transaction = null) => {
    try {
        await models.Notification.create({
            user_id: data.user_id,
            type: data.type,
            message: data.message, 
            link: data.link,
            is_read: false
        }, { transaction }); 
    } catch (error) {
        console.error(`Lỗi khi tạo thông báo cho user ${data.user_id}:`, error.message);
    }
};

const buildLocalDateTime = (dateStr, timeStr = '00:00:00') => {
  if (!dateStr) return null;

  const safeDate = String(dateStr).split('T')[0];
  const safeTime = String(timeStr || '00:00:00').slice(0, 8);
  const [year, month, day] = safeDate.split('-').map(Number);
  const [hour, minute, second] = safeTime.split(':').map(Number);

  if (!year || !month || !day) return null;

  return new Date(
    year,
    month - 1,
    day,
    Number.isFinite(hour) ? hour : 0,
    Number.isFinite(minute) ? minute : 0,
    Number.isFinite(second) ? second : 0
  );
};

const buildRefundBankSnapshot = (appointment, payment, refundMode) => {
  if (refundMode === 'gateway') {
    return {
      bank_name: payment.method || 'gateway',
      account_no: '',
      account_name: '',
      note: 'Hoàn tiền tự động qua cổng thanh toán'
    };
  }

  return {
    bank_name: '',
    account_no: '',
    account_name: '',
    note: 'CSKH sẽ liên hệ xác nhận STK hoặc hướng dẫn nhận tiền tại quầy',
    appointment_code: appointment.code,
    payment_method: payment.method || 'cash'
  };
};

const handleCancellationRefund = async ({ appointment, payment, reason, cancelledBy, patientEmail, patientName }) => {
  if (!payment || payment.status !== 'paid') {
    console.log(`[Appointment ${appointment.code}] Không có payment paid nên không tạo hoàn tiền.`);
    return { created: false, mode: 'none', status: 'not_required' };
  }

  const appointmentTime = buildLocalDateTime(appointment.appointment_date, appointment.appointment_start_time);
  const now = new Date();
  const hoursDiff = appointmentTime ? (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60) : 0;

  let refundPercent = 0;
  if (hoursDiff >= 24) refundPercent = 100;
  else if (hoursDiff >= 6) refundPercent = 50;

  const amountOriginal = parseFloat(payment.amount || appointment.Service?.price || 0);
  const refundAmount = Math.max(0, Math.round((amountOriginal * refundPercent) * 100) / 100);
  const paymentMethod = String(payment.method || '').toLowerCase();
  const gatewayTxnRef = payment.provider_ref || payment.transaction_id || appointment.code;
  const supportsGatewayRefund = ['vnpay', 'momo'].includes(paymentMethod) && gatewayTxnRef && !String(gatewayTxnRef).startsWith('SEPAY_');

  console.log(
    `[Appointment ${appointment.code}] Bắt đầu xử lý hoàn tiền. method=${paymentMethod}, hoursDiff=${hoursDiff.toFixed(2)}, ` +
    `refundPercent=${refundPercent}, refundAmount=${refundAmount}, supportsGatewayRefund=${supportsGatewayRefund}`
  );

  let refundResult = { success: false, message: 'Chưa tạo hoàn tiền tự động' };
  let refundMode = 'manual_support';
  let refundStatus = 'pending';

  if (supportsGatewayRefund && refundAmount > 0) {
    try {
      if (paymentMethod === 'vnpay') {
        refundResult = await vnpayService.createRefund({
          orderId: gatewayTxnRef,
          transactionNo: payment.provider_ref || gatewayTxnRef,
          amount: amountOriginal,
          refundAmount,
          user: cancelledBy || 'system',
          ipAddr: '127.0.0.1'
        });
      } else if (paymentMethod === 'momo') {
        refundResult = await momoService.createRefund({
          orderId: gatewayTxnRef,
          transId: payment.provider_ref || gatewayTxnRef,
          amount: refundAmount,
          description: `Hoàn tiền lịch hẹn ${appointment.code}`
        });
      }

      if (refundResult?.success) {
        refundMode = 'gateway';
        refundStatus = 'completed';
        console.log(`[Appointment ${appointment.code}] Hoàn tiền gateway tạo thành công.`);
      } else {
        console.warn(`[Appointment ${appointment.code}] Gateway refund chưa thành công: ${refundResult?.message || 'unknown'}`);
      }
    } catch (refundError) {
      console.error(`[Appointment ${appointment.code}] Lỗi khi tạo refund gateway:`, refundError.message);
    }
  }

  const refundRequest = await models.RefundRequest.create({
    payment_id: payment.id,
    user_id: payment.user_id || appointment.patient_id || 1,
    amount_original: amountOriginal,
    refund_amount: refundAmount,
    penalty_fee: Math.max(0, amountOriginal - refundAmount),
    reason: reason || `Hủy lịch hẹn ${appointment.code}`,
    bank_info_snapshot: buildRefundBankSnapshot(appointment, payment, refundMode),
    status: refundStatus,
    policy_snapshot: {
      applied_percent: refundPercent,
      hours_diff: hoursDiff,
      refund_mode: refundMode,
      supports_gateway_refund: supportsGatewayRefund,
      cancelled_by: cancelledBy
    },
    admin_note: refundMode === 'gateway'
      ? 'Đã tạo hoàn tiền qua cổng thanh toán'
      : 'Chờ CSKH xác nhận STK hoặc hướng dẫn nhận tiền tại quầy'
  });

  if (refundStatus === 'completed') {
    await payment.update({ status: 'refunded' });
    await appointment.update({ payment_status: 'refunded' });
  }

  if (patientEmail) {
    const html = refundStatus === 'completed'
      ? `
        <p>Xin chào <strong>${patientName || 'Quý khách'}</strong>,</p>
        <p>Hệ thống đã tự động hoàn tiền cho lịch hẹn <strong>${appointment.code}</strong>.</p>
        <p><strong>Số tiền hoàn:</strong> ${new Intl.NumberFormat('vi-VN').format(refundAmount)} VNĐ</p>
        <p>Mã tham chiếu hoàn tiền: <strong>${refundResult?.data?.requestId || refundResult?.data?.vnp_TransactionNo || 'AUTO_REFUND'}</strong></p>
        <p>Nếu sau thời gian xử lý mà bạn chưa nhận được tiền, vui lòng liên hệ CSKH để được kiểm tra lại.</p>
      `
      : `
        <p>Xin chào <strong>${patientName || 'Quý khách'}</strong>,</p>
        <p>Lịch hẹn <strong>${appointment.code}</strong> đã được hủy và hệ thống đã ghi nhận yêu cầu hoàn tiền.</p>
        <p><strong>Hình thức thanh toán:</strong> ${paymentMethod || 'không xác định'}</p>
        <p><strong>Số tiền dự kiến hoàn:</strong> ${new Intl.NumberFormat('vi-VN').format(refundAmount)} VNĐ</p>
        <p>Nếu bạn thanh toán bằng chuyển khoản hoặc tiền mặt, CSKH sẽ liên hệ để xác nhận STK hoặc hướng dẫn nhận tiền trực tiếp tại phòng khám.</p>
      `;

    await emailSender.sendEmail({
      to: patientEmail,
      subject: `Cập nhật hoàn tiền cho lịch hẹn ${appointment.code}`,
      html
    });
    console.log(`[Appointment ${appointment.code}] Đã gửi email cập nhật hoàn tiền đến ${patientEmail}`);
  }

  if (refundStatus !== 'completed') {
    await notificationHelper.notifyAllAdmins(
      'refund_request',
      `Lịch hẹn ${appointment.code} đã hủy và cần xử lý hoàn tiền (${new Intl.NumberFormat('vi-VN').format(refundAmount)} VNĐ).`,
      '/quan-ly-thanh-toan/hoan-tien'
    );
  }

  console.log(`[Appointment ${appointment.code}] Refund request created: ${refundRequest.id}, status=${refundStatus}, mode=${refundMode}`);
  return { created: true, mode: refundMode, status: refundStatus, refundRequest, refundAmount, refundPercent };
};

// =================================================================
// TÍNH TOÁN CHỖ TRỐNG: PHÂN BIỆT ONLINE (SLOT) VÀ OFFLINE (CA/SỨC CHỨA)
// =================================================================
const getAvailableSlotsLogic = async (doctorId, serviceId, date, appointmentType = 'offline', transaction = null) => {
  const SLOT_DURATION = 30; // Phân bổ Slot 30 phút cho Online
  const service = await models.Service.findByPk(serviceId, { attributes: ['duration'], transaction }); 
  if (!service) throw new Error('Không tìm thấy dịch vụ');
  
  const serviceDuration = service.duration || 15; // Thời gian khám trung bình 1 ca (Mặc định 15p)
  
  const doctor = await models.Doctor.findByPk(doctorId, { transaction });
  if (!doctor) throw new Error('Không tìm thấy bác sĩ');

  const selectedDayOfWeek = new Date(date).getDay();
  const now = new Date();
  const isToday = new Date(date).toDateString() === now.toDateString();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Lấy lịch bác sĩ xin nghỉ phép
  const onLeave = await models.LeaveRequest.findOne({ 
    where: {
      user_id: doctor.user_id,
      status: 'approved',
      date_from: { [Op.lte]: date },
      [Op.or]: [ { date_to: null, date_from: date }, { date_to: { [Op.gte]: date } } ]
    }, transaction
  });

  if (onLeave && onLeave.leave_type !== 'time_range') return []; // Nghỉ cả ngày thì không còn slot

  // 2. Lấy danh sách Ca làm việc (Shifts)
  const fixedSchedules = await models.Schedule.findAll({ 
      where: { user_id: doctor.user_id, date: date, schedule_type: 'fixed', status: 'available' },
      transaction,
      raw: true
  });
  const activeShiftConfigs = await models.WorkShiftConfig.findAll({ 
    where: { is_active: true },
    transaction,
    raw: true
  });

  // Ghép lịch cố định với cấu hình mặc định thay vì thay thế hoàn toàn.
  // Điều này giúp một lịch cố định không làm mất các ca còn lại trong ngày.
  const shiftMap = new Map();
  activeShiftConfigs.forEach(shift => {
    const key = `${shift.shift_name}:${shift.start_time}:${shift.end_time}`;
    shiftMap.set(key, shift);
  });
  fixedSchedules.forEach(schedule => {
    const key = `${schedule.shift_name || schedule.schedule_type}:${schedule.start_time}:${schedule.end_time}`;
    shiftMap.set(key, schedule);
  });
  const shifts = Array.from(shiftMap.values()).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  // 3. Lấy các lịch hẹn ĐÃ CÓ của bác sĩ trong ngày này
  const existingAppointments = await models.Appointment.findAll({ 
    where: { doctor_id: doctorId, appointment_date: date, status: { [Op.notIn]: ['cancelled', 'passed'] } },
    attributes: ['appointment_type', 'appointment_start_time', 'appointment_end_time'],
    raw: true, transaction
  });

  const availableSlots = [];

  // ================= LUỒNG 1: TƯ VẤN ONLINE (Khóa cứng Slot) =================
  if (appointmentType === 'online') {
    const busySlots = existingAppointments
      .filter(a => a.appointment_type === 'online') // Chỉ tránh đụng độ với lịch Online khác
      .map(appt => ({
        start: timeToMinutes(appt.appointment_start_time), 
        end: timeToMinutes(appt.appointment_end_time) 
      }));

    for (const shift of shifts) {
      if (shift.days_of_week && !shift.days_of_week.includes(selectedDayOfWeek)) continue;
      
      const shiftStart = timeToMinutes(shift.start_time); 
      const shiftEnd = timeToMinutes(shift.end_time); 
      
      for (let slotStart = shiftStart; slotStart < shiftEnd; slotStart += SLOT_DURATION) {
        const slotEnd = slotStart + serviceDuration;
        let status = 'available';
        let reason = '';

        if (slotEnd > shiftEnd) continue; // Khung giờ lố ca
        if (isToday && slotStart < currentMinutes + 15) { // Tránh đặt gấp trước 15p
          status = 'unavailable'; reason = 'Đã qua giờ';
        }
        
        // Kiểm tra nghỉ phép theo giờ
        if (status === 'available' && onLeave && onLeave.leave_type === 'time_range') { 
            const leaveStart = timeToMinutes(onLeave.time_from);
            const leaveEnd = timeToMinutes(onLeave.time_to);
            if (Math.max(slotStart, leaveStart) < Math.min(slotEnd, leaveEnd)) {
                status = 'unavailable'; reason = 'Bác sĩ nghỉ phép';
            }
        }

        // Kiểm tra đụng Slot Online khác
        if (status === 'available') {
          for (const busy of busySlots) {
            if (Math.max(slotStart, busy.start) < Math.min(slotEnd, busy.end)) {
              status = 'unavailable'; reason = 'Đã có lịch hẹn'; break;
            }
          }
        }

        const timeStr = `${String(Math.floor(slotStart / 60)).padStart(2, '0')}:${String(slotStart % 60).padStart(2, '0')}`;
        availableSlots.push({ time: timeStr, status, reason, shift_name: shift.shift_name });
      }
    }
  } 
  // ================= LUỒNG 2: KHÁM TẠI VIỆN (Tính theo sức chứa theo từng giờ) =================
  else {
    for (const shift of shifts) {
      if (shift.days_of_week && !shift.days_of_week.includes(selectedDayOfWeek)) continue;

      const shiftStart = timeToMinutes(shift.start_time); 
      const shiftEnd = timeToMinutes(shift.end_time); 

      const hourlyCapacity = Math.max(1, Math.floor(60 / serviceDuration));

      for (let hourStart = shiftStart; hourStart < shiftEnd; hourStart += 60) {
        const hourEnd = Math.min(hourStart + 60, shiftEnd);
        if (hourEnd <= hourStart) continue;

        if (isToday && hourStart < currentMinutes) continue;

        if (onLeave && onLeave.leave_type === 'time_range') {
          const leaveStart = timeToMinutes(onLeave.time_from);
          const leaveEnd = timeToMinutes(onLeave.time_to);
          if (Math.max(hourStart, leaveStart) < Math.min(hourEnd, leaveEnd)) {
            continue;
          }
        }

        const offlineBookedCount = existingAppointments.filter(a => 
          a.appointment_type === 'offline' &&
          timeToMinutes(a.appointment_start_time) >= hourStart && 
          timeToMinutes(a.appointment_start_time) < hourEnd
        ).length;

        if (offlineBookedCount < hourlyCapacity) {
          const startLabel = `${String(Math.floor(hourStart / 60)).padStart(2, '0')}:${String(hourStart % 60).padStart(2, '0')}`;
          const endLabel = `${String(Math.floor(hourEnd / 60)).padStart(2, '0')}:${String(hourEnd % 60).padStart(2, '0')}`;

          availableSlots.push({ 
            time: startLabel,
            label: `${startLabel} - ${endLabel}`,
            status: 'available', 
            reason: `Khung ${startLabel} - ${endLabel}: Còn ${hourlyCapacity - offlineBookedCount} chỗ`,
            shift_name: shift.shift_name
          });
        }
      }
    }
  }

  return availableSlots;
};


// =================================================================
// ======================= APPOINTMENT CREATION ====================
// =================================================================

/**
 * @desc    Tạo lịch hẹn mới
 * @route   POST /api/appointments
 * @access  Public/Patient
 */
// =================================================================
// 1. TẠO LỊCH HẸN (PATIENT TỰ ĐẶT WEB/APP)
// =================================================================
exports.createAppointment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      service_id, doctor_id, appointment_date, appointment_start_time,
      appointment_type = 'offline', reason, payment_method,
      guest_email, guest_name, guest_phone, guest_gender, guest_dob,
      booking_for, relative_name, relationship
    } = req.body;

    if (!service_id || !doctor_id || !appointment_date || !appointment_start_time) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu thông tin: Dịch vụ, Bác sĩ, Ngày và Giờ khám.' });
    }

    const user = req.user; 
    let patientId = null;
    let finalEmail = guest_email, finalFullName = guest_name, finalPhone = guest_phone; 

    if (user && user.role === 'patient') {
      const patient = await models.Patient.findOne({ where: { user_id: user.id }, transaction });
      if (!patient) { await transaction.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy BN' }); }
      patientId = patient.id;
    }
    
    const service = await models.Service.findByPk(service_id, { transaction }); 
    const doctor = await models.Doctor.findByPk(doctor_id, { include: [{ model: models.User, as: 'user' }], transaction });

    // CẬP NHẬT TRUYỀN PARAM `appointment_type`
    const slotCheck = await getAvailableSlotsLogic(doctor.id, service.id, appointment_date, appointment_type, transaction);
    const chosenSlot = slotCheck.find(slot => slot.time === appointment_start_time);

    if (!chosenSlot || chosenSlot.status !== 'available') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Khung giờ này đã hết chỗ hoặc bác sĩ bận. Vui lòng chọn ca khác.'
      });
    }

    const [startHour, startMin] = appointment_start_time.split(':').map(Number);
    const endMinutes = (startHour * 60 + startMin) + service.duration; 
    const appointment_end_time = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`;

    // CẤP QUYỀN ƯU TIÊN VÌ ĐÃ ĐẶT TRƯỚC HỆ THỐNG
    const queue_type = 'priority';

    // TÍNH PAYMENT DEADLINE: 30 phút trước giờ khám (chỉ cho online payment)
    const isOnlinePayment = ['vnpay', 'momo', 'bank_transfer'].includes(payment_method?.toLowerCase());
    let payment_hold_until = null;
    if (isOnlinePayment && service.price > 0) {
      const appointmentDateTime = buildLocalDateTime(appointment_date, appointment_start_time);
      payment_hold_until = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000); // 30 phút trước
    }

    const appointmentStartMinutes = (startHour * 60) + startMin;
    const offlineEndMinutes = appointmentStartMinutes + 60;
    const offlineAppointmentEndTime = `${String(Math.floor(offlineEndMinutes / 60)).padStart(2, '0')}:${String(offlineEndMinutes % 60).padStart(2, '0')}:00`;

    const isPatientUser = user && user.role === 'patient';
    const bookingContext = {
      source: user && ['admin', 'staff'].includes(user.role) ? 'front_desk' : 'patient_portal',
      booking_for: isPatientUser ? (booking_for === 'other' ? 'other' : 'self') : null,
      relative_name: isPatientUser && booking_for === 'other' ? (relative_name || null) : null,
      relationship: isPatientUser && booking_for === 'other' ? (relationship || null) : null,
      booked_by_user_id: user?.id || null
    };

    const appointment = await models.Appointment.create({
      patient_id: patientId,
      doctor_id,
      service_id,
      specialty_id: service.specialty_id,
      staff_id: doctor.assigned_staff_id,
      guest_email: finalEmail,
      guest_name: finalFullName,
      guest_phone: finalPhone,
      guest_gender: guest_gender || null,
      guest_dob: guest_dob,
      guest_token: !user ? crypto.randomUUID() : null,
      booking_context: bookingContext,
      appointment_type,
      appointment_date,
      appointment_start_time,
      appointment_end_time: appointment_type === 'online' ? appointment_end_time : offlineAppointmentEndTime,
      status: 'pending',
      payment_status: service.price === 0 ? 'not_required' : 'unpaid',
      payment_method,
      payment_hold_until, // Deadline thanh toán online (30 phút trước)
      reason,
      queue_type // Lưu quyền ưu tiên vào DB
    }, { transaction }); 

    await transaction.commit();
    res.status(201).json({ success: true, message: 'Đặt lịch hẹn thành công!', data: { appointment } });

  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('ERROR in createAppointment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Lấy lịch hẹn theo guest token
 * @route   GET /api/appointments/guest/:token
 * @access  Public
 */
exports.getAppointmentByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const appointment = await models.Appointment.findOne({
      where: { guest_token: token },
      include: [
        { model: models.Service, as: 'Service', attributes: ['id', 'name', 'price', 'duration'] },
        {
          model: models.Doctor,
          as: 'Doctor',
          include: [
            { model: models.User, as: 'user', attributes: ['full_name', 'email'] },
            { model: models.Specialty, as: 'specialty', attributes: ['name'] }
          ]
        },
        { model: models.Specialty, as: 'Specialty' }, // Thêm
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn.'
      });
    }

    res.status(200).json({ success: true, data: appointment });

  } catch (error) {
    console.error('ERROR in getAppointmentByToken:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
};

/**
 * @desc    Hoàn thành thanh toán (VD: VNPay callback)
 * @route   PUT /api/appointments/:id/complete-payment
 * @access  Public (with token) / Patient
 */
exports.completePayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params; // 'id' ở đây là 'code'
    const { token } = req.body;

    let appointment;
    
    // SỬA: Tìm bằng code
    if (token) {
      appointment = await models.Appointment.findOne({ where: { code: id, guest_token: token }, transaction });
    } else if (req.user) {
      const patient = await models.Patient.findOne({ where: { user_id: req.user.id }, transaction });
      appointment = await models.Appointment.findOne({ where: { code: id, patient_id: patient.id }, transaction });
    }

    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn.' });
    }

    // Check if already paid (paid_online or paid_at_clinic)
    if (appointment.payment_status === 'paid_online' || appointment.payment_status === 'paid_at_clinic') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Lịch hẹn đã được thanh toán.' });
    }

    await appointment.update({ payment_status: 'paid_online', status: 'confirmed', paid_at: new Date() }, { transaction });

    if (appointment.patient_id) {
      const patient = await models.Patient.findByPk(appointment.patient_id, {
        include: [{ model: models.User }],
        transaction
      });
      if (patient && patient.User) {
        await createInternalNotification({ // SỬA: Dùng helper
          user_id: patient.User.id,
          type: 'payment', 
          message: `Thanh toán thành công cho lịch hẹn ${appointment.code}. Lịch hẹn đã được xác nhận.`,
          link: `/lich-hen/${appointment.code}`, // SỬA LINK
          transaction
        });
      }
    }
    
    await transaction.commit();

    // (Gửi email thanh toán thành công) ...

    res.status(200).json({ success: true, message: 'Thanh toán thành công!', data: appointment });

  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('ERROR in completePayment:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý thanh toán.' });
  }
};


/**
 * @desc    Lấy lịch trống của bác sĩ (API Endpoint)
 * @route   GET /api/appointments/available-slots
 * @access  Public
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctor_id, service_id, date } = req.query;

    if (!doctor_id || !service_id || !date) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin doctor_id, service_id hoặc date'
      });
    }

    const slots = await getAvailableSlotsLogic(doctor_id, service_id, date);

    const grouped = { morning: [], afternoon: [], evening: [] };
    slots.forEach(slot => {
      const hour = parseInt(slot.time.split(':')[0]);
      if (hour < 12) grouped.morning.push(slot);
      else if (hour < 18) grouped.afternoon.push(slot);
      else grouped.evening.push(slot);
    });

    res.status(200).json({
      success: true,
      data: {
        raw: slots,
        grouped: grouped
      }
    });

  } catch (error) {
    console.error('ERROR in getAvailableSlots:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi lấy khung giờ.'
    });
  }
};

// =================================================================
// ======================= APPOINTMENT MANAGEMENT ==================
// =================================================================

/**
 * @desc    Lấy danh sách lịch hẹn của bệnh nhân đăng nhập (ĐÃ FIX LỖI THANH TOÁN)
 * @route   GET /api/appointments/my-appointments
 * @access  Private (Patient)
 */
exports.getMyAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const patient = await models.Patient.findOne({
      where: { user_id: userId }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bệnh nhân' });
    }

    const appointments = await models.Appointment.findAll({
      where: { patient_id: patient.id },
      include: [
        { 
          model: models.Doctor, 
          as: 'Doctor', 
          include: [
            { model: models.User, as: 'user', attributes: ['full_name', 'email'] },
            { model: models.Specialty, as: 'specialty', attributes: ['name'] }
          ] 
        },
        { model: models.Service, as: 'Service' },
        { model: models.MedicalRecord, as: 'MedicalRecord' },
        
        { 
            model: models.Payment, 
            as: 'Payment',
            required: false 
        } 
      ],
      order: [['appointment_date', 'DESC'], ['appointment_start_time', 'DESC']]
    });

    res.status(200).json({ success: true, data: appointments });

  } catch (error) {
    console.error('ERROR in getMyAppointments:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách lịch hẹn', error: error.message });
  }
};

/**
 * @desc    Lấy chi tiết lịch hẹn
 * @route   GET /api/appointments/:id (id là code)
 * @access  Private (Patient, Doctor, Staff, Admin)
 */
exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params; // 'id' bây giờ là 'code'
    const userId = req.user.id;

    const appointment = await models.Appointment.findOne({
      where: { code: id },
      include: [
        { 
          model: models.Patient, 
          as: 'Patient', 
          required: false,
          include: [{ 
            model: models.User, 
            // SỬA LỖI: Xóa as: 'user' vì Patient.js không định nghĩa alias này
            attributes: ['full_name', 'email', 'phone'],
            required: false 
          }] 
        },
        { 
          model: models.Doctor, 
          as: 'Doctor', 
          include: [
            // Giữ nguyên as: 'user' vì Doctor.js CÓ định nghĩa
            { model: models.User, as: 'user', attributes: ['full_name', 'email', 'phone'] }, 
            { model: models.Specialty, as: 'specialty', attributes: ['name'] } 
          ] 
        },
        { model: models.Service, as: 'Service' },
        { model: models.Specialty, as: 'Specialty' },
        { model: models.Payment, as: 'Payment' },
        { model: models.MedicalRecord, as: 'MedicalRecord' }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    // Logic kiểm tra quyền (Giữ nguyên)
    let hasAccess = false;
    if (['admin', 'staff'].includes(req.user.role)) hasAccess = true;
    else if (req.user.role === 'patient') {
      const patient = await models.Patient.findOne({ where: { user_id: userId } });
      hasAccess = patient && appointment.patient_id === patient.id;
    } else if (req.user.role === 'doctor') {
      const doctor = await models.Doctor.findOne({ where: { user_id: userId } });
      hasAccess = doctor && appointment.doctor_id === doctor.id;
    }

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập lịch hẹn này' });
    }

    res.status(200).json({ success: true, data: appointment });

  } catch (error) {
    console.error('ERROR in getAppointmentById:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy thông tin lịch hẹn' });
  }
};

// =================================================================
// ======================= APPOINTMENT ACTIONS =====================
// =================================================================

/**
 * @desc    Hủy lịch hẹn
 * @route   PUT /api/appointments/:id/cancel (id là code)
 * @access  Private (Patient, Admin, Staff)
 */
exports.cancelAppointment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // 'id' là 'code'
    const { reason } = req.body;
    const userId = req.user.id;

    if (!reason || !reason.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Lý do hủy lịch hẹn là bắt buộc' });
    }

    // SỬA: Dùng findOne({ where: { code: id } })
    const appointment = await models.Appointment.findOne({ 
        where: { code: id },
        include: [
          { model: models.Patient, as: 'Patient', include: [{ model: models.User }] },
          { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] }
        ],
        transaction: t 
    });
    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Không thể hủy lịch hẹn đã hoàn thành hoặc đã hủy' });
    }
    
    if (req.user.role === 'patient') {
        const appointmentDateTime = moment(`${appointment.appointment_date} ${appointment.appointment_start_time}`, 'YYYY-MM-DD HH:mm:ss');
        const now = moment();
        const hoursRemaining = appointmentDateTime.diff(now, 'hours');

        if (hoursRemaining < 6) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Chỉ có thể hủy lịch hẹn trước ít nhất 6 tiếng.' });
        }
    }

    let canCancel = false;
    let cancelledBy = '';
    let cancelledRole = req.user.role;

    if (['admin', 'staff'].includes(req.user.role)) {
      canCancel = true;
      cancelledBy = `${req.user.role}:${req.user.id}`;
    } else if (req.user.role === 'patient') {
      const patient = await models.Patient.findOne({ where: { user_id: userId }, transaction: t });
      canCancel = patient && appointment.patient_id === patient.id;
      cancelledBy = `patient:${patient?.id}`;
    } 
    // ✅ FIX: Thêm quyền cho Bác sĩ hủy lịch của chính mình
    else if (req.user.role === 'doctor') {
      const doctor = await models.Doctor.findOne({ where: { user_id: userId }, transaction: t });
      canCancel = doctor && appointment.doctor_id === doctor.id;
      cancelledBy = `doctor:${doctor?.id}`;
    }

    if (!canCancel) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy lịch hẹn này' });
    }

    await appointment.update({
      status: 'cancelled',
      cancel_reason: reason.trim(),
      cancelled_by: cancelledBy,
      cancelled_at: new Date()
    }, { transaction: t });

    await t.commit();

    console.log(`[Appointment ${appointment.code}] Đã hủy lịch thành công. Bắt đầu đánh giá hoàn tiền...`);

    const patientUser = appointment.Patient?.User;
    const doctorUser = appointment.Doctor?.user;
    const patientEmail = patientUser ? patientUser.email : appointment.guest_email;
    const patientName = patientUser ? patientUser.full_name : appointment.guest_name;
    const payment = await models.Payment.findOne({
      where: { appointment_id: appointment.id }
    });
    const refundDetailLink = `/lich-hen/${appointment.code}?openRefund=1`;
    const cancellationLink = payment && payment.status === 'paid' ? refundDetailLink : `/lich-hen/${appointment.code}`;

    if (patientUser) {
        const cancellationMessage = payment && payment.status === 'paid'
          ? `Lịch hẹn ${appointment.code} của bạn đã bị hủy. Lịch này đã được thanh toán, vui lòng mở để gửi yêu cầu hoàn tiền.`
          : `Lịch hẹn ${appointment.code} của bạn đã bị hủy. Lý do: ${reason}.`;

        await createInternalNotification({ 
          user_id: patientUser.id,
          type: 'appointment',
          message: cancellationMessage,
          link: cancellationLink
        });
    }

    if (payment && payment.status === 'paid') {
      console.log(`[Appointment ${appointment.code}] Phát hiện lịch đã thanh toán, chuyển sang xử lý hoàn tiền.`);
      await handleCancellationRefund({
        appointment,
        payment,
        reason: reason.trim(),
        cancelledBy,
        patientEmail,
        patientName
      });
    } else if (patientEmail) {
      console.log(`[Appointment ${appointment.code}] Không có payment paid, gửi email hủy lịch thông thường.`);
      await emailSender.sendEmail({ 
        to: patientEmail,
        subject: `Thông báo hủy lịch hẹn ${appointment.code}`,
        template: 'appointment_cancelled', 
        data: {
          patientName,
          appointmentCode: appointment.code,
          cancelReason: reason,
          cancelledAt: new Date().toLocaleString('vi-VN')
        }
      });
    }
    
    if (doctorUser) {
         await createInternalNotification({ 
          user_id: doctorUser.id,
          type: 'appointment',
          message: `Lịch hẹn ${appointment.code} (với ${patientName}) đã bị hủy. Lý do: ${reason}.`,
          link: '/lich-hen-bac-si'
        });
    }

    res.status(200).json({ success: true, message: 'Hủy lịch hẹn thành công' });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR in cancelAppointment:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi hủy lịch hẹn' });
  }
};

/**
 * @desc    Đổi lịch hẹn (Reschedule)
 * @route   PUT /api/appointments/:id/reschedule (id là code)
 * @access  Private (Patient, Admin, Staff)
 */
exports.rescheduleAppointment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // 'id' là 'code'
    const { new_date, new_start_time, new_doctor_id, new_service_id } = req.body;
    const userId = req.user.id;

    if (!new_date || !new_start_time) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Ngày và giờ mới là bắt buộc' });
    }

    // SỬA: Dùng findOne({ where: { code: id } })
    const appointment = await models.Appointment.findOne({ 
      where: { code: id },
      include: [
        { model: models.Patient, as: 'Patient', include: [{ model: models.User }] },
        { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] },
        { model: models.Service, as: 'Service' }
      ],
      transaction: t 
    });

    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    let canReschedule = false;
    if (['admin', 'staff'].includes(req.user.role)) {
      canReschedule = true;
    } else if (req.user.role === 'patient') {
      const patient = await models.Patient.findOne({ where: { user_id: userId }, transaction: t });
      canReschedule = patient && appointment.patient_id === patient.id;
    }

    if (!canReschedule) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền đổi lịch hẹn này' });
    }

    if (req.user.role === 'patient' && (appointment.reschedule_count || 0) >= 3) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Bạn đã hết số lần đổi lịch cho lịch hẹn này (Tối đa 3 lần).' });
    }

    const appointmentDateTime = moment(`${appointment.appointment_date} ${appointment.appointment_start_time}`, 'YYYY-MM-DD HH:mm:ss');
    const now = moment();
    const hoursRemaining = appointmentDateTime.diff(now, 'hours');

    if (req.user.role === 'patient' && hoursRemaining < 24) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Chỉ có thể đổi lịch hẹn trước ít nhất 24 tiếng.' });
    }

    const serviceId = new_service_id || appointment.service_id;
    const doctorId = new_doctor_id || appointment.doctor_id;

    const service = (serviceId === appointment.service_id) 
        ? appointment.Service 
        : await models.Service.findByPk(serviceId, { transaction });
        
    if (!service) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Dịch vụ không hợp lệ' });
    }

    const slotCheck = await getAvailableSlotsLogic(doctorId, serviceId, new_date, transaction);
    const chosenSlot = slotCheck.find(slot => slot.time === new_start_time);

    if (!chosenSlot || chosenSlot.status !== 'available') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Khung giờ mới không khả dụng. Vui lòng chọn giờ khác.'
      });
    }
    
    const [startHour, startMin] = new_start_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = startMinutes + service.duration; 
    const new_end_time = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`;

    // ================== BẮT ĐẦU ĐOẠN SỬA (CHÈN VÀO ĐÂY) ==================
    
    // 1. Kiểm tra trùng lịch Bệnh nhân (Trừ chính lịch đang sửa ra)
    if (appointment.patient_id) {
       const patientConflict = await models.Appointment.findOne({
         where: {
           patient_id: appointment.patient_id,
           appointment_date: new_date,
           id: { [Op.ne]: appointment.id }, // Quan trọng: Loại trừ chính nó
           status: { [Op.notIn]: ['cancelled', 'rejected', 'passed'] },
           [Op.and]: [
             { appointment_start_time: { [Op.lt]: new_end_time } },
             { appointment_end_time: { [Op.gt]: new_start_time } }
           ]
         },
         transaction: t
       });
       if (patientConflict) {
         await t.rollback();
         return res.status(400).json({ success: false, message: 'Khung giờ mới bị trùng với một lịch hẹn khác của bạn.' });
       }
    }

    // 2. Kiểm tra trùng lịch Bác sĩ
    const doctorConflict = await models.Appointment.findOne({
      where: {
        doctor_id: doctorId,
        appointment_date: new_date,
        id: { [Op.ne]: appointment.id }, // Loại trừ chính nó
        status: { [Op.notIn]: ['cancelled', 'rejected'] },
        [Op.and]: [
             { appointment_start_time: { [Op.lt]: new_end_time } },
             { appointment_end_time: { [Op.gt]: new_start_time } }
        ]
      },
      transaction: t
    });
    if (doctorConflict) {
       await t.rollback();
       return res.status(400).json({ success: false, message: 'Bác sĩ đã có lịch khác vào giờ này.' });
    }
    // ================== KẾT THÚC ĐOẠN SỬA ==================

    await appointment.update({
      doctor_id: doctorId,
      service_id: serviceId,
      appointment_date: new_date,
      appointment_start_time: new_start_time,
      appointment_end_time: new_end_time,
      reschedule_count: (appointment.reschedule_count || 0) + 1,
      status: 'confirmed' 
    }, { transaction: t });

    await t.commit();

    const patientUser = appointment.Patient?.User;
    const doctorUser = appointment.Doctor?.user;
    
    if (patientUser) {
      await createInternalNotification({
        user_id: patientUser.id,
        type: 'appointment',
        message: `Lịch hẹn ${appointment.code} đã được đổi thành công sang ${new_start_time} ${new_date}.`,
        link: `/lich-hen/${appointment.code}` // SỬA LINK
      });
    }
    if (doctorUser) {
       await createInternalNotification({
        user_id: doctorUser.id,
        type: 'appointment',
        message: `Lịch hẹn ${appointment.code} đã bị dời sang ${new_start_time} ${new_date}.`,
        link: '/lich-hen-bac-si'
      });
    }
    
    res.status(200).json({ success: true, message: 'Đổi lịch hẹn thành công', data: appointment });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR in rescheduleAppointment:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đổi lịch hẹn' });
  }
};

/**
 * @desc    Xác nhận lịch hẹn
 * @route   PUT /api/appointments/:id/confirm (id là code)
 * @access  Private (Admin, Staff)
 */
exports.confirmAppointment = async (req, res) => {
  // Khởi tạo transaction
  let t;
  try {
    t = await sequelize.transaction();
  } catch (err) {
    console.error('Error starting transaction:', err);
    return res.status(500).json({ success: false, message: 'Lỗi khởi tạo giao dịch' });
  }

  try {
    const { id } = req.params; 
    const { doctor_id } = req.body || {}; 

    // ✅ FIX: Thêm 'doctor' vào danh sách cho phép
    if (!req.user || !['admin', 'staff', 'doctor'].includes(req.user.role)) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xác nhận lịch hẹn' });
    }

    // Kiểm tra models có tồn tại không
    if (!models || !models.Appointment || !models.Staff) {
       await t.rollback();
       console.error('Models not loaded correctly');
       return res.status(500).json({ success: false, message: 'Lỗi cấu hình server (Models)' });
    }

    const appointment = await models.Appointment.findOne({ 
      where: { code: id },
      include: [{ model: models.Patient, as: 'Patient', include: [{ model: models.User }] }],
      transaction: t 
    });

    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    // ✅ FIX: Thêm logic kiểm tra nếu là BÁC SĨ (chỉ được duyệt lịch của mình)
    if (req.user.role === 'doctor') {
        const doctorProfile = await models.Doctor.findOne({ 
            where: { user_id: req.user.id },
            transaction: t
        });

        if (!doctorProfile || appointment.doctor_id !== doctorProfile.id) {
            await t.rollback();
            return res.status(403).json({ 
                success: false, 
                message: 'Bạn chỉ có thể xác nhận lịch hẹn được phân công cho chính mình.' 
            });
        }
    }

    // --- LOGIC STAFF QUẢN LÝ ---
    if (req.user.role === 'staff') {
      const staffProfile = await models.Staff.findOne({ where: { user_id: req.user.id }, transaction: t });

      if (!staffProfile) {
         await t.rollback();
         return res.status(403).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên của bạn.' });
      }

      // Parse JSON an toàn
      let managedIds = [];
      try {
        let managedData = staffProfile.managed_doctors;
        // Nếu là chuỗi thì parse, nếu là object thì dùng luôn
        if (typeof managedData === 'string') {
           managedData = JSON.parse(managedData);
        }
        managedIds = (managedData?.doctor_ids || []).map(id => Number(id));
      } catch (e) {
        console.error('Error parsing managed_doctors:', e);
        managedIds = [];
      }
      
      const appointmentDoctorId = Number(appointment.doctor_id);
      
      // Nếu lịch hẹn đã có bác sĩ, và bác sĩ đó KHÔNG nằm trong danh sách quản lý
      if (appointmentDoctorId && !managedIds.includes(appointmentDoctorId)) {
         await t.rollback();
         return res.status(403).json({ 
           success: false, 
           message: 'Bạn không có quyền phê duyệt lịch cho bác sĩ này (không thuộc phạm vi quản lý).' 
         });
      }
    }
    // ---------------------------

    if (appointment.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Chỉ có thể xác nhận lịch hẹn đang chờ' });
    }

    let updateData = { status: 'confirmed' };
    
    // Kiểm tra trùng lịch nếu có đổi bác sĩ
    if (doctor_id && doctor_id !== appointment.doctor_id) {
      const conflict = await models.Appointment.findOne({
        where: {
          doctor_id,
          appointment_date: appointment.appointment_date,
          appointment_start_time: appointment.appointment_start_time,
          status: { [Op.notIn]: ['cancelled'] },
          id: { [Op.ne]: appointment.id }
        },
        transaction: t
      });

      if (conflict) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Bác sĩ đã có lịch hẹn vào thời gian này' });
      }
      updateData.doctor_id = doctor_id;
    }

    await appointment.update(updateData, { transaction: t });
    await t.commit();

    // Gửi thông báo (Chạy ngoài transaction để không block response nếu lỗi)
    try {
        const patientUserId = appointment.Patient?.User?.id;
        if (patientUserId) {
            await createInternalNotification({
            user_id: patientUserId,
            type: 'appointment',
            message: `Lịch hẹn ${appointment.code} của bạn đã được xác nhận.`,
            link: `/lich-hen/${appointment.code}`
            });
        }
    } catch (notifyError) {
        console.error('Notification error (ignorable):', notifyError);
    }

    res.status(200).json({ success: true, message: 'Xác nhận lịch hẹn thành công' });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR in confirmAppointment:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xác nhận lịch hẹn' });
  }
};
/**
 * @desc    Hoàn thành lịch hẹn
 * @route   PUT /api/appointments/:id/complete (id là code)
 * @access  Private (Admin, Staff, Doctor)
 */
exports.completeAppointment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // 'id' là 'code'
    const { medicalResult, prescription, nextAppointment, files = [] } = req.body;
    const userId = req.user.id;

    if (!['doctor', 'admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' });
    }

    if (!medicalResult || !medicalResult.trim()) {
      return res.status(400).json({ success: false, message: 'Kết quả khám là bắt buộc' });
    }

    // SỬA: Dùng findOne({ where: { code: id } })
    const appointment = await models.Appointment.findOne({
      where: { code: id },
      include: [{ model: models.Patient, as: 'Patient', include: [{ model: models.User }] }, { model: models.Service, as: 'Service' }],
      transaction: t
    });

    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    if (appointment.status !== 'confirmed' && appointment.status !== 'in_progress') { // Cho phép hoàn thành 'in_progress'
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Chỉ có thể hoàn thành lịch hẹn đã xác nhận hoặc đang khám' });
    }

    if (req.user.role === 'doctor') {
      const doctor = await models.Doctor.findOne({ where: { user_id: userId }, transaction: t });
      if (!doctor || appointment.doctor_id !== doctor.id) {
        await t.rollback();
        return res.status(403).json({ success: false, message: 'Bạn chỉ có thể hoàn thành lịch hẹn của mình' });
      }
    }

    let uploadedFiles = [];
    if (files.length > 0) {
      for (const file of files) {
        try {
          const result = await uploadFile(file.data, file.name, 'medical');
          uploadedFiles.push({ name: file.name, url: result.url, type: file.type, size: file.size });
        } catch (err) { console.error('Upload error:', err); }
      }
    }

    const medicalRecordData = {
      appointment_id: appointment.id,
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      service_id: appointment.service_id,
      diagnosis: medicalResult.trim(),
      prescription: prescription?.trim() || null,
      next_appointment: nextAppointment?.trim() || null,
      medical_files: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null,
      created_at: new Date()
    };
    await models.MedicalRecord.upsert(medicalRecordData, { transaction: t });

    await appointment.update({
      status: 'completed',
      medical_result: medicalResult.trim(),
      prescription: prescription?.trim() || null,
      next_appointment: nextAppointment?.trim() || null,
      medical_files: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null,
      completed_at: new Date(),
      completed_by: userId
    }, { transaction: t });

    await t.commit();

    const patientUserId = appointment.Patient?.User?.id;
    if (patientUserId) {
      await createInternalNotification({ // SỬA: Dùng helper
        user_id: patientUserId,
        type: 'appointment',
        message: `Lịch hẹn ${appointment.code} đã hoàn thành. Vui lòng xem kết quả khám.`,
        link: `/ket-qua-kham/${appointment.id}` // Link đến kết quả
      });
    }

    res.status(200).json({ success: true, message: 'Hoàn thành lịch hẹn thành công', data: { uploadedFiles } });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR in completeAppointment:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi hoàn thành lịch hẹn' });
  }
};

/**
 * @desc    Lấy tất cả lịch hẹn (Admin/Staff)
 * @route   GET /api/appointments/admin/all
 * @access  Private (Admin, Staff)
 */
exports.getAllAppointments = async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Chỉ admin hoặc staff mới có thể truy cập' });
    }

    const { status, doctor_id, service_id, date_from, date_to, search, page = 1, limit = 20 } = req.query;

    let whereCondition = {};

    // [CODE MỚI - START] LOGIC PHÂN QUYỀN STAFF VẬN HÀNH
    // Nếu là Staff -> Chỉ hiện lịch hẹn của bác sĩ mình quản lý
    if (req.user.role === 'staff') {
      const staff = await models.Staff.findOne({ where: { user_id: req.user.id } });
      const managedDoctorIds = staff?.managed_doctors?.doctor_ids || [];

      if (managedDoctorIds.length > 0) {
        if (doctor_id) {
          // Nếu staff đang tìm kiếm 1 bác sĩ cụ thể -> Check quyền
          if (!managedDoctorIds.includes(parseInt(doctor_id))) {
             return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } });
          }
          // Nếu hợp lệ, logic gán where.doctor_id bên dưới sẽ chạy
        } else {
           // Nếu không tìm cụ thể -> Tự động filter theo list managed
           whereCondition.doctor_id = { [Op.in]: managedDoctorIds }; // ✅ ĐÃ SỬA: dùng 'whereCondition'
        }
      } else {
         // Staff không quản lý ai
         return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } });
      }
    }
    // [CODE MỚI - END]

    // --- BẮT ĐẦU SỬA LOGIC LỌC ---
    // 1. Xử lý quyền hạn Staff và Filter Bác sĩ
    if (req.user.role === 'staff') {
      const staffProfile = await models.Staff.findOne({ where: { user_id: req.user.id } });
      let managedData = staffProfile?.managed_doctors;
      if (typeof managedData === 'string') {
          try { managedData = JSON.parse(managedData); } catch (e) { managedData = {}; }
      }
      const managedDoctorIds = (managedData?.doctor_ids || []).map(id => Number(id));
      if (managedDoctorIds.length === 0) {
        return res.status(200).json({ success: true, data: [], statistics: [], pagination: {}, message: 'Chưa được phân công bác sĩ.' });
      }

      // Nếu Staff chọn lọc theo 1 bác sĩ cụ thể
      if (doctor_id) {
        // Kiểm tra xem bác sĩ đó có thuộc quyền quản lý không
        if (managedDoctorIds.includes(Number(doctor_id))) { // SỬA: Number()
          whereCondition.doctor_id = Number(doctor_id);     // SỬA: Number()
        } else {
          // Nếu chọn bác sĩ không thuộc quyền quản lý -> Trả về rỗng hoặc lỗi
          whereCondition.doctor_id = -1; // Hack để không ra kết quả nào
        }
      } else {
        // Nếu không chọn ai -> Lấy tất cả bác sĩ được phân công
        whereCondition.doctor_id = { [Op.in]: managedDoctorIds };
      }
    } else {
      // Nếu là Admin hoặc role khác, lọc bình thường theo query
      if (doctor_id) whereCondition.doctor_id = doctor_id;
    }

    // 2. Các filter chung khác
    // [SỬA] Cho phép lọc nhiều trạng thái cách nhau bằng dấu phẩy
    if (status && status !== 'all') {
      if (status.includes(',')) {
        whereCondition.status = { [Op.in]: status.split(',') };
      } else {
        whereCondition.status = status;
      }
    }
    if (service_id) whereCondition.service_id = service_id;
    if (date_from && date_to) {
      whereCondition.appointment_date = { [Op.between]: [new Date(date_from), new Date(date_to)] };
    }


    // SỬA ĐỔI: Bổ sung 'MedicalRecord' vào include
    let include = [
      { 
        model: models.Patient, 
        as: 'Patient', 
        include: [{ 
          model: models.User, 
          attributes: ['full_name', 'email', 'phone'], 
          required: false 
        }] 
      },
      { 
        model: models.Doctor, 
        as: 'Doctor', 
        include: [{ model: models.User, as: 'user', attributes: ['full_name', 'email'] }] 
      },
      { model: models.Service, as: 'Service' },
      { model: models.Payment, as: 'Payment' },
      
      // BỔ SUNG MỚI
      // BỔ SUNG MỚI - ĐÃ SỬA: Lấy thêm đơn thuốc và chẩn đoán
      {
        model: models.MedicalRecord,
        as: 'MedicalRecord',
        attributes: ['id', 'created_at', 'updated_at', 'prescription_json', 'diagnosis'], 
        required: false 
      }
      // KẾT THÚC BỔ SUNG
    ];

    if (search) {
      const searchLike = { [Op.like]: `%${search}%` };
      whereCondition[Op.or] = [
          { code: searchLike },
          { guest_name: searchLike },
          { guest_phone: searchLike },
          { guest_email: searchLike },
          { '$Patient.User.full_name$': searchLike },
          { '$Patient.User.phone$': searchLike },
          { '$Patient.User.email$': searchLike }
      ];
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await models.Appointment.findAndCountAll({
      where: whereCondition,
      include,
      order: [['appointment_date', 'DESC'], ['appointment_start_time', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true,
      subQuery: false
    });

    const statusStats = await models.Appointment.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: rows,
      statistics: statusStats,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: parseInt(page), itemsPerPage: parseInt(limit) }
    });

  } catch (error) {
    console.error('ERROR in getAllAppointments:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách lịch hẹn' });
  }
};


/**
 * @desc    Lấy lịch hẹn của bác sĩ được Staff quản lý
 * @route   GET /api/appointments/staff/managed
 * @access  Private (Staff)
 */
exports.getStaffManagedAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. Lấy Staff profile
    const staffProfile = await models.Staff.findOne({ 
      where: { user_id: userId } 
    });
    
    if (!staffProfile) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên' });
    }
    
    // 2. Lấy danh sách doctor_id được phân công
    const managedDoctorIds = staffProfile.managed_doctors?.doctor_ids || [];
    
    if (managedDoctorIds.length === 0) {
      return res.status(200).json({ 
        success: true, 
        data: [],
        message: 'Bạn chưa được phân công quản lý bác sĩ nào.'
      });
    }
    
    // 3. Query lịch hẹn
    const { status, date_from, date_to, doctor_id } = req.query;
    
    let whereCondition = {
      doctor_id: { [Op.in]: managedDoctorIds }
    };
    
    // Nếu có filter theo bác sĩ cụ thể
    if (doctor_id && managedDoctorIds.includes(parseInt(doctor_id))) {
      whereCondition.doctor_id = parseInt(doctor_id);
    }
    
    if (status && status !== 'all') whereCondition.status = status;
    if (date_from && date_to) {
      whereCondition.appointment_date = { [Op.between]: [date_from, date_to] };
    }
    
    const appointments = await models.Appointment.findAll({
      where: whereCondition,
      include: [
        { 
          model: models.Patient, 
          as: 'Patient', 
          required: false, 
          include: [{ 
            model: models.User, 
            attributes: ['full_name', 'email', 'phone'],
            required: false 
          }] 
        },
        { 
          model: models.Doctor, 
          as: 'Doctor', 
          include: [
            { model: models.User, as: 'user', attributes: ['full_name', 'email'] },
            { model: models.Specialty, as: 'specialty', attributes: ['name'] }
          ] 
        },
        { model: models.Service, as: 'Service' },
        { model: models.MedicalRecord, as: 'MedicalRecord' },
        
        // SỬA: Thêm Payment để frontend hiển thị trạng thái thanh toán đúng
        { 
            model: models.Payment, 
            as: 'Payment',
            required: false 
        }
      ],
      order: [['appointment_date', 'DESC'], ['appointment_start_time', 'DESC']]
    });
    
    res.status(200).json({ 
      success: true, 
      data: appointments,
      managedDoctorIds: managedDoctorIds
    });
    
  } catch (error) {
    console.error('ERROR in getStaffManagedAppointments:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

/**
 * Staff lâm sàng: Lấy danh sách lịch hẹn theo ngày để nhập hồ sơ y tế
 * Chỉ lấy lịch hẹn khám dịch vụ (appointment_type = 'offline')
 * Sắp xếp theo queue_number (STT khám), rồi theo giờ hẹn
 * @route GET /api/appointments/staff/clinical-queue
 */
// =================================================================
// 4. LẤY HÀNG ĐỢI LÂM SÀNG (BÁC SĨ / LỄ TÂN GỌI SỐ)
// =================================================================
exports.getClinicalQueue = async (req, res) => {
  try {
    const { date, doctor_id, status, search } = req.query;
    const where = { appointment_type: 'offline' }; // Chỉ xuất hàng đợi Offline

    where.appointment_date = date && date !== 'all' ? date : new Date().toISOString().split('T')[0];

    if (doctor_id) where.doctor_id = parseInt(doctor_id);

    const relevantStatuses = ['confirmed', 'upcoming', 'waiting_pay', 'waiting_exam', 'in_progress', 'completed'];
    where.status = status && status !== 'all' ? status : { [Op.in]: relevantStatuses };

    const { literal } = require('sequelize');
    const appointments = await models.Appointment.findAll({
      where,
      include: [
        { model: models.Patient, as: 'Patient', include: [{ model: models.User }] },
        { model: models.Service, as: 'Service' }
      ],
      // [QUAN TRỌNG]: THUẬT TOÁN XẾP HÀNG XEN KẼ
      // 1. Ai đang khám (in_progress) thì đứng số 1.
      // 2. Mã U (Priority) xếp trên mã N (Normal).
      // 3. Xếp theo số thứ tự hiển thị tăng dần.
      order: [
        [literal(`CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END`), 'ASC'], 
        [literal(`CASE WHEN display_queue LIKE 'U%' THEN 1 WHEN display_queue LIKE 'N%' THEN 2 ELSE 3 END`), 'ASC'], 
        [literal('CAST(SUBSTRING(display_queue, 2) AS UNSIGNED)'), 'ASC'], 
        ['appointment_start_time', 'ASC'] // Rớt xuống đây nếu chưa cấp số (Khách hẹn chưa tới viện)
      ]
    });

    res.status(200).json({ success: true, data: appointments });

  } catch (error) {
    console.error('ERROR in getClinicalQueue:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// =================================================================
// ======================= RATING & REVIEW =========================
// =================================================================

/**
 * @desc    Review lịch hẹn
 * @route   POST /api/appointments/:id/review (id là code)
 * @access  Private (Patient)
 */
exports.reviewAppointment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // 'id' là 'code'
    const { rating, comment, images = [] } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'patient') {
      return res.status(403).json({ success: false, message: 'Chỉ bệnh nhân mới có thể đánh giá' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá phải từ 1 đến 5 sao' });
    }

    // SỬA: Dùng findOne({ where: { code: id } })
    const appointment = await models.Appointment.findOne({ 
      where: { code: id }, 
      transaction: t 
    });
    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    if (appointment.status !== 'completed') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Chỉ có thể đánh giá lịch hẹn đã hoàn thành' });
    }

    const existingReview = await models.Review.findOne({ where: { appointment_id: appointment.id }, transaction: t });
    if (existingReview) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Lịch hẹn này đã được đánh giá' });
    }

    let uploadedImages = [];
    if (images.length > 0) {
      for (const img of images) {
        try {
          const result = await uploadFile(img.data, img.name, 'reviews');
          uploadedImages.push(result.url);
        } catch (err) {
          console.error('Upload review image error:', err);
        }
      }
    }

    const review = await models.Review.create({
      appointment_id: appointment.id, // Dùng PK
      patient_id: appointment.patient_id,
      service_id: appointment.service_id,
      doctor_id: appointment.doctor_id,
      rating,
      comment: comment?.trim() || null,
      images: uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : null
    }, { transaction: t });

    await t.commit();

    res.status(201).json({ success: true, data: review, message: 'Đánh giá thành công!' });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR in reviewAppointment:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo đánh giá' });
  }
};

/**
 * @desc    Cập nhật chi tiết (Địa chỉ, Trạng thái) (Admin/Doctor/Staff)
 * @route   PUT /api/appointments/:id/details (id là code)
 * @access  Private (Admin, Staff, Doctor)
 */
exports.updateAppointmentDetails = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // 'id' là 'code'
    const { status, appointment_address, cancel_reason } = req.body; 
    const userId = req.user.id;

    // SỬA: Dùng findOne({ where: { code: id } })
    const appointment = await models.Appointment.findOne({
      where: { code: id },
      transaction: t
    });
    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }
    
    const doctorProfile = await models.Doctor.findOne({ where: { user_id: userId }, transaction: t });
    const isDoctorOfAppointment = (req.user.role === 'doctor' && doctorProfile && appointment.doctor_id === doctorProfile.id);
    const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);

    if (!isDoctorOfAppointment && !isAdminOrStaff) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật lịch hẹn này' });
    }

    let updateData = {};
    if (status) {
      if (status === 'cancelled' && (!cancel_reason || !cancel_reason.trim())) {
         await t.rollback();
         return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do hủy (khi BS/Admin hủy)' });
      }
      updateData.status = status;
      if (status === 'cancelled') {
         updateData.cancel_reason = cancel_reason;
         updateData.cancelled_by = `${req.user.role}:${userId}`;
         updateData.cancelled_at = new Date();
      }
      if (status === 'completed') {
         updateData.completed_at = new Date();
         updateData.completed_by = userId;
      }
    }
    
    // Cập nhật địa chỉ (cho phép xóa nếu gửi chuỗi rỗng)
    if (appointment_address !== undefined) { 
      updateData.appointment_address = appointment_address;
    }

    await appointment.update(updateData, { transaction: t });
    await t.commit();
    
    // (Gửi thông báo/email về việc cập nhật)

    res.status(200).json({ success: true, message: 'Cập nhật chi tiết lịch hẹn thành công', data: appointment });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR in updateAppointmentDetails:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật' });
  }
};

/**
 * @desc    Lấy danh sách lịch hẹn của BÁC SĨ đăng nhập
 * @route   GET /api/appointments/doctor/my-appointments
 * @access  Private (Doctor)
 */
exports.getDoctorAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    // Tìm profile bác sĩ từ user_id
    const doctor = await models.Doctor.findOne({
      where: { user_id: userId }
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bác sĩ' });
    }

    const appointments = await models.Appointment.findAll({
      where: { doctor_id: doctor.id }, // Đã sửa: Xác định rõ điều kiện lọc
      include: [
        {
          model: models.Patient,
          as: 'Patient',
          required: false,
          include: [{
            model: models.User,
            attributes: ['full_name', 'email', 'phone', 'avatar_url'], // Đã sửa thành 'avatar_url' cho khớp với User.js
            required: false
          }]
        },
        { 
          model: models.Doctor, 
          as: 'Doctor', 
          include: [
            { model: models.User, as: 'user', attributes: ['full_name', 'email'] },
            { model: models.Specialty, as: 'specialty', attributes: ['name'] }
          ] 
        },
        { model: models.Service, as: 'Service' },
        { model: models.MedicalRecord, as: 'MedicalRecord' }
      ],
      order: [['appointment_date', 'DESC'], ['appointment_start_time', 'DESC']]
    });

    res.status(200).json({ success: true, data: appointments });

  } catch (error) {
    console.error('ERROR in getDoctorAppointments:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách lịch hẹn của bác sĩ', error: error.message });
  }
};

/**
 * @desc    Khôi phục mã lịch hẹn (Public)
 * @route   POST /api/appointments/recover-codes
 * @access  Public
 */
exports.recoverAppointmentCodes = async (req, res) => {
  try {
    const { contact, date } = req.body;

    if (!contact || !date) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Email/SĐT và Ngày khám.' });
    }

    // Xác định contact là email hay phone
    const isEmail = contact.includes('@');
    const contactQuery = isEmail ? { email: contact } : { phone: contact };
    const guestQuery = isEmail ? { guest_email: contact } : { guest_phone: contact };

    let patientIds = [];

    // 1. Tìm user (nếu có)
    const user = await models.User.findOne({ where: contactQuery });
    if (user && user.role === 'patient') {
      const patient = await models.Patient.findOne({ where: { user_id: user.id } });
      if (patient) {
        patientIds.push(patient.id);
      }
    }

    // 2. Tìm tất cả lịch hẹn (cả guest và user)
    const appointments = await models.Appointment.findAll({
      where: {
        appointment_date: date,
        [Op.or]: [
          guestQuery, // Tìm theo guest
          { patient_id: { [Op.in]: patientIds } } // Tìm theo patient
        ]
      },
      include: [
        { model: models.Service, as: 'Service', attributes: ['name'] }
      ],
      order: [['appointment_start_time', 'ASC']]
    });

    // 3. Gửi email (luôn trả về success để tránh lộ thông tin)
    if (appointments.length > 0) {
      const emailData = {
        patientName: appointments[0].guest_name || user?.full_name || 'Quý khách',
        appointmentDate: new Date(date).toLocaleDateString('vi-VN'),
        contact: contact,
        appointments: appointments.map(apt => ({
          code: apt.code,
          time: apt.appointment_start_time.slice(0, 5),
          serviceName: apt.Service?.name || 'Dịch vụ'
        }))
      };

      // Gửi email (nếu là email)
      if (isEmail) {
        emailSender.sendEmail({
          to: contact,
          subject: `[Easy Medify] Thông tin lịch hẹn ngày ${emailData.appointmentDate}`,
          template: 'appointment_code_recovery', // Template mới
          data: emailData
        });
      } else {
        // (Nếu có tích hợp SMS)
        // smsSender.sendSMS(contact, `Ban co ${appointments.length} lich hen...`);
      }
    }

    // Luôn trả về thành công để bảo mật
    res.status(200).json({ 
      success: true, 
      message: 'Nếu thông tin chính xác, chúng tôi đã gửi email (hoặc SMS) chứa các mã lịch hẹn tìm được đến bạn.' 
    });

  } catch (error) {
    console.error('ERROR in recoverAppointmentCodes:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
};

exports.getAppointmentsForCalendar = async (req, res) => {
  try {
    const { user_id, date_from, date_to } = req.query;

    if (!user_id || !date_from || !date_to) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu user_id, date_from hoặc date_to' 
      });
    }

    // 1. Tìm doctor_id từ user_id
    // (Giả sử model Doctor của bạn liên kết với User qua user_id)
    const doctor = await models.Doctor.findOne({ 
      where: { user_id: user_id } 
    });

    // Nếu không tìm thấy doctor (có thể là staff), trả về mảng rỗng
    if (!doctor) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 2. Lấy Appointments dựa trên doctor_id
    const appointments = await models.Appointment.findAll({
      where: {
        doctor_id: doctor.id,
        appointment_date: {
          [Op.between]: [date_from, date_to]
        },
        // Chỉ lấy các lịch hẹn đã xác nhận hoặc đang diễn ra
        status: {
          [Op.in]: ['confirmed', 'in_progress', 'completed']
        }
      },
      // Lấy thêm thông tin bệnh nhân nếu là tài khoản
      include: [
        { model: models.Patient, as: 'Patient', attributes: ['full_name'] }
      ],
      order: [['appointment_date', 'ASC'], ['appointment_start_time', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: appointments
    });

  } catch (error) {
    console.error('ERROR in getAppointmentsForCalendar:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch hẹn',
      error: error.message
    });
  }
};

/**
 * Update appointment workflow status (admin/staff/doctor manual override)
 * PUT /api/appointments/:id/status
 * Body: { status: 'pending'|'confirmed'|'upcoming'|'in_progress'|'completed'|'passed'|'cancelled' }
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'upcoming', 'in_progress', 'completed', 'passed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Phải là một trong: ${validStatuses.join(', ')}`
      });
    }

    const appointment = await models.Appointment.findOne({
      where: isNaN(id) ? { code: id } : { [Op.or]: [{ id }, { code: id }] }
    });
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn'
      });
    }

    // Update status
    const oldStatus = appointment.status;
    appointment.status = status;
    await appointment.save();

    // Log audit trail
    console.log(`Appointment ${id} status changed: ${oldStatus} → ${status} by user ${req.user?.id}`);

    // Create notification if status changed to confirmed
    if (status === 'confirmed' && oldStatus !== 'confirmed') {
      const patient = await models.Patient.findByPk(appointment.patient_id);
      if (patient?.user_id) {
        await createInternalNotification(
          patient.user_id,
          'appointment_confirmed',
          `Lịch hẹn của bạn đã được xác nhận: ${appointment.appointment_date} lúc ${appointment.appointment_start_time}`,
          { appointment_id: id }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: appointment
    });

  } catch (error) {
    console.error('ERROR in updateStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái',
      error: error.message
    });
  }
};

/**
 * Admin/Staff: Cập nhật thông tin thanh toán (Thu tiền tại quầy)
 * [FIX FINAL]: Nhận đúng payment_status từ Frontend và đồng bộ sang bảng Payment
 * Route: PUT /api/appointments/:id/payment
 */
exports.updatePaymentInfo = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // Đây là CODE (VD: AP-2026...) hoặc ID
    // [QUAN TRỌNG] Lấy cả payment_status và amount từ body frontend gửi lên
    const { payment_status, payment_method, paid_at, amount } = req.body;

    // 1. TÌM LỊCH HẸN BẰNG CODE (Ưu tiên) HOẶC ID
    let appointment = await models.Appointment.findOne({ 
        where: { code: id }, 
        include: [{ model: models.Service, as: 'Service' }],
        transaction: t 
    });
    
    if (!appointment && !isNaN(id)) {
        appointment = await models.Appointment.findByPk(id, {
            include: [{ model: models.Service, as: 'Service' }],
            transaction: t
        });
    }

    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    const normalizedMethod = payment_method === 'transfer' ? 'bank_transfer' : payment_method;
    const resolvedPaymentStatus = payment_status || 'paid_at_clinic';

    // 2. CẬP NHẬT TRẠNG THÁI LỊCH HẸN (APPOINTMENT)
    const updates = {};
    
    // [FIX LOGIC] Tôn trọng dữ liệu Frontend gửi lên
    // Nếu Frontend gửi 'paid_at_clinic' -> Lưu y nguyên 'paid_at_clinic'
    updates.payment_status = resolvedPaymentStatus;
    
    if (normalizedMethod) updates.payment_method = normalizedMethod;
    if (paid_at) updates.paid_at = new Date(paid_at);
    
    // Logic phụ: Nếu đã thanh toán (dù online hay tại quầy) -> Xác nhận lịch luôn
    if (updates.payment_status === 'paid_at_clinic' || updates.payment_status === 'paid_online') {
        updates.status = 'confirmed'; 
        // Nếu chưa có giờ thanh toán thì lấy giờ hiện tại
        if (!updates.paid_at) updates.paid_at = new Date();
    }

    await appointment.update(updates, { transaction: t });

    // 3. ĐỒNG BỘ SANG BẢNG THANH TOÁN (PAYMENT)
    // Để xem chi tiết hiển thị đúng số tiền và trạng thái
    let payment = await models.Payment.findOne({ 
        where: { appointment_id: appointment.id }, 
        transaction: t 
    });

    const paymentData = {
      user_id: appointment.patient_id || (req.user ? req.user.id : 1),
      appointment_id: appointment.id,
      amount: amount || appointment.Service?.price || 0, // Ưu tiên lấy số tiền thực thu gửi từ Frontend
      method: normalizedMethod || payment?.method || 'cash',
      status: 'paid', // Bảng Payment chỉ cần biết là 'paid' (đã thu tiền)
      transaction_id: `MANUAL_${Date.now()}`,
      payment_info: JSON.stringify({ 
          updated_by: req.user ? req.user.id : 'staff', 
          note: 'Thu ngân xác nhận tại quầy'
      })
    };

    if (payment) {
      await payment.update(paymentData, { transaction: t });
    } else {
      paymentData.code = `PY${Date.now()}`; 
      await models.Payment.create(paymentData, { transaction: t });
    }

    console.log(`[Appointment ${id}] Đã đồng bộ payment record: status=${paymentData.status}, method=${paymentData.method}, amount=${paymentData.amount}`);

    const paymentSuccessContext = await models.Appointment.findByPk(appointment.id, {
      include: [
        { model: models.Service, as: 'Service' },
        { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] },
        { model: models.Patient, as: 'Patient', include: [{ model: models.User }] }
      ],
      transaction: t
    });

    const successPatientEmail = paymentSuccessContext?.Patient?.User?.email || appointment.guest_email;
    const successPatientName = paymentSuccessContext?.Patient?.User?.full_name || appointment.guest_name || 'Quý khách';
    const successDoctorName = paymentSuccessContext?.Doctor?.user?.full_name || 'Bác sĩ';
    const successServiceName = paymentSuccessContext?.Service?.name || 'Dịch vụ y tế';

    if (successPatientEmail) {
      console.log(`[Appointment ${id}] Gửi email xác nhận thanh toán tại quầy tới ${successPatientEmail}`);
      await emailSender.sendEmail({
        to: successPatientEmail,
        subject: `✅ Thanh toán thành công - Lịch hẹn ${appointment.code} đã được xác nhận`,
        template: 'payment_success_invoice',
        data: {
          patientName: successPatientName,
          appointmentCode: appointment.code,
          serviceName: successServiceName,
          doctorName: successDoctorName,
          appointmentTime: `${appointment.appointment_start_time.slice(0, 5)} - ${new Date(appointment.appointment_date).toLocaleDateString('vi-VN')}`,
          paymentMethod: normalizedMethod === 'bank_transfer' ? 'Chuyển khoản Ngân hàng' : 'Tiền mặt tại quầy',
          amount: paymentData.amount,
          link: `${process.env.CLIENT_URL || 'http://localhost:3000'}/lich-hen/${appointment.code}`
        }
      });
    } else {
      console.log(`[Appointment ${id}] Không tìm thấy email bệnh nhân để gửi hóa đơn.`);
    }

    // 4. GỬI THÔNG BÁO CHO BÁC SĨ NẾU APPOINTMENT ĐƯỢC XÁC NHẬN
    if (updates.status === 'confirmed') {
      const notificationHelper = require('../utils/notificationHelper');
      const doctorNotifications = [];
      
      // Load lại doctor & staff info
      const fullAppt = await models.Appointment.findByPk(appointment.id, {
        include: [
          { model: models.Service, as: 'Service' },
          { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] },
          { model: models.Patient, as: 'Patient', include: [{ model: models.User }] }
        ],
        transaction: t
      });

      if (fullAppt) {
        const patientName = fullAppt.Patient?.User?.full_name || fullAppt.guest_name || 'Quý khách';
        const serviceName = fullAppt.Service?.name || 'Dịch vụ y tế';
        const timeStr = `${fullAppt.appointment_start_time.slice(0,5)} - ${new Date(fullAppt.appointment_date).toLocaleDateString('vi-VN')}`;

        // Gửi notification cho Bác sĩ
        if (fullAppt.Doctor?.user_id) {
          doctorNotifications.push({
            user_id: fullAppt.Doctor.user_id,
            type: 'appointment_confirmed',
            title: `[Xác nhận] Lịch hẹn ${fullAppt.code}`,
            message: `Lịch hẹn ${fullAppt.code} được xác nhận: ${patientName} - ${serviceName} lúc ${timeStr}`,
            link: `/lich-hen/${fullAppt.code}`,
            data: { appointment_id: fullAppt.id, appointment_code: fullAppt.code }
          });
        }

        // Gửi notification cho Staff
        if (fullAppt.staff_id) {
          const staffUser = await models.User.findOne({ 
            where: { role: 'staff', id: fullAppt.staff_id },
            transaction: t
          });
          if (staffUser) {
            doctorNotifications.push({
              user_id: staffUser.id,
              type: 'appointment_confirmed',
              title: `[Xác nhận] Lịch hẹn ${fullAppt.code}`,
              message: `Lịch hẹn ${fullAppt.code} được xác nhận: ${patientName} - ${serviceName} lúc ${timeStr}`,
              link: `/lich-hen/${fullAppt.code}`,
              data: { appointment_id: fullAppt.id, appointment_code: fullAppt.code }
            });
          }
        }

        if (doctorNotifications.length > 0) {
          await notificationHelper.createNotifications(doctorNotifications);
          console.log(`[Appointment ${code}] Gửi thông báo xác nhận cho ${doctorNotifications.length} người`);
        }
      }
    }

    await t.commit();
    res.json({ success: true, message: 'Thu tiền thành công!', data: appointment });

  } catch (error) {
    await t.rollback();
    console.error('ERROR updatePaymentInfo:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật: ' + error.message });
  }
};

/**
 * @desc    Check-in tại quầy (Cấp số chuẩn MAX + 1)
 */
// =================================================================
// 3. CHECK-IN (LỄ TÂN CẤP SỐ THỨ TỰ TẠI QUẦY)
// =================================================================
exports.checkIn = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { code } = req.params;
    const { type } = req.body; 

    const appointment = await models.Appointment.findOne({ where: { code }, transaction: t });
    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    const today = moment().format('YYYY-MM-DD'); 
    let updateData = { checked_in_at: new Date() };

    // --- LOGIC CẤP SỐ THANH TOÁN ---
    if (type === 'payment') {
      const maxRecord = await models.Appointment.findOne({
        where: { appointment_date: today, payment_queue_number: { [Op.ne]: null } },
        order: [['payment_queue_number', 'DESC']],
        attributes: ['payment_queue_number'],
        transaction: t
      });
      updateData.payment_queue_number = (maxRecord?.payment_queue_number || 0) + 1;
      updateData.status = 'waiting_pay'; 
    } 
    
    // --- LOGIC CẤP SỐ LÂM SÀNG (BÁC SĨ KHÁM) ---
    else if (type === 'clinical') {
      const queueType = appointment.queue_type || 'normal'; 
      const prefix = queueType === 'priority' ? 'U' : 'N'; // U: Đặt lịch trước | N: Vãng lai

      // Cấp số thứ tự nguyên (để lưu DB)
      const maxQueueNumRecord = await models.Appointment.findOne({
        where: { appointment_date: today, doctor_id: appointment.doctor_id, queue_number: { [Op.ne]: null } },
        order: [['queue_number', 'DESC']],
        attributes: ['queue_number'],
        transaction: t
      });
      const nextQueueNumber = (maxQueueNumRecord?.queue_number || 0) + 1;

      // Cấp chuỗi hiển thị theo từng Prefix U hoặc N riêng biệt
      const { literal } = require('sequelize');
      const maxDisplayRecord = await models.Appointment.findOne({
        where: { 
          appointment_date: today, doctor_id: appointment.doctor_id, 
          display_queue: { [Op.like]: `${prefix}%` } 
        },
        order: [[literal('CAST(SUBSTRING(display_queue, 2) AS UNSIGNED)'), 'DESC']],
        attributes: ['display_queue'],
        transaction: t
      });
      
      let nextDisplayNum = 1;
      if (maxDisplayRecord && maxDisplayRecord.display_queue) {
         nextDisplayNum = parseInt(maxDisplayRecord.display_queue.substring(1)) + 1;
      }

      updateData.queue_number = nextQueueNumber;
      updateData.display_queue = `${prefix}${String(nextDisplayNum).padStart(2, '0')}`;
      updateData.status = 'waiting_exam';
    }

    await appointment.update(updateData, { transaction: t });
    await t.commit();

    res.json({ 
      success: true, 
      message: `Cấp số thành công: ${updateData.display_queue || updateData.payment_queue_number}`,
      data: appointment
    });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cấp số' });
  }
};

// =================================================================
// 2. TẠO LỊCH WALK-IN (LỄ TÂN TẠO CHO KHÁCH TẠI QUẦY)
// =================================================================
exports.createWalkInAppointment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      guest_name, guest_phone, guest_email, guest_dob, guest_gender,
      service_id, doctor_id, appointment_date, appointment_start_time,
      payment_method = 'cash', reason
    } = req.body;

    if (!guest_name || !guest_phone || !service_id || !doctor_id || !appointment_date) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    const service = await models.Service.findByPk(service_id, { transaction: t });
    
    // Khách vãng lai lấy số tại quầy luôn là Offline và Normal Priority
    const queue_type = 'normal'; 
    const appointment_time = appointment_start_time || moment().format('HH:mm:ss');

    const maxPayRecord = await models.Appointment.findOne({
      where: { appointment_date, payment_queue_number: { [Op.ne]: null } },
      order: [['payment_queue_number', 'DESC']],
      attributes: ['payment_queue_number'],
      transaction: t
    });
    const payment_queue_number = (maxPayRecord?.payment_queue_number || 0) + 1;

    const appointment = await models.Appointment.create({
      guest_name, guest_phone, guest_email, guest_dob, guest_gender,
      doctor_id, service_id, specialty_id: service.specialty_id,
      appointment_date,
      appointment_start_time: appointment_time, // Giờ bệnh nhân xuất hiện
      appointment_end_time: null, 
      appointment_type: 'offline',
      status: 'waiting_pay', // Tự động đẩy qua hàng chờ thu ngân
      payment_status: 'unpaid',
      payment_method,
      payment_queue_number,
      checked_in_at: new Date(), 
      queue_type: queue_type, // 'normal'
      reason,
      booking_context: {
        source: 'front_desk_walkin',
        booked_by_user_id: req.user?.id || null
      }
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ success: true, message: 'Tạo lịch walk-in thành công', data: appointment });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR createWalkInAppointment:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

/**
 * @desc    Đổi phương thức thanh toán
 * @route   PUT /api/appointments/:code/change-payment-method
 * @access  Private (Patient chính chủ hoặc Guest với token)
 */
exports.changePaymentMethod = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { code } = req.params;
    const { payment_method } = req.body;
    const user = req.user;

    if (!code || !payment_method) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu appointment code hoặc payment_method' 
      });
    }

    const appointment = await models.Appointment.findOne({
      where: { code },
      include: [
        { model: models.Patient, as: 'Patient', include: [{ model: models.User, as: 'User' }] },
        { model: models.Service, as: 'Service' }
      ],
      transaction
    });

    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy lịch hẹn' 
      });
    }

    // Kiểm tra quyền: Bệnh nhân chính chủ hoặc Guest
    const isOwner = user && appointment.Patient?.user_id === user.id;
    const isGuest = !user && req.query?.token === appointment.guest_token;

    if (!isOwner && !isGuest) {
      await transaction.rollback();
      return res.status(403).json({ 
        success: false, 
        message: 'Bạn không có quyền đổi phương thức thanh toán' 
      });
    }

    // Cho phép đổi phương thức nếu lịch chưa thanh toán và chưa kết thúc/hủy
    const allowedStatuses = ['pending', 'confirmed', 'waiting_pay'];
    if (!allowedStatuses.includes(appointment.status) || appointment.payment_status !== 'unpaid') {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Chỉ có thể đổi phương thức thanh toán khi lịch hẹn chưa thanh toán và còn hiệu lực' 
      });
    }

    // Normalize payment_method
    const normalizedMethod = payment_method === 'transfer' ? 'bank_transfer' : payment_method;

    // Tính toán payment_hold_until nếu đổi thành online
    const isOnlinePayment = ['vnpay', 'momo', 'bank_transfer'].includes(normalizedMethod?.toLowerCase());
    let payment_hold_until = null;
    
    if (isOnlinePayment && appointment.Service?.price > 0) {
      const safeDate = String(appointment.appointment_date).split('T')[0];
      const safeTime = String(appointment.appointment_start_time || '00:00:00').slice(0, 8);
      const [year, month, day] = safeDate.split('-').map(Number);
      const [hour, minute, second] = safeTime.split(':').map(Number);

      const appointmentDateTime = new Date(
        year,
        (month || 1) - 1,
        day || 1,
        Number.isFinite(hour) ? hour : 0,
        Number.isFinite(minute) ? minute : 0,
        Number.isFinite(second) ? second : 0
      );

      payment_hold_until = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000); // 30 phút trước
    }

    // Update appointment
    await appointment.update({
      payment_method: normalizedMethod,
      payment_hold_until
    }, { transaction });

    // Log thay đổi
    console.log(`[Appointment ${code}] Đổi phương thức thanh toán từ ${appointment.payment_method} sang ${normalizedMethod}`);

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Đổi phương thức thanh toán thành công',
      data: {
        appointment: {
          code: appointment.code,
          payment_method: normalizedMethod,
          payment_hold_until,
          payment_status: appointment.payment_status
        }
      }
    });

  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('ERROR changePaymentMethod:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Lấy thống kê slot hôm nay theo từng ca cho 1 dịch vụ
 * @route   GET /api/appointments/service/:serviceId/slots-stats-today
 * @access  Private (Admin, Manager)
 * @returns {shiftName: {display_name, booked, capacity, remaining, occupancy}}
 */
exports.getSlotsStatsToday = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Lấy thông tin dịch vụ
    const service = await models.Service.findByPk(serviceId, {
      attributes: ['id', 'name', 'duration']
    });

    if (!service) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy dịch vụ' 
      });
    }

    const serviceDuration = service.duration || 15;
    const hourlyCapacity = Math.max(1, Math.floor(60 / serviceDuration));

    // 2. Lấy tất cả shifts hoạt động
    const shifts = await models.WorkShiftConfig.findAll({
      where: { is_active: true },
      order: [['start_time', 'ASC']],
      raw: true
    });

    // 3. Lấy tất cả appointments hôm nay của dịch vụ (loại bỏ cancelled)
    const appointments = await models.Appointment.findAll({
      where: {
        service_id: serviceId,
        appointment_date: today,
        appointment_type: 'offline',
        status: { [Op.notIn]: ['cancelled', 'passed'] }
      },
      attributes: ['appointment_start_time', 'appointment_type'],
      raw: true
    });

    // 4. Tính stats theo từng shift
    const stats = {};
    const dayOfWeek = today.getDay();

    for (const shift of shifts) {
      // Kiểm tra shift có hoạt động vào hôm nay không
      if (shift.days_of_week && !shift.days_of_week.includes(dayOfWeek)) {
        continue;
      }

      const shiftStart = timeToMinutes(shift.start_time);
      const shiftEnd = timeToMinutes(shift.end_time);

      // Đếm appointments trong shift này
      let bookedCount = 0;
      for (const appt of appointments) {
        const apptStart = timeToMinutes(appt.appointment_start_time);
        if (apptStart >= shiftStart && apptStart < shiftEnd) {
          bookedCount++;
        }
      }

      // Tính capacity: mỗi shift có thể chứa bao nhiêu appointments
      const shiftDurationMinutes = shiftEnd - shiftStart;
      const shiftCapacity = Math.max(1, Math.floor(shiftDurationMinutes / serviceDuration)) * hourlyCapacity;

      stats[shift.shift_name] = {
        display_name: shift.display_name || shift.shift_name,
        booked: bookedCount,
        capacity: shiftCapacity,
        remaining: Math.max(0, shiftCapacity - bookedCount),
        occupancy: Math.round((bookedCount / shiftCapacity) * 100)
      };
    }

    res.json({ 
      success: true, 
      data: stats,
      service_name: service.name
    });

  } catch (error) {
    console.error('ERROR getSlotsStatsToday:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

module.exports = exports;
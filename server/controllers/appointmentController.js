// server/controllers/appointmentController.js
// PHIÊN BẢN SỬA LỖI HOÀN CHỈNH
// 1. SỬA: Tất cả các hàm (getById, cancel, reschedule...) đều tìm bằng 'code' thay vì 'id'.
// 2. SỬA: Cập nhật link email/thông báo thành '/lich-hen/:code'.

const { Op } = require('sequelize');
const crypto = require('crypto');
const emailSender = require('../utils/emailSender');
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

const getAvailableSlotsLogic = async (doctorId, serviceId, date, transaction = null) => {
  const SLOT_DURATION = 30;
  const service = await models.Service.findByPk(serviceId, { attributes: ['duration'], transaction }); 
  if (!service) throw new Error('Không tìm thấy dịch vụ');
  const serviceDuration = service.duration; 
  const doctor = await models.Doctor.findByPk(doctorId, { transaction });
  if (!doctor) throw new Error('Không tìm thấy bác sĩ');
  const shifts = await models.WorkShiftConfig.findAll({ where: { is_active: true }, transaction }); 
  const onLeave = await models.LeaveRequest.findOne({ 
    where: {
      user_id: doctor.user_id,
      status: 'approved',
      date_from: { [Op.lte]: date },
      [Op.or]: [
        { date_to: null, date_from: date },
        { date_to: { [Op.gte]: date } }
      ]
    },
    transaction
  });
  const fixedSchedules = await models.Schedule.findAll({ 
      where: {
          user_id: doctor.user_id,
          date: date,
          schedule_type: 'fixed',
          status: 'available'
      },
      transaction
  });
  const existingAppointments = await models.Appointment.findAll({ 
    where: {
      doctor_id: doctorId,
      appointment_date: date,
      status: { [Op.notIn]: ['cancelled'] }
    },
    attributes: ['appointment_start_time', 'appointment_end_time'],
    raw: true,
    transaction
  });
  const busySlots = existingAppointments.map(appt => ({
    start: timeToMinutes(appt.appointment_start_time), 
    end: timeToMinutes(appt.appointment_end_time) 
  }));
  const availableSlots = [];
  const selectedDayOfWeek = new Date(date).getDay();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDateObj = new Date(date);
  const isToday = selectedDateObj.getTime() === today.getTime();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (onLeave && onLeave.leave_type !== 'time_range') { 
      return []; 
  }
  let sourceShifts = [];
  if (fixedSchedules.length > 0) {
      sourceShifts = fixedSchedules.map(s => ({
          start_time: s.start_time, 
          end_time: s.end_time, 
          days_of_week: [selectedDayOfWeek]
      }));
  } else {
      sourceShifts = shifts;
  }
  for (const shift of sourceShifts) {
    if (!shift.days_of_week.includes(selectedDayOfWeek)) { 
      continue;
    }
    const shiftStart = timeToMinutes(shift.start_time); 
    const shiftEnd = timeToMinutes(shift.end_time); 
    for (let slotStart = shiftStart; slotStart < shiftEnd; slotStart += SLOT_DURATION) {
      const slotEnd = slotStart + serviceDuration;
      let status = 'available';
      let reason = '';
      if (slotEnd > shiftEnd) {
        status = 'unavailable';
        reason = 'Thời gian dịch vụ vượt quá giờ làm việc';
        const slotHour = Math.floor(slotStart / 60);
        const slotMin = slotStart % 60;
        const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
        if (slotStart + SLOT_DURATION > shiftEnd) {
             availableSlots.push({ time: timeStr, status: status, reason: reason });
        }
        continue;
      }
      if (isToday && slotStart < currentMinutes) {
        status = 'unavailable';
        reason = 'Đã qua giờ';
      }
      if (status === 'available' && onLeave && onLeave.leave_type === 'time_range') { 
          const leaveStart = timeToMinutes(onLeave.time_from);
          const leaveEnd = timeToMinutes(onLeave.time_to);
          if (Math.max(slotStart, leaveStart) < Math.min(slotEnd, leaveEnd)) {
              status = 'unavailable';
              reason = 'Bác sĩ nghỉ phép';
          }
      }
      if (status === 'available') {
        for (const busy of busySlots) {
          if (Math.max(slotStart, busy.start) < Math.min(slotEnd, busy.end)) {
            status = 'unavailable';
            reason = 'Đã có lịch hẹn';
            break;
          }
        }
      }
      const slotHour = Math.floor(slotStart / 60);
      const slotMin = slotStart % 60;
      const timeStr = `${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
      availableSlots.push({
        time: timeStr,
        status: status,
        reason: status === 'available' ? `Dự kiến kết thúc lúc ${Math.floor(slotEnd/60)}:${String(slotEnd%60).padStart(2, '0')}` : reason
      });
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
exports.createAppointment = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      service_id, doctor_id, appointment_date, appointment_start_time,
      appointment_type, reason, payment_method,
      guest_email, guest_name, guest_phone, guest_gender, guest_dob
    } = req.body;

    if (!service_id || !doctor_id || !appointment_date || !appointment_start_time) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu thông tin: Dịch vụ, Bác sĩ, Ngày và Giờ khám.' });
    }

    const user = req.user; 
    const isGuest = !user;
    let patientId = null;
    let finalEmail = guest_email;
    let finalFullName = guest_name;
    let finalPhone = guest_phone; 

    if (user && user.role === 'patient') {
      const patient = await models.Patient.findOne({ where: { user_id: user.id }, transaction });
      if (!patient) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bệnh nhân.' });
      }
      patientId = patient.id;
      finalEmail = guest_email;
      finalFullName = guest_name;
      finalPhone = guest_phone;
    }
    
    if (!finalFullName || !finalEmail || !finalPhone || !guest_dob) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Khách vui lòng nhập đủ Họ tên, Email, SĐT và Ngày sinh.' });
    }

    const service = await models.Service.findByPk(service_id, { transaction }); 
    if (!service) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ.' });
    }

    const doctor = await models.Doctor.findByPk(doctor_id, { 
      include: [{ model: models.User, as: 'user' }],
      transaction
    });
    if (!doctor) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy bác sĩ.' });
    }

    const [startHour, startMin] = appointment_start_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = startMinutes + service.duration; 
    const appointment_end_time = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`;

    const slotCheck = await getAvailableSlotsLogic(doctor.id, service.id, appointment_date, transaction);
    const chosenSlot = slotCheck.find(slot => slot.time === appointment_start_time);

    if (!chosenSlot || chosenSlot.status !== 'available') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Khung giờ này không khả dụng hoặc đã có người đặt. Vui lòng tải lại trang và chọn giờ khác.'
      });
    }
    
    const appointmentDateTime = new Date(`${appointment_date} ${appointment_start_time}`);
    const guest_token = isGuest ? crypto.randomUUID() : null;
    const staff_id = doctor.assigned_staff_id || null; 

    let payment_status = 'pending';
    let status = 'pending';
    let payment_hold_until = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000); 

    if (payment_method === 'cash' || service.price === 0) {
      payment_status = service.price === 0 ? 'not_required' : 'paid_at_clinic';
      status = 'confirmed'; 
      payment_hold_until = null; 
    }

    const appointment = await models.Appointment.create({
      patient_id: patientId,
      doctor_id,
      service_id,
      specialty_id: service.specialty_id,
      staff_id,
      guest_email: finalEmail,
      guest_name: finalFullName,
      guest_phone: finalPhone,
      guest_gender: guest_gender || null,
      guest_dob: guest_dob,
      guest_token,
      appointment_type: appointment_type || 'offline',
      appointment_date,
      appointment_start_time,
      appointment_end_time,
      status: status,
      payment_status: payment_status,
      payment_hold_until: payment_hold_until,
      reason,
      reschedule_count: 0 
    }, { transaction }); 

    // (Gửi cho Patient)
    if (patientId && user) {
      const message = (status === 'confirmed')
        ? `Lịch hẹn ${appointment.code} của bạn đã được XÁC NHẬN.`
        : `Lịch hẹn ${appointment.code} đã được tạo. Vui lòng thanh toán trước hạn.`;
        
      await createInternalNotification({ 
        user_id: user.id,
        type: 'appointment', 
        message: message,
        link: `/lich-hen/${appointment.code}`, // SỬA LINK
        transaction
      });
    }
    
    // (Gửi cho Bác sĩ)
     await createInternalNotification({ 
        user_id: doctor.user_id,
        type: 'appointment', 
        message: `Bạn có lịch hẹn mới mã ${appointment.code} (${status}) lúc ${appointment_start_time} ngày ${appointment_date}.`,
        link: `/lich-hen/${appointment.code}`, // Link tới trang quản lý của BS
        transaction
      });
      
    // (Gửi cho Admin)
    const admins = await models.User.findAll({ where: { role: 'admin' }, transaction });
    for (const admin of admins) {
         await createInternalNotification({ 
            user_id: admin.id,
            type: 'appointment', 
            message: `Lịch hẹn mới ${appointment.code} (BS ${doctor.user.full_name}) vừa được tạo (Trạng thái: ${status}).`,
            link: `/lich-hen/${appointment.code}`, // Link tới trang quản lý Admin
            transaction
      });
    }

    await transaction.commit();

    // SỬA: Gửi email xác nhận
    try {
      const emailTemplateData = {
        patientName: finalFullName,
        appointmentCode: appointment.code,
        serviceName: service.name,
        appointmentTime: `${appointment.appointment_start_time.slice(0, 5)} ngày ${new Date(appointment.appointment_date).toLocaleDateString('vi-VN')}`,
        price: service.price,
        doctorName: doctor.user.full_name,
        
        // SỬA LINK CHO USER
        appointmentLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/lich-hen/${appointment.code}`,
        
        // SỬA LINK CHO GUEST (Trỏ chung về 1 link)
        guestViewLink: isGuest ? `${process.env.CLIENT_URL || 'http://localhost:3000'}/guest/appointment/${guest_token}` : null,
        guestRescheduleLink: isGuest ? `${process.env.CLIENT_URL || 'http://localhost:3000'}/guest/appointment/${guest_token}` : null,
        guestCancelLink: isGuest ? `${process.env.CLIENT_URL || 'http://localhost:3000'}/guest/appointment/${guest_token}` : null,
      };
      
      await emailSender.sendEmail({ 
        to: finalEmail,
        subject: `Xác nhận lịch hẹn ${appointment.code} tại Clinic System`,
        template: 'appointment_confirmation', 
        data: emailTemplateData
      });
      
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Đặt lịch hẹn thành công!',
      data: {
        appointment, // Gửi appointment về
        guest_token: isGuest ? guest_token : undefined,
        paymentRequired: (payment_method === 'online' && service.price > 0),
        paymentUrl: (payment_method === 'online' && service.price > 0) ? `/thanh-toan/${appointment.code}` : null, // Sửa: Dùng code
        status: status 
      }
    });

  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('ERROR in createAppointment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi máy chủ khi tạo lịch hẹn.'
    });
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

    if (appointment.payment_status === 'paid') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Lịch hẹn đã được thanh toán.' });
    }

    await appointment.update({ payment_status: 'paid', status: 'confirmed' }, { transaction });

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
 * @desc    Lấy danh sách lịch hẹn của bệnh nhân đăng nhập
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
            { model: models.Specialty, as: 'specialty', attributes: ['name'] } // Thêm
          ] 
        },
        { model: models.Service, as: 'Service' },
        { model: models.MedicalRecord, as: 'MedicalRecord' }
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

    const patientUser = appointment.Patient?.User;
    const doctorUser = appointment.Doctor?.user;
    const patientEmail = patientUser ? patientUser.email : appointment.guest_email;
    const patientName = patientUser ? patientUser.full_name : appointment.guest_name;

    const emailData = {
      patientName: patientName,
      appointmentCode: appointment.code,
      cancelReason: reason,
      cancelledAt: new Date().toLocaleString('vi-VN')
    };

    if (patientUser && cancelledRole !== 'patient') {
        await createInternalNotification({ 
          user_id: patientUser.id,
          type: 'appointment',
          message: `Lịch hẹn ${appointment.code} của bạn đã bị hủy bởi Quản trị viên. Lý do: ${reason}.`,
          link: `/lich-hen/${appointment.code}` // SỬA LINK
        });
    }
    
    if (patientEmail) {
        await emailSender.sendEmail({ 
            to: patientEmail,
            subject: `Thông báo hủy lịch hẹn ${appointment.code}`,
            template: 'appointment_cancelled', 
            data: emailData
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
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // 'id' là 'code'
    const { doctor_id } = req.body;

    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Chỉ admin hoặc staff mới có thể xác nhận lịch hẹn' });
    }

    // SỬA: Dùng findOne({ where: { code: id } })
    const appointment = await models.Appointment.findOne({ 
      where: { code: id },
      include: [{ model: models.Patient, as: 'Patient', include: [{ model: models.User }] }],
      transaction: t 
    });
    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    if (appointment.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Chỉ có thể xác nhận lịch hẹn đang chờ' });
    }

    let updateData = { status: 'confirmed' };
    if (doctor_id && doctor_id !== appointment.doctor_id) {
      const conflict = await models.Appointment.findOne({
        where: {
          doctor_id,
          appointment_date: appointment.appointment_date,
          appointment_start_time: appointment.appointment_start_time,
          status: { [Op.notIn]: ['cancelled'] },
          id: { [Op.ne]: appointment.id } // SỬA: Phải dùng appointment.id (PK) ở đây
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

    const patientUserId = appointment.Patient?.User?.id;
    if (patientUserId) {
        await createInternalNotification({ // SỬA: Dùng helper
          user_id: patientUserId,
          type: 'appointment',
          message: `Lịch hẹn ${appointment.code} của bạn đã được xác nhận.`,
          link: `/lich-hen/${appointment.code}` // SỬA LINK
        });
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
    if (status) whereCondition.status = status;
    if (doctor_id) whereCondition.doctor_id = doctor_id;
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
      {
        model: models.MedicalRecord,
        as: 'MedicalRecord',
        attributes: ['id', 'created_at', 'updated_at'], // Chỉ lấy các trường cần thiết
        required: false // Dùng left join để vẫn lấy lịch hẹn dù chưa có kết quả
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
      where: { doctor_id: doctor.id }, // Lọc theo doctor.id
      include: [
        { 
          model: models.Patient, 
          as: 'Patient', 
          required: false, // Thêm required: false để lấy cả guest
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
          subject: `[Clinic System] Thông tin lịch hẹn ngày ${emailData.appointmentDate}`,
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

module.exports = exports;
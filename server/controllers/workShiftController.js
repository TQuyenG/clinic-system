// server/controllers/workShiftController.js
const { models } = require('../config/db');
const { Op } = require('sequelize');

/**
 * @desc    Lấy cấu hình ca làm việc (public)
 * @route   GET /api/work-shifts/config
 * @access  Public
 */
exports.getWorkShiftConfig = async (req, res) => {
  try {
    const shifts = await models.WorkShiftConfig.findAll({
      // where: { is_active: true },
      order: [['start_time', 'ASC']],
      attributes: ['id', 'shift_name', 'display_name', 'start_time', 'end_time', 'days_of_week', 'is_active']
    });

    res.status(200).json({
      success: true,
      data: shifts
    });
  } catch (error) {
    console.error('ERROR in getWorkShiftConfig:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy cấu hình ca làm việc.'
    });
  }
};

/**
 * @desc    Cập nhật cấu hình ca làm việc (Admin only)
 * @route   PUT /api/work-shifts/config
 * @access  Private/Admin
 */
exports.updateWorkShiftConfig = async (req, res) => {
  try {
    const { shifts } = req.body;

    if (!shifts || !Array.isArray(shifts)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu shifts không hợp lệ.'
      });
    }

    // Validate shifts data
    // Thêm 'night' vào mảng các ca hợp lệ
    const validShiftNames = ['morning', 'afternoon', 'evening', 'night'];
    for (const shift of shifts) {
      if (!validShiftNames.includes(shift.shift_name)) {
        return res.status(400).json({
          success: false,
          message: `Tên ca không hợp lệ: ${shift.shift_name}`
        });
      }

      if (!shift.start_time || !shift.end_time) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thời gian bắt đầu hoặc kết thúc.'
        });
      }
    }

    // Upsert từng shift
    const results = [];
    for (const shiftData of shifts) {
      const [shift, created] = await models.WorkShiftConfig.upsert({
        shift_name: shiftData.shift_name,
        display_name: shiftData.display_name || shiftData.shift_name,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        days_of_week: shiftData.days_of_week || [1, 2, 3, 4, 5, 6],
        is_active: shiftData.is_active !== undefined ? shiftData.is_active : true
      }, {
        conflictFields: ['shift_name']
      });

      results.push(shift);
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật cấu hình ca làm việc thành công.',
      data: results
    });
  } catch (error) {
    console.error('ERROR in updateWorkShiftConfig:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật cấu hình ca làm việc.'
    });
  }
};

/**
 * @desc    Lấy danh sách slots còn trống cho bác sĩ trong ngày
 * @route   GET /api/work-shifts/available-slots
 * @query   doctor_id, date, service_id
 * @access  Public
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctor_id, date, service_id } = req.query;

    // Validate input
    if (!doctor_id || !date || !service_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: doctor_id, date, service_id là bắt buộc.'
      });
    }

    // 1. Lấy thông tin service để biết duration
    const service = await models.Service.findByPk(service_id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dịch vụ.'
      });
    }

    // 2. Lấy cấu hình ca làm việc active
    const workShifts = await models.WorkShiftConfig.findAll({
      // where: { is_active: true },
      order: [['start_time', 'ASC']]
    });

    if (workShifts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có cấu hình ca làm việc.'
      });
    }

    // 3. Generate tất cả slots 30 phút từ các ca làm việc
    const allSlots = [];
    const slotInterval = 30; // minutes

    for (const shift of workShifts) {
      const startTime = shift.start_time; // "07:00:00"
      const endTime = shift.end_time;     // "12:00:00"

      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      let currentMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const min = currentMinutes % 60;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

        allSlots.push({
          time: timeStr,
          shift_name: shift.shift_name,
          status: 'available',
          reason: null
        });

        currentMinutes += slotInterval;
      }
    }

    // 4. Check bác sĩ có nghỉ không (LeaveRequest)
    const doctor = await models.Doctor.findByPk(doctor_id, {
      include: [{ model: models.User, as: 'user' }]
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bác sĩ.'
      });
    }

    const leaveRequests = await models.LeaveRequest.findAll({
      where: {
        user_id: doctor.user_id,
        status: 'approved',
        [Op.or]: [
          // full_day hoặc multiple_days
          {
            leave_type: { [Op.in]: ['full_day', 'multiple_days'] },
            date_from: { [Op.lte]: date },
            [Op.or]: [
              { date_to: null, date_from: date },
              { date_to: { [Op.gte]: date } }
            ]
          },
          // single_shift
          {
            leave_type: 'single_shift',
            date_from: date
          },
          // time_range
          {
            leave_type: 'time_range',
            date_from: date
          }
        ]
      }
    });

    // Mark slots unavailable dựa vào leave requests
    for (const leave of leaveRequests) {
      if (leave.leave_type === 'full_day' || leave.leave_type === 'multiple_days') {
        // Nghỉ cả ngày → mark tất cả slots
        allSlots.forEach(slot => {
          slot.status = 'unavailable';
          slot.reason = 'Bác sĩ nghỉ';
        });
      } else if (leave.leave_type === 'single_shift') {
        // Nghỉ 1 ca → mark slots trong ca đó
        allSlots.forEach(slot => {
          if (slot.shift_name === leave.shift_name) {
            slot.status = 'unavailable';
            slot.reason = `Bác sĩ nghỉ ca ${leave.shift_name === 'morning' ? 'sáng' : leave.shift_name === 'afternoon' ? 'chiều' : 'tối'}`;
          }
        });
      } else if (leave.leave_type === 'time_range') {
        // Nghỉ khoảng giờ → mark slots trong khoảng đó
        const [leaveStartHour, leaveStartMin] = leave.time_from.split(':').map(Number);
        const [leaveEndHour, leaveEndMin] = leave.time_to.split(':').map(Number);
        const leaveStartMinutes = leaveStartHour * 60 + leaveStartMin;
        const leaveEndMinutes = leaveEndHour * 60 + leaveEndMin;

        allSlots.forEach(slot => {
          const [slotHour, slotMin] = slot.time.split(':').map(Number);
          const slotMinutes = slotHour * 60 + slotMin;

          if (slotMinutes >= leaveStartMinutes && slotMinutes < leaveEndMinutes) {
            slot.status = 'unavailable';
            slot.reason = `Bác sĩ nghỉ từ ${leave.time_from.slice(0, 5)} - ${leave.time_to.slice(0, 5)}`;
          }
        });
      }
    }

    // 5. Query appointments đã đặt trong ngày
    const appointments = await models.Appointment.findAll({
      where: {
        doctor_id: doctor_id,
        appointment_date: date,
        status: { [Op.ne]: 'cancelled' }
      },
      attributes: ['appointment_start_time', 'appointment_end_time'],
      order: [['appointment_start_time', 'ASC']]
    });

    // 6. Tính locked slots dựa vào service.duration
    for (const appointment of appointments) {
      const [aptStartHour, aptStartMin] = appointment.appointment_start_time.split(':').map(Number);
      const [aptEndHour, aptEndMin] = appointment.appointment_end_time.split(':').map(Number);
      
      const aptStartMinutes = aptStartHour * 60 + aptStartMin;
      const aptEndMinutes = aptEndHour * 60 + aptEndMin;

      allSlots.forEach(slot => {
        if (slot.status === 'unavailable') return; // Skip nếu đã unavailable

        const [slotHour, slotMin] = slot.time.split(':').map(Number);
        const slotMinutes = slotHour * 60 + slotMin;

        // Slot trùng với appointment đã đặt
        if (slotMinutes >= aptStartMinutes && slotMinutes < aptEndMinutes) {
          if (slotMinutes === aptStartMinutes) {
            slot.status = 'booked';
            slot.reason = 'Đã có lịch hẹn';
          } else {
            slot.status = 'locked';
            slot.reason = 'Dịch vụ trước chưa kết thúc';
          }
        }
      });
    }

    // 7. Group slots by shift
    const groupedSlots = {
      morning: allSlots.filter(s => s.shift_name === 'morning'),
      afternoon: allSlots.filter(s => s.shift_name === 'afternoon'),
      evening: allSlots.filter(s => s.shift_name === 'evening')
    };

    res.status(200).json({
      success: true,
      data: {
        date: date,
        doctor_id: parseInt(doctor_id),
        service_duration: service.duration,
        slots: allSlots,
        grouped: groupedSlots
      }
    });

  } catch (error) {
    console.error('ERROR in getAvailableSlots:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy slots trống.'
    });
  }
};

// ================================================================
// CA THU NGÂN (CASHIER SHIFT) — MỞ CA / ĐÓNG CA / QUẢN LÝ
// ================================================================

/**
 * Kiểm tra ca hiện tại của nhân viên đang đăng nhập
 * GET /api/work-shifts/cashier/current
 */
exports.getCurrentCashierShift = async (req, res) => {
  try {
    const userId = req.user.id;

    const staff = await models.Staff.findOne({ where: { user_id: userId } });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên.' });
    }

    const shift = await models.CashierShift.findOne({
      where: { staff_id: staff.id, status: 'open' },
      include: [
        { model: models.WorkShiftConfig, as: 'shiftConfig' },
        { model: models.User, as: 'cashier', attributes: ['full_name', 'username'] }
      ],
      order: [['started_at', 'DESC']]
    });

    // Nếu đang có ca mở → tính doanh thu thực tế trong ca
    if (shift) {
      const payments = await models.Payment.findAll({
        where: {
          status: 'paid',
          created_at: { [Op.gte]: shift.started_at }
        },
        attributes: ['method', 'amount']
      });

      const revenueCash = payments
        .filter(p => p.method === 'cash')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const revenueTransfer = payments
        .filter(p => p.method !== 'cash')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      return res.json({
        success: true,
        data: {
          ...shift.toJSON(),
          live_revenue_cash: revenueCash,
          live_revenue_transfer: revenueTransfer,
          live_transactions: payments.length,
          system_expected_cash: parseFloat(shift.opening_cash) + revenueCash
        }
      });
    }

    res.json({ success: true, data: null, message: 'Chưa có ca nào đang mở.' });
  } catch (error) {
    console.error('ERROR getCurrentCashierShift:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * Mở ca làm việc
 * POST /api/work-shifts/cashier/start
 * Body: { opening_cash, opening_note, shift_config_id? }
 */
exports.startCashierShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { opening_cash, opening_note, shift_config_id } = req.body;

    if (opening_cash === undefined || opening_cash === null) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số tiền đầu ca.' });
    }

    // Tìm Staff record
    const staff = await models.Staff.findOne({
      where: { user_id: userId },
      include: [{ model: models.User, attributes: ['full_name'] }]
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên.' });
    }

    // Kiểm tra đã có ca mở chưa
    const existingShift = await models.CashierShift.findOne({
      where: { staff_id: staff.id, status: 'open' }
    });
    if (existingShift) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đang có ca chưa đóng. Vui lòng đóng ca hiện tại trước.',
        data: existingShift
      });
    }

    // Kiểm tra lịch phân công (nếu có shift_config_id)
    let shiftConfig = null;
    if (shift_config_id) {
      shiftConfig = await models.WorkShiftConfig.findByPk(shift_config_id);
      if (!shiftConfig) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc.' });
      }
    } else {
      // Tự động tìm ca phù hợp theo giờ hiện tại
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`;
      const allShifts = await models.WorkShiftConfig.findAll({ where: { is_active: true } });
      shiftConfig = allShifts.find(s => s.start_time <= currentTime && s.end_time >= currentTime) || null;
    }

    const today = new Date().toISOString().split('T')[0];

    const newShift = await models.CashierShift.create({
      staff_id: staff.id,
      user_id: userId,
      shift_config_id: shiftConfig?.id || null,
      shift_date: today,
      started_at: new Date(),
      opening_cash: parseFloat(opening_cash),
      opening_note: opening_note || null,
      status: 'open'
    });

    // Log audit
    await models.AuditLog.create({
      user_id: userId,
      action_type: 'shift_start',
      target_type: 'cashier_shift',
      target_id: newShift.id,
      target_name: staff.User?.full_name || `Staff ${staff.code}`,
      details: JSON.stringify({
        opening_cash: opening_cash,
        shift_config: shiftConfig?.display_name || 'Tự động',
        shift_date: today
      })
    });

    res.status(201).json({
      success: true,
      message: `Mở ca thành công! Ca ${shiftConfig?.display_name || 'làm việc'} đã bắt đầu.`,
      data: { ...newShift.toJSON(), shiftConfig }
    });
  } catch (error) {
    console.error('ERROR startCashierShift:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi mở ca: ' + error.message });
  }
};

/**
 * Đóng ca làm việc
 * POST /api/work-shifts/cashier/end
 * Body: { closing_cash_actual, closing_note }
 */
exports.endCashierShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { closing_cash_actual, closing_note } = req.body;

    if (closing_cash_actual === undefined || closing_cash_actual === null) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số tiền kiểm đếm cuối ca.' });
    }

    const staff = await models.Staff.findOne({
      where: { user_id: userId },
      include: [{ model: models.User, attributes: ['full_name'] }]
    });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên.' });
    }

    const shift = await models.CashierShift.findOne({
      where: { staff_id: staff.id, status: 'open' },
      order: [['started_at', 'DESC']]
    });
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca đang mở.' });
    }

    // Tính doanh thu thực tế trong ca
    const payments = await models.Payment.findAll({
      where: {
        status: 'paid',
        created_at: { [Op.gte]: shift.started_at }
      },
      attributes: ['method', 'amount']
    });

    const revenueCash = payments
      .filter(p => p.method === 'cash')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const revenueTransfer = payments
      .filter(p => p.method !== 'cash')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const systemExpectedCash = parseFloat(shift.opening_cash) + revenueCash;
    const actualCash = parseFloat(closing_cash_actual);
    const difference = actualCash - systemExpectedCash;

    // Cập nhật ca
    await shift.update({
      ended_at: new Date(),
      closing_cash_actual: actualCash,
      closing_cash_system: systemExpectedCash,
      cash_difference: difference,
      total_transactions: payments.length,
      total_revenue_cash: revenueCash,
      total_revenue_transfer: revenueTransfer,
      closing_note: closing_note || null,
      status: Math.abs(difference) > 50000 ? 'pending_review' : 'closed'
    });

    // Log audit
    await models.AuditLog.create({
      user_id: userId,
      action_type: 'shift_end',
      target_type: 'cashier_shift',
      target_id: shift.id,
      target_name: staff.User?.full_name || `Staff ${staff.code}`,
      details: JSON.stringify({
        opening_cash: shift.opening_cash,
        closing_cash_actual: actualCash,
        closing_cash_system: systemExpectedCash,
        difference: difference,
        total_revenue_cash: revenueCash,
        total_revenue_transfer: revenueTransfer,
        total_transactions: payments.length
      })
    });

    res.json({
      success: true,
      message: Math.abs(difference) > 50000
        ? `Đóng ca thành công. ⚠️ Chênh lệch ${Math.abs(difference).toLocaleString('vi-VN')}đ — chờ Admin xét duyệt.`
        : 'Đóng ca thành công!',
      data: {
        shift: await models.CashierShift.findByPk(shift.id),
        summary: {
          opening_cash: shift.opening_cash,
          revenue_cash: revenueCash,
          revenue_transfer: revenueTransfer,
          system_expected: systemExpectedCash,
          actual_counted: actualCash,
          difference: difference,
          total_transactions: payments.length
        }
      }
    });
  } catch (error) {
    console.error('ERROR endCashierShift:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đóng ca.' });
  }
};

/**
 * Lấy lịch sử ca của nhân viên đang đăng nhập
 * GET /api/work-shifts/cashier/history
 */
exports.getMyCashierShiftHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const staff = await models.Staff.findOne({ where: { user_id: userId } });
    if (!staff) return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên.' });

    const { rows, count } = await models.CashierShift.findAndCountAll({
      where: { staff_id: staff.id },
      include: [{ model: models.WorkShiftConfig, as: 'shiftConfig' }],
      order: [['started_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, data: rows, total: count });
  } catch (error) {
    console.error('ERROR getMyCashierShiftHistory:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * [ADMIN] Lấy tất cả ca làm việc — để quản lý, xét duyệt
 * GET /api/work-shifts/cashier/all
 */
exports.getAllCashierShifts = async (req, res) => {
  try {
    const { date, status, staff_id, limit = 30, offset = 0 } = req.query;
    const where = {};
    if (date) where.shift_date = date;
    if (status) where.status = status;
    if (staff_id) where.staff_id = staff_id;

    const { rows, count } = await models.CashierShift.findAndCountAll({
      where,
      include: [
        {
          model: models.Staff,
          as: 'staff',
          include: [{ model: models.User, attributes: ['full_name', 'avatar_url'] }]
        },
        { model: models.WorkShiftConfig, as: 'shiftConfig' },
        { model: models.User, as: 'reviewer', attributes: ['full_name'] }
      ],
      order: [['started_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Tổng hợp thống kê ngày
    const todayStr = new Date().toISOString().split('T')[0];
    const todayShifts = await models.CashierShift.findAll({
      where: { shift_date: date || todayStr }
    });

    const stats = {
      total_revenue_cash: todayShifts.reduce((s, sh) => s + parseFloat(sh.total_revenue_cash || 0), 0),
      total_revenue_transfer: todayShifts.reduce((s, sh) => s + parseFloat(sh.total_revenue_transfer || 0), 0),
      total_transactions: todayShifts.reduce((s, sh) => s + (sh.total_transactions || 0), 0),
      open_shifts: todayShifts.filter(sh => sh.status === 'open').length,
      pending_review: todayShifts.filter(sh => sh.status === 'pending_review').length
    };

    res.json({ success: true, data: rows, total: count, stats });
  } catch (error) {
    console.error('ERROR getAllCashierShifts:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

/**
 * [ADMIN] Xét duyệt ca chênh lệch
 * PUT /api/work-shifts/cashier/:id/review
 * Body: { action: 'approve'|'reject', review_note }
 */
exports.reviewCashierShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, review_note } = req.body;
    const adminId = req.user.id;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action phải là approve hoặc reject.' });
    }

    const shift = await models.CashierShift.findByPk(id, {
      include: [{ model: models.Staff, as: 'staff', include: [{ model: models.User, attributes: ['full_name'] }] }]
    });
    if (!shift) return res.status(404).json({ success: false, message: 'Không tìm thấy ca làm việc.' });
    if (shift.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: 'Ca này không ở trạng thái chờ xét duyệt.' });
    }

    await shift.update({
      status: action === 'approve' ? 'closed' : 'pending_review',
      reviewed_by: adminId,
      reviewed_at: new Date(),
      review_note: review_note || null
    });

    // Gửi thông báo cho nhân viên
    await models.Notification.create({
      user_id: shift.staff?.User?.id || shift.user_id,
      type: 'shift_review',
      message: action === 'approve'
        ? `Ca làm việc ngày ${shift.shift_date} đã được Admin xác nhận.`
        : `Ca làm việc ngày ${shift.shift_date} cần giải trình. Lý do: ${review_note}`,
      link: '/quay-tiep-don',
      is_read: false
    });

    res.json({
      success: true,
      message: action === 'approve' ? 'Đã xác nhận ca làm việc.' : 'Đã gửi yêu cầu giải trình.',
      data: shift
    });
  } catch (error) {
    console.error('ERROR reviewCashierShift:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};
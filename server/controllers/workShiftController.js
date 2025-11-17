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
    const validShiftNames = ['morning', 'afternoon', 'evening'];
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
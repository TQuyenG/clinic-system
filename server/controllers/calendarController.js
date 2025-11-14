// server/controllers/calendarController.js
const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');
const moment = require('moment'); // Đảm bảo đã import

// Helper gán thông tin user vào sự kiện
const mapUserToEvent = (event, userMap) => {
  const eventJSON = event.toJSON ? event.toJSON() : event;
  // SỬA: Dùng user_id từ bản thân event (nếu có)
  const userId = event.user_id || event.user?.id; 
  const user = userMap.get(userId);
  return {
    ...eventJSON,
    user: user || null,
  };
};

exports.getCalendarData = async (req, res) => {
  try {
    const { user_ids, date_from, date_to, types } = req.query;
    const requestUser = req.user;

    if (!date_from || !date_to) {
      return res.status(400).json({ success: false, message: 'Thiếu date_from hoặc date_to' });
    }

    let targetUserIds = [];
    // SỬA: Bổ sung 'overtime' vào types mặc định
    let typesToFetch = types ? types.split(',') : ['schedules', 'leaves', 'appointments', 'overtime'];

    // ========== 1. Xác định danh sách User ==========
    if (user_ids) {
      targetUserIds = user_ids.split(',').map(id => parseInt(id, 10));
      // (Giữ logic check quyền và giới hạn 5 user)
      if (targetUserIds.length > 5) {
        return res.status(400).json({ success: false, message: 'Chỉ được phép lọc tối đa 5 người dùng' });
      }
      if (requestUser.role !== 'admin' && (targetUserIds.length > 1 || targetUserIds[0] !== requestUser.id)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xem lịch của người dùng khác' });
      }
    } else {
      if (requestUser.role === 'admin') {
        const allUsers = await models.User.findAll({
          where: { role: { [Op.in]: ['doctor', 'staff'] } },
          attributes: ['id']
        });
        targetUserIds = allUsers.map(u => u.id);
      } else {
        targetUserIds = [requestUser.id];
      }
    }

    if (targetUserIds.length === 0) {
      return res.status(200).json({ 
        success: true, 
        data: { schedules: [], leaves: [], appointments: [], overtime_schedules: [] } 
      });
    }

    // ========== 2. Lấy thông tin User (UserMap) ==========
    const users = await models.User.findAll({
      where: { id: { [Op.in]: targetUserIds } },
      attributes: ['id', 'full_name', 'avatar_url', 'role']
    });
    const userMap = new Map(users.map(u => [u.id, u.toJSON()]));

    // ========== 3. Lấy dữ liệu theo từng loại ==========
    let schedules = []; // Lịch làm việc (Fixed/Flexible)
    let overtime_schedules = []; // Lịch tăng ca
    let leaves = []; // Lịch nghỉ
    let appointments = []; // Lịch hẹn
    
    const dateRange = { [Op.between]: [date_from, date_to] };

    // --- A. TỰ ĐỘNG SINH LỊCH LÀM VIỆC (Schedules) ---
    if (typesToFetch.includes('schedules')) {
      // 1. Lấy cấu hình ca cố định (WorkShiftConfig)
      const shiftsConfig = await models.WorkShiftConfig.findAll({ 
        where: { is_active: true } 
      });
      
      // 2. Lấy thông tin (Doctor/Staff) của tất cả user mục tiêu
      // (Bao gồm bản đăng ký 'active' của họ)
      const userProfiles = await models.User.findAll({
        where: { id: { [Op.in]: targetUserIds } },
        attributes: ['id', 'role'],
        include: [
          {
            model: models.Doctor,
            required: false,
            attributes: ['id', 'schedule_preference_type', 'current_schedule_id'],
            include: [{
              model: models.Schedule,
              as: 'activeScheduleRegistration',
              attributes: ['weekly_schedule_json'],
              required: false 
            }]
          },
          {
            model: models.Staff,
            required: false,
            attributes: ['id', 'schedule_preference_type', 'current_schedule_id'],
            include: [{
              model: models.Schedule,
              as: 'activeScheduleRegistration',
              attributes: ['weekly_schedule_json'],
              required: false 
            }]
          }
        ]
      });

      // 3. Helper lặp ngày
      const getDatesInRange = (startDate, endDate) => {
        const dates = [];
        let currentDate = moment(startDate);
        const stopDate = moment(endDate);
        while (currentDate <= stopDate) {
          dates.push({ 
            date: currentDate.format('YYYY-MM-DD'), 
            dayOfWeek: currentDate.day() // 0 = CN, 1 = T2
          });
          currentDate = currentDate.add(1, 'days');
        }
        return dates;
      };
      const allDates = getDatesInRange(date_from, date_to);

      // 4. Lặp qua từng user và sinh lịch
      for (const profile of userProfiles) {
        const user_id = profile.id;
        const user_role = profile.role;
        const userMapData = userMap.get(user_id);
        
        const userTypeProfile = (user_role === 'doctor') ? profile.Doctor : profile.Staff;
        
        const preference = userTypeProfile?.schedule_preference_type || 'fixed';
        const activeReg = userTypeProfile?.activeScheduleRegistration;
        const flexibleJson = activeReg?.weekly_schedule_json;

        // Lặp qua các ngày trong khoảng thời gian
        for (const { date, dayOfWeek } of allDates) {
          
          if (preference === 'fixed') {
            // ----- LOGIC LỊCH CỐ ĐỊNH -----
            for (const shift of shiftsConfig) {
              if (shift.days_of_week.includes(dayOfWeek)) {
                schedules.push({
                  id: `fixed-${user_id}-${date}-${shift.shift_name}`,
                  user_id: user_id,
                  user: userMapData,
                  date: date,
                  start_time: shift.start_time,
                  end_time: shift.end_time,
                  schedule_type: 'fixed', // Màu Xanh
                  status: 'available' 
                });
              }
            }
          } 
          else if (preference === 'flexible' && flexibleJson) {
            // ----- LOGIC LỊCH LINH HOẠT -----
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayOfWeek]; 
            const flexibleSlots = flexibleJson[dayKey] || []; 
            
            for (const slot of flexibleSlots) {
              const [start_time, end_time] = slot.split('-');
              if (start_time && end_time) {
                schedules.push({
                  id: `flex-${user_id}-${date}-${start_time}`,
                  user_id: user_id,
                  user: userMapData,
                  date: date,
                  start_time: `${start_time}:00`,
                  end_time: `${end_time}:00`,
                  schedule_type: 'flexible', // Màu Tím
                  status: 'available'
                });
              }
            }
          }
        }
      }
    }
    
    // --- B. LẤY LỊCH TĂNG CA (Overtime) ---
    if (typesToFetch.includes('overtime')) {
       const overtimeData = await models.Schedule.findAll({
         where: {
           user_id: { [Op.in]: targetUserIds },
           schedule_type: 'overtime',
           status: 'approved', // Chỉ lấy ca đã duyệt
           date: dateRange
         },
         // Không cần include user vì đã có user_id
       });
       // Gán thông tin user (Avatar, Name)
       overtime_schedules = overtimeData.map(event => mapUserToEvent(event, userMap));
    }


    // --- C. Lấy Lịch Nghỉ (Leaves) ---
    if (typesToFetch.includes('leaves')) {
      const leaveData = await models.LeaveRequest.findAll({
        where: {
          user_id: { [Op.in]: targetUserIds },
          status: 'approved',
          [Op.or]: [
            {
              date_to: { [Op.not]: null },
              date_from: { [Op.lte]: date_to },
              date_to: { [Op.gte]: date_from }
            },
            {
              date_to: null,
              date_from: dateRange
            }
          ]
        }
      });
      leaves = leaveData.map(event => mapUserToEvent(event, userMap));
    }

    // --- D. Lấy Lịch Hẹn (Appointments) ---
    if (typesToFetch.includes('appointments')) {
      const doctors = await models.Doctor.findAll({
        where: { user_id: { [Op.in]: targetUserIds } },
        attributes: ['id', 'user_id']
      });
      
      const doctorIdToUserIdMap = new Map(doctors.map(d => [d.id, d.user_id]));
      const targetDoctorIds = doctors.map(d => d.id);

      if (targetDoctorIds.length > 0) {
        const appointmentData = await models.Appointment.findAll({
          where: {
            doctor_id: { [Op.in]: targetDoctorIds },
            appointment_date: dateRange,
            status: { [Op.in]: ['confirmed', 'in_progress', 'completed'] }
          },
          attributes: [
            'id', 'patient_id', 'doctor_id', 'guest_name', 'guest_phone', 'code', 'status',
            'appointment_date', 'appointment_start_time', 'appointment_end_time'
          ],
          include: [
            { 
              model: models.Patient, 
              as: 'Patient',
              attributes: ['id', 'user_id'], 
              required: false,
              include: [{
                model: models.User,
                attributes: ['full_name', 'email', 'phone'],
                required: false
              }]
            },
          ]
        });
        
        appointments = appointmentData.map(app => {
          const appJSON = app.toJSON();
          const userId = doctorIdToUserIdMap.get(app.doctor_id);
          
          if (appJSON.Patient && appJSON.Patient.User) {
             appJSON.Patient.full_name = appJSON.Patient.User.full_name;
          }

          return {
            ...appJSON,
            user_id: userId,
            user: userMap.get(userId) || null
          };
        });
      }
    }

    // Trả về 4 mảng dữ liệu
    res.status(200).json({
      success: true,
      data: {
        schedules: schedules,
        overtime_schedules: overtime_schedules, // Bổ sung
        leaves: leaves,
        appointments: appointments
      }
    });

  } catch (error) {
    console.error('ERROR in getCalendarData:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy dữ liệu lịch',
      error: error.message
    });
  }
};
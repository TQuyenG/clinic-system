// server/controllers/leaveRequestController.js
// SỬA: Đã cập nhật transaction và dùng đúng ENUM 'leave_req'

const { models, sequelize } = require('../config/db'); 
const { Op } = require('sequelize');
const emailSender = require('../utils/emailSender');

/**
 * @desc    Tạo đơn xin nghỉ (Doctor/Staff)
 * @route   POST /api/leave-requests
 * @access  Private/Doctor/Staff
 */
exports.createLeaveRequest = async (req, res) => {
  
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { leave_type, date_from, date_to, shift_name, time_from, time_to, reason } = req.body;

    // Validate
    if (!leave_type || !date_from || !reason) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Thiếu thông tin: leave_type, date_from, reason là bắt buộc.' });
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dateFromObj = new Date(date_from);
    if (dateFromObj < tomorrow) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Phải gửi đơn xin nghỉ trước ít nhất 1 ngày.' });
    }

    // Kiểm tra user_type
    let userType = null;
    let doctorId = null;
    const doctor = await models.Doctor.findOne({ where: { user_id: userId }, transaction });
    if (doctor) {
      userType = 'doctor';
      doctorId = doctor.id;
    } else {
      const staff = await models.Staff.findOne({ where: { user_id: userId }, transaction });
      if (staff) { userType = 'staff'; }
    }
    if (!userType) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Chỉ bác sĩ hoặc nhân viên mới có thể xin nghỉ.' });
    }
    
    // Kiểm tra trùng lặp đơn nghỉ
    const overlappingLeave = await models.LeaveRequest.findOne({
      where: {
        user_id: userId,
        status: { [Op.in]: ['pending', 'approved'] },
        date_from: { [Op.lte]: date_to || date_from }, 
        [Op.or]: [
          { date_to: { [Op.gte]: date_from } },
          { date_to: { [Op.is]: null }, date_from: { [Op.eq]: date_from } } 
        ]
      },
      transaction
    });
    if (overlappingLeave) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: `Bạn đã có một đơn xin nghỉ (Trạng thái: ${overlappingLeave.status}) trùng với khoảng thời gian này.` });
    }

    // (Kiểm tra conflict appointments)
    if (userType === 'doctor') {
      const conflictAppointments = await models.Appointment.findAll({
        where: {
          doctor_id: doctorId,
          appointment_date: { [Op.between]: [date_from, date_to || date_from] },
          status: { [Op.in]: ['pending', 'confirmed'] }
        },
        transaction
      });
      if (conflictAppointments.length > 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `Bạn có ${conflictAppointments.length} lịch hẹn trong khoảng thời gian này. Vui lòng liên hệ admin để xử lý trước khi xin nghỉ.` });
      }
    }

    // Create leave request
    const leaveRequest = await models.LeaveRequest.create({
      user_id: userId,
      user_type: userType,
      leave_type,
      date_from,
      date_to: leave_type === 'multiple_days' ? date_to : null,
      shift_name: leave_type === 'single_shift' ? shift_name : null,
      time_from: leave_type === 'time_range' ? time_from : null,
      time_to: leave_type === 'time_range' ? time_to : null,
      reason,
      status: 'pending',
      requested_at: new Date()
    }, { transaction });

    // Gửi thông báo cho admin
    const admins = await models.User.findAll({ where: { role: 'admin', is_active: true }, transaction });
    for (const admin of admins) {
      if (models.Notification) {
        await models.Notification.create({
          user_id: admin.id,
          // SỬA: Dùng đúng ENUM 'leave_req'
          type: 'leave_req', 
          message: `${req.user.full_name} đã gửi đơn xin nghỉ mới: "${reason.substring(0, 50)}..."`,
          link: `/quan-ly-lich-lam-viec?tab=manage-registrations&sub_tab=leaves&highlight=${leaveRequest.id}`,
          is_read: false
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Đơn xin nghỉ đã được gửi và đang chờ duyệt.',
      data: leaveRequest
    });

  } catch (error) {
    await transaction.rollback();
    
    console.error('ERROR in createLeaveRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tạo đơn xin nghỉ.'
    });
  }
};

/**
 * @desc    Lấy danh sách đơn xin nghỉ của tôi
 * @route   GET /api/leave-requests/my-leaves
 * @access  Private/Doctor/Staff
 */
exports.getMyLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { user_id: userId };
    if (status && status !== 'all') where.status = status;

    const leaveRequests = await models.LeaveRequest.findAll({
      where,
      include: [
        {
          model: models.User,
          as: 'processor',
          attributes: ['id', 'full_name', 'email']
        }
      ],
      order: [['requested_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests
    });

  } catch (error) {
    console.error('ERROR in getMyLeaveRequests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách đơn xin nghỉ.'
    });
  }
};

/**
 * @desc    Lấy danh sách đơn xin nghỉ (Admin/Staff)
 * @route   GET /api/leave-requests/pending
 * @access  Private/Admin/Staff
 */
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { user_type, status } = req.query;

    const where = {};

    // SỬA: Logic lọc trạng thái (Loại bỏ 'cancelled' khỏi 'all')
    if (status && status !== 'all') {
      // 1. Lọc theo status cụ thể (pending, approved, rejected)
      where.status = status;
    } else if (status === 'all') {
      // 2. Nếu là 'all', lấy tất cả TRỪ 'cancelled'
      where.status = { [Op.not]: 'cancelled' };
    } else {
      // 3. Mặc định (không truyền status) -> chỉ lấy 'pending'
      where.status = 'pending';
    }

    if (user_type && user_type !== 'all') {
      where.user_type = user_type;
    }

    let includeClause = [
      { 
        model: models.User, 
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role'],
        include: [
          { 
            model: models.Doctor,
            include: [{ model: models.Specialty, as: 'specialty' }] 
          },
          { model: models.Staff }
        ] 
      } 
    ];

    let leaveRequests;
    if (userRole === 'staff') {
      leaveRequests = await models.LeaveRequest.findAll({
        where,
        include: includeClause,
        order: [['requested_at', 'ASC']]
      });
    } else {
      leaveRequests = await models.LeaveRequest.findAll({
        where,
        include: includeClause,
        order: [['requested_at', 'ASC']]
      });
    }

    res.status(200).json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests
    });

  } catch (error) {
    console.error('ERROR in getPendingLeaveRequests:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách đơn chờ duyệt.'
    });
  }
};

/**
 * @desc    Duyệt đơn xin nghỉ (Admin/Staff)
 * @route   PUT /api/leave-requests/:id/approve
 * @access  Private/Admin/Staff
 */
exports.approveLeaveRequest = async (req, res) => {
  
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    const leaveRequest = await models.LeaveRequest.findByPk(id, {
      include: [ { model: models.User, as: 'user' } ],
      transaction
    });

    if (!leaveRequest) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn.' });
    }
    if (leaveRequest.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Đơn đã được xử lý.' });
    }

    await leaveRequest.update({
      status: 'approved',
      processed_at: new Date(),
      processed_by: userId
    }, { transaction });

    // Cập nhật WORK_STATUS
    if (leaveRequest.user_type === 'doctor') {
        const doctor = await models.Doctor.findOne({ where: { user_id: leaveRequest.user_id }, transaction });
        if (doctor && doctor.update) {
            await doctor.update({ work_status: 'on_leave' }, { transaction }); //
        }
    } else if (leaveRequest.user_type === 'staff') {
        const staff = await models.Staff.findOne({ where: { user_id: leaveRequest.user_id }, transaction });
        if (staff && staff.update) {
            await staff.update({ work_status: 'on_leave' }, { transaction }); //
        }
    }

    // Tạo notification cho user
    if (models.Notification) {
      await models.Notification.create({
        user_id: leaveRequest.user_id,
        // SỬA: Dùng 'leave_req'
        type: 'leave_req', 
        message: `Đơn xin nghỉ của bạn (từ ${leaveRequest.date_from}) đã được DUYỆT.`,
        link: `/lich-cua-toi`,
        is_read: false
      }, { transaction });
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Đơn xin nghỉ đã được duyệt.',
      data: leaveRequest
    });

  } catch (error) {
    await transaction.rollback();
    console.error('ERROR in approveLeaveRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi duyệt đơn xin nghỉ.'
    });
  }
};

/**
 * @desc    Từ chối đơn xin nghỉ (Admin/Staff)
 * @route   PUT /api/leave-requests/:id/reject
 * @access  Private/Admin/Staff
 */
exports.rejectLeaveRequest = async (req, res) => {

  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { reject_reason } = req.body;
    const userId = req.user.id;

    if (!reject_reason) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối.' });
    }

    const leaveRequest = await models.LeaveRequest.findByPk(id, {
      include: [{ model: models.User, as: 'user' }],
      transaction
    });

    if (!leaveRequest) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn.' });
    }
    if (leaveRequest.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Đơn đã được xử lý.' });
    }

    await leaveRequest.update({
      status: 'rejected',
      processed_at: new Date(),
      processed_by: userId,
      reject_reason
    }, { transaction });

    // Notification
    if (models.Notification) {
      await models.Notification.create({
        user_id: leaveRequest.user_id,
        // SỬA: Dùng 'leave_req'
        type: 'leave_req', 
        message: `Đơn xin nghỉ của bạn (từ ${leaveRequest.date_from}) đã bị TỪ CHỐI. Lý do: ${reject_reason}`,
        link: `/lich-cua-toi`,
        is_read: false
      }, { transaction });
    }
    
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Đơn xin nghỉ đã bị từ chối.',
      data: leaveRequest
    });

  } catch (error) {
    await transaction.rollback();
    console.error('ERROR in rejectLeaveRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi từ chối đơn xin nghỉ.'
    });
  }
};

/**
 * @desc    Hủy đơn xin nghỉ (Owner)
 * @route   DELETE /api/leave-requests/:id
 * @access  Private/Doctor/Staff
 */
exports.cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const leaveRequest = await models.LeaveRequest.findByPk(id);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn.' });
    }
    if (leaveRequest.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn này.' });
    }
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn đang chờ duyệt.' });
    }

    await leaveRequest.update({ 
      status: 'cancelled' //
    });

    res.status(200).json({
      success: true,
      message: 'Đơn xin nghỉ đã được hủy.',
      data: leaveRequest
    });

  } catch (error) {
    console.error('ERROR in cancelLeaveRequest:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi hủy đơn xin nghỉ.'
    });
  }
};

/**
 * @desc    Lấy lịch sử đơn nghỉ của 1 user (Admin/Staff xem)
 * @route   GET /api/leave-requests/history/:userId
 * @access  Private/Admin/Staff
 */
exports.getUserLeaveHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const where = { user_id: userId };
    if (status && status !== 'all') where.status = status;

    const leaveRequests = await models.LeaveRequest.findAll({
      where,
      include: [
        {
          model: models.User,
          as: 'processor',
          attributes: ['id', 'full_name', 'email']
        }
      ],
      order: [['requested_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: leaveRequests.length,
      data: leaveRequests
    });

  } catch (error) {
    console.error('ERROR in getUserLeaveHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy lịch sử đơn xin nghỉ.'
    });
  }
};
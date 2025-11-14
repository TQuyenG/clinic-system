// server/controllers/staffController.js
const { models } = require('../config/db');
const { Op } = require('sequelize');

/**
 * @desc    Phân công bác sĩ cho staff (Admin only)
 * @route   PUT /api/admin/staff/:id/assign-doctors
 * @access  Private/Admin
 */
exports.assignDoctorsToStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_ids } = req.body;

    if (!doctor_ids || !Array.isArray(doctor_ids)) {
      return res.status(400).json({
        success: false,
        message: 'doctor_ids phải là một mảng.'
      });
    }

    const staff = await models.Staff.findByPk(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên.'
      });
    }

    // Update staff.managed_doctors
    await staff.update({
      managed_doctors: {
        doctor_ids
      }
    });

    // Update doctor.assigned_staff_id cho từng doctor
    // Trước tiên, xóa assignment cũ (set null cho doctors không còn trong list)
    await models.Doctor.update(
      { assigned_staff_id: null },
      { where: { assigned_staff_id: staff.id } }
    );

    // Sau đó, set assignment mới
    if (doctor_ids.length > 0) {
      await models.Doctor.update(
        { assigned_staff_id: staff.id },
        { where: { id: { [Op.in]: doctor_ids } } }
      );
    }

    // Lấy danh sách doctors đã assign
    const assignedDoctors = await models.Doctor.findAll({
      where: { id: { [Op.in]: doctor_ids } },
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['full_name', 'email']
        },
        {
          model: models.Specialty,
          as: 'specialty',
          attributes: ['name']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Phân công bác sĩ thành công.',
      data: {
        staff,
        assigned_doctors: assignedDoctors
      }
    });

  } catch (error) {
    console.error('ERROR in assignDoctorsToStaff:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi phân công bác sĩ.'
    });
  }
};

/**
 * @desc    Lấy danh sách bác sĩ được phân công
 * @route   GET /api/staff/:id/doctors
 * @access  Private/Admin/Staff
 */
exports.getAssignedDoctors = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const staff = await models.Staff.findByPk(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên.'
      });
    }

    // Check permission: Admin hoặc chính staff đó
    if (userRole === 'staff' && staff.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thông tin này.'
      });
    }

    const doctorIds = staff.getManagedDoctorIds();

    const doctors = await models.Doctor.findAll({
      where: { id: { [Op.in]: doctorIds } },
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'full_name', 'email', 'phone']
        },
        {
          model: models.Specialty,
          as: 'specialty',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });

  } catch (error) {
    console.error('ERROR in getAssignedDoctors:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.'
    });
  }
};
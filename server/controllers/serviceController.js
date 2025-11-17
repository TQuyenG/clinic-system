// server/controllers/serviceController.js
const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');

const { Service, ServiceCategory, Specialty, Doctor, User } = models;

/**
 * @route   GET /api/services/admin/all
 * @desc    Lấy tất cả dịch vụ cho admin (với pagination, filter, search)
 * @access  Private (Admin)
 */
exports.getServicesForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category_id,
      status,
      sort = 'name',
      order = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { short_description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (category_id) {
      whereClause.category_id = category_id;
    }
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: services } = await Service.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Specialty,
          as: 'specialty',
          attributes: ['id', 'name']
        }
      ],
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });

    // ✅ MỚI: Populate doctors từ doctor_codes cho từng service
    const servicesWithDoctors = await Promise.all(
      services.map(async (service) => {
        const serviceData = service.toJSON();
        let doctors = [];
        if (serviceData.doctor_codes && Array.isArray(serviceData.doctor_codes) && serviceData.doctor_codes.length > 0) {
          doctors = await Doctor.findAll({
            where: {
              code: { [Op.in]: serviceData.doctor_codes },
              work_status: 'active'
            },
            include: [
              { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'phone'] },
              { model: Specialty, as: 'specialty', attributes: ['id', 'name'] }
            ],
            order: [['user_id', 'ASC']]
          });
        }
        serviceData.doctors = doctors;
        return serviceData;
      })
    );

    res.json({
      success: true,
      data: servicesWithDoctors,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error in getServicesForAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách dịch vụ cho admin',
      error: error.message
    });
  }
};

/* ==================== TẠO DỊCH VỤ ==================== */
exports.createService = async (req, res) => {
  try {
    const {
      category_id,
      specialty_id,
      name,
      price,
      duration,
      short_description,
      detailed_content,
      image_url,
      user_ids,           // <-- NHẬN MỚI
      allow_doctor_choice,
      status
    } = req.body;

    // === VALIDATE BẮT BUỘC ===
    if (!category_id || !name || !price || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: category_id, name, price, duration'
      });
    }

    // === VALIDATE & MAP user_ids → doctor_codes ===
    let doctorCodes = null;
    if (user_ids !== undefined && user_ids !== null) {
      if (!Array.isArray(user_ids)) {
        return res.status(400).json({
          success: false,
          message: 'user_ids phải là một mảng hoặc null'
        });
      }

      if (user_ids.length > 0) {
        const doctors = await Doctor.findAll({
          where: { user_id: { [Op.in]: user_ids } },
          attributes: ['code']
        });
        if (doctors.length !== user_ids.length) {
          return res.status(400).json({
            success: false,
            message: 'Một số user_id không tồn tại hoặc không phải bác sĩ'
          });
        }
        doctorCodes = doctors.map(d => d.code);
      }
    }

    // === TẠO DỊCH VỤ ===
    const service = await Service.create({
      category_id,
      specialty_id: specialty_id || null,
      name,
      price,
      duration,
      short_description: short_description || null,
      detailed_content: detailed_content || null,
      image_url: image_url || null,
      doctor_codes: doctorCodes, // <-- LƯU VÀO CỘT JSON
      allow_doctor_choice: allow_doctor_choice !== undefined ? allow_doctor_choice : true,
      status: status || 'active'
    });

    const createdService = await Service.findByPk(service.id, {
      include: [
        { model: ServiceCategory, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Specialty, as: 'specialty', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Tạo dịch vụ thành công',
      data: createdService
    });

  } catch (error) {
    console.error('Error in createService:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo dịch vụ',
      error: error.message
    });
  }
};

/* ==================== CẬP NHẬT DỊCH VỤ ==================== */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id,
      specialty_id,
      name,
      price,
      duration,
      short_description,
      detailed_content,
      image_url,
      user_ids,           // <-- NHẬN MỚI
      allow_doctor_choice,
      status
    } = req.body;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dịch vụ'
      });
    }

    // === VALIDATE & MAP user_ids → doctor_codes ===
    let doctorCodes = service.doctor_codes;
    if (user_ids !== undefined) {
      if (user_ids !== null && !Array.isArray(user_ids)) {
        return res.status(400).json({
          success: false,
          message: 'user_ids phải là một mảng hoặc null'
        });
      }

      if (user_ids && user_ids.length > 0) {
        const doctors = await Doctor.findAll({
          where: { user_id: { [Op.in]: user_ids } },
          attributes: ['code']
        });
        if (doctors.length !== user_ids.length) {
          return res.status(400).json({
            success: false,
            message: 'Một số user_id không tồn tại hoặc không phải bác sĩ'
          });
        }
        doctorCodes = doctors.map(d => d.code);
      } else {
        doctorCodes = null;
      }
    }

    // === CẬP NHẬT ===
    await service.update({
      category_id: category_id !== undefined ? category_id : service.category_id,
      specialty_id: specialty_id !== undefined ? specialty_id : service.specialty_id,
      name: name !== undefined ? name : service.name,
      price: price !== undefined ? price : service.price,
      duration: duration !== undefined ? duration : service.duration,
      short_description: short_description !== undefined ? short_description : service.short_description,
      detailed_content: detailed_content !== undefined ? detailed_content : service.detailed_content,
      image_url: image_url !== undefined ? image_url : service.image_url,
      doctor_codes: doctorCodes,
      allow_doctor_choice: allow_doctor_choice !== undefined ? allow_doctor_choice : service.allow_doctor_choice,
      status: status !== undefined ? status : service.status
    });

    const updatedService = await Service.findByPk(id, {
      include: [
        { model: ServiceCategory, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Specialty, as: 'specialty', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      success: true,
      message: 'Cập nhật dịch vụ thành công',
      data: updatedService
    });

  } catch (error) {
    console.error('Error in updateService:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật dịch vụ',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/services/:id
 * @desc    Lấy chi tiết một dịch vụ công khai (bao gồm danh sách bác sĩ)
 * @access  Public
 */
exports.getServiceByIdPublic = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findOne({
      where: {
        id: id,
        status: 'active'
      },
      include: [
        {
          model: ServiceCategory,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description']
        },
        {
          model: Specialty,
          as: 'specialty',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dịch vụ'
      });
    }

    // Lấy danh sách bác sĩ từ doctor_codes
    let doctors = [];
    if (service.doctor_codes && Array.isArray(service.doctor_codes) && service.doctor_codes.length > 0) {
      doctors = await Doctor.findAll({
        where: {
          code: {
            [Op.in]: service.doctor_codes
          },
          work_status: 'active'
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'phone']
          },
          {
            model: Specialty,
            as: 'specialty',
            attributes: ['id', 'name']
          }
        ],
        order: [['user_id', 'ASC']]
      });
    }

    // Convert service to plain object và thêm doctors
    const serviceData = service.toJSON();
    serviceData.doctors = doctors || [];

    res.json({
      success: true,
      data: serviceData
    });

  } catch (error) {
    console.error('Error in getServiceByIdPublic:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin dịch vụ',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/services/:id/doctors
 * @desc    Lấy danh sách bác sĩ được chỉ định cho dịch vụ (dùng cho booking page)
 * @access  Public
 */
exports.getServiceDoctors = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra dịch vụ tồn tại
    const service = await Service.findOne({
      where: { id, status: 'active' },
      attributes: ['doctor_codes', 'allow_doctor_choice']
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dịch vụ'
      });
    }

    if (!service.allow_doctor_choice) {
      return res.json({
        success: true,
        allow_choice: false,
        doctors: []
      });
    }

    let doctors = [];
    if (service.doctor_codes && Array.isArray(service.doctor_codes) && service.doctor_codes.length > 0) {
      doctors = await Doctor.findAll({
        where: {
          code: { [Op.in]: service.doctor_codes },
          work_status: 'active'
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'phone'] },
          { model: Specialty, as: 'specialty', attributes: ['id', 'name'] }
        ],
        order: [['user_id', 'ASC']]
      });
    }

    res.json({
      success: true,
      allow_choice: true,
      doctors
    });

  } catch (error) {
    console.error('Error in getServiceDoctors:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách bác sĩ của dịch vụ',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/services
 * @desc    Lấy danh sách dịch vụ công khai (có filter, search, paginate)
 * @access  Public
 */
exports.getPublicServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category_id,
      specialty_id,
      search,
      sort = 'name',
      order = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = { status: 'active' };
    if (category_id) whereClause.category_id = category_id;
    if (specialty_id) whereClause.specialty_id = specialty_id;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { short_description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: services } = await Service.findAndCountAll({
      where: whereClause,
      include: [
        { model: ServiceCategory, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Specialty, as: 'specialty', attributes: ['id', 'name'] }
      ],
      order: [[sort, order.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });

    res.json({
      success: true,
      data: services,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error in getPublicServices:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách dịch vụ',
      error: error.message
    });
  }
};

/**
 * @route   DELETE /api/services/:id
 * @desc    Xóa dịch vụ
 * @access  Private (Admin)
 */
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dịch vụ' });
    }

    const Appointment = models.Appointment;
    const appointmentCount = await Appointment.count({
      where: { service_id: id, status: { [Op.in]: ['pending', 'confirmed'] } }
    });

    if (appointmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa vì có ${appointmentCount} lịch hẹn đang sử dụng. Đặt trạng thái 'inactive' thay vì xóa.`
      });
    }

    await service.destroy();

    res.json({ success: true, message: 'Xóa dịch vụ thành công' });

  } catch (error) {
    console.error('Error in deleteService:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa dịch vụ',
      error: error.message
    });
  }
};
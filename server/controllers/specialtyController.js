// ============================================
// server/controllers/specialtyController.js
// ============================================

const { models } = require('../config/db');
const { Op } = require('sequelize');

// Lấy tất cả chuyên khoa
exports.getAllSpecialties = async (req, res) => {
  try {
    const specialties = await models.Specialty.findAll({
      order: [['created_at', 'DESC']],
      include: [{
        model: models.Doctor,
        attributes: ['id'],
        required: false
      }]
    });

    // Thêm số lượng bác sĩ cho mỗi chuyên khoa
    const formattedSpecialties = specialties.map(specialty => ({
      ...specialty.toJSON(),
      doctorCount: specialty.Doctors?.length || 0
    }));

    res.status(200).json({
      success: true,
      count: formattedSpecialties.length,
      specialties: formattedSpecialties
    });
  } catch (error) {
    console.error('ERROR trong getAllSpecialties:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách chuyên khoa',
      error: error.message
    });
  }
};

// Lấy chi tiết 1 chuyên khoa
exports.getSpecialtyById = async (req, res) => {
  try {
    const { id } = req.params;

    const specialty = await models.Specialty.findByPk(id, {
      include: [{
        model: models.Doctor,
        include: [{
          model: models.User,
          attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url']
        }]
      }]
    });

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyên khoa'
      });
    }

    res.status(200).json({
      success: true,
      specialty
    });
  } catch (error) {
    console.error('ERROR trong getSpecialtyById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin chuyên khoa',
      error: error.message
    });
  }
};

// Tạo chuyên khoa mới
exports.createSpecialty = async (req, res) => {
  try {
    const { name, description, slug } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tên chuyên khoa là bắt buộc'
      });
    }

    // Kiểm tra trùng tên
    const existing = await models.Specialty.findOne({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Chuyên khoa đã tồn tại'
      });
    }

    // Tự động tạo slug nếu không có
    const finalSlug = slug || name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const specialty = await models.Specialty.create({
      name,
      description: description || null,
      slug: finalSlug
    });

    res.status(201).json({
      success: true,
      message: 'Tạo chuyên khoa thành công',
      specialty
    });
  } catch (error) {
    console.error('ERROR trong createSpecialty:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Tên hoặc slug chuyên khoa đã tồn tại'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo chuyên khoa',
      error: error.message
    });
  }
};

// Cập nhật chuyên khoa
exports.updateSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, slug } = req.body;

    const specialty = await models.Specialty.findByPk(id);

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyên khoa'
      });
    }

    // Kiểm tra trùng tên (ngoại trừ chính nó)
    if (name && name !== specialty.name) {
      const existing = await models.Specialty.findOne({
        where: {
          name,
          id: { [Op.ne]: id }
        }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Tên chuyên khoa đã tồn tại'
        });
      }
    }

    // Cập nhật
    if (name !== undefined) specialty.name = name;
    if (description !== undefined) specialty.description = description;
    if (slug !== undefined) specialty.slug = slug;

    await specialty.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật chuyên khoa thành công',
      specialty
    });
  } catch (error) {
    console.error('ERROR trong updateSpecialty:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật chuyên khoa',
      error: error.message
    });
  }
};

// Xóa chuyên khoa
exports.deleteSpecialty = async (req, res) => {
  try {
    const { id } = req.params;

    const specialty = await models.Specialty.findByPk(id);

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyên khoa'
      });
    }

    // Kiểm tra xem có bác sĩ nào đang thuộc chuyên khoa này không
    const doctorCount = await models.Doctor.count({
      where: { specialty_id: id }
    });

    if (doctorCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa. Có ${doctorCount} bác sĩ đang thuộc chuyên khoa này. Vui lòng chuyển họ sang chuyên khoa khác trước.`
      });
    }

    await specialty.destroy();

    res.status(200).json({
      success: true,
      message: 'Xóa chuyên khoa thành công'
    });
  } catch (error) {
    console.error('ERROR trong deleteSpecialty:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa chuyên khoa',
      error: error.message
    });
  }
};

// Lấy chuyên khoa theo slug + danh sách bác sĩ
exports.getSpecialtyBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const specialty = await models.Specialty.findOne({
      where: { slug },
      include: [{
        model: models.Doctor,
        include: [{
          model: models.User,
          where: { 
            is_active: true,
            is_verified: true 
          },
          attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url', 'gender'],
          required: true
        }],
        required: false
      }]
    });

    if (!specialty) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy chuyên khoa'
      });
    }

    // Format doctors
    const doctors = specialty.Doctors.map(doctor => ({
      id: doctor.User.id,
      code: doctor.code,
      full_name: doctor.User.full_name,
      email: doctor.User.email,
      phone: doctor.User.phone,
      gender: doctor.User.gender,
      avatar_url: doctor.User.avatar_url || 'https://via.placeholder.com/400?text=Doctor',
      experience_years: doctor.experience_years || 0,
      bio: doctor.bio
    }));

    res.status(200).json({
      success: true,
      specialty: {
        id: specialty.id,
        name: specialty.name,
        slug: specialty.slug,
        description: specialty.description,
        doctor_count: doctors.length
      },
      doctors
    });
  } catch (error) {
    console.error('ERROR trong getSpecialtyBySlug:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin chuyên khoa',
      error: error.message
    });
  }
};


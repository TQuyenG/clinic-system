// server/controllers/medicalRecordController.js
// ĐÃ SỬA LỖI: Bỏ require 'notificationHelper' và thêm hàm helper nội bộ

const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { models, sequelize } = require('../config/db');
const emailSender = require('../utils/emailSender');

// === HELPERS ===

/**
 * @desc    Tạo thông báo nội bộ
 */
const createInternalNotification = async (data, transaction = null) => {
    try {
        // Ghi chú: Đảm bảo 'models' đã được khởi tạo
        if (!models || !models.Notification) {
             console.error('Model Notification chưa được khởi tạo!');
             return;
        }
        
        await models.Notification.create({
            user_id: data.user_id,
            type: data.type,
            // SỬA: Đổi message thành content (nếu model Notification dùng 'content')
            // Giả sử model dùng 'message' như appointmentController
            message: data.message, 
            content: data.message, // Thêm cả content cho chắc
            title: data.title || 'Thông báo mới', // Thêm title
            link: data.link,
            related_id: data.related_id,
            related_type: data.related_type,
            is_read: false
        }, { transaction }); 
    } catch (error) {
        console.error(`Lỗi khi tạo thông báo cho user ${data.user_id}:`, error.message);
    }
};

/**
 * @desc    Helper xử lý đường dẫn file
 */
const formatFileUrl = (filePath) => {
  if (!filePath) return null;
  // Chuyển đổi C:\...\\uploads\\medical-files\\... thành /uploads/medical-files/...
  return filePath.replace(/\\/g, '/').split('/uploads/').pop();
};

// === TẠO & CẬP NHẬT ===

/**
 * @desc    Tạo Hồ sơ y tế (BS/Admin)
 * @route   POST /api/medical-records
 */
exports.createMedicalRecord = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      appointment_id,
      diagnosis,
      symptoms,
      treatment_plan,
      advice,
      follow_up_date, // Nhận đơn thuốc dưới dạng JSON string
      prescription_json
    } = req.body;

    // 1. Kiểm tra Appointment
    const appointment = await models.Appointment.findByPk(appointment_id, {
      include: [
        { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] },
        { model: models.Patient, as: 'Patient', include: [{ model: models.User }] }
      ],
      transaction: t
    });
    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
    }

    // 2. Kiểm tra đã tồn tại record chưa
    const existingRecord = await models.MedicalRecord.findOne({ where: { appointment_id }, transaction: t });
    if (existingRecord) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Lịch hẹn này đã có hồ sơ y tế. Vui lòng vào trang cập nhật.' });
    }

    // 3. Xử lý file đã upload (từ medicalUploadMiddleware)
    const testImages = req.files?.test_images ? req.files.test_images.map(file => ({
      filename: file.filename,
      originalname: Buffer.from(file.originalname, 'latin1').toString('utf8'), // Hỗ trợ tên file tiếng Việt
      url: `/uploads/medical-files/${file.filename}`, // Lưu URL tương đối
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    const reportFiles = req.files?.report_files ? req.files.report_files.map(file => ({
      filename: file.filename,
      originalname: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      url: `/uploads/medical-files/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    // 4. Tạo Record (Model Hook 'beforeCreate' sẽ tự động tạo hash)
    const medicalRecord = await models.MedicalRecord.create({
      appointment_id,
      patient_id: appointment.patient_id, // Lấy từ appointment (có thể null)
      doctor_id: appointment.doctor_id,
      diagnosis,
      symptoms,
      treatment_plan,
      advice,
      follow_up_date: follow_up_date || null,
      prescription_json: prescription_json ? JSON.parse(prescription_json) : null,
      test_images_json: testImages.length > 0 ? testImages : null,
      report_files_json: reportFiles.length > 0 ? reportFiles : null,
      lookup_code_sent: false
    }, { transaction: t });

    // Lấy mã plaintext từ hook (chỉ tồn tại tạm thời)
    const plaintextLookupCode = medicalRecord.plaintext_lookup_code;
    
    // 5. Cập nhật trạng thái Appointment
    await appointment.update({ 
      status: 'completed', 
      completed_at: new Date(), 
      completed_by: req.user.id 
    }, { transaction: t });
    
    // 5b. Tạo thông báo cho Bệnh nhân (nếu là user)
    if(appointment.patient_id && appointment.Patient?.User) {
        await createInternalNotification({
            user_id: appointment.Patient.User.id,
            type: 'appointment',
            title: 'Đã có kết quả khám',
            message: `Kết quả khám cho lịch hẹn ${appointment.code} đã có. Bạn có thể xem ngay.`,
            link: `/ket-qua-kham/${medicalRecord.id}`, // Link thẳng tới kết quả
            related_id: medicalRecord.id,
            related_type: 'MedicalRecord'
        }, t); // Thêm 't' để chạy trong transaction
    }
    
    await t.commit();

    // 6. Gửi Email (Bất đồng bộ - không cần await)
    const patientEmail = appointment.guest_email || appointment.Patient?.User?.email;
    const patientName = appointment.guest_name || appointment.Patient?.User?.full_name;

    if (patientEmail && plaintextLookupCode) {
      emailSender.sendEmail({
        to: patientEmail,
        subject: `[Bảo mật] Kết quả khám bệnh & Mã tra cứu cho lịch hẹn ${appointment.code}`,
        template: 'medical_record_created', // Template mới
        data: {
          patientName,
          appointmentCode: appointment.code,
          doctorName: appointment.Doctor?.user?.full_name,
          lookupCode: plaintextLookupCode, // Gửi mã tra cứu
          lookupUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/tra-cu-ket-qua`
        }
      });
      // Đánh dấu đã gửi mail (không cần transaction)
      await medicalRecord.update({ lookup_code_sent: true });
    }

    res.status(201).json({ success: true, message: 'Tạo hồ sơ y tế thành công', data: medicalRecord });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR in createMedicalRecord:', error);
    // Xóa file đã upload nếu có lỗi
    if (req.files) {
      const files = [...(req.files.test_images || []), ...(req.files.report_files || [])];
      for (const file of files) {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`Lỗi khi xóa file (rollback): ${file.path}`, err);
        });
      }
    }
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo hồ sơ y tế' });
  }
};

/**
 * @desc    Cập nhật Hồ sơ y tế (BS/Admin)
 * @route   PUT /api/medical-records/:id
 */
exports.updateMedicalRecord = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      diagnosis,
      symptoms,
      treatment_plan,
      advice,
      follow_up_date,
      prescription_json,
      keep_test_images, // Danh sách file ảnh cũ (JSON string)
      keep_report_files  // Danh sách file báo cáo cũ (JSON string)
    } = req.body;

    // 1. Tìm Record
    const record = await models.MedicalRecord.findByPk(id, { 
      include: [{
        model: models.Appointment,
        as: 'Appointment',
        include: [
          { model: models.Patient, as: 'Patient', include: [{ model: models.User }] },
          { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] }
        ]
      }],
      transaction: t 
    });
    if (!record) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ y tế' });
    }

    // 2. Xử lý file mới
    const newTestImages = req.files?.test_images ? req.files.test_images.map(file => ({
      filename: file.filename,
      originalname: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      url: `/uploads/medical-files/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    const newReportFiles = req.files?.report_files ? req.files.report_files.map(file => ({
      filename: file.filename,
      originalname: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      url: `/uploads/medical-files/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size
    })) : [];
    
    // 3. Xử lý file cũ
    const keptImages = keep_test_images ? JSON.parse(keep_test_images) : [];
    const keptReports = keep_report_files ? JSON.parse(keep_report_files) : [];

    const oldImages = record.test_images_json || [];
    const oldReports = record.report_files_json || [];

    // Hàm tìm file cần xóa
    const findFilesToDelete = (oldFiles, keptFiles) => {
      const keptFilenames = new Set(keptFiles.map(f => f.filename));
      return oldFiles.filter(f => !keptFilenames.has(f.filename));
    };

    const imagesToDelete = findFilesToDelete(oldImages, keptImages);
    const reportsToDelete = findFilesToDelete(oldReports, keptReports);

    // 4. Gộp danh sách file cuối cùng
    const finalTestImages = [...keptImages, ...newTestImages];
    const finalReportFiles = [...keptReports, ...newReportFiles];
    
    // 5. Cập nhật DB
    await record.update({
      diagnosis,
      symptoms,
      treatment_plan,
      advice,
      follow_up_date: follow_up_date || null,
      prescription_json: prescription_json ? JSON.parse(prescription_json) : null,
      test_images_json: finalTestImages.length > 0 ? finalTestImages : null,
      report_files_json: finalReportFiles.length > 0 ? finalReportFiles : null,
    }, { transaction: t });
    
    // 5b. Tạo thông báo cập nhật
    const appointment = record.Appointment;
    if(appointment.patient_id && appointment.Patient?.User) {
        await createInternalNotification({
            user_id: appointment.Patient.User.id,
            type: 'appointment',
            title: 'Kết quả khám được cập nhật',
            message: `Kết quả khám cho lịch hẹn ${appointment.code} vừa được cập nhật.`,
            link: `/ket-qua-kham/${record.id}`,
            related_id: record.id,
            related_type: 'MedicalRecord'
        }, t);
    }

    await t.commit();
    
    // 6. Xóa file vật lý (bất đồng bộ, sau khi commit)
    [...imagesToDelete, ...reportsToDelete].forEach(file => {
      if (file && file.filename) {
          const filePath = path.join(__dirname, '../uploads/medical-files', file.filename);
          fs.unlink(filePath, (err) => {
            if (err) console.error(`Lỗi khi xóa file cũ: ${filePath}`, err);
            else console.log(`Đã xóa file cũ: ${filePath}`);
          });
      }
    });

    // 7. Gửi Email thông báo cập nhật (KHÔNG gửi mã code)
    const patientEmail = appointment.guest_email || appointment.Patient?.User?.email;
    const patientName = appointment.guest_name || appointment.Patient?.User?.full_name;

    if (patientEmail) {
      emailSender.sendEmail({
        to: patientEmail,
        subject: `[Cập nhật] Kết quả khám bệnh cho lịch hẹn ${appointment.code}`,
        template: 'medical_record_updated', // Template mới
        data: {
          patientName,
          appointmentCode: appointment.code,
          doctorName: appointment.Doctor?.user?.full_name,
          lookupUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/tra-cu-ket-qua`
        }
      });
    }

    res.status(200).json({ success: true, message: 'Cập nhật hồ sơ thành công', data: record });

  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('ERROR in updateMedicalRecord:', error);
    // Xóa file MỚI đã upload nếu có lỗi
    if (req.files) {
      const files = [...(req.files.test_images || []), ...(req.files.report_files || [])];
      for (const file of files) {
        fs.unlink(file.path, (err) => {
          if (err) console.error(`Lỗi khi xóa file (rollback): ${file.path}`, err);
        });
      }
    }
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật hồ sơ' });
  }
};


// === TRA CỨU & BẢO MẬT ===

/**
 * @desc    Xác thực mật khẩu (Patient/Admin)
 * @route   POST /api/medical-records/verify-password
 */
exports.verifyUserPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu' });
    }

    const user = await models.User.findByPk(userId, { attributes: ['password_hash'] });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
    }

    res.status(200).json({ success: true, message: 'Xác thực thành công' });

  } catch (error) {
    console.error('ERROR in verifyUserPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

/**
 * @desc    Tra cứu kết quả (Guest / Public)
 * @route   POST /api/medical-records/lookup
 */
exports.lookupMedicalRecord = async (req, res) => {
  try {
    const { appointment_code, lookup_code } = req.body;

    if (!appointment_code || !lookup_code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Mã lịch hẹn và Mã tra cứu' });
    }

    // 1. Tìm Appointment
    const appointment = await models.Appointment.findOne({ where: { code: appointment_code } });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Mã lịch hẹn không đúng' });
    }

    // 2. Tìm Medical Record
    const record = await models.MedicalRecord.findOne({ 
      where: { appointment_id: appointment.id },
      // Include đầy đủ thông tin để hiển thị
      include: [
        { model: models.Appointment, as: 'Appointment' },
        { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] },
      ]
    });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Lịch hẹn này chưa có kết quả khám bệnh' });
    }
    
    // 3. SỬA: Xác thực mã (so sánh hash)
    const isMatch = await record.validateLookupCode(lookup_code);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mã tra cứu không chính xác' });
    }

    // 4. Trả về dữ liệu (frontend sẽ render)
    res.status(200).json({ success: true, data: record });

  } catch (error) {
    console.error('ERROR in lookupMedicalRecord:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tra cứu' });
  }
};


/**
 * @desc    Gửi lại mã tra cứu (Guest / Public)
 * @route   POST /api/medical-records/resend-code
 */
exports.resendLookupCode = async (req, res) => {
  try {
    const { appointment_code } = req.body;
    if (!appointment_code) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Mã lịch hẹn' });
    }

    const appointment = await models.Appointment.findOne({ 
      where: { code: appointment_code },
      include: [
          // SỬA LỖI: Thêm as: 'MedicalRecord' (với chữ M viết hoa)
          { model: models.MedicalRecord, as: 'MedicalRecord' }, 
          { model: models.Patient, as: 'Patient', include: [{ model: models.User }] }
      ]
    });
    
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Mã lịch hẹn không đúng' });
    }
    
    // SỬA LỖI: Truy cập record thông qua bí danh
    const record = appointment.MedicalRecord; 
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Lịch hẹn này chưa có kết quả' });
    }

    // SỬA: Chúng ta không thể lấy lại mã plaintext từ hash.
    // Logic đúng: Tạo 1 mã MỚI, hash nó, CẬP NHẬT DB, và gửi mã MỚI.
    
    // 1. Tạo mã mới
    const newLookupCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newLookupCode, salt);
    
    // 2. Cập nhật DB
    await record.update({ lookup_code_hash: newHash, lookup_code_sent: false }); // Reset cờ

    // 3. Gửi email
    const patientEmail = appointment.guest_email || appointment.Patient?.User?.email;
    const patientName = appointment.guest_name || appointment.Patient?.User?.full_name;

    if (patientEmail) {
      emailSender.sendEmail({
        to: patientEmail,
        subject: `[Yêu cầu gửi lại] Mã tra cứu cho lịch hẹn ${appointment.code}`,
        template: 'medical_record_created', // Dùng lại template cũ
        data: {
          patientName,
          appointmentCode: appointment.code,
          doctorName: "Bác sĩ", // Không cần join lại
          lookupCode: newLookupCode, // Gửi mã MỚI
          lookupUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/tra-cu-ket-qua`
        }
      });
      await record.update({ lookup_code_sent: true });
    }

    res.status(200).json({ success: true, message: 'Mã tra cứu mới đã được gửi đến email của bạn. Vui lòng kiểm tra.' });

  } catch (error) {
    console.error('ERROR in resendLookupCode:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

/**
 * @desc    Lấy chi tiết hồ sơ (cho Patient/Doctor/Admin)
 * @route   GET /api/medical-records/:id
 */
exports.getMedicalRecordById = async (req, res) => {
  try {
    const { id } = req.params; // ID của MedicalRecord
    
    // Tạm thời check quyền bằng cách check user (logic đơn giản)
    if (!req.user) {
        // Nếu không có user, ta phải check xem họ có phải là guest đã lookup thành công không
        // Logic này phức tạp, tạm thời frontend sẽ xử lý (Guest sẽ vào /lookup)
        // User đã đăng nhập sẽ vào thẳng đây.
    }
    
    const record = await models.MedicalRecord.findByPk(id, {
      include: [
        { model: models.Appointment, as: 'Appointment' },
        { model: models.Patient, as: 'Patient', include: [{ model: models.User }] },
        { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] },
      ]
    });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    
    // (Logic check quyền xem chi tiết - tương tự getAppointmentById)
    // Nếu là user, check xem có phải chủ record không
    if (req.user && req.user.role === 'patient') {
        const patient = await models.Patient.findOne({ where: { user_id: req.user.id } });
        if (record.patient_id !== patient.id) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem hồ sơ này' });
        }
    }
    
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error('ERROR in getMedicalRecordById:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// === ADMIN ===

/**
 * @desc    Lấy danh sách hồ sơ y tế (Admin)
 * @route   GET /api/medical-records/admin/all
 */
exports.getAdminMedicalRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let whereCondition = {};
    let includeWhere = {};

    if (search) {
      const searchLike = { [Op.like]: `%${search}%` };
      whereCondition[Op.or] = [
        { '$Appointment.code$': searchLike },
        { '$Appointment.guest_name$': searchLike },
        { '$Appointment.Patient.User.full_name$': searchLike },
        { '$Doctor.user.full_name$': searchLike },
      ];
    }
    
    const { count, rows } = await models.MedicalRecord.findAndCountAll({
      where: whereCondition,
      include: [
        { 
          model: models.Appointment, 
          as: 'Appointment', 
          attributes: ['code', 'guest_name', 'guest_email'],
          include: [{
             model: models.Patient, 
             as: 'Patient', 
             attributes: ['id'],
             include: [{ model: models.User, attributes: ['full_name', 'email'] }]
          }]
        },
        { 
          model: models.Doctor, 
          as: 'Doctor', 
          attributes: ['id'],
          include: [{ model: models.User, as: 'user', attributes: ['full_name'] }]
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true,
      subQuery: false
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: parseInt(page), itemsPerPage: parseInt(limit) }
    });

  } catch (error) {
    console.error('ERROR in getAdminMedicalRecords:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};


// /**
//  * @desc    Tiết lộ mã tra cứu (Admin)
//  * @route   POST /api/medical-records/admin/reveal-code
//  */
// exports.revealLookupCode = async (req, res) => {
//   try {
//     const { password, record_id } = req.body;
//     const adminUserId = req.user.id;
    
//     // 1. Xác thực mật khẩu Admin
//     const adminUser = await models.User.findByPk(adminUserId, { attributes: ['password_hash'] });

//     // SỬA LỖI: Thêm bước kiểm tra xem adminUser có tồn tại không
//     if (!adminUser) {
//       return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản Admin' });
//     }
//     // KẾT THÚC SỬA LỖI
    
//     const isMatch = await bcrypt.compare(password, adminUser.password_hash);
    
//     if (!isMatch) {
//       return res.status(401).json({ success: false, message: 'Mật khẩu Admin không chính xác' });
//     }

//     // 2. Tìm record
//     const record = await models.MedicalRecord.findByPk(record_id, { 
//         attributes: ['lookup_code_hash', 'appointment_id'],
//         include: [{ model: models.Appointment, as: 'Appointment', attributes: ['code'] }]
//     });
//     if (!record) {
//       return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
//     }
    
//     // 3. Logic RESET mã (Giữ nguyên)
    
//     // 1. Tạo mã mới
//     const newLookupCode = crypto.randomBytes(5).toString('hex').toUpperCase();
//     const salt = await bcrypt.genSalt(10);
//     const newHash = await bcrypt.hash(newLookupCode, salt);
    
//     // 2. Cập nhật DB
//     await record.update({ lookup_code_hash: newHash, lookup_code_sent: false });

//     // 3. Trả về mã MỚI
//     res.status(200).json({ 
//       success: true, 
//       message: 'Mật khẩu chính xác. Mã tra cứu đã được reset và hiển thị.',
//       newLookupCode: newLookupCode,
//       appointmentCode: record.Appointment.code
//     });
    
//     // (Admin sẽ đọc mã này cho bệnh nhân qua điện thoại)

//   } catch (error) {
//     console.error('ERROR in revealLookupCode:', error);
//     res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
//   }
// };

/**
 * @desc    RESET mã tra cứu (Admin) - KHÔNG CẦN MẬT KHẨU
 * @route   POST /api/medical-records/admin/reset-code
 */
exports.resetLookupCodeByAdmin = async (req, res) => {
  try {
    const { record_id } = req.body;

    // 1. Tìm record VÀ thông tin liên quan (Appointment, Patient, Doctor)
    const record = await models.MedicalRecord.findByPk(record_id, { 
        // SỬA LỖI: Thêm 'id' vào attributes (Đã sửa ở lượt trước)
        attributes: ['id', 'lookup_code_hash', 'appointment_id'],
        include: [{ 
            model: models.Appointment, 
            as: 'Appointment', 
            attributes: ['code', 'guest_email', 'guest_name', 'patient_id'],
            include: [
                { model: models.Patient, as: 'Patient', include: [{ model: models.User }] },
                { model: models.Doctor, as: 'Doctor', include: [{ model: models.User, as: 'user' }] }
            ]
        }]
    });
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ' });
    }
    
    // 2. Logic RESET mã
    const newLookupCode = crypto.randomBytes(5).toString('hex').toUpperCase();
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newLookupCode, salt);
    
    // 3. Cập nhật DB
    await record.update({ lookup_code_hash: newHash, lookup_code_sent: false });

    // 4. BỔ SUNG: Gửi email cho bệnh nhân
    const appointment = record.Appointment;
    const patientEmail = appointment.guest_email || appointment.Patient?.User?.email;
    const patientName = appointment.guest_name || appointment.Patient?.User?.full_name;
    const doctorName = appointment.Doctor?.user?.full_name || 'Bác sĩ';

    if (patientEmail) {
      emailSender.sendEmail({
        to: patientEmail,
        subject: `[Admin Reset] Mã tra cứu MỚI cho lịch hẹn ${appointment.code}`,
        
        // SỬA LỖI QUAN TRỌNG:
        // Đảm bảo template là 'medical_record_created', 
        // KHÔNG PHẢI 'appointment_code_recovery'
        template: 'medical_record_created', 
        
        data: {
          patientName,
          appointmentCode: appointment.code,
          doctorName: doctorName,
          lookupCode: newLookupCode, // Gửi mã MỚI
          lookupUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/tra-cu-ket-qua`
          // Dữ liệu này không có 'appointments.length'
        }
      });
      await record.update({ lookup_code_sent: true });
    }
    
    // 5. Trả về mã MỚI cho Admin
    res.status(200).json({ 
      success: true, 
      message: 'Reset thành công! Mã mới đã được gửi đến email bệnh nhân.',
      newLookupCode: newLookupCode,
      appointmentCode: record.Appointment.code
    });

  } catch (error) {
    console.error('ERROR in resetLookupCodeByAdmin:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

/**
 * @desc    Lấy tất cả hồ sơ y tế của Bệnh nhân (đã đăng nhập)
 * @route   GET /api/medical-records/my-records
 */
exports.getMyMedicalRecords = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Tìm patient_id từ user_id
    const patient = await models.Patient.findOne({
      where: { user_id: userId },
      attributes: ['id']
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bệnh nhân' });
    }

    // 2. Lấy tất cả hồ sơ y tế của patient_id này
    const records = await models.MedicalRecord.findAll({
      where: { patient_id: patient.id },
      include: [
        {
          model: models.Appointment,
          as: 'Appointment',
          attributes: ['code', 'appointment_date']
        },
        {
          model: models.Doctor,
          as: 'Doctor',
          include: [{ model: models.User, as: 'user', attributes: ['full_name'] }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ success: true, data: records });

  } catch (error) {
    console.error('ERROR in getMyMedicalRecords:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy hồ sơ y tế' });
  }
};

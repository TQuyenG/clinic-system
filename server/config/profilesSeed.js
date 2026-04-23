// server/config/profilesSeed.js
// Hàm seed cho bảng Patient, Staff, Doctor, Admin profiles (hỗ trợ số lượng động)
const { getPermissionsTemplate } = require('./departmentPermissions');

module.exports = async function seedProfiles(models, transaction, context = {}) {
  const users = context.users;
  if (!users || users.length === 0) throw new Error('profilesSeed requires users array');

  // Group users by role
  const patientUsers = users.filter(u => u.role === 'patient');
  const staffUsers = users.filter(u => u.role === 'staff');
  const doctorUsers = users.filter(u => u.role === 'doctor');
  const adminUsers = users.filter(u => u.role === 'admin');

  // Patients
  const patientCount = await models.Patient.count({ transaction });
  const patientData = patientUsers.map((u, idx) => ({
    user_id: u.id,
    username: u.username,
    code: `PT${String(patientCount + idx + 1).padStart(5, '0')}`,
    medical_history: idx % 2 === 0 ? 'Không có' : 'Dị ứng penicillin',
    created_at: new Date(),
    updated_at: new Date()
  }));
  const patients = patientData.length ? await models.Patient.bulkCreate(patientData, { transaction, validate: true }) : [];

  // Staffs
  const staffCount = await models.Staff.count({ transaction });
  const defaultDepts = ['system','support','clinical','content','finance'];
  
  // Map username to department cho staff mới
  const deptMapping = {
    'staff_clinical_manager': 'clinical',
    'staff_clinical_1': 'clinical',
    'staff_clinical_2': 'clinical',
    'staff_it_manager': 'system',
    'staff_it_1': 'system',
    'staff_support_manager': 'support',
    'staff_support_1': 'support',
    'staff_finance_manager': 'finance',
    'staff_finance_1': 'finance',
    'staff_content_manager': 'content'
  };
  
  // Map username to rank
  const rankMapping = {
    'staff_clinical_manager': 'manager',
    'staff_it_manager': 'manager',
    'staff_support_manager': 'manager',
    'staff_finance_manager': 'manager',
    'staff_content_manager': 'manager'
  };
  
  const staffData = staffUsers.map((u, idx) => {
    const department = deptMapping[u.username] || defaultDepts[idx % defaultDepts.length] || 'support';
    const rank = rankMapping[u.username] || 'staff';
    const permissions = getPermissionsTemplate(department, rank);
    
    return {
      user_id: u.id,
      username: u.username,
      code: `ST${String(staffCount + idx + 1).padStart(5, '0')}`,
      department: department,
      rank: rank,
      permissions: permissions, // Thêm permissions từ template
      job_description: rank === 'manager' 
        ? `Trưởng phòng ${department}` 
        : `Nhân viên ${department}`,
      created_at: new Date(),
      updated_at: new Date()
    };
  });
  const staffs = staffData.length ? await models.Staff.bulkCreate(staffData, { transaction, validate: true }) : [];

  // Doctors
  const doctorCount = await models.Doctor.count({ transaction });
  const specialties = context.specialties || [];
  const doctorsData = doctorUsers.map((u, idx) => ({
    user_id: u.id,
    username: u.username,
    code: `DR${String(doctorCount + idx + 1).padStart(5, '0')}`,
    specialty_id: specialties.length ? specialties[idx % specialties.length].id : null,
    experience_years: 5 + (idx % 20),
    title: ['BS.', 'ThS.', 'TS.', 'PGS. TS.'][idx % 4],
    position: ['Bác sĩ chính', 'Trưởng khoa', 'Bác sĩ điều trị', 'Chuyên gia tư vấn'][idx % 4],
    workplace: [`Bệnh viện Trung ương ${idx+1}`, `Phòng khám Đa khoa ${idx+1}`][idx % 2],
    specializations: [
      specialties.length ? specialties[idx % specialties.length].name : 'Nội tổng quát',
      'Siêu âm',
      'Điện tim'
    ],
    bio: `Bác sĩ ${u.full_name} có kinh nghiệm ${5 + (idx % 20)} năm trong lĩnh vực ${specialties.length ? specialties[idx % specialties.length].name : 'y khoa'}.`,
    education: [
      { year: 2005 + (idx % 10), degree: 'Bác sĩ Y khoa', institution: `Đại học Y Hà Nội`, description: null },
      { year: 2010 + (idx % 5), degree: 'Chuyên khoa cấp I/II', institution: `Bệnh viện ${idx+1}`, description: null }
    ],
    certifications: [
      { name: 'Chứng chỉ chuyên môn', link: null }
    ],
    work_experience: [
      { period: `${2011 + idx}-${2015 + idx}`, position: 'Bác sĩ', hospital: `Bệnh viện ${idx+1}`, department: specialties.length ? specialties[idx % specialties.length].name : null, description: null }
    ],
    research: [
      { title: `Nghiên cứu ${idx+1} về ${specialties.length ? specialties[idx % specialties.length].name : 'y khoa'}`, journal: 'Tạp chí Y học', year: 2018 + (idx % 5), authors: u.full_name }
    ],
    achievements: [
      { title: `Thành tích ${idx+1}`, link: null }
    ],
    created_at: new Date(),
    updated_at: new Date()
  }));
  const doctors = doctorsData.length ? await models.Doctor.bulkCreate(doctorsData, { transaction, validate: true }) : [];

  // Admins
  const adminCount = await models.Admin.count({ transaction });
  const adminData = adminUsers.map((u, idx) => ({
    user_id: u.id,
    username: u.username,
    code: `AD${String(adminCount + idx + 1).padStart(5, '0')}`,
    permissions_json: idx === 0 ? ['all'] : ['manage_users','manage_content'],
    created_at: new Date(),
    updated_at: new Date()
  }));
  const admins = adminData.length ? await models.Admin.bulkCreate(adminData, { transaction, validate: true }) : [];

  return { patients, staffs, doctors, admins };
};
// server/config/appointmentsSeed.js
const crypto = require('crypto');

function generateAppointmentCode() {
  const date = new Date();
  const datePart = `${String(date.getDate()).padStart(2,'0')}${String(date.getMonth()+1).padStart(2,'0')}`;
  const randomPart = String(Math.floor(1000 + Math.random() * 9000));
  return `AP-${datePart}-${randomPart}`;
}

module.exports = async function seedAppointments(models, transaction) {
  // Get some patients, doctors, services
  const patients = await models.Patient.findAll({ limit: 10, transaction });
  const doctors = await models.Doctor.findAll({ limit: 10, transaction });
  const services = await models.Service.findAll({ limit: 10, transaction });

  if (!patients.length || !doctors.length || !services.length) return [];

  const appointments = [];
  const today = new Date();
  const makeDate = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0,10);
  };

  const statuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
  const paymentStatuses = ['unpaid', 'paid_online', 'paid_at_clinic', 'refunded'];
  const appointmentTypes = ['offline', 'online', 'emergency'];
  
  const timeSlots = [
    { start: '07:00:00', end: '07:30:00' },
    { start: '08:00:00', end: '08:30:00' },
    { start: '09:00:00', end: '09:30:00' },
    { start: '10:00:00', end: '10:30:00' },
    { start: '14:00:00', end: '14:30:00' },
    { start: '15:00:00', end: '15:30:00' },
    { start: '16:00:00', end: '16:30:00' }
  ];

  // Tạo 20 appointments với các trường hợp khác nhau
  for (let i = 0; i < 20; i++) {
    const patient = patients[i % patients.length];
    const service = services[i % services.length];
    const doctor = doctors[i % doctors.length];
    const timeSlot = timeSlots[i % timeSlots.length];

    // Phân bổ các ngày: quá khứ, hôm nay, tương lai
    let dateOffset;
    if (i < 5) dateOffset = -2; // Quá khứ
    else if (i < 8) dateOffset = 0; // Hôm nay
    else dateOffset = 1 + (i % 5); // Tương lai

    const date = makeDate(dateOffset);
    
    // Phân bổ trạng thái theo logic
    let status, paymentStatus;
    if (dateOffset < 0) {
      // Lịch quá khứ: completed hoặc cancelled
      status = i % 2 === 0 ? 'completed' : 'cancelled';
      paymentStatus = status === 'completed' ? 'paid_online' : 'refunded';
    } else if (dateOffset === 0) {
      // Hôm nay: in_progress, confirmed
      status = i % 2 === 0 ? 'in_progress' : 'confirmed';
      paymentStatus = 'paid_online';
    } else {
      // Tương lai: pending, confirmed
      status = i % 2 === 0 ? 'pending' : 'confirmed';
      paymentStatus = i % 3 === 0 ? 'unpaid' : 'paid_online';
    }

    appointments.push({
      patient_id: patient.id,
      doctor_id: doctor.id,
      service_id: service.id,
      specialty_id: service.specialty_id || null,
      appointment_date: date,
      appointment_start_time: timeSlot.start,
      appointment_end_time: timeSlot.end,
      appointment_type: appointmentTypes[i % appointmentTypes.length],
      status: status,
      payment_status: paymentStatus,
      code: generateAppointmentCode(),
      guest_name: i % 5 === 0 ? 'Người thân' : null, // Một số dành cho người thân
      guest_phone: i % 5 === 0 ? '0912345678' : null,
      notes: `Ghi chú mẫu ${i + 1}`
    });
  }

  try {
    await models.Appointment.bulkCreate(appointments, { transaction, ignoreDuplicates: true });
    console.log(`✅ Appointments seed: created ${appointments.length} appointments`);
  } catch (err) {
    console.error('❌ Error seeding appointments:', err);
  }

  const created = await models.Appointment.findAll({ limit: 30, transaction });
  return created;
};

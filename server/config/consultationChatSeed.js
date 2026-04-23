// server/config/consultationChatSeed.js
// Seed consultation records + chat messages for chat/video
module.exports = async function seedConsultationChat(models, transaction, context = {}) {
  const Consultation = models.Consultation;
  const ChatMessage = models.ChatMessage;
  const User = models.User;
  const Specialty = models.Specialty;
  const ConsultationPricing = models.ConsultationPricing;

  const users = await User.findAll({ transaction });
  const patients = users.filter(u => u.role === 'patient');
  const doctors = users.filter(u => u.role === 'doctor');
  const specialties = await Specialty.findAll({ transaction });
  const packages = await ConsultationPricing.findAll({ transaction });

  if (!patients.length || !doctors.length || !packages.length) return [];

  const created = [];
  const now = new Date();
  
  const consultationTypes = ['chat', 'video', 'offline'];
  const statuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'];
  const paymentStatuses = ['unpaid', 'paid_online', 'paid_at_clinic', 'not_required', 'refunded'];

  function generateConsultationCode() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `CS${timestamp}${random}`;
  }

  const makeDateTime = (daysOffset, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  // Tạo 25 consultations với nhiều trường hợp khác nhau
  for (let i = 0; i < 25; i++) {
    const patient = patients[i % patients.length];
    const doctor = doctors[i % doctors.length];
    const specialty = specialties.length ? specialties[i % specialties.length] : null;
    const pkg = packages[i % packages.length];

    // Phân bổ ngày: quá khứ, hôm nay, tương lai
    let daysOffset, status, paymentStatus, consultationType;
    
    if (i < 5) {
      // Quá khứ: completed hoặc cancelled
      daysOffset = -2 - (i % 3);
      status = i % 2 === 0 ? 'completed' : 'cancelled';
      paymentStatus = status === 'completed' ? 'paid_online' : 'refunded';
      consultationType = consultationTypes[i % 3];
    } else if (i < 10) {
      // Hôm nay: in_progress hoặc confirmed
      daysOffset = 0;
      status = i % 2 === 0 ? 'in_progress' : 'confirmed';
      paymentStatus = 'paid_online';
      consultationType = i % 2 === 0 ? 'chat' : 'video';
    } else if (i < 15) {
      // Tương lai: pending hoặc confirmed
      daysOffset = 1 + (i % 4);
      status = i % 2 === 0 ? 'pending' : 'confirmed';
      paymentStatus = i % 3 === 0 ? 'unpaid' : 'paid_online';
      consultationType = consultationTypes[i % 3];
    } else {
      // Tương lai xa: pending với các loại payment khác nhau
      daysOffset = 5 + (i % 5);
      status = 'pending';
      // Mix payment statuses
      if (i % 4 === 0) paymentStatus = 'not_required'; // Miễn phí
      else if (i % 4 === 1) paymentStatus = 'unpaid';
      else paymentStatus = 'paid_online';
      consultationType = consultationTypes[i % 3];
    }

    const apptTime = makeDateTime(daysOffset, 8 + (i % 10));

    try {
      const consult = await Consultation.create({
        consultation_code: generateConsultationCode(),
        patient_id: patient.id,
        doctor_id: doctor.id,
        consultation_type: consultationType,
        specialty_id: specialty ? specialty.id : null,
        consultation_pricing_id: pkg.id,
        appointment_time: apptTime,
        duration_minutes: pkg.duration_minutes || 30,
        chief_complaint: `Triệu chứng mẫu ${i + 1}: ${consultationType === 'chat' ? 'Tư vấn qua chat' : consultationType === 'video' ? 'Tư vấn video call' : 'Khám trực tiếp'}`,
        medical_history: i % 3 === 0 ? 'Tiền sử bệnh: Cao huyết áp' : null,
        current_medications: i % 4 === 0 ? 'Đang dùng thuốc hạ áp' : null,
        symptom_duration: `${1 + (i % 7)} ngày`,
        status: status,
        base_fee: pkg.price,
        platform_fee: Math.round(pkg.price * 0.1),
        total_fee: pkg.price + Math.round(pkg.price * 0.1),
        payment_status: paymentStatus,
        payment_method: paymentStatus === 'paid_online' ? 'vnpay' : (paymentStatus === 'not_required' ? null : 'bank_transfer'),
        notes: `Ghi chú mẫu consultation ${i + 1}`
      }, { transaction });

      // Tạo chat messages cho consultation type chat hoặc video và đã bắt đầu
      if ((consultationType === 'chat' || consultationType === 'video') && 
          (status === 'in_progress' || status === 'completed')) {
        const messages = [
          { sender: patient, receiver: doctor, text: `Chào bác sĩ, tôi cần tư vấn về triệu chứng của mình.` },
          { sender: doctor, receiver: patient, text: `Chào bạn! Bạn có thể mô tả chi tiết triệu chứng không?` },
          { sender: patient, receiver: doctor, text: `Tôi bị đau đầu và mệt mỏi khoảng ${1 + (i % 5)} ngày rồi.` },
          { sender: doctor, receiver: patient, text: `Bạn đã thử nghỉ ngơi và uống thuốc giảm đau chưa?` },
          { sender: patient, receiver: doctor, text: `Tôi đã thử nhưng không đỡ lắm.` },
          { sender: doctor, receiver: patient, text: `Tôi khuyên bạn nên làm thêm xét nghiệm. Tôi sẽ kê đơn thuốc cho bạn.` }
        ];

        for (const m of messages) {
          await ChatMessage.create({
            consultation_id: consult.id,
            sender_id: m.sender.id,
            sender_type: m.sender.role === 'doctor' ? 'doctor' : 'patient',
            receiver_id: m.receiver.id,
            message_type: 'text',
            content: m.text
          }, { transaction });
        }
      }

      created.push(consult);
    } catch (err) {
      console.error(`❌ Error creating consultation ${i}:`, err.message);
    }
  }

  console.log(`✅ Consultation + chat seed: created ${created.length}/25 consultations`);
  return created;
};

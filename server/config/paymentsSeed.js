// server/config/paymentsSeed.js
module.exports = async function seedPayments(models, transaction) {
  const appointments = await models.Appointment.findAll({ where: { payment_status: 'pending' }, limit: 8, transaction });
  const created = [];
  for (const appt of appointments) {
    try {
      const service = await models.Service.findByPk(appt.service_id, { transaction });
      const amount = service ? service.price : 100000;
      const p = await models.Payment.create({
        appointment_id: appt.id,
        user_id: appt.patient_id || appt.guest_phone || null,
        amount,
        method: 'cash',
        status: 'pending'
      }, { transaction });
      created.push(p);
    } catch (err) {
      // ignore
    }
  }
  return created;
};

// server/jobs/statusUpdater.js
// Cron job tự động cập nhật status của Appointment và Consultation

const cron = require('node-cron');
const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');

/**
 * Cập nhật status của Appointments tự động
 * - upcoming: 24h trước appointment_date + appointment_start_time
 * - in_progress: trong khoảng start_time đến end_time
 * - completed: sau end_time
 * - passed: 1 ngày sau end_time
 */
async function updateAppointmentStatuses() {
  try {
    const now = new Date();
    
    // 1. Update to 'upcoming' (24 giờ trước appointment)
    const upcomingThreshold = new Date(now);
    upcomingThreshold.setHours(now.getHours() + 24);
    
    const upcomingCount = await models.Appointment.update(
      { status: 'upcoming' },
      {
        where: {
          status: 'confirmed',
          [Op.and]: [
            sequelize.where(
              sequelize.fn('TIMESTAMP', 
                sequelize.col('appointment_date'), 
                sequelize.col('appointment_start_time')
              ),
              { [Op.lte]: upcomingThreshold }
            ),
            sequelize.where(
              sequelize.fn('TIMESTAMP', 
                sequelize.col('appointment_date'), 
                sequelize.col('appointment_start_time')
              ),
              { [Op.gt]: now }
            )
          ]
        }
      }
    );
    
    // 2. Update to 'in_progress' (đang trong giờ khám)
    const inProgressCount = await models.Appointment.update(
      { status: 'in_progress' },
      {
        where: {
          status: { [Op.in]: ['confirmed', 'upcoming'] },
          [Op.and]: [
            sequelize.where(
              sequelize.fn('TIMESTAMP', 
                sequelize.col('appointment_date'), 
                sequelize.col('appointment_start_time')
              ),
              { [Op.lte]: now }
            ),
            sequelize.where(
              sequelize.fn('TIMESTAMP', 
                sequelize.col('appointment_date'), 
                sequelize.col('appointment_end_time')
              ),
              { [Op.gte]: now }
            )
          ]
        }
      }
    );
    
    // 3. Update to 'completed' (sau giờ khám)
    const completedCount = await models.Appointment.update(
      { status: 'completed' },
      {
        where: {
          status: { [Op.in]: ['confirmed', 'upcoming', 'in_progress'] },
          [Op.and]: [
            sequelize.where(
              sequelize.fn('TIMESTAMP', 
                sequelize.col('appointment_date'), 
                sequelize.col('appointment_end_time')
              ),
              { [Op.lt]: now }
            ),
            // Chưa quá 24h sau khi kết thúc
            sequelize.where(
              sequelize.fn('TIMESTAMP', 
                sequelize.col('appointment_date'), 
                sequelize.col('appointment_end_time')
              ),
              { [Op.gte]: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
            )
          ]
        }
      }
    );
    
    // 4. Update to 'passed' (1 ngày sau khi kết thúc)
    const passedThreshold = new Date(now);
    passedThreshold.setDate(passedThreshold.getDate() - 1);
    
    const passedCount = await models.Appointment.update(
      { status: 'passed' },
      {
        where: {
          status: { [Op.in]: ['completed'] },
          [Op.and]: [
            sequelize.where(
              sequelize.fn('TIMESTAMP', 
                sequelize.col('appointment_date'), 
                sequelize.col('appointment_end_time')
              ),
              { [Op.lt]: passedThreshold }
            )
          ]
        }
      }
    );
    
    // 5. Tự động cập nhật medical_record_status nếu đã có hồ sơ y tế
    const medicalRecordCount = await sequelize.query(`
      UPDATE appointments a
      INNER JOIN medical_records mr ON a.id = mr.appointment_id
      SET a.medical_record_status = 'has_record'
      WHERE a.medical_record_status = 'no_record'
    `, { type: sequelize.QueryTypes.UPDATE });

    const totalUpdates = upcomingCount[0] + inProgressCount[0] + completedCount[0] + passedCount[0];
    
    if (totalUpdates > 0) {
      console.log(`✅ [CRON] Updated ${totalUpdates} appointments:`, {
        upcoming: upcomingCount[0],
        in_progress: inProgressCount[0],
        completed: completedCount[0],
        passed: passedCount[0],
        medical_records: medicalRecordCount[0] || 0
      });
    }
    
  } catch (error) {
    console.error('❌ [CRON] Error updating appointment statuses:', error);
  }
}

/**
 * Cập nhật status của Consultations tự động
 */
async function updateConsultationStatuses() {
  try {
    const now = new Date();
    
    // 1. Update to 'upcoming' (24h trước appointment_time)
    const upcomingThreshold = new Date(now);
    upcomingThreshold.setHours(now.getHours() + 24);
    
    const upcomingCount = await models.Consultation.update(
      { status: 'upcoming' },
      {
        where: {
          status: 'confirmed',
          appointment_time: {
            [Op.lte]: upcomingThreshold,
            [Op.gt]: now
          }
        }
      }
    );
    
    // 2. Update to 'in_progress' (đang trong giờ tư vấn)
    // Giả sử mỗi consultation kéo dài duration_minutes (mặc định 30 phút nếu không có)
    const inProgressCount = await models.Consultation.update(
      { status: 'in_progress' },
      {
        where: {
          status: { [Op.in]: ['confirmed', 'upcoming'] },
          appointment_time: { [Op.lte]: now },
          [Op.or]: [
            // Nếu có ended_at, kiểm tra chưa kết thúc
            { ended_at: { [Op.gte]: now } },
            // Nếu chưa có ended_at, giả sử kéo dài duration_minutes
            {
              ended_at: null,
              [Op.and]: sequelize.where(
                sequelize.fn('DATE_ADD', 
                  sequelize.col('appointment_time'), 
                  sequelize.literal('INTERVAL COALESCE(duration_minutes, 30) MINUTE')
                ),
                { [Op.gte]: now }
              )
            }
          ]
        }
      }
    );
    
    // 3. Update to 'completed' (sau khi kết thúc)
    const completedCount = await models.Consultation.update(
      { status: 'completed' },
      {
        where: {
          status: { [Op.in]: ['confirmed', 'upcoming', 'in_progress'] },
          [Op.or]: [
            // Có ended_at và đã qua
            { 
              ended_at: { 
                [Op.lt]: now,
                [Op.gte]: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Trong vòng 24h
              } 
            },
            // Không có ended_at nhưng đã quá duration_minutes
            {
              ended_at: null,
              [Op.and]: sequelize.where(
                sequelize.fn('DATE_ADD', 
                  sequelize.col('appointment_time'), 
                  sequelize.literal('INTERVAL COALESCE(duration_minutes, 30) MINUTE')
                ),
                { 
                  [Op.lt]: now,
                  [Op.gte]: new Date(now.getTime() - 24 * 60 * 60 * 1000)
                }
              )
            }
          ]
        }
      }
    );
    
    // 4. Update to 'passed' (1 ngày sau khi kết thúc)
    const passedThreshold = new Date(now);
    passedThreshold.setDate(passedThreshold.getDate() - 1);
    
    const passedCount = await models.Consultation.update(
      { status: 'passed' },
      {
        where: {
          status: 'completed',
          [Op.or]: [
            { ended_at: { [Op.lt]: passedThreshold } },
            {
              ended_at: null,
              [Op.and]: sequelize.where(
                sequelize.fn('DATE_ADD', 
                  sequelize.col('appointment_time'), 
                  sequelize.literal('INTERVAL COALESCE(duration_minutes, 30) MINUTE')
                ),
                { [Op.lt]: passedThreshold }
              )
            }
          ]
        }
      }
    );
    
    // 5. Tự động cập nhật medical_record_status nếu có consultation report
    const reportCount = await sequelize.query(`
      UPDATE consultations c
      INNER JOIN consultation_reports cr ON c.id = cr.consultation_id
      SET c.medical_record_status = 'has_record'
      WHERE c.medical_record_status = 'no_record'
    `, { type: sequelize.QueryTypes.UPDATE });

    const totalUpdates = upcomingCount[0] + inProgressCount[0] + completedCount[0] + passedCount[0];
    
    if (totalUpdates > 0) {
      console.log(`✅ [CRON] Updated ${totalUpdates} consultations:`, {
        upcoming: upcomingCount[0],
        in_progress: inProgressCount[0],
        completed: completedCount[0],
        passed: passedCount[0],
        reports: reportCount[0] || 0
      });
    }
    
  } catch (error) {
    console.error('❌ [CRON] Error updating consultation statuses:', error);
  }
}

/**
 * Khởi động cron job
 * Chạy mỗi 5 phút
 */
function startStatusUpdaterCron() {
  console.log('🕒 Starting Status Updater Cron Job (every 5 minutes)...');
  
  // Chạy ngay lần đầu khi khởi động
  updateAppointmentStatuses();
  updateConsultationStatuses();
  
  // Sau đó chạy định kỳ mỗi 5 phút
  cron.schedule('*/5 * * * *', async () => {
    console.log(`\n⏰ [CRON] Running status update at ${new Date().toLocaleString()}`);
    await updateAppointmentStatuses();
    await updateConsultationStatuses();
  });
}

module.exports = { startStatusUpdaterCron };

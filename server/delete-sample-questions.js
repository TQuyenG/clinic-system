require('dotenv').config({ path: '../.env' });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('clinic_db', 'quytai', 'Quytai@2025!', {
  host: '127.0.0.1',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

async function deleteSampleData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công');

    // Xóa answers trước (foreign key)
    const [deletedAnswers] = await sequelize.query(
      'DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY))'
    );
    console.log(`🗑️  Đã xóa ${deletedAnswers.affectedRows || 0} câu trả lời mẫu`);

    // Xóa questions
    const [deletedQuestions] = await sequelize.query(
      'DELETE FROM questions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)'
    );
    console.log(`🗑️  Đã xóa ${deletedQuestions.affectedRows || 0} câu hỏi mẫu`);

    console.log('✅ Hoàn tất! Bây giờ user có thể tự tạo câu hỏi.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
}

deleteSampleData();

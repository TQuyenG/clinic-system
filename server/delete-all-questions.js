// Script để xóa tất cả câu hỏi hiện có
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('clinic_db', 'quytai', 'Quytai@2025!', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false,
});

const Question = sequelize.define('Question', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255) },
  status: { type: DataTypes.ENUM('open', 'closed', 'hidden') },
}, {
  tableName: 'questions',
  timestamps: true,
  underscored: true,
  paranoid: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at'
});

const Answer = sequelize.define('Answer', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  questionId: { type: DataTypes.BIGINT, field: 'question_id' },
}, {
  tableName: 'answers',
  timestamps: false,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Đã kết nối database');

    // Lấy danh sách câu hỏi
    const questions = await Question.findAll();
    console.log(`\nTìm thấy ${questions.length} câu hỏi:`);
    questions.forEach(q => {
      console.log(`- ID ${q.id}: ${q.title.substring(0, 60)}... (${q.status})`);
    });

    if (questions.length === 0) {
      console.log('\n✓ Không có câu hỏi nào để xóa');
      process.exit(0);
    }

    // Xóa tất cả answers trước
    const answerCount = await Answer.destroy({ where: {}, force: true });
    console.log(`\n✓ Đã xóa ${answerCount} câu trả lời`);

    // Xóa tất cả questions
    const questionCount = await Question.destroy({ where: {}, force: true });
    console.log(`✓ Đã xóa ${questionCount} câu hỏi`);

    console.log('\n✅ HOÀN TẤT! Đã xóa sạch tất cả câu hỏi cũ.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
})();

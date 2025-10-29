// Force delete ALL questions regardless of date
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('clinic_db', 'quytai', 'Quytai@2025!', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false,
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Đã kết nối database');

    // Delete all answers first (foreign key)
    const [answersResult] = await sequelize.query('DELETE FROM answers WHERE 1=1');
    console.log(`✓ Đã xóa tất cả answers`);

    // Delete all questions (force, ignore paranoid)
    const [questionsResult] = await sequelize.query('DELETE FROM questions WHERE 1=1');
    console.log(`✓ Đã xóa tất cả questions`);

    // Also clean up deleted_at records
    const [cleanupResult] = await sequelize.query('UPDATE questions SET deleted_at = NULL WHERE deleted_at IS NOT NULL');
    
    console.log('\n✅ HOÀN TẤT! Database đã sạch sẽ.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
})();

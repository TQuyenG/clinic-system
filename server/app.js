const express = require('express');
const cors = require('cors');
const { sequelize, initializeDatabase, seedData } = require('./config/db');
const userRoutes = require('./routes/userRoutes');
// Thêm các routes khác khi cần...

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
// Thêm các routes khác: appointmentRoutes, scheduleRoutes, v.v.

// Error handler
app.use(require('./middleware/errorHandler'));

// Khởi động server và đồng bộ CSDL
const PORT = process.env.PORT || 3001;
async function startServer() {
  try {
    // Tạo cơ sở dữ liệu nếu chưa tồn tại
    await initializeDatabase();

    // Đồng bộ bảng dựa trên SYNC_MODE
    const syncMode = process.env.SYNC_MODE || 'normal';
    if (syncMode === 'force') {
      console.log('Đang đồng bộ force: Xóa và tạo lại toàn bộ bảng...');
      await sequelize.sync({ force: true });
      console.log('SUCCESS: Tất cả bảng đã được xóa và tạo lại thành công.');
      // Thêm dữ liệu mẫu khi force sync
      await seedData();
      console.log('SUCCESS: Dữ liệu mẫu đã được thêm vào tất cả bảng.');
    } else if (syncMode === 'alter') {
      console.log('Đang đồng bộ alter: Cập nhật bảng để khớp với model...');
      await sequelize.sync({ alter: true });
      console.log('SUCCESS: Cập nhật bảng thành công, dữ liệu được giữ nguyên.');
    } else {
      console.log('Đang đồng bộ normal: Tạo bảng nếu chưa tồn tại...');
      await sequelize.sync();
      console.log('SUCCESS: Tất cả bảng đã được tạo hoặc đã tồn tại.');
    }

    // Khởi động server
    app.listen(PORT, () => {
      console.log(`SUCCESS: Server đang chạy trên cổng ${PORT}`);
    });
  } catch (error) {
    console.error('ERROR: Không thể khởi động server hoặc đồng bộ CSDL:', error.message);
    process.exit(1);
  }
}

startServer();
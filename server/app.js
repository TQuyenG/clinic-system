require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, initializeDatabase, seedData } = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');
const WebSocket = require('ws');
const cron = require('node-cron');

// Khởi tạo ứng dụng Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

// Error Handler Middleware
app.use(errorHandler);

// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', (ws) => {
  console.log('SUCCESS: WebSocket client đã kết nối.');
  ws.on('message', (message) => {
    console.log(`Nhận tin nhắn: ${message}`);
    ws.send(`Server nhận: ${message}`);
  });
  ws.on('close', () => {
    console.log('SUCCESS: WebSocket client đã ngắt kết nối.');
  });
});

// Cron Job: Gửi thông báo nhắc lịch hẹn hàng ngày
cron.schedule('0 8 * * *', () => {
  console.log('SUCCESS: Chạy cron job gửi thông báo nhắc lịch hẹn.');
  // Logic gửi thông báo qua email hoặc notification (chưa triển khai)
});

// Khởi động server và đồng bộ cơ sở dữ liệu
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Khởi tạo cơ sở dữ liệu
    console.log('Đang khởi tạo cơ sở dữ liệu...');
    await initializeDatabase();

    // Đồng bộ cơ sở dữ liệu
    if (process.env.SYNC_MODE === 'force') {
      console.log('Đang đồng bộ force: Xóa và tạo lại toàn bộ bảng...');
      await sequelize.sync({ force: true, logging: console.log });
      console.log('SUCCESS: Tất cả bảng đã được xóa và tạo lại thành công.');

      // Kiểm tra hooks của User model trước khi seed
      console.log('Hooks của User model trước khi seed:', 
        Object.keys(sequelize.models.User.hooks || {}));

      await seedData();
      console.log('SUCCESS: Dữ liệu mẫu đã được thêm vào tất cả bảng.');
    } else if (process.env.SYNC_MODE === 'alter') {
      console.log('Đang đồng bộ alter: Cập nhật bảng để khớp với model...');
      await sequelize.sync({ alter: true, logging: console.log });
      console.log('SUCCESS: Cập nhật bảng thành công, dữ liệu được giữ nguyên.');
    } else {
      console.log('Đang đồng bộ normal: Tạo bảng nếu chưa tồn tại...');
      await sequelize.sync({ logging: console.log });
      console.log('SUCCESS: Tất cả bảng đã được tạo hoặc đã tồn tại.');
    }

    // Khởi động server
    app.listen(PORT, () => {
      console.log(`SUCCESS: Server đang chạy trên cổng ${PORT}`);
    });
  } catch (error) {
    console.error('ERROR: Không thể khởi động server:', error.message);
    process.exit(1);
  }
}

startServer();

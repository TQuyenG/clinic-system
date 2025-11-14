// client/src/services/api.js - AUTO LOGOUT
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const showNotification = (message, type = 'info') => {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${type === 'error' ? 'Lỗi' : 'Thông báo'}</span>
      <span class="notification-message">${message}</span>
    </div>
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideIn 0.3s ease;
      max-width: 400px;
    }
    .notification-error {
      border-left: 4px solid #ef4444;
    }
    .notification-info {
      border-left: 4px solid #3b82f6;
    }
    .notification-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .notification-icon {
      font-size: 14px;
      font-weight: 700;
      color: #ef4444;
    }
    .notification-message {
      color: #374151;
      font-weight: 500;
    }
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  
  if (!document.querySelector('#notification-styles')) {
    style.id = 'notification-styles';
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
};

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  const publicPaths = ['/', '/login', '/register', '/verify-email'];
  const currentPath = window.location.pathname;
  
  if (!publicPaths.includes(currentPath)) {
    window.location.href = '/login';
  }
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response?.status, error.response?.data);
    console.error('📋 Chi tiết lỗi:', JSON.stringify(error.response?.data, null, 2)); 
    
    const status = error.response?.status;
    const message = error.response?.data?.message || '';
    
    if (status === 401) {
      const isTokenExpired = message.includes('hết hạn') || 
                             message.includes('expired') ||
                             message.includes('Token đã hết hạn');
      
      const isTokenInvalid = message.includes('không hợp lệ') || 
                             message.includes('invalid') ||
                             message.includes('Token không hợp lệ');
      
      const isNoToken = message.includes('Không tìm thấy token');

      if (isTokenExpired) {
        showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
        setTimeout(handleLogout, 1500);
      } else if (isTokenInvalid) {
        showNotification('Token không hợp lệ. Vui lòng đăng nhập lại.', 'error');
        setTimeout(handleLogout, 1500);
      } else if (isNoToken) {
        showNotification('Vui lòng đăng nhập để tiếp tục.', 'error');
        setTimeout(handleLogout, 1500);
      }
    }
    
    if (status === 403) {
      if (message.includes('chưa được xác thực email')) {
        showNotification('Vui lòng xác thực email trước khi đăng nhập.', 'error');
        setTimeout(handleLogout, 1500);
      } else if (message.includes('bị khóa')) {
        showNotification('Tài khoản đã bị khóa. Vui lòng liên hệ admin.', 'error');
        setTimeout(handleLogout, 1500);
      } else {
        showNotification('Bạn không có quyền truy cập chức năng này.', 'error');
      }
    }
    
    if (status === 404) {
      showNotification('Không tìm thấy tài nguyên yêu cầu.', 'error');
    }
    
    if (status === 500) {
      showNotification('Lỗi máy chủ. Vui lòng thử lại sau.', 'error');
    }
    
    return Promise.reject(error);
  }
);

export default api;
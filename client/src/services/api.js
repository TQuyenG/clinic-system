import axios from 'axios';

// Tạo axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Gắn token vào header
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

// Response interceptor - Xử lý lỗi chung
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response?.status, error.response?.data);
    
    // Xử lý lỗi 401 - Token hết hạn hoặc không hợp lệ
    if (error.response?.status === 401) {
      const message = error.response.data?.message;
      
      // Nếu token hết hạn, xóa token và redirect về login
      if (message?.includes('hết hạn') || message?.includes('không hợp lệ')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Hiển thị thông báo
        if (window.showNotification) {
          window.showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
        }
        
        // Redirect về trang login nếu không phải đang ở trang login
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
    }
    
    // Xử lý lỗi 403
    if (error.response?.status === 403) {
      const message = error.response.data?.message || '';

      if (message.toLowerCase().includes('token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (window.showNotification) {
          window.showNotification('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.', 'error');
        }

        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      } else if (window.showNotification) {
        window.showNotification('Bạn không có quyền truy cập chức năng này.', 'error');
      }
    }
    
    // Xử lý lỗi 404
    if (error.response?.status === 404) {
      if (window.showNotification) {
        window.showNotification('Không tìm thấy tài nguyên yêu cầu.', 'error');
      }
    }
    
    // Xử lý lỗi 500
    if (error.response?.status === 500) {
      if (window.showNotification) {
        window.showNotification('Lỗi máy chủ. Vui lòng thử lại sau.', 'error');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

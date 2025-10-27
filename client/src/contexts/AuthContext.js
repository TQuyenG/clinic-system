// client/src/contexts/AuthContext.js - PHIÊN BẢN CẢI THIỆN
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

// Custom hook để sử dụng AuthContext dễ dàng hơn
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  // ============================================
  // HÀM ĐĂNG NHẬP
  // ============================================
  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post('http://localhost:3001/api/users/login', {
        email,
        password,
      });

      const { token, user: userData } = response.data;

      // Lưu vào localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      // Cập nhật state
      setUser(userData);
      setIsAuthenticated(true);

      // Dispatch custom event để thông báo cho tất cả components
      window.dispatchEvent(new Event('authStateChanged'));

      console.log('Đăng nhập thành công:', userData.email);

      // Chuyển hướng
      navigate('/dashboard');
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Lỗi đăng nhập:', error);
      throw error;
    }
  }, [navigate]);

  // ============================================
  // HÀM ĐĂNG XUẤT
  // ============================================
  const logout = useCallback(() => {
    console.log('🚪 Đang đăng xuất...');

    // Xóa localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Reset state
    setUser(null);
    setIsAuthenticated(false);

    // Dispatch event để thông báo cho tất cả components
    window.dispatchEvent(new Event('authStateChanged'));

    // Chuyển về trang login
    navigate('/login');
  }, [navigate]);

  // ============================================
  // HÀM LẤY THÔNG TIN USER TỪ TOKEN
  // ============================================
  const fetchUserProfile = useCallback(async (token) => {
    try {
      const response = await axios.get('http://localhost:3001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);

      // Cập nhật localStorage
      localStorage.setItem('user', JSON.stringify(userData));

      return userData;
    } catch (error) {
      console.error('❌ Lỗi lấy profile:', error);
      
      // Nếu token không hợp lệ, logout
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
      
      throw error;
    }
  }, [logout]);

  // ============================================
  // KIỂM TRA TOKEN KHI KHỞI ĐỘNG APP
  // ============================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token) {
          setLoading(false);
          return;
        }

        // Nếu có user trong localStorage, set luôn (tránh flash)
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            setUser(userData);
            setIsAuthenticated(true);
          } catch (e) {
            console.error('Lỗi parse user:', e);
          }
        }

        // Verify token với server
        await fetchUserProfile(token);
      } catch (error) {
        console.error('Lỗi khởi tạo auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [fetchUserProfile]);

  // ============================================
  // LẮNG NGHE THAY ĐỔI AUTH TỪ CÁC COMPONENT KHÁC
  // ============================================
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        setUser(null);
        setIsAuthenticated(false);
      } else {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Lỗi parse user:', e);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    // Lắng nghe event
    window.addEventListener('authStateChanged', handleAuthChange);
    window.addEventListener('storage', handleAuthChange); // Lắng nghe thay đổi từ tab khác

    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // ============================================
  // HÀM CẬP NHẬT USER
  // ============================================
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const newUser = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(newUser));
      window.dispatchEvent(new Event('authStateChanged'));
      return newUser;
    });
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
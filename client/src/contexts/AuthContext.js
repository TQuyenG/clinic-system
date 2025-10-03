import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Kiểm tra token khi ứng dụng khởi động
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Gọi API để lấy thông tin người dùng
      axios
        .get('http://localhost:3001/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setUser({
            id: response.data.id,
            role: response.data.role, // 'patient', 'staff', 'doctor', 'admin'
            email: response.data.email,
            full_name: response.data.full_name,
          });
          setLoading(false);
        })
        .catch((error) => {
          console.error('Lỗi khi lấy thông tin người dùng:', error);
          localStorage.removeItem('token');
          setUser(null);
          setLoading(false);
          navigate('/login');
        });
    } else {
      setLoading(false);
    }
  }, [navigate]);

  // Hàm đăng nhập
  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:3001/api/users/login', {
        email,
        password,
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser({
        id: user.id,
        role: user.role,
        email: user.email,
        full_name: user.full_name,
      });
      // Chuyển hướng theo vai trò
      navigate(user.role === 'admin' ? '/dashboard' : '/dashboard');
    } catch (error) {
      console.error('Đăng nhập thất bại:', error);
      throw error;
    }
  };

  // Hàm đăng xuất
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
// ===== client/src/components/layout/MainLayout.js =====
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import Chatbot from '../common/Chatbot';
import Sidebar from '../common/Sidebar';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const dashboardPaths = [
  '/dashboard', '/ho-so-nguoi-dung', '/quan-ly-nguoi-dung', '/quan-ly-chuyen-khoa', '/dien-dan-cua-toi',
  '/quan-ly-danh-muc', '/quan-ly-bai-viet', '/quan-ly-lich-lam-viec', '/quan-ly-lich-hen',
  '/bai-viet-da-luu', '/thong-ke', '/lich-hen-cua-toi', '/quan-ly-tu-van/goi-dich-vu', '/quan-ly-tu-van/realtime',
  '/ho-so-y-te', '/thong-bao', '/cai-dat-tai-khoan', '/quan-ly-he-thong', '/lich-cua-toi', '/staff/tu-van/realtime', '/staff/tu-van/video',
  '/quan-ly-danh-muc-bac-si', '/quan-ly-bac-si', '/quan-ly-danh-muc-nhan-vien', '/quan-ly-nhan-vien',
  '/quan-ly-danh-muc-dich-vu', '/quan-ly-dich-vu', '/quan-ly-dien-dan', '/quan-ly-thuoc', '/quan-ly-benh-ly',
  '/admin/tu-van/realtime', '/admin/tu-van/packages', '/quan-ly-gioi-thieu',
  '/quan-ly-thanh-toan/giao-dich', '/quan-ly-thanh-toan/hoan-tien', '/quan-ly-thanh-toan/chinh-sach',
  '/quan-ly-thanh-toan/cau-hinh'
];

  const showSidebar = !!token && dashboardPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="main-layout">
      <Header />
      <Navbar />
      {showSidebar ? (
        <div className="layout-body">
          <Sidebar onToggle={setSidebarCollapsed} />
          <main className={`main-content with-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {children}
          </main>
        </div>
      ) : (
        <main className="main-content">
          {children}
        </main>
      )}
      <Footer />
      <Chatbot />
    </div>
  );
};

export default MainLayout;
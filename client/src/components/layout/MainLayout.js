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
    '/dashboard', '/ho-so-nguoi-dung', '/quan-ly-nguoi-dung', '/quan-ly-chuyen-khoa',
    '/quan-ly-danh-muc', '/quan-ly-bai-viet', '/quan-ly-lich-lam-viec', '/quan-ly-lich-hen',
    '/quan-ly-dien-dan', '/bai-viet-da-luu', '/thong-ke', '/lich-hen-cua-toi', '/lich-su-tu-van',
    '/dat-lich-hen', '/ho-so-y-te', '/thong-bao', '/cai-dat-tai-khoan', '/quan-ly-he-thong'
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

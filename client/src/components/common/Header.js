// client/src/components/common/Header.js
import React from 'react';
import { FaPhone, FaEnvelope, FaClock } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  return (
    <div className="header">
      <div className="header-container">
        <div className="header-info">
          <div className="header-item">
            <FaPhone className="header-icon" />
            <span>Hotline: 1900 1234</span>
          </div>
          <div className="header-item">
            <FaEnvelope className="header-icon" />
            <span>contact@clinicsystem.vn</span>
          </div>
          <div className="header-item">
            <FaClock className="header-icon" />
            <span>T2-T7: 7:00-20:00 | CN: 8:00-17:00</span>
          </div>
        </div>
        <div className="header-welcome">
          <span className="welcome-text">Chào mừng bạn đến với Clinic System</span>
        </div>
      </div>
    </div>
  );
};

export default Header;

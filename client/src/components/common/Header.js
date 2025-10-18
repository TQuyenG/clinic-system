// client/src/components/common/Header.js
// client/src/components/common/Header.js
import React, { useState, useEffect } from 'react';
import { FaPhone, FaEnvelope, FaClock } from 'react-icons/fa';
import axios from 'axios';
import './Header.css';

const API_BASE_URL = 'http://localhost:3001/api';

const Header = () => {
  const [headerData, setHeaderData] = useState({
    phone: '1900 1234',
    email: 'contact@clinicsystem.vn',
    working_hours: 'T2-T7: 7:00-20:00 | CN: 8:00-17:00',
    welcome_text: 'Chào mừng bạn đến với Clinic System'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeaderData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/header-nav-footer`);
        if (response.data && response.data.header) {
          setHeaderData(response.data.header);
        }
      } catch (error) {
        console.error('Error fetching header data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeaderData();
  }, []);

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-info">
          <div className="header-item">
            <FaPhone className="header-icon" />
            <span>{headerData.phone}</span>
          </div>
          <div className="header-item">
            <FaEnvelope className="header-icon" />
            <span>{headerData.email}</span>
          </div>
          <div className="header-item">
            <FaClock className="header-icon" />
            <span>{headerData.working_hours}</span>
          </div>
        </div>
        <div className="header-welcome">
          <span className="welcome-text">{headerData.welcome_text}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
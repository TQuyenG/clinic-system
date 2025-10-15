// src/pages/EquipmentPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaXRay, FaMicroscope, FaHeartbeat, FaLungs, FaBrain, FaBone, FaEye, FaStethoscope } from 'react-icons/fa';
import './EquipmentPage.css';

const EquipmentPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [equipmentData, setEquipmentData] = useState({
    categories: [],
    equipment: [],
    stats: []
  });
  const [isVisible, setIsVisible] = useState({});

  useEffect(() => {
    const fetchEquipmentData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/system/equipment');
        if (response.data) {
          setEquipmentData(response.data);
        }
      } catch (error) {
        console.error('Error fetching equipment data:', error);
      }
    };

    fetchEquipmentData();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.animate-section');
    sections.forEach(section => observer.observe(section));

    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  const filteredEquipment = activeCategory === 'all' 
    ? equipmentData.equipment 
    : equipmentData.equipment.filter(item => item.category === activeCategory);

  return (
    <div className="equipment-page">
      {/* Hero Section */}
      <section className="equipment-hero">
        <div className="container">
          <h1>Trang thiết bị y tế</h1>
          <p className="hero-subtitle">
            Đầu tư trang thiết bị hiện đại từ các thương hiệu hàng đầu thế giới, 
            đảm bảo chẩn đoán và điều trị chính xác, hiệu quả
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="equipment-stats animate-section" id="stats">
        <div className="container">
          <div className="stats-grid">
            {equipmentData.stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="equipment-categories animate-section" id="categories">
        <div className="container">
          <div className="categories-filter">
            {equipmentData.categories.map(cat => (
              <button
                key={cat.id}
                className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Equipment Grid */}
      <section className="equipment-grid-section animate-section" id="equipment">
        <div className="container">
          <div className="equipment-grid">
            {filteredEquipment.map((item, index) => (
              <div key={index} className="equipment-card">
                <div className="equipment-image">
                  <img src={item.image} alt={item.name} />
                  <div className="equipment-badge">{item.year}</div>
                </div>
                
                <div className="equipment-content">
                  <h3>{item.name}</h3>
                  
                  <div className="equipment-meta">
                    <span className="brand">Hãng: {item.brand}</span>
                    <span className="origin">Xuất xứ: {item.origin}</span>
                  </div>

                  <div className="equipment-features">
                    <h4>Tính năng nổi bật:</h4>
                    <ul>
                      {item.features.map((feature, idx) => (
                        <li key={idx}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="equipment-applications">
                    <h4>Ứng dụng:</h4>
                    <div className="application-tags">
                      {item.applications.map((app, idx) => (
                        <span key={idx} className="app-tag">{app}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality Assurance */}
      <section className="quality-section animate-section" id="quality">
        <div className="container">
          <h2 className="section-title">Cam kết chất lượng</h2>
          
          <div className="quality-grid">
            <div className="quality-card">
              <h3>Nhập khẩu chính hãng</h3>
              <p>100% thiết bị nhập khẩu từ các nhà sản xuất uy tín hàng đầu thế giới như Siemens, GE, Philips, Olympus...</p>
            </div>
            
            <div className="quality-card">
              <h3>Bảo trì định kỳ</h3>
              <p>Lịch bảo trì và kiểm định chặt chẽ theo tiêu chuẩn quốc tế, đảm bảo thiết bị luôn hoạt động tốt nhất</p>
            </div>
            
            <div className="quality-card">
              <h3>Đội ngũ kỹ thuật viên</h3>
              <p>Được đào tạo bài bản, có chứng chỉ vận hành và bảo trì các thiết bị y tế chuyên dụng</p>
            </div>
            
            <div className="quality-card">
              <h3>Cập nhật công nghệ</h3>
              <p>Liên tục đầu tư nâng cấp và bổ sung thiết bị mới nhất để phục vụ tốt nhất cho người bệnh</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="equipment-cta">
        <div className="container">
          <h2>Trải nghiệm dịch vụ y tế chất lượng cao</h2>
          <p>Đặt lịch khám ngay hôm nay để được sử dụng các trang thiết bị hiện đại nhất</p>
          <button className="btn-primary">Đặt lịch khám</button>
        </div>
      </section>
    </div>
  );
};

export default EquipmentPage;
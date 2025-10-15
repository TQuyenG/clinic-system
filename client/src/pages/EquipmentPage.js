// src/pages/EquipmentPage.js
// Lấy dữ liệu động từ database thông qua API /api/settings/equipment

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaStethoscope, FaCheckCircle } from 'react-icons/fa';
import './EquipmentPage.css';

const EquipmentPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [equipmentData, setEquipmentData] = useState({
    categories: [],
    equipment: [],
    stats: []
  });
  const [isVisible, setIsVisible] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEquipmentData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings/equipment');
        if (response.data) {
          setEquipmentData(response.data);
        }
      } catch (error) {
        console.error('Error fetching equipment data:', error);
        setError('Không thể tải thông tin trang thiết bị. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
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

  if (loading) {
    return (
      <div className="equipment-page">
        <section className="equipment-hero">
          <div className="container">
            <h1>Trang thiết bị y tế</h1>
            <p className="hero-subtitle">Đang tải thông tin...</p>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="equipment-page">
        <section className="equipment-hero">
          <div className="container">
            <h1>Trang thiết bị y tế</h1>
            <p className="error-text">{error}</p>
          </div>
        </section>
      </div>
    );
  }

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
      {equipmentData.stats.length > 0 && (
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
      )}

      {/* Categories Filter */}
      {equipmentData.categories.length > 0 && (
        <section className="equipment-categories animate-section" id="categories">
          <div className="container">
            <div className="categories-filter">
              {equipmentData.categories.map(cat => (
                <button
                  key={cat.id}
                  className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {typeof cat.icon === 'string' ? (
                    <FaStethoscope />
                  ) : (
                    cat.icon
                  )}
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Equipment Grid */}
      {filteredEquipment.length > 0 && (
        <section className="equipment-grid-section animate-section" id="equipment">
          <div className="container">
            <div className="equipment-grid">
              {filteredEquipment.map((item, index) => (
                <div key={index} className="equipment-card">
                  <div className="equipment-image">
                    <img src={item.image} alt={item.name} />
                    {item.year && <div className="equipment-badge">{item.year}</div>}
                  </div>
                  
                  <div className="equipment-content">
                    <h3>{item.name}</h3>
                    
                    <div className="equipment-meta">
                      {item.brand && <span className="brand">Hãng: {item.brand}</span>}
                      {item.origin && <span className="origin">Xuất xứ: {item.origin}</span>}
                    </div>

                    {item.features && item.features.length > 0 && (
                      <div className="equipment-features">
                        <h4>Tính năng nổi bật:</h4>
                        <ul>
                          {item.features.map((feature, idx) => (
                            <li key={idx}>✓ {feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.applications && item.applications.length > 0 && (
                      <div className="equipment-applications">
                        <h4>Ứng dụng:</h4>
                        <div className="application-tags">
                          {item.applications.map((app, idx) => (
                            <span key={idx} className="app-tag">{app}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {filteredEquipment.length === 0 && !loading && (
        <section className="equipment-grid-section">
          <div className="container">
            <p className="empty-message">Không có thiết bị nào trong danh mục này.</p>
          </div>
        </section>
      )}

      {/* Quality Assurance */}
      <section className="quality-section animate-section" id="quality">
        <div className="container">
          <h2 className="section-title">Cam kết chất lượng</h2>
          
          <div className="quality-grid">
            <div className="quality-card">
              <FaCheckCircle className="quality-icon" />
              <h3>Nhập khẩu chính hãng</h3>
              <p>100% thiết bị nhập khẩu từ các nhà sản xuất uy tín hàng đầu thế giới như Siemens, GE, Philips, Olympus...</p>
            </div>
            
            <div className="quality-card">
              <FaCheckCircle className="quality-icon" />
              <h3>Bảo trì định kỳ</h3>
              <p>Lịch bảo trì và kiểm định chặt chẽ theo tiêu chuẩn quốc tế, đảm bảo thiết bị luôn hoạt động tốt nhất</p>
            </div>
            
            <div className="quality-card">
              <FaCheckCircle className="quality-icon" />
              <h3>Đội ngũ kỹ thuật viên</h3>
              <p>Được đào tạo bài bản, có chứng chỉ vận hành và bảo trì các thiết bị y tế chuyên dụng</p>
            </div>
            
            <div className="quality-card">
              <FaCheckCircle className="quality-icon" />
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
          <button className="btn-primary" onClick={() => window.location.href = '/book-appointment'}>
            Đặt lịch khám
          </button>
        </div>
      </section>
    </div>
  );
};

export default EquipmentPage;
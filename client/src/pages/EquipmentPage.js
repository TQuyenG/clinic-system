/* 
 * Tệp: EquipmentPage.js - PHIÊN BẢN HOÀN CHỈNH
 * Mô tả: Trang "Trang thiết bị y tế" với 6 sections theo yêu cầu mới
 * API: /api/settings/equipment
 * Sections:
 * 1. Banner - Từ API
 * 2. Thống kê - Từ API
 * 3. Danh mục thiết bị - Từ API với filter
 * 4. Danh sách thiết bị - Từ API, filter theo category
 * 5. Cam kết chất lượng - Từ API
 * 6. CTA - Hardcode
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './EquipmentPage.css';

const EquipmentPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [equipmentData, setEquipmentData] = useState({
    banner: {},
    stats: [],
    categories: [],
    equipment: [],
    quality: []
  });
  const [isVisible, setIsVisible] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const iconMap = { ...FaIcons };

  useEffect(() => {
    const fetchEquipmentData = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3001/api/settings/equipment');
        if (response.data) {
          setEquipmentData(response.data);
          setError(null);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu trang thiết bị:', error);
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

    const sections = document.querySelectorAll('.equipmentpage-animate-section');
    sections.forEach(section => observer.observe(section));

    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  // Filter equipment by category
  const filteredEquipment = activeCategory === 'all' 
    ? (equipmentData.equipment || [])
    : (equipmentData.equipment || []).filter(item => item.category === activeCategory);

  // Loading state
  if (loading) {
    return (
      <div className="equipmentpage-page">
        <section className="equipmentpage-hero">
          <div className="equipmentpage-container">
            <p>Đang tải dữ liệu...</p>
          </div>
        </section>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="equipmentpage-page">
        <section className="equipmentpage-hero">
          <div className="equipmentpage-container">
            <p className="equipmentpage-error-text">{error}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="equipmentpage-page">
      {/* 1. Banner */}
      <section className="equipmentpage-hero"
        style={{ 
          background: equipmentData.banner?.image 
            ? `linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.85) 100%), url(${equipmentData.banner.image})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
        <div className="equipmentpage-container">
          <h1>{equipmentData.banner?.title || 'Trang thiết bị y tế'}</h1>
          <p className="equipmentpage-hero-subtitle">
            {equipmentData.banner?.subtitle || equipmentData.banner?.description || 
              'Đầu tư trang thiết bị hiện đại từ các thương hiệu hàng đầu thế giới, đảm bảo chẩn đoán và điều trị chính xác, hiệu quả'}
          </p>
        </div>
      </section>

      {/* 2. Thống kê */}
      {equipmentData.stats && equipmentData.stats.length > 0 && (
        <section className="equipmentpage-section-container equipmentpage-equipment-stats equipmentpage-animate-section" id="stats">
          <div className="equipmentpage-container">
            <h2 className="equipmentpage-section-title">Thống kê</h2>
            <div className="equipmentpage-stats-grid">
              {equipmentData.stats.map((stat, index) => (
                <div key={index} className="equipmentpage-stat-item">
                  <div className="equipmentpage-stat-number">{stat.number}</div>
                  <div className="equipmentpage-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Danh mục thiết bị */}
      {equipmentData.categories && equipmentData.categories.length > 0 && (
        <section className="equipmentpage-section-container equipmentpage-equipment-categories equipmentpage-animate-section" id="categories">
          <div className="equipmentpage-container">
            <h2 className="equipmentpage-section-title">Danh mục thiết bị</h2>
            <div className="equipmentpage-categories-filter">
              <button
                className={`equipmentpage-category-btn ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                <FaIcons.FaThLarge />
                <span>Tất cả</span>
              </button>
              {equipmentData.categories.map((cat, index) => {
                const Icon = iconMap[cat.icon] || iconMap.FaStethoscope;
                return (
                  <button
                    key={cat.id || index}
                    className={`equipmentpage-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <Icon />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. Danh sách thiết bị */}
      <section className="equipmentpage-section-container equipmentpage-equipment-grid-section equipmentpage-animate-section" id="equipment">
        <div className="equipmentpage-container">
          <h2 className="equipmentpage-section-title">Danh sách thiết bị</h2>
          {filteredEquipment && filteredEquipment.length > 0 ? (
            <div className="equipmentpage-equipment-grid">
              {filteredEquipment.map((item, index) => (
                <div key={index} className="equipmentpage-equipment-card">
                  <div className="equipmentpage-equipment-image">
                    <img 
                      src={item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage%3C/text%3E%3C/svg%3E'} 
                      alt={item.alt || item.name} 
                      onError={(e) => {
                          e.target.onerror = null; // Ngăn loop vô hạn
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EDoctor%3C/text%3E%3C/svg%3E';
                        }}
                    />
                    {item.year && (
                      <div className="equipmentpage-equipment-badge">{item.year}</div>
                    )}
                  </div>
                  
                  <div className="equipmentpage-equipment-content">
                    <h3>{item.name}</h3>
                    
                    {(item.brand || item.origin) && (
                      <div className="equipmentpage-equipment-meta">
                        {item.brand && <span className="equipmentpage-brand">Hãng: {item.brand}</span>}
                        {item.origin && <span className="equipmentpage-origin">Xuất xứ: {item.origin}</span>}
                      </div>
                    )}

                    {item.features && Array.isArray(item.features) && item.features.length > 0 && (
                      <div className="equipmentpage-equipment-features">
                        <h4>Tính năng nổi bật:</h4>
                        <ul>
                          {item.features.map((feature, idx) => (
                            <li key={idx}>✓ {feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.applications && Array.isArray(item.applications) && item.applications.length > 0 && (
                      <div className="equipmentpage-equipment-applications">
                        <h4>Ứng dụng:</h4>
                        <div className="equipmentpage-application-tags">
                          {item.applications.map((app, idx) => (
                            <span key={idx} className="equipmentpage-app-tag">{app}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <p>Không có thiết bị nào trong danh mục này.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. Cam kết chất lượng */}
      {equipmentData.quality && equipmentData.quality.length > 0 && (
        <section className="equipmentpage-section-container equipmentpage-quality-section equipmentpage-animate-section" id="quality">
          <div className="equipmentpage-container">
            <h2 className="equipmentpage-section-title">Cam kết chất lượng</h2>
            <div className="equipmentpage-quality-grid">
              {equipmentData.quality.map((item, index) => (
                <div key={index} className="equipmentpage-quality-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. CTA - Hardcode theo yêu cầu */}
      <section className="equipmentpage-section-container equipmentpage-equipment-cta">
        <div className="equipmentpage-container">
          <h2>Trải nghiệm dịch vụ</h2>
          <p>Đặt lịch khám ngay hôm nay để được sử dụng các trang thiết bị hiện đại nhất</p>
          <button 
            className="equipmentpage-btn-primary" 
            onClick={() => window.location.href = '/book-appointment'}
          >
            Đặt lịch khám
          </button>
        </div>
      </section>
    </div>
  );
};

export default EquipmentPage
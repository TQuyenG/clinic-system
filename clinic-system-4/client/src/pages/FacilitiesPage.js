/* 
 * Tệp: FacilitiesPage.js - PHIÊN BẢN MỚI
 * Mô tả: Trang "Cơ sở vật chất" với 5 sections theo yêu cầu mới
 * API: /api/settings/facilities
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as FaIcons from 'react-icons/fa';
import './FacilitiesPage.css';

const FacilitiesPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [facilitiesData, setFacilitiesData] = useState({
    banner: {},
    amenities: [],
    facilities: [],
    gallery: [],
    stats: []
  });
  const [isVisible, setIsVisible] = useState({});
  const [error, setError] = useState(null);

  const iconMap = { ...FaIcons };

  useEffect(() => {
    const fetchFacilitiesData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings/facilities');
        if (response.data) {
          setFacilitiesData(response.data);
          setError(null);
        }
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu cơ sở vật chất:', error);
        setError('Không thể tải thông tin cơ sở vật chất. Vui lòng thử lại sau.');
      }
    };

    fetchFacilitiesData();

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

    const sections = document.querySelectorAll('.facilitiespage-animate-section');
    sections.forEach(section => observer.observe(section));

    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  if (error) {
    return (
      <div className="facilitiespage-page">
        <section className="facilitiespage-hero">
          <p className="facilitiespage-error-text">{error}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="facilitiespage-page">
      {/* 1. Banner */}
      <section className="facilitiespage-hero"
        style={{ 
          background: facilitiesData.banner?.image 
            ? `linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.85) 100%), url(${facilitiesData.banner.image})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
        <div className="facilitiespage-container">
          <h1>{facilitiesData.banner?.title || 'Cơ sở vật chất'}</h1>
          <p className="facilitiespage-hero-subtitle">
            {facilitiesData.banner?.subtitle || facilitiesData.banner?.description || 
              'Không gian hiện đại, sạch sẽ và thân thiện, được thiết kế để mang lại sự thoải mái tối đa cho bệnh nhân'}
          </p>
        </div>
      </section>

      {/* 2. Tiện ích */}
      {facilitiesData.amenities && facilitiesData.amenities.length > 0 && (
        <section className="facilitiespage-section-container facilitiespage-amenities-bar facilitiespage-animate-section" id="amenities">
          <div className="facilitiespage-container">
            <h2 className="facilitiespage-section-title">Tiện ích</h2>
            <div className="facilitiespage-amenities-grid">
              {facilitiesData.amenities.map((amenity, index) => {
                const Icon = iconMap[amenity.icon] || iconMap.FaWifi;
                return (
                  <div key={index} className="facilitiespage-amenity-item">
                    <Icon />
                    <span>{amenity.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 3. Các khu vực chính */}
      {facilitiesData.facilities && facilitiesData.facilities.length > 0 && (
        <section className="facilitiespage-section-container facilitiespage-facilities-section facilitiespage-animate-section" id="facilities">
          <div className="facilitiespage-container">
            <h2 className="facilitiespage-section-title">Các khu vực chính</h2>
            <div className="facilitiespage-facilities-grid">
              {facilitiesData.facilities.map((facility, index) => {
                const Icon = iconMap[facility.icon] || iconMap.FaBuilding;
                return (
                  <div key={index} className="facilitiespage-facility-card">
                    <div className="facilitiespage-facility-image" onClick={() => setSelectedImage(facility.image)}>
                      <img src={facility.image} alt={facility.alt || facility.title} />
                      <div className="facilitiespage-facility-overlay">
                        <span>Xem chi tiết</span>
                      </div>
                    </div>
                    <div className="facilitiespage-facility-content">
                      <div className="facilitiespage-facility-icon"><Icon /></div>
                      <h3>{facility.title}</h3>
                      <p>{facility.description}</p>
                      {facility.features && facility.features.length > 0 && (
                        <ul className="facilitiespage-facility-features">
                          {facility.features.map((feature, idx) => (
                            <li key={idx}>✓ {feature}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. Thư viện hình ảnh */}
      {facilitiesData.gallery && facilitiesData.gallery.length > 0 && (
        <section className="facilitiespage-section-container facilitiespage-gallery-section facilitiespage-animate-section" id="gallery">
          <div className="facilitiespage-container">
            <h2 className="facilitiespage-section-title">Thư viện hình ảnh</h2>
            <div className="facilitiespage-gallery-grid">
              {facilitiesData.gallery.map((item, index) => (
                <div key={index} className="facilitiespage-gallery-item" onClick={() => setSelectedImage(item.url)}>
                  <img src={item.url} alt={item.alt || item.title} />
                  <div className="facilitiespage-gallery-caption">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Thống kê */}
      {facilitiesData.stats && facilitiesData.stats.length > 0 && (
        <section className="facilitiespage-section-container facilitiespage-facilities-stats facilitiespage-animate-section" id="stats">
          <div className="facilitiespage-container">
            <h2 className="facilitiespage-section-title">Thống kê</h2>
            <div className="facilitiespage-stats-grid">
              {facilitiesData.stats.map((stat, index) => (
                <div key={index} className="facilitiespage-stat-item">
                  <div className="facilitiespage-stat-number">{stat.number}</div>
                  <div className="facilitiespage-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="facilitiespage-image-modal" onClick={() => setSelectedImage(null)}>
          <div className="facilitiespage-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Preview" />
            <button className="facilitiespage-modal-close" onClick={() => setSelectedImage(null)}>&times;</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitiesPage;
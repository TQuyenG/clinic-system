// src/pages/FacilitiesPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBuilding, FaBed, FaParking, FaCoffee, FaWifi, FaSnowflake, FaShieldAlt, FaLeaf } from 'react-icons/fa';
import './FacilitiesPage.css';

const FacilitiesPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [facilitiesData, setFacilitiesData] = useState({
    facilities: [],
    amenities: [],
    gallery: []
  });
  const [isVisible, setIsVisible] = useState({});

  useEffect(() => {
    const fetchFacilitiesData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/system/facilities');
        if (response.data) {
          setFacilitiesData(response.data);
        }
      } catch (error) {
        console.error('Error fetching facilities data:', error);
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

    const sections = document.querySelectorAll('.animate-section');
    sections.forEach(section => observer.observe(section));

    return () => sections.forEach(section => observer.unobserve(section));
  }, []);

  return (
    <div className="facilities-page">
      {/* Hero */}
      <section className="facilities-hero">
        <div className="container">
          <h1>Cơ sở vật chất</h1>
          <p className="hero-subtitle">
            Không gian hiện đại, sạch sẽ và thân thiện, được thiết kế để mang lại sự thoải mái tối đa cho bệnh nhân
          </p>
        </div>
      </section>

      {/* Amenities Bar */}
      <section className="amenities-bar animate-section" id="amenities">
        <div className="container">
          <div className="amenities-grid">
            {facilitiesData.amenities.map((amenity, index) => (
              <div key={index} className="amenity-item">
                {amenity.icon}
                <span>{amenity.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Facilities */}
      <section className="facilities-section animate-section" id="facilities">
        <div className="container">
          <h2 className="section-title">Các khu vực chính</h2>
          <div className="facilities-grid">
            {facilitiesData.facilities.map((facility, index) => (
              <div key={index} className="facility-card">
                <div className="facility-image" onClick={() => setSelectedImage(facility.image)}>
                  <img src={facility.image} alt={facility.title} />
                  <div className="facility-overlay">
                    <span>Xem chi tiết</span>
                  </div>
                </div>
                <div className="facility-content">
                  <div className="facility-icon">{facility.icon}</div>
                  <h3>{facility.title}</h3>
                  <p>{facility.description}</p>
                  <ul className="facility-features">
                    {facility.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="gallery-section animate-section" id="gallery">
        <div className="container">
          <h2 className="section-title">Thư viện hình ảnh</h2>
          <div className="gallery-grid">
            {facilitiesData.gallery.map((item, index) => (
              <div key={index} className="gallery-item" onClick={() => setSelectedImage(item.url)}>
                <img src={item.url} alt={item.title} />
                <div className="gallery-caption">{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="facilities-stats animate-section" id="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">2000m²</div>
              <div className="stat-label">Diện tích</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50</div>
              <div className="stat-label">Giường bệnh</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">15</div>
              <div className="stat-label">Phòng khám</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Hoạt động</div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content">
            <img src={selectedImage} alt="Preview" />
            <button className="modal-close">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitiesPage;
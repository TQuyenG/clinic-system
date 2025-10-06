import React, { useState } from 'react';
import { FaBuilding, FaBed, FaParking, FaCoffee, FaWifi, FaSnowflake, FaShieldAlt, FaLeaf } from 'react-icons/fa';
import './FacilitiesPage.css';

const FacilitiesPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  const facilities = [
    {
      icon: <FaBed />,
      title: 'Phòng khám hiện đại',
      description: 'Hệ thống phòng khám được trang bị đầy đủ tiện nghi, không gian rộng rãi, thoáng mát',
      image: 'https://via.placeholder.com/600x400?text=Phong+Kham',
      features: ['15 phòng khám chuyên khoa', 'Hệ thống điều hòa trung tâm', 'Thiết bị y tế hiện đại', 'Không gian riêng tư']
    },
    {
      icon: <FaBuilding />,
      title: 'Khu nội trú 4 tầng',
      description: 'Khu điều trị nội trú với 50 giường bệnh, phòng đơn VIP và phòng tập thể',
      image: 'https://via.placeholder.com/600x400?text=Khu+Noi+Tru',
      features: ['10 phòng VIP đơn', '20 phòng đôi', '5 phòng tập thể', 'Điều dưỡng 24/7']
    },
    {
      icon: <FaShieldAlt />,
      title: 'Phòng cấp cứu',
      description: 'Phòng cấp cứu hoạt động 24/7 với đầy đủ trang thiết bị hồi sức',
      image: 'https://via.placeholder.com/600x400?text=Cap+Cuu',
      features: ['Trực 24/7', '3 giường cấp cứu', 'Xe cứu thương', 'Phòng hồi sức tích cực']
    },
    {
      icon: <FaLeaf />,
      title: 'Khu vực chờ thoáng mát',
      description: 'Sảnh chờ rộng rãi với cây xanh, ghế ngồi êm ái và không gian yên tĩnh',
      image: 'https://via.placeholder.com/600x400?text=Sanh+Cho',
      features: ['Ghế ngồi thoải mái', 'Tivi màn hình lớn', 'Tạp chí & sách báo', 'Cây xanh trang trí']
    },
    {
      icon: <FaParking />,
      title: 'Bãi đỗ xe miễn phí',
      description: 'Bãi đỗ xe rộng 200m² với an ninh 24/7, miễn phí cho bệnh nhân',
      image: 'https://via.placeholder.com/600x400?text=Bai+Do+Xe',
      features: ['50 chỗ xe máy', '20 chỗ ô tô', 'An ninh 24/7', 'Có mái che']
    },
    {
      icon: <FaCoffee />,
      title: 'Quán café & Nhà thuốc',
      description: 'Quán café nhỏ và nhà thuốc tiện lợi ngay trong khuôn viên bệnh viện',
      image: 'https://via.placeholder.com/600x400?text=Cafe+Nha+Thuoc',
      features: ['Đồ uống giá ưu đãi', 'Nhà thuốc đầy đủ', 'Thực phẩm chức năng', 'Phục vụ nhanh chóng']
    }
  ];

  const amenities = [
    { icon: <FaWifi />, name: 'WiFi miễn phí' },
    { icon: <FaSnowflake />, name: 'Điều hòa nhiệt độ' },
    { icon: <FaShieldAlt />, name: 'An ninh 24/7' },
    { icon: <FaCoffee />, name: 'Nước uống miễn phí' },
    { icon: <FaBed />, name: 'Ghế nằm thư giãn' },
    { icon: <FaLeaf />, name: 'Không gian xanh' }
  ];

  const gallery = [
    { url: 'https://via.placeholder.com/400x300?text=Entrance', title: 'Lối vào chính' },
    { url: 'https://via.placeholder.com/400x300?text=Reception', title: 'Quầy tiếp đón' },
    { url: 'https://via.placeholder.com/400x300?text=Waiting+Area', title: 'Khu vực chờ' },
    { url: 'https://via.placeholder.com/400x300?text=Examination', title: 'Phòng khám' },
    { url: 'https://via.placeholder.com/400x300?text=Lab', title: 'Phòng xét nghiệm' },
    { url: 'https://via.placeholder.com/400x300?text=Pharmacy', title: 'Nhà thuốc' }
  ];

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
      <section className="amenities-bar">
        <div className="container">
          <div className="amenities-grid">
            {amenities.map((amenity, index) => (
              <div key={index} className="amenity-item">
                {amenity.icon}
                <span>{amenity.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Facilities */}
      <section className="facilities-section">
        <div className="container">
          <h2 className="section-title">Các khu vực chính</h2>
          <div className="facilities-grid">
            {facilities.map((facility, index) => (
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
      <section className="gallery-section">
        <div className="container">
          <h2 className="section-title">Thư viện hình ảnh</h2>
          <div className="gallery-grid">
            {gallery.map((item, index) => (
              <div key={index} className="gallery-item" onClick={() => setSelectedImage(item.url)}>
                <img src={item.url} alt={item.title} />
                <div className="gallery-caption">{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="facilities-stats">
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
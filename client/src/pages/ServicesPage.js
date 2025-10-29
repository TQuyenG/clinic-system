import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaStethoscope, 
  FaXRay, 
  FaSyringe, 
  FaHeartbeat, 
  FaMicroscope, 
  FaAmbulance,
  FaHospital,
  FaPills,
  FaUserMd,
  FaClipboardList,
  FaBaby,
  FaTooth
} from 'react-icons/fa';
import './ServicesPage.css';

const ServicesPage = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: <FaStethoscope />,
      title: 'Khám tổng quát',
      description: 'Khám sức khỏe định kỳ, tầm soát bệnh lý, tư vấn sức khỏe toàn diện',
      features: ['Khám lâm sàng', 'Đo chỉ số sinh tồn', 'Tư vấn dinh dưỡng', 'Kế hoạch điều trị']
    },
    {
      icon: <FaXRay />,
      title: 'Chẩn đoán hình ảnh',
      description: 'Trang thiết bị hiện đại với công nghệ X-Quang, CT, MRI, Siêu âm',
      features: ['X-Quang kỹ thuật số', 'CT 64 lát cắt', 'MRI 1.5 Tesla', 'Siêu âm 4D']
    },
    {
      icon: <FaMicroscope />,
      title: 'Xét nghiệm',
      description: 'Phòng lab hiện đại, kết quả nhanh chóng và chính xác',
      features: ['Xét nghiệm máu', 'Xét nghiệm nước tiểu', 'Sinh hóa', 'Vi sinh']
    },
    {
      icon: <FaHeartbeat />,
      title: 'Chuyên khoa Tim mạch',
      description: 'Chẩn đoán và điều trị các bệnh lý tim mạch',
      features: ['Điện tim', 'Siêu âm tim', 'Holter 24h', 'Test gắng sức']
    },
    {
      icon: <FaSyringe />,
      title: 'Tiêm chủng',
      description: 'Dịch vụ tiêm chủng đầy đủ cho trẻ em và người lớn',
      features: ['Vắc xin cơ bản', 'Vắc xin mở rộng', 'Vắc xin du lịch', 'Tư vấn miễn phí']
    },
    {
      icon: <FaUserMd />,
      title: 'Khám chuyên khoa',
      description: 'Đội ngũ bác sĩ chuyên môn cao trong nhiều lĩnh vực',
      features: ['Nội khoa', 'Ngoại khoa', 'Sản phụ khoa', 'Nhi khoa']
    },
    {
      icon: <FaPills />,
      title: 'Nhà thuốc',
      description: 'Cung cấp thuốc chính hãng, tư vấn sử dụng thuốc',
      features: ['Thuốc kê đơn', 'Thuốc OTC', 'Thực phẩm chức năng', 'Giao thuốc tận nhà']
    },
    {
      icon: <FaAmbulance />,
      title: 'Cấp cứu 24/7',
      description: 'Sẵn sàng xử lý các tình huống khẩn cấp mọi lúc',
      features: ['Trực 24/7', 'Xe cứu thương', 'Hồi sức cấp cứu', 'Chuyển viện']
    },
    {
      icon: <FaBaby />,
      title: 'Khám thai & Sản',
      description: 'Chăm sóc toàn diện cho mẹ và bé',
      features: ['Khám thai', 'Siêu âm 4D', 'Tư vấn dinh dưỡng', 'Chăm sóc sau sinh']
    },
    {
      icon: <FaTooth />,
      title: 'Nha khoa',
      description: 'Dịch vụ nha khoa thẩm mỹ và điều trị',
      features: ['Khám tổng quát', 'Nhổ răng', 'Trám răng', 'Bọc răng sứ']
    },
    {
      icon: <FaHospital />,
      title: 'Nội trú',
      description: 'Phòng bệnh tiện nghi, chăm sóc chu đáo',
      features: ['Phòng đơn VIP', 'Phòng đôi', 'Phòng tập thể', 'Điều dưỡng 24/7']
    },
    {
      icon: <FaClipboardList />,
      title: 'Khám sức khỏe doanh nghiệp',
      description: 'Gói khám sức khỏe định kỳ cho doanh nghiệp',
      features: ['Khám tại công ty', 'Báo cáo chi tiết', 'Tư vấn sức khỏe', 'Giá ưu đãi']
    }
  ];

  const packages = [
    {
      name: 'Gói cơ bản',
      price: '500.000đ',
      features: [
        'Khám lâm sàng tổng quát',
        'Đo huyết áp, nhịp tim',
        'Xét nghiệm máu cơ bản',
        'Xét nghiệm nước tiểu',
        'Chụp X-Quang phổi'
      ]
    },
    {
      name: 'Gói nâng cao',
      price: '1.500.000đ',
      features: [
        'Tất cả dịch vụ gói cơ bản',
        'Siêu âm ổ bụng',
        'Điện tim',
        'Xét nghiệm sinh hóa mở rộng',
        'Tư vấn dinh dưỡng',
        'Khám mắt'
      ],
      popular: true
    },
    {
      name: 'Gói VIP',
      price: '3.000.000đ',
      features: [
        'Tất cả dịch vụ gói nâng cao',
        'CT Scanner',
        'Siêu âm tim',
        'Nội soi dạ dày',
        'Khám chuyên sâu tất cả khoa',
        'Tặng 1 năm tư vấn sức khỏe'
      ]
    }
  ];

  return (
    <div className="services-page">
      {/* Hero Section */}
      <section className="services-hero">
        <div className="container">
          <h1>Dịch vụ y tế</h1>
          <p className="hero-subtitle">
            Chúng tôi cung cấp đa dạng dịch vụ y tế chất lượng cao với đội ngũ bác sĩ giàu kinh nghiệm và trang thiết bị hiện đại
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="services-grid-section">
        <div className="container">
          <h2 className="section-title">Các dịch vụ của chúng tôi</h2>
          <div className="services-grid">
            {services.map((service, index) => (
              <div key={index} className="service-card">
                <div className="service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ul className="service-features">
                  {service.features.map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Health Check Packages */}
      <section className="packages-section">
        <div className="container">
          <h2 className="section-title">Gói khám sức khỏe</h2>
          <p className="section-subtitle">Chọn gói khám phù hợp với nhu cầu của bạn</p>
          
          <div className="packages-grid">
            {packages.map((pkg, index) => (
              <div key={index} className={`package-card ${pkg.popular ? 'popular' : ''}`}>
                {pkg.popular && <div className="popular-badge">Phổ biến nhất</div>}
                <h3>{pkg.name}</h3>
                <div className="package-price">{pkg.price}</div>
                <ul className="package-features">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
                <button className="btn-book" onClick={() => navigate('/dat-lich')}>
                  Đặt lịch ngay
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="services-cta">
        <div className="container">
          <h2>Cần tư vấn thêm?</h2>
          <p>Đội ngũ chăm sóc khách hàng của chúng tôi sẵn sàng hỗ trợ bạn</p>
          <div className="cta-buttons">
            <button className="btn-primary" onClick={() => navigate('/dat-lich')}>
              Đặt lịch khám
            </button>
            <button className="btn-secondary" onClick={() => navigate('/lien-he')}>
              Liên hệ ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
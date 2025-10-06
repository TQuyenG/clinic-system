import React, { useState } from 'react';
import { FaXRay, FaMicroscope, FaHeartbeat, FaLungs, FaBrain, FaBone, FaEye, FaStethoscope } from 'react-icons/fa';
import './EquipmentPage.css';

const EquipmentPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'Tất cả', icon: <FaStethoscope /> },
    { id: 'imaging', name: 'Chẩn đoán hình ảnh', icon: <FaXRay /> },
    { id: 'lab', name: 'Xét nghiệm', icon: <FaMicroscope /> },
    { id: 'cardio', name: 'Tim mạch', icon: <FaHeartbeat /> },
    { id: 'surgery', name: 'Phẫu thuật', icon: <FaBone /> }
  ];

  const equipment = [
    {
      category: 'imaging',
      name: 'Máy CT Scanner 64 lát cắt',
      brand: 'Siemens Somatom',
      origin: 'Đức',
      year: '2023',
      image: 'https://via.placeholder.com/400x300?text=CT+Scanner',
      features: [
        'Chụp cắt lớp vi tính 64 lát cắt',
        'Tốc độ quét nhanh, giảm bức xạ',
        'Hình ảnh 3D chất lượng cao',
        'Chẩn đoán chính xác các bệnh lý'
      ],
      applications: ['Chấn thương', 'Ung thư', 'Bệnh mạch máu', 'Bệnh phổi']
    },
    {
      category: 'imaging',
      name: 'Máy MRI 1.5 Tesla',
      brand: 'GE Signa',
      origin: 'Mỹ',
      year: '2022',
      image: 'https://via.placeholder.com/400x300?text=MRI',
      features: [
        'Từ trường 1.5 Tesla',
        'Không sử dụng tia X',
        'Hình ảnh mô mềm sắc nét',
        'An toàn cho người bệnh'
      ],
      applications: ['Não bộ', 'Cột sống', 'Khớp', 'Ổ bụng']
    },
    {
      category: 'imaging',
      name: 'Máy X-Quang kỹ thuật số DR',
      brand: 'Canon CXDI',
      origin: 'Nhật Bản',
      year: '2023',
      image: 'https://via.placeholder.com/400x300?text=X-Ray',
      features: [
        'Hình ảnh kỹ thuật số chất lượng cao',
        'Liều bức xạ thấp',
        'Kết quả nhanh chóng',
        'Lưu trữ và truyền tải dễ dàng'
      ],
      applications: ['Xương khớp', 'Ngực', 'Răng', 'Bụng']
    },
    {
      category: 'imaging',
      name: 'Máy siêu âm 4D',
      brand: 'Voluson E10',
      origin: 'Mỹ',
      year: '2023',
      image: 'https://via.placeholder.com/400x300?text=Ultrasound',
      features: [
        'Hình ảnh 4D sống động',
        'Màu doppler chính xác',
        'Đầu dò đa năng',
        'Giao diện thân thiện'
      ],
      applications: ['Sản khoa', 'Tim mạch', 'Tiêu hóa', 'Tiết niệu']
    },
    {
      category: 'lab',
      name: 'Máy xét nghiệm sinh hóa tự động',
      brand: 'Roche Cobas',
      origin: 'Thụy Sĩ',
      year: '2022',
      image: 'https://via.placeholder.com/400x300?text=Biochemistry',
      features: [
        'Xét nghiệm tự động hoàn toàn',
        '600 test/giờ',
        'Chính xác cao',
        'Kết quả nhanh trong 30 phút'
      ],
      applications: ['Đường huyết', 'Chức năng gan', 'Chức năng thận', 'Lipid máu']
    },
    {
      category: 'lab',
      name: 'Máy xét nghiệm huyết học',
      brand: 'Sysmex XN-1000',
      origin: 'Nhật Bản',
      year: '2023',
      image: 'https://via.placeholder.com/400x300?text=Hematology',
      features: [
        'Đếm và phân loại tế bào máu',
        '100 mẫu/giờ',
        'Công nghệ huỳnh quang',
        'Báo cáo chi tiết'
      ],
      applications: ['Công thức máu', 'Thiếu máu', 'Nhiễm trùng', 'Rối loạn đông máu']
    },
    {
      category: 'lab',
      name: 'Kính hiển vi quang học',
      brand: 'Olympus CX43',
      origin: 'Nhật Bản',
      year: '2022',
      image: 'https://via.placeholder.com/400x300?text=Microscope',
      features: [
        'Độ phóng đại lên đến 1000x',
        'Hệ thống chiếu sáng LED',
        'Thấu kính chất lượng cao',
        'Camera kỹ thuật số tích hợp'
      ],
      applications: ['Vi sinh', 'Mô bệnh học', 'Tế bào học', 'Ký sinh trùng']
    },
    {
      category: 'cardio',
      name: 'Máy điện tim 12 cần',
      brand: 'Fukuda Denshi',
      origin: 'Nhật Bản',
      year: '2023',
      image: 'https://via.placeholder.com/400x300?text=ECG',
      features: [
        'Ghi 12 đạo trình đồng thời',
        'Tự động phân tích',
        'In kết quả tức thì',
        'Kết nối máy tính'
      ],
      applications: ['Đau ngực', 'Rối loạn nhịp tim', 'Nhồi máu cơ tim', 'Khám sức khỏe']
    },
    {
      category: 'cardio',
      name: 'Máy siêu âm tim',
      brand: 'Philips EPIQ CVx',
      origin: 'Hà Lan',
      year: '2022',
      image: 'https://via.placeholder.com/400x300?text=Echo',
      features: [
        'Hình ảnh tim 3D/4D',
        'Doppler màu tiên tiến',
        'Đánh giá chức năng tim',
        'Đầu dò chuyên dụng tim'
      ],
      applications: ['Bệnh van tim', 'Suy tim', 'Bệnh cơ tim', 'Bệnh tim bẩm sinh']
    },
    {
      category: 'cardio',
      name: 'Máy Holter 24h',
      brand: 'Schiller',
      origin: 'Thụy Sĩ',
      year: '2023',
      image: 'https://via.placeholder.com/400x300?text=Holter',
      features: [
        'Ghi liên tục 24-48 giờ',
        'Nhỏ gọn, thoải mái',
        'Phân tích tự động',
        'Phát hiện rối loạn nhịp'
      ],
      applications: ['Hồi hộp, đánh trống ngực', 'Ngất', 'Rối loạn nhịp tim', 'Đánh giá sau can thiệp']
    },
    {
      category: 'surgery',
      name: 'Bàn mổ điện tử',
      brand: 'Maquet Alphamaxx',
      origin: 'Đức',
      year: '2022',
      image: 'https://via.placeholder.com/400x300?text=Operating+Table',
      features: [
        'Điều chỉnh điện tử tự động',
        'Tải trọng lên đến 450kg',
        'Đa tư thế phẫu thuật',
        'Dễ dàng vệ sinh khử trùng'
      ],
      applications: ['Phẫu thuật tổng quát', 'Phẫu thuật chỉnh hình', 'Phẫu thuật nội soi', 'Phẫu thuật tim']
    },
    {
      category: 'surgery',
      name: 'Đèn mổ LED',
      brand: 'Trumpf TruLight 5000',
      origin: 'Đức',
      year: '2023',
      image: 'https://via.placeholder.com/400x300?text=Surgical+Light',
      features: [
        'Công nghệ LED tiên tiến',
        'Độ sáng 160.000 lux',
        'Không tạo bóng',
        'Tiết kiệm năng lượng'
      ],
      applications: ['Phẫu thuật nhỏ', 'Phẫu thuật lớn', 'Phẫu thuật nội soi', 'Thủ thuật']
    },
    {
      category: 'surgery',
      name: 'Máy nội soi',
      brand: 'Olympus EVIS X1',
      origin: 'Nhật Bản',
      year: '2023',
      image: 'https://via.placeholder.com/400x300?text=Endoscope',
      features: [
        'Hình ảnh 4K Ultra HD',
        'Zoom quang học',
        'Chế độ chiếu sáng đa dạng',
        'Ống soi mềm dẻo'
      ],
      applications: ['Nội soi dạ dày', 'Nội soi đại tràng', 'Nội soi phế quản', 'Nội soi mật - tụy']
    }
  ];

  const filteredEquipment = activeCategory === 'all' 
    ? equipment 
    : equipment.filter(item => item.category === activeCategory);

  const stats = [
    { number: '50+', label: 'Trang thiết bị hiện đại' },
    { number: '100%', label: 'Nhập khẩu chính hãng' },
    { number: '24/7', label: 'Bảo trì và kiểm định' },
    { number: '15+', label: 'Năm kinh nghiệm' }
  ];

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
      <section className="equipment-stats">
        <div className="container">
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="equipment-categories">
        <div className="container">
          <div className="categories-filter">
            {categories.map(cat => (
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
      <section className="equipment-grid-section">
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
      <section className="quality-section">
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
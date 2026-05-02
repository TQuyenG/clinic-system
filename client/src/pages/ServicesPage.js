// client/src/pages/ServicesPage.js
// ✅ ĐÃ SỬA: Logic điều hướng và truyền state chuẩn xác

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import serviceCategoryService from '../services/serviceCategoryService';
import userService from '../services/userService';
import consultationService from '../services/consultationService';
import { toast } from 'react-toastify';
import { 
  FaSearch, FaStar, FaClock, FaArrowRight,
  FaComments, FaVideo, FaUserMd, FaShieldAlt, FaBolt, FaWallet,
  FaCheckCircle, FaFilter, FaStethoscope, FaLaptopMedical,
  FaTimes, FaCalendarCheck, FaFileMedical, FaUserPlus, FaTag
} from 'react-icons/fa';
import './ServicesPage.css';

const ServicesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'hospital';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Data States
  const [categories, setCategories] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  
  // Filter States
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Settings
  const [methodsSettings, setMethodsSettings] = useState([]);
  const [whyChooseSettings, setWhyChooseSettings] = useState([]);
  
  const bannerConfig = {
    hospital: {
      title: 'Dịch Vụ Y Tế Chuyên Sâu',
      subtitle: 'Trải nghiệm quy trình khám chữa bệnh hiện đại, tận tâm tại bệnh viện.',
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000'
    },
    consultation: {
      title: 'Bác Sĩ Trực Tuyến 24/7',
      subtitle: 'Kết nối ngay với chuyên gia y tế qua Video/Chat mà không cần đi xa.',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000'
    }
  };

  useEffect(() => {
    fetchData();
    setDefaultSettings();
  }, [activeTab]);

  const setDefaultSettings = () => {
    setMethodsSettings([
      {
        id: 'quick-chat', name: 'Chat Nhanh với AI', subtitle: 'Hỗ trợ sơ bộ',
        description: 'Dành cho các câu hỏi ngắn, tư vấn sơ bộ.', icon: 'bolt', color: '#f39c12',
        price: 0, features: ['Không cần đặt lịch', 'Phản hồi ngay lập tức']
      },
      {
        id: 'chat', name: 'Tư Vấn Qua Chat', subtitle: 'Chi tiết & Riêng tư',
        description: 'Trao đổi sâu về bệnh lý với bác sĩ chuyên khoa.', icon: 'comments', color: '#20bf6b',
        price: 100000, features: ['Đặt lịch bác sĩ giỏi', 'Gửi file đính kèm']
      },
      {
        id: 'video', name: 'Video Call 1:1', subtitle: 'Trực quan như tại viện',
        description: 'Gặp mặt bác sĩ qua video, chẩn đoán chính xác hơn.', icon: 'video', color: '#0eb7ce',
        price: 300000, features: ['Video HD sắc nét', 'Tương tác trực tiếp']
      }
    ]);

    setWhyChooseSettings([
      { id: 1, icon: 'usermd', title: '100+ Bác Sĩ Giỏi', desc: 'Đội ngũ chuyên gia đầu ngành từ các bệnh viện lớn.', color: '#20bf6b' },
      { id: 2, icon: 'bolt', title: 'Kết Nối Tức Thì', desc: 'Không phải xếp hàng, gặp bác sĩ chỉ sau vài thao tác.', color: '#f39c12' },
      { id: 3, icon: 'shield', title: 'Bảo Mật 100%', desc: 'Hồ sơ bệnh án điện tử được mã hóa an toàn tuyệt đối.', color: '#3498db' },
      { id: 4, icon: 'wallet', title: 'Tiết Kiệm Chi Phí', desc: 'Giảm thiểu chi phí đi lại và chờ đợi không cần thiết.', color: '#9b59b6' }
    ]);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'hospital') {
        const [catRes, allRes] = await Promise.all([
          serviceCategoryService.getPublicServiceCategories(),
          api.get('/services', { params: { limit: 100 } })
        ]);
        if (catRes.data.success) setCategories(catRes.data.data);
        if (allRes.data.success) {
          setAllServices(allRes.data.data);
          setFeaturedServices(allRes.data.data.slice(0, 6));
        }
      } else {
        // Load public consultation packages (admin-created)
        try {
          const pkgRes = await consultationService.getAllPublicPackages({ limit: 100 });
          const packages = pkgRes?.data?.data || pkgRes?.data || [];
          // Map packages into methodsSettings-like structure for UI
          const pkgMethods = (Array.isArray(packages) ? packages : []).map(p => ({
            id: p.id,
            name: p.name || p.title || (`Gói ${p.id}`),
            subtitle: p.short_description || p.subtitle || '',
            description: p.description || '',
            icon: p.icon || 'comments',
            color: p.color || '#20bf6b',
            price: p.price || p.fee || 0,
            duration: p.duration_minutes || p.duration || 30,
            features: p.features || []
          }));
          setMethodsSettings(pkgMethods.length ? pkgMethods : methodsSettings);
        } catch (err) {
          console.error('Error loading consultation packages', err);
          // fallback to existing default methodsSettings
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải dữ liệu dịch vụ.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('default');
    setShowFilters(false);
    navigate(`/dich-vu?tab=${tab}`, { replace: true });
  };

  // ✅ SỬA: Hàm xử lý đặt lịch chung cho cả Gói và Bác sĩ
  const handleBooking = (type, doctorId = null) => {
    if (!user) {
      // Lưu lại state để sau khi login quay lại đúng chỗ
      return navigate('/login', { state: { from: location.pathname + location.search } });
    }

    if (type === 'quick-chat') {
      if (window.openChatbot) {
        window.openChatbot();
      } else {
        toast.info('Tính năng Chatbot đang được cập nhật.');
      }
      return;
    }

    // Điều hướng sang trang đặt lịch với state
    // doctorId: ID bác sĩ (nếu có)
    // consultationType: 'chat' hoặc 'video' để lọc gói
    navigate('/dat-lich-tu-van', { 
      state: { 
        doctorId: doctorId, 
        consultationType: type 
      } 
    });
  };

  const handleViewDoctorProfile = (doctorId) => {
    navigate(`/bac-si/${doctorId}`);
  };

  // ... (Phần logic filter giữ nguyên) ...
  const getFilteredServices = () => {
    let result = [...allServices];
    if (searchTerm) result = result.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (selectedCategory !== 'all') result = result.filter(s => s.category_id === parseInt(selectedCategory));
    if (priceRange !== 'all') {
      if (priceRange === 'low') result = result.filter(s => s.price < 500000);
      if (priceRange === 'mid') result = result.filter(s => s.price >= 500000 && s.price < 2000000);
      if (priceRange === 'high') result = result.filter(s => s.price >= 2000000);
    }
    if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    return result;
  };

  const getFilteredDoctors = () => {
    let result = [...availableDoctors];
    if (searchTerm) {
      result = result.filter(d => 
        d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.Doctor?.Specialty?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  };

  const getIcon = (name) => {
    const map = { 'bolt': <FaBolt/>, 'comments': <FaComments/>, 'video': <FaVideo/>, 'usermd': <FaUserMd/>, 'shield': <FaShieldAlt/>, 'wallet': <FaWallet/> };
    return map[name] || <FaCheckCircle/>;
  };

  if (loading) return <div className="service-page-loading"><div className="service-page-spinner"></div></div>;

  return (
    <div className="service-page">
      {/* ... (Phần Hero Banner và Tabs giữ nguyên) ... */}
      <section className="service-page-hero" style={{ backgroundImage: `url(${bannerConfig[activeTab].image})` }}>
        <div className="service-page-hero-overlay"></div>
        <div className="service-page-hero-content">
          <span className="service-page-hero-tag">Dịch vụ Y tế Cao cấp</span>
          <h1>{bannerConfig[activeTab].title}</h1>
          <p>{bannerConfig[activeTab].subtitle}</p>
          <div className="service-page-search-box">
            <FaSearch className="service-page-search-icon" />
            <input 
              type="text" 
              placeholder={activeTab === 'hospital' ? "Tìm gói khám, xét nghiệm..." : "Tìm bác sĩ, chuyên khoa..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button className="service-page-clear-btn" onClick={() => setSearchTerm('')}><FaTimes/></button>}
          </div>
        </div>
      </section>

      <div className="service-page-tabs-wrapper">
        <div className="service-page-tabs">
          <button className={`service-page-tab ${activeTab === 'hospital' ? 'active' : ''}`} onClick={() => handleTabChange('hospital')}><FaStethoscope /> Khám tại Bệnh viện</button>
          <button className={`service-page-tab ${activeTab === 'consultation' ? 'active' : ''}`} onClick={() => handleTabChange('consultation')}><FaLaptopMedical /> Tư vấn Trực tuyến</button>
        </div>
      </div>

      <div className="service-page-container">
        {activeTab === 'hospital' && (
          <div className="service-page-hospital-content fade-in">
             {/* ... (Nội dung tab Hospital giữ nguyên) ... */}
             <section className="service-page-section">
              <div className="service-page-section-header"><h2>Danh Mục Dịch Vụ</h2><div className="service-page-divider"></div></div>
              <div className="service-page-cat-grid">
                {categories.map(cat => (
                  <div key={cat.id} className="service-page-cat-card" onClick={() => { setSelectedCategory(cat.id); setShowFilters(true); }}>
                    <div className="service-page-cat-icon"><FaFileMedical/></div>
                    <h3>{cat.name}</h3>
                    <p>{cat.description}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="service-page-section">
              <div className="service-page-filter-bar">
                <h3>Danh sách Gói khám ({getFilteredServices().length})</h3>
                <button className="service-page-btn-filter" onClick={() => setShowFilters(!showFilters)}><FaFilter/> Bộ lọc</button>
              </div>
              {showFilters && (
                <div className="service-page-filter-panel">
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}><option value="all">Tất cả danh mục</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <select value={priceRange} onChange={e => setPriceRange(e.target.value)}><option value="all">Tất cả mức giá</option><option value="low">Dưới 500k</option><option value="mid">500k - 2 triệu</option><option value="high">Trên 2 triệu</option></select>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="default">Mặc định</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select>
                </div>
              )}
              <div className="service-page-grid">
                {getFilteredServices().map(service => (
                  <div key={service.id} className="service-page-card">
                    <div className="service-page-card-img">
                      <img src={service.image_url || 'https://via.placeholder.com/300'} alt={service.name} />
                      <span className="service-page-price-tag">{parseInt(service.price).toLocaleString()}đ</span>
                    </div>
                    <div className="service-page-card-body">
                      <h4>{service.name}</h4>
                      <div className="service-page-meta"><span><FaClock/> {service.duration} phút</span><span><FaTag/> {service.category?.name}</span></div>
                      <Link to={`/dich-vu/${service.id}`} className="service-page-btn-outline">Xem chi tiết <FaArrowRight/></Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'consultation' && (
          <div className="service-page-consultation-content fade-in">
            {/* 1. Process Steps */}
            <section className="service-page-steps">
              <div className="service-page-section-header center"><h2>Quy trình Tư vấn Đơn giản</h2><p>Kết nối với bác sĩ chỉ trong 3 bước</p></div>
              <div className="service-page-steps-grid">
                <div className="service-page-step-item"><div className="service-page-step-num">1</div><div className="service-page-step-icon"><FaUserPlus/></div><h4>Chọn Bác sĩ</h4><p>Tìm bác sĩ phù hợp với chuyên khoa và nhu cầu của bạn.</p></div>
                <div className="service-page-step-item"><div className="service-page-step-num">2</div><div className="service-page-step-icon"><FaCalendarCheck/></div><h4>Đặt Lịch hẹn</h4><p>Chọn khung giờ trống và thanh toán phí tư vấn.</p></div>
                <div className="service-page-step-item"><div className="service-page-step-num">3</div><div className="service-page-step-icon"><FaVideo/></div><h4>Bắt đầu Tư vấn</h4><p>Truy cập phòng tư vấn qua Video hoặc Chat đúng giờ hẹn.</p></div>
              </div>
            </section>

            {/* 2. Methods - SỬA: Gọi hàm handleBooking với type */}
            <section className="service-page-section">
              <div className="service-page-section-header"><h2>Gói Tư vấn Y tế</h2></div>
              <div className="service-page-methods-grid">
                {methodsSettings.map(method => (
                  <div key={method.id} className="service-page-method-card" style={{borderTopColor: method.color}}>
                    <div className="service-page-method-icon" style={{color: method.color, background: `${method.color}20`}}>{getIcon(method.icon)}</div>
                    <h3>{method.name}</h3>
                    <p className="service-page-method-sub">{method.subtitle}</p>
                    <div className="service-page-method-price">
                      {method.price === 0 || method.price === undefined ? 'Miễn phí' : `${Math.floor(method.price).toLocaleString('vi-VN')}₫`}
                      {method.price > 0 && <small>/{method.duration || 0}p</small>}
                    </div>
                    <ul className="service-page-features">{(method.features || []).map((f, i) => <li key={i}><FaCheckCircle/> {f}</li>)}</ul>
                    <button className="service-page-btn-block" style={{background: method.color}} onClick={() => {
                      // If this is a package (has numeric id), navigate with packageId
                      if (typeof method.id === 'number' || String(method.id).match(/^\d+$/)) {
                        navigate('/dat-lich-tu-van', { state: { packageId: method.id } });
                      } else {
                        handleBooking(method.id);
                      }
                    }}>
                      Chọn gói này
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Doctors List - SỬA: Gọi handleBooking với doctorId */}
            <section className="service-page-section">
              <div className="service-page-section-header"><h2>Đội ngũ Bác sĩ Tiêu biểu</h2><Link to="/bac-si" className="service-page-link">Xem tất cả <FaArrowRight/></Link></div>
              {searchTerm && <div className="service-page-search-result-label">Kết quả tìm kiếm cho: "{searchTerm}"</div>}
              <div className="service-page-doc-grid">
                {getFilteredDoctors().map(doc => (
                  <div key={doc.id} className="service-page-doc-card">
                    <div className="service-page-doc-header">
                      <img src={doc.avatar_url || '/default-avatar.png'} alt={doc.full_name} />
                      <div className="service-page-doc-info">
                        <h4>{doc.full_name}</h4>
                        <span className="service-page-doc-spec">{doc.Doctor?.Specialty?.name || 'Đa khoa'}</span>
                        <div className="service-page-doc-rating"><FaStar className="star"/> {doc.Doctor?.avg_rating || 5.0} <span>({doc.Doctor?.total_reviews || 0} đánh giá)</span></div>
                      </div>
                    </div>
                    <div className="service-page-doc-footer">
                      {/* ✅ Nút gọi hàm handleBooking đúng chuẩn */}
                      <button className="service-page-btn-chat" onClick={() => handleBooking('chat', doc.id)}><FaComments/> Chat</button>
                      <button className="service-page-btn-video" onClick={() => handleBooking('video', doc.id)}><FaVideo/> Video</button>
                      <button className="service-page-btn-detail" onClick={() => handleViewDoctorProfile(doc.id)}>Hồ sơ</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Why Choose */}
            <section className="service-page-why-section">
              <div className="service-page-container"><h2 className="center-text">Tại sao chọn chúng tôi?</h2><div className="service-page-why-grid">{whyChooseSettings.map(item => (<div key={item.id} className="service-page-why-item"><div className="service-page-why-icon" style={{color: item.color}}>{getIcon(item.icon)}</div><h4>{item.title}</h4><p>{item.desc}</p></div>))}</div></div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
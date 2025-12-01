// client/src/pages/ServicesPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api'; // ✅ SỬA: Dùng api thay vì serviceService
import serviceCategoryService from '../services/serviceCategoryService';
import userService from '../services/userService';
import consultationService from '../services/consultationService';
import { toast } from 'react-toastify';
import { 
  FaSearch, FaStar, FaQuoteLeft, FaTag, FaClock, FaArrowRight,
  FaComments, FaVideo, FaUserMd, FaShieldAlt, FaBolt, FaWallet,
  FaCheckCircle, FaFilter, FaSort, FaStethoscope, FaLaptopMedical,
  FaTimes
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
  const [error, setError] = useState(null);

  // States cho tab Dịch vụ khám bệnh
  const [categories, setCategories] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [allServices, setAllServices] = useState([]); // Lưu tất cả dịch vụ để filter

  // Filter states cho Hospital Services
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // States cho tab Tư vấn trực tuyến
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [topRatedDoctors, setTopRatedDoctors] = useState([]);
  const [consultationStats, setConsultationStats] = useState(null);
  const [selectedConsultationType, setSelectedConsultationType] = useState('all');
  const [selectedRating, setSelectedRating] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [methodsSettings, setMethodsSettings] = useState([]);
  const [whyChooseSettings, setWhyChooseSettings] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'hospital') {
        // ✅ SỬA: Fetch dữ liệu cho tab Dịch vụ khám bệnh - Dùng api thay vì serviceService
        const [categoryRes, serviceRes, allServicesRes] = await Promise.all([
          serviceCategoryService.getPublicServiceCategories(),
          api.get('/services', { params: { limit: 6 } }), // ✅ THAY ĐỔI
          api.get('/services', { params: { limit: 100 } }) // ✅ THAY ĐỔI
        ]);

        if (categoryRes.data.success) {
          setCategories(categoryRes.data.data);
        }

        if (serviceRes.data.success) {
          setFeaturedServices(serviceRes.data.data);
        }

        if (allServicesRes.data.success) {
          setAllServices(allServicesRes.data.data);
        }
      } else {
        // Fetch dữ liệu cho tab Tư vấn trực tuyến
        try {
          const doctorsResponse = await userService.getAllDoctorsPublic({
            limit: 12,
            is_online: true
          });
          setAvailableDoctors(doctorsResponse.data.doctors || []);
        } catch (error) {
          console.error('Error fetching available doctors:', error);
          setAvailableDoctors([]);
        }

        try {
          const topDoctorsResponse = await userService.getAllDoctorsPublic({
            limit: 6,
            sort_by: 'rating',
            order: 'desc'
          });
          setTopRatedDoctors(topDoctorsResponse.data.doctors || []);
        } catch (error) {
          console.error('Error fetching top rated doctors:', error);
          setTopRatedDoctors([]);
        }

        if (user) {
          try {
            if (user.role === 'patient') {
              const statsResponse = await consultationService.getPatientStats();
              setConsultationStats(statsResponse.data.stats);
            } else if (user.role === 'doctor') {
              const statsResponse = await consultationService.getDoctorStats();
              setConsultationStats(statsResponse.data.stats);
            }
          } catch (error) {
            console.error('Error fetching stats:', error);
          }
        }

        setDefaultConsultationSettings();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      toast.error(`Lỗi tải dữ liệu: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultConsultationSettings = () => {
    setMethodsSettings([
      {
        id: 'quick-chat',
        name: 'Chat Nhanh',
        subtitle: 'Tư vấn tức thì',
        description: 'Kết nối ngay với bác sĩ đang online, không cần đặt lịch trước',
        icon: 'bolt',
        color: '#86efac',
        price: 50000,
        duration: 15,
        enabled: true,
        badge: 'Nhanh nhất',
        features: [
          'Phản hồi trong 2 phút',
          'Không cần đặt lịch',
          'Phí từ 50K/15 phút',
          'Phù hợp vấn đề đơn giản'
        ]
      },
      {
        id: 'chat',
        name: 'Tư Vấn Chat Real-time',
        subtitle: 'Đặt lịch trước',
        description: 'Đặt lịch và tư vấn chi tiết với bác sĩ chuyên khoa qua chat',
        icon: 'comments',
        color: '#4ade80',
        price: 100000,
        duration: 30,
        enabled: true,
        badge: 'Phổ biến',
        features: [
          'Chọn bác sĩ và thời gian',
          'Tư vấn chi tiết 30 phút',
          'Gửi ảnh, file đính kèm',
          'Phí từ 100K/30 phút'
        ]
      },
      {
        id: 'video',
        name: 'Video Call',
        subtitle: 'Gặp mặt trực tiếp',
        description: 'Tư vấn trực tiếp qua video HD với bác sĩ chuyên khoa',
        icon: 'video',
        color: '#6ee7b7',
        price: 300000,
        duration: 30,
        enabled: true,
        badge: 'Chuyên sâu',
        features: [
          'Video HD 1-1 với bác sĩ',
          'Khám và tư vấn chi tiết',
          'Chia sẻ màn hình, hình ảnh',
          'Phí từ 300K/30 phút'
        ]
      }
    ]);

    setWhyChooseSettings([
      {
        id: 'professional',
        icon: 'usermd',
        title: 'Đội Ngũ Chuyên Nghiệp',
        description: 'Hơn 100+ bác sĩ có chứng chỉ hành nghề, kinh nghiệm lâu năm',
        color: '#86efac'
      },
      {
        id: 'fast',
        icon: 'bolt',
        title: 'Phản Hồi Nhanh',
        description: 'Kết nối với bác sĩ trong vài phút, tư vấn 24/7',
        color: '#4ade80'
      },
      {
        id: 'secure',
        icon: 'shield',
        title: 'Bảo Mật Tuyệt Đối',
        description: 'Thông tin y tế được mã hóa và bảo vệ theo tiêu chuẩn quốc tế',
        color: '#34d399'
      },
      {
        id: 'affordable',
        icon: 'wallet',
        title: 'Chi Phí Hợp Lý',
        description: 'Giá cả minh bạch, đa dạng gói tư vấn phù hợp mọi túi tiền',
        color: '#6ee7b7'
      }
    ]);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset filters khi đổi tab
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('default');
    setPriceRange('all');
    navigate(`/dich-vu?tab=${tab}`, { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Search sẽ được xử lý realtime trong getFilteredServices
    if (searchTerm.trim()) {
      toast.success(`Đang tìm kiếm: "${searchTerm}"`);
    }
  };

  const handleConsultationType = (methodId) => {
    if (!user) {
      navigate('/login', { state: { from: '/dich-vu?tab=consultation' } });
      return;
    }
    navigate('/tu-van/chon-bac-si', { state: { consultationType: methodId } });
  };

  const handleQuickChat = () => {
    if (!user) {
      navigate('/login', { state: { from: '/dich-vu?tab=consultation' } });
      return;
    }
    navigate('/tu-van/chat-nhanh');
  };

  const handleViewDoctorProfile = (doctorId) => {
    navigate(`/bac-si/${doctorId}`);
  };

  const handleBookConsultation = (doctorId, type) => {
    if (!user) {
      navigate('/login', { state: { from: `/dich-vu?tab=consultation` } });
      return;
    }
    navigate('/tu-van/dat-lich', { state: { doctorId, consultationType: type } });
  };

  const getIcon = (iconName) => {
    const iconMap = {
      'bolt': <FaBolt />,
      'comments': <FaComments />,
      'video': <FaVideo />,
      'usermd': <FaUserMd />,
      'shield': <FaShieldAlt />,
      'wallet': <FaWallet />
    };
    return iconMap[iconName] || <FaCheckCircle />;
  };

  // Filter và search services cho Hospital tab
  const getFilteredServices = () => {
    let filtered = [...allServices];

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower) ||
        service.category?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => 
        service.category_id === parseInt(selectedCategory)
      );
    }

    // Filter by price range
    if (priceRange !== 'all') {
      switch (priceRange) {
        case 'under500k':
          filtered = filtered.filter(s => s.price < 500000);
          break;
        case '500k-1m':
          filtered = filtered.filter(s => s.price >= 500000 && s.price < 1000000);
          break;
        case '1m-2m':
          filtered = filtered.filter(s => s.price >= 1000000 && s.price < 2000000);
          break;
        case 'over2m':
          filtered = filtered.filter(s => s.price >= 2000000);
          break;
        default:
          break;
      }
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'duration-asc':
        filtered.sort((a, b) => a.duration - b.duration);
        break;
      case 'duration-desc':
        filtered.sort((a, b) => b.duration - a.duration);
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name, 'vi'));
        break;
      default:
        // default order
        break;
    }

    return filtered;
  };

  // Filter doctors
  const getFilteredDoctors = () => {
    return availableDoctors.filter(doctor => {
      const matchesSearch = searchQuery === '' || 
        doctor.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.Doctor?.Specialty?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating = selectedRating === '' || 
        (doctor.Doctor?.avg_rating || 0) >= parseFloat(selectedRating);

      return matchesSearch && matchesRating;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('default');
    setPriceRange('all');
    toast.info('Đã xóa tất cả bộ lọc');
  };

  // Check if any filter is active
  const hasActiveFilters = () => {
    return searchTerm !== '' || 
           selectedCategory !== 'all' || 
           sortBy !== 'default' || 
           priceRange !== 'all';
  };

  const reviews = [
    { 
      id: 1, 
      name: 'Anh Nguyễn Văn A', 
      service: 'Khám Tổng Quát', 
      stars: 5, 
      comment: 'Bác sĩ tư vấn rất tận tình, cơ sở vật chất hiện đại.' 
    },
    { 
      id: 2, 
      name: 'Chị Trần Thị B', 
      service: 'Khám Tim Mạch', 
      stars: 5, 
      comment: 'Hệ thống đặt lịch tiện lợi, không phải chờ đợi.' 
    },
    { 
      id: 3, 
      name: 'Chị Lê Thị C', 
      service: 'Xét nghiệm máu', 
      stars: 5, 
      comment: 'Kết quả trả nhanh, chi tiết. Tôi rất hài lòng.' 
    },
  ];

  if (loading) {
    return (
      <div className="service-page">
        <div className="service-page-loading">
          Đang tải trang dịch vụ...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="service-page">
        <div className="service-page-error">
          Lỗi: {error}
        </div>
      </div>
    );
  }

  const filteredServices = getFilteredServices();

  return (
    <div className="service-page">
      {/* HERO BANNER */}
      <section className="service-page-hero">
        <div className="service-page-hero-content">
          <h1 className="service-page-hero-title">
            Hệ Thống Dịch Vụ Y Tế Chuyên Nghiệp
          </h1>
          <p className="service-page-hero-subtitle">
            Chăm sóc sức khỏe toàn diện cho bạn và gia đình với đội ngũ chuyên gia hàng đầu.
          </p>
          <form className="service-page-search-form" onSubmit={handleSearchSubmit}>
            <div className="service-page-search-wrapper">
              <FaSearch className="service-page-search-icon" />
              <input 
                type="text" 
                placeholder="Nhập tên dịch vụ, chuyên khoa, bác sĩ..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="service-page-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="service-page-search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Xóa tìm kiếm"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <button type="submit" className="service-page-search-btn">
              TÌM KIẾM
            </button>
          </form>
        </div>
      </section>

      {/* TAB NAVIGATION */}
      <section className="service-page-tabs">
        <div className="service-page-container">
          <div className="service-page-tab-buttons">
            <button 
              className={`service-page-tab-btn ${activeTab === 'hospital' ? 'service-page-tab-active' : ''}`}
              onClick={() => handleTabChange('hospital')}
            >
              <FaStethoscope className="service-page-tab-icon" />
              Dịch Vụ Khám Chữa Tại Bệnh Viện
            </button>
            <button 
              className={`service-page-tab-btn ${activeTab === 'consultation' ? 'service-page-tab-active' : ''}`}
              onClick={() => handleTabChange('consultation')}
            >
              <FaLaptopMedical className="service-page-tab-icon" />
              Tư Vấn Trực Tuyến Với Bác Sĩ
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="service-page-content">
        {activeTab === 'hospital' ? (
          <>
            {/* TAB 1: DỊCH VỤ KHÁM BỆNH TẠI BỆNH VIỆN */}
            <section className="service-page-section">
              <div className="service-page-container">
                <h2 className="service-page-section-title">
                  KHÁM PHÁ THEO DANH MỤC
                </h2>
                <div className="service-page-category-grid">
                  {categories.map(cat => (
                    <div key={cat.id} className="service-page-category-card">
                      <img 
                        src={cat.image_url || 'https://via.placeholder.com/400x250?text=Health+Package'} 
                        alt={cat.name} 
                        className="service-page-category-image"
                      />
                      <div className="service-page-category-content">
                        <h3>{cat.name}</h3>
                        <p>{cat.description}</p>
                        <Link 
                          to={`/danh-muc-dich-vu/${cat.slug}`} 
                          className="service-page-category-link"
                        >
                          Xem chi tiết <FaArrowRight />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="service-page-section service-page-bg-white">
              <div className="service-page-container">
                <div className="service-page-services-header">
                  <h2 className="service-page-section-title">
                    DỊCH VỤ NỔI BẬT
                  </h2>
                  
                  {/* Filter Toggle Button */}
                  <button 
                    className="service-page-filter-toggle"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <FaFilter />
                    {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                    {hasActiveFilters() && (
                      <span className="service-page-filter-badge">
                        {[searchTerm, selectedCategory !== 'all', sortBy !== 'default', priceRange !== 'all']
                          .filter(Boolean).length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="service-page-filter-panel">
                    <div className="service-page-filter-row">
                      <div className="service-page-filter-group">
                        <label className="service-page-filter-label">
                          <FaFilter /> Danh mục
                        </label>
                        <select 
                          className="service-page-filter-select-input"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                          <option value="all">Tất cả danh mục</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="service-page-filter-group">
                        <label className="service-page-filter-label">
                          <FaSort /> Sắp xếp
                        </label>
                        <select 
                          className="service-page-filter-select-input"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                        >
                          <option value="default">Mặc định</option>
                          <option value="price-asc">Giá: Thấp đến cao</option>
                          <option value="price-desc">Giá: Cao đến thấp</option>
                          <option value="duration-asc">Thời gian: Ít đến nhiều</option>
                          <option value="duration-desc">Thời gian: Nhiều đến ít</option>
                          <option value="name-asc">Tên: A - Z</option>
                          <option value="name-desc">Tên: Z - A</option>
                        </select>
                      </div>

                      <div className="service-page-filter-group">
                        <label className="service-page-filter-label">
                          <FaTag /> Khoảng giá
                        </label>
                        <select 
                          className="service-page-filter-select-input"
                          value={priceRange}
                          onChange={(e) => setPriceRange(e.target.value)}
                        >
                          <option value="all">Tất cả giá</option>
                          <option value="under500k">Dưới 500K</option>
                          <option value="500k-1m">500K - 1M</option>
                          <option value="1m-2m">1M - 2M</option>
                          <option value="over2m">Trên 2M</option>
                        </select>
                      </div>

                      {hasActiveFilters() && (
                        <div className="service-page-filter-group">
                          <button 
                            className="service-page-clear-filters-btn"
                            onClick={clearFilters}
                          >
                            <FaTimes /> Xóa bộ lọc
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters() && (
                      <div className="service-page-active-filters">
                        <span className="service-page-active-filters-label">Đang lọc:</span>
                        {searchTerm && (
                          <span className="service-page-filter-chip">
                            Tìm kiếm: "{searchTerm}"
                            <FaTimes onClick={() => setSearchTerm('')} />
                          </span>
                        )}
                        {selectedCategory !== 'all' && (
                          <span className="service-page-filter-chip">
                            {categories.find(c => c.id === parseInt(selectedCategory))?.name}
                            <FaTimes onClick={() => setSelectedCategory('all')} />
                          </span>
                        )}
                        {sortBy !== 'default' && (
                          <span className="service-page-filter-chip">
                            Sắp xếp: {sortBy}
                            <FaTimes onClick={() => setSortBy('default')} />
                          </span>
                        )}
                        {priceRange !== 'all' && (
                          <span className="service-page-filter-chip">
                            Giá: {priceRange}
                            <FaTimes onClick={() => setPriceRange('all')} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Results Count */}
                <div className="service-page-results-info">
                  <p>
                    Tìm thấy <strong>{filteredServices.length}</strong> dịch vụ
                    {searchTerm && ` cho "${searchTerm}"`}
                  </p>
                </div>

                {/* Services Grid */}
                {filteredServices.length > 0 ? (
                  <div className="service-page-service-grid">
                    {filteredServices.map(service => (
                      <div key={service.id} className="service-page-service-card">
                        <div className="service-page-service-image-wrapper">
                          <img 
                            src={service.image_url || 'https://via.placeholder.com/400x250?text=Service'} 
                            alt={service.name} 
                            className="service-page-service-image"
                          />
                          <span className="service-page-category-tag">
                            {service.category?.name || 'Dịch vụ'}
                          </span>
                        </div>
                        <div className="service-page-service-content">
                          <h3>{service.name}</h3>
                          <div className="service-page-service-meta">
                            <span className="service-page-meta-item">
                              <FaTag /> 
                              {new Intl.NumberFormat('vi-VN').format(service.price)} VNĐ
                            </span>
                            <span className="service-page-meta-item">
                              <FaClock /> 
                              {service.duration} phút
                            </span>
                          </div>
                          <Link 
                            to={`/dich-vu/${service.id}`} 
                            className="service-page-btn-book"
                          >
                            Đặt lịch ngay
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="service-page-no-results">
                    <FaSearch className="service-page-no-results-icon" />
                    <h3>Không tìm thấy dịch vụ nào</h3>
                    <p>Vui lòng thử lại với từ khóa hoặc bộ lọc khác</p>
                    {hasActiveFilters() && (
                      <button 
                        className="service-page-btn-clear-filters"
                        onClick={clearFilters}
                      >
                        Xóa tất cả bộ lọc
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="service-page-section">
              <div className="service-page-container">
                <h2 className="service-page-section-title">
                  ĐÁNH GIÁ TỪ BỆNH NHÂN
                </h2>
                <div className="service-page-reviews-grid">
                  {reviews.map(review => (
                    <div key={review.id} className="service-page-review-card">
                      <FaQuoteLeft className="service-page-quote-icon" />
                      <div className="service-page-stars">
                        {[...Array(review.stars)].map((_, i) => (
                          <FaStar key={i} />
                        ))}
                      </div>
                      <p className="service-page-review-comment">
                        "{review.comment}"
                      </p>
                      <div className="service-page-reviewer-info">
                        <p className="service-page-reviewer-name">
                          - {review.name}
                        </p>
                        <p className="service-page-service-used">
                          (DV: {review.service})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* TAB 2: TƯ VẤN TRỰC TUYẾN */}
            <section className="service-page-consultation-methods">
              <div className="service-page-container">
                <h2 className="service-page-section-title">
                  CHỌN PHƯƠNG THỨC TƯ VẤN
                </h2>
                <div className="service-page-methods-grid">
                  {methodsSettings.map((method) => (
                    <div 
                      key={method.id} 
                      className="service-page-method-card"
                      style={{ '--method-color': method.color }}
                    >
                      {method.badge && (
                        <span className="service-page-method-badge">{method.badge}</span>
                      )}
                      <div className="service-page-method-icon-wrapper">
                        <div className="service-page-method-icon">
                          {getIcon(method.icon)}
                        </div>
                      </div>
                      <h3 className="service-page-method-title">{method.name}</h3>
                      <p className="service-page-method-subtitle">{method.subtitle}</p>
                      <p className="service-page-method-description">{method.description}</p>
                      <ul className="service-page-method-features">
                        {method.features.map((feature, idx) => (
                          <li key={idx}>
                            <FaCheckCircle className="service-page-feature-check" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <button 
                        className="service-page-method-btn"
                        onClick={() => handleConsultationType(method.id)}
                      >
                        Bắt đầu ngay
                        <FaArrowRight />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {availableDoctors && availableDoctors.length > 0 && (
              <section className="service-page-section service-page-bg-white">
                <div className="service-page-container">
                  <h2 className="service-page-section-title">
                    BÁC SĨ SẴN SÀNG TƯ VẤN
                  </h2>
                  <div className="service-page-doctors-grid">
                    {getFilteredDoctors().slice(0, 6).map(doctor => (
                      <div key={doctor.id} className="service-page-doctor-card">
                        <div className="service-page-doctor-header">
                          <img 
                            src={doctor.avatar_url || '/default-avatar.png'} 
                            alt={doctor.full_name}
                            className="service-page-doctor-avatar"
                          />
                          <span className="service-page-online-badge">
                            <span className="service-page-online-dot"></span>
                            Đang online
                          </span>
                        </div>

                        <div className="service-page-doctor-info">
                          <h4 className="service-page-doctor-name">{doctor.full_name}</h4>
                          <p className="service-page-doctor-specialty">
                            {doctor.Doctor?.Specialty?.name || 'Đa khoa'}
                          </p>
                          
                          <div className="service-page-doctor-rating">
                            <div className="service-page-rating-stars">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <FaStar 
                                  key={i}
                                  className={i < Math.round(doctor.Doctor?.avg_rating || 4.5) 
                                    ? 'service-page-star-filled' 
                                    : 'service-page-star-empty'}
                                />
                              ))}
                            </div>
                            <span className="service-page-rating-value">
                              {doctor.Doctor?.avg_rating || 4.5}/5
                            </span>
                            <span className="service-page-review-count">
                              ({doctor.Doctor?.total_reviews || 0} đánh giá)
                            </span>
                          </div>
                        </div>

                        <div className="service-page-doctor-pricing">
                          <div className="service-page-pricing-item">
                            <span className="service-page-pricing-label">Chat</span>
                            <span className="service-page-pricing-value">
                              100K<span className="service-page-pricing-unit">/30p</span>
                            </span>
                          </div>
                          <div className="service-page-pricing-divider"></div>
                          <div className="service-page-pricing-item">
                            <span className="service-page-pricing-label">Video</span>
                            <span className="service-page-pricing-value">
                              300K<span className="service-page-pricing-unit">/30p</span>
                            </span>
                          </div>
                        </div>

                        <div className="service-page-doctor-actions">
                          <button 
                            className="service-page-btn-view-profile"
                            onClick={() => handleViewDoctorProfile(doctor.id)}
                          >
                            Xem hồ sơ
                          </button>
                          <button 
                            className="service-page-btn-book-chat"
                            onClick={() => handleBookConsultation(doctor.id, 'chat')}
                          >
                            <FaComments /> Đặt lịch Chat
                          </button>
                          <button 
                            className="service-page-btn-book-video"
                            onClick={() => handleBookConsultation(doctor.id, 'video')}
                          >
                            <FaVideo /> Đặt lịch Video
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {topRatedDoctors && topRatedDoctors.length > 0 && (
              <section className="service-page-section">
                <div className="service-page-container">
                  <h2 className="service-page-section-title">
                    BÁC SĨ ĐƯỢC YÊU THÍCH NHẤT
                  </h2>
                  <div className="service-page-top-doctors-grid">
                    {topRatedDoctors.map((doctor, index) => (
                      <div key={doctor.id} className="service-page-top-doctor-card">
                        <div className="service-page-top-doctor-rank">
                          #{index + 1}
                        </div>
                        
                        <div className="service-page-top-doctor-avatar-wrapper">
                          <img 
                            src={doctor.avatar_url || '/default-avatar.png'} 
                            alt={doctor.full_name}
                            className="service-page-top-doctor-avatar"
                          />
                          {index < 3 && (
                            <div className="service-page-top-star-badge">
                              <FaStar />
                            </div>
                          )}
                        </div>

                        <h4 className="service-page-top-doctor-name">{doctor.full_name}</h4>
                        <p className="service-page-top-doctor-specialty">
                          {doctor.Doctor?.Specialty?.name || 'Đa khoa'}
                        </p>
                        
                        <div className="service-page-top-doctor-rating">
                          <div className="service-page-rating-stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <FaStar 
                                key={i}
                                className={i < Math.round(doctor.Doctor?.avg_rating || 4.5) 
                                  ? 'service-page-star-filled' 
                                  : 'service-page-star-empty'}
                              />
                            ))}
                          </div>
                          <span className="service-page-rating-value">
                            {doctor.Doctor?.avg_rating || 4.5}/5
                          </span>
                          <span className="service-page-review-count">
                            ({doctor.Doctor?.total_reviews || 0} đánh giá)
                          </span>
                        </div>

                        <button 
                          className="service-page-btn-view-top-doctor"
                          onClick={() => handleViewDoctorProfile(doctor.id)}
                        >
                          Xem chi tiết
                          <FaArrowRight />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className="service-page-why-choose">
              <div className="service-page-container">
                <h2 className="service-page-section-title">
                  TẠI SAO CHỌN CHÚNG TÔI?
                </h2>
                <div className="service-page-features-grid">
                  {whyChooseSettings.map((feature) => (
                    <div key={feature.id} className="service-page-feature-card">
                      <div 
                        className="service-page-feature-icon"
                        style={{
                          background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)`
                        }}
                      >
                        {getIcon(feature.icon)}
                      </div>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="service-page-cta">
              <div className="service-page-cta-background">
                <div className="service-page-cta-shape service-page-cta-shape-1"></div>
                <div className="service-page-cta-shape service-page-cta-shape-2"></div>
              </div>
              
              <div className="service-page-container">
                <div className="service-page-cta-content">
                  <h2 className="service-page-cta-title">
                    Sẵn Sàng Bắt Đầu?
                  </h2>
                  <p className="service-page-cta-description">
                    Đừng chần chừ! Kết nối ngay với bác sĩ chuyên khoa trong vài phút. 
                    Sức khỏe của bạn là ưu tiên hàng đầu!
                  </p>
                  <div className="service-page-cta-buttons">
                    <button 
                      className="service-page-cta-btn service-page-cta-btn-primary"
                      onClick={handleQuickChat}
                    >
                      <FaBolt /> Chat Nhanh Ngay
                    </button>
                    <button 
                      className="service-page-cta-btn service-page-cta-btn-secondary"
                      onClick={() => navigate('/tu-van/chon-bac-si')}
                    >
                      <FaUserMd /> Chọn Bác Sĩ
                    </button>
                  </div>
                  <p className="service-page-cta-note">
                    <FaCheckCircle /> Đã có hơn 50,000+ lượt tư vấn thành công
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
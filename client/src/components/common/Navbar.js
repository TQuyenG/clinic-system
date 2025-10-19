import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaSearch, 
  FaUser, 
  FaBars, 
  FaTimes, 
  FaSignOutAlt,
  FaChevronDown,
  FaTachometerAlt,
  FaCalendarAlt,
  FaHospital,
  FaUserMd,
  FaNewspaper,
  FaPills,
  FaHeartbeat,
  FaCogs,
  FaInfoCircle,
  FaBuilding,
  FaMicroscope, 
  FaSignInAlt, 
  FaUserPlus, 
  FaBookmark,
  FaStethoscope,
  FaComments
} from 'react-icons/fa';
import NotificationDropdown from './NotificationDropdown';
import './Navbar.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // ✅ State mới cho profile đầy đủ
  const [specialties, setSpecialties] = useState([]);
  const [categories, setCategories] = useState({
    tin_tuc: [],
    thuoc: [],
    benh_ly: []
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeMobileColumn, setActiveMobileColumn] = useState(null);
  
  const [navbarData, setNavbarData] = useState({
    logo_image: '',
    logo_text: 'Clinic System',
    search_placeholder: 'Tìm kiếm...'
  });
  
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    // Tải dữ liệu người dùng
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        // ✅ Fetch profile đầy đủ từ API để lấy avatar_url mới nhất
        fetchUserProfile(token);
      } catch (error) {
        console.error('Lỗi khi phân tích dữ liệu người dùng:', error);
      }
    }

    fetchSpecialties();
    fetchCategories();
    fetchNavbarData();

    // Xử lý sự kiện click ngoài khu vực tìm kiếm
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Fetch user profile đầy đủ từ API
  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success || response.data.user) {
        const profileData = response.data.user || response.data;
        setUserProfile(profileData);
        
        // ✅ Cập nhật localStorage với avatar_url mới nhất
        const updatedUser = {
          ...user,
          avatar_url: profileData.avatar_url,
          full_name: profileData.full_name
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Lỗi khi lấy profile:', error);
    }
  };

  const fetchNavbarData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings/header-nav-footer`);
      if (response.data && response.data.navbar) {
        setNavbarData(response.data.navbar);
      }
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu navbar:', error);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/specialties`);
      if (response.data.success) {
        setSpecialties(response.data.specialties || []);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách chuyên khoa:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/articles/categories`);
      if (response.data.success) {
        const cats = response.data.categories || [];
        setCategories({
          tin_tuc: cats.filter(c => c.category_type === 'tin_tuc'),
          thuoc: cats.filter(c => c.category_type === 'thuoc'),
          benh_ly: cats.filter(c => c.category_type === 'benh_ly')
        });
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách danh mục:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      if (response.data.success) {
        setSearchResults(response.data.results || []);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm:', error);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setUserProfile(null);
    navigate('/login');
  };

  const toggleDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const toggleMobileColumn = (column) => {
    setActiveMobileColumn(activeMobileColumn === column ? null : column);
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
    setActiveMobileColumn(null);
    setIsMenuOpen(false);
  };

  // ✅ Function render avatar
  const renderUserAvatar = () => {
    // Ưu tiên: userProfile > user > default
    const currentUser = userProfile || user;
    
    if (!currentUser) {
      return (
        <div className="user-avatar-placeholder">
          <FaUser />
        </div>
      );
    }

    // Nếu có avatar_url
    if (currentUser.avatar_url) {
      return (
        <img 
          src={currentUser.avatar_url} 
          alt={currentUser.full_name || currentUser.email} 
          className="user-avatar"
          onError={(e) => {
            // Fallback nếu ảnh lỗi
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }

    // Nếu không có avatar, hiển thị chữ cái đầu
    const initial = currentUser.full_name?.charAt(0)?.toUpperCase() 
                    || currentUser.email?.charAt(0)?.toUpperCase() 
                    || 'U';
    
    return (
      <div className="user-avatar-placeholder">
        {initial}
      </div>
    );
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* LOGO */}
        <Link to="/" className="logo" onClick={closeAllDropdowns}>
          {navbarData.logo_image ? (
            <img src={navbarData.logo_image} alt={navbarData.logo_text} />
          ) : (
            <img src={require('../../assets/images/logo.png')} alt="Clinic System" />
          )}
          <span>{navbarData.logo_text}</span>
        </Link>

        {/* Nút Menu trên Mobile */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Bật/tắt menu"
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* PHẦN GIỮA */}
        <div className={`nav-center ${isMenuOpen ? 'active' : ''}`}>
          {/* Thanh Tìm kiếm */}
          <div className="search-container" ref={searchRef}>
            <form className="search-bar" onSubmit={handleSearchSubmit}>
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder={navbarData.search_placeholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </form>

            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result, index) => (
                  <Link
                    key={index}
                    to={result.url}
                    className="search-result-item"
                    onClick={() => {
                      setShowSearchResults(false);
                      setSearchQuery('');
                      closeAllDropdowns();
                    }}
                  >
                    <span className="result-title">{result.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Menu Điều hướng */}
          <div className="nav-menu">
            {/* Giới thiệu */}
            <div className="nav-item dropdown">
              <button 
                className="nav-link dropdown-toggle"
                onClick={() => toggleDropdown('intro')}
              >
                Giới thiệu
                <FaChevronDown className={`chevron ${activeDropdown === 'intro' ? 'rotate' : ''}`} />
              </button>
              <div className={`dropdown-menu ${activeDropdown === 'intro' ? 'show' : ''}`}>
                <Link to="/ve-chung-toi" onClick={closeAllDropdowns}>
                  <FaInfoCircle /> Về chúng tôi
                </Link>
                <Link to="/dich-vu" onClick={closeAllDropdowns}>
                  <FaCogs /> Dịch vụ
                </Link>
                <Link to="/co-so-vat-chat" onClick={closeAllDropdowns}>
                  <FaBuilding /> Cơ sở vật chất
                </Link>
                <Link to="/trang-thiet-bi" onClick={closeAllDropdowns}>
                  <FaMicroscope /> Trang thiết bị
                </Link>
              </div>
            </div>

            {/* Đội ngũ y tế - MEGA MENU */}
            <div className="nav-item dropdown mega">
              <button 
                className="nav-link dropdown-toggle"
                onClick={() => toggleDropdown('team')}
              >
                Đội ngũ y tế
                <FaChevronDown className={`chevron ${activeDropdown === 'team' ? 'rotate' : ''}`} />
              </button>
              <div className={`dropdown-menu mega-menu ${activeDropdown === 'team' ? 'show' : ''}`}>
                <div className="mega-menu-grid">
                  {/* Cột Chuyên khoa */}
                  <div className={`mega-menu-column ${activeMobileColumn === 'specialties' ? 'active' : ''}`}>
                    <Link 
                      to="/chuyen-khoa"
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('specialties');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="column-header"
                    >
                      <FaStethoscope /> Chuyên khoa
                    </Link>
                    {specialties.length > 0 && (
                      <div className="column-items">
                        {specialties.slice(0, 5).map(sp => (
                          <Link 
                            key={sp.id} 
                            to={`/chuyen-khoa/${sp.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {sp.name}
                          </Link>
                        ))}
                        <Link to="/chuyen-khoa" onClick={closeAllDropdowns} className="view-all">
                          Xem tất cả →
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Cột Bác sĩ */}
                  <div className={`mega-menu-column ${activeMobileColumn === 'doctors' ? 'active' : ''}`}>
                    <Link 
                      to="/bac-si"
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('doctors');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="column-header"
                    >
                      <FaUserMd /> Bác sĩ
                    </Link>
                    <div className="column-items">
                      <Link to="/bac-si" onClick={closeAllDropdowns}>
                        Tất cả bác sĩ
                      </Link>
                      <Link to="/bac-si?min_experience=5" onClick={closeAllDropdowns}>
                        Bác sĩ 5+ năm kinh nghiệm
                      </Link>
                      <Link to="/bac-si?min_experience=10" onClick={closeAllDropdowns}>
                        Bác sĩ 10+ năm kinh nghiệm
                      </Link>
                      <Link to="/bac-si?min_experience=15" onClick={closeAllDropdowns}>
                        Bác sĩ 15+ năm kinh nghiệm
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cẩm nang y tế - MEGA MENU */}
            <div className="nav-item dropdown mega">
              <button 
                className="nav-link dropdown-toggle"
                onClick={() => toggleDropdown('articles')}
              >
                Cẩm nang y tế
                <FaChevronDown className={`chevron ${activeDropdown === 'articles' ? 'rotate' : ''}`} />
              </button>
              <div className={`dropdown-menu mega-menu ${activeDropdown === 'articles' ? 'show' : ''}`}>
                <div className="mega-menu-grid">
                  {/* Diễn đàn sức khỏe */}
                  <div className="mega-menu-column">
                    <Link 
                      to="/dien-dan-suc-khoe"
                      className="column-header"
                      onClick={closeAllDropdowns}
                    >
                      <FaComments /> Diễn đàn sức khỏe
                    </Link>
                  </div>

                  {/* Cột Tin tức */}
                  <div className={`mega-menu-column ${activeMobileColumn === 'news' ? 'active' : ''}`}>
                    <Link 
                      to="/tin-tuc" 
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('news');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="column-header"
                    >
                      <FaNewspaper /> Tin tức
                    </Link>
                    {categories.tin_tuc && categories.tin_tuc.length > 0 && (
                      <div className="column-items">
                        {categories.tin_tuc.slice(0, 5).map(cat => (
                          <Link 
                            key={cat.id} 
                            to={`/tin-tuc/${cat.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cột Thuốc */}
                  <div className={`mega-menu-column ${activeMobileColumn === 'medicine' ? 'active' : ''}`}>
                    <Link 
                      to="/thuoc" 
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('medicine');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="column-header"
                    >
                      <FaPills /> Thuốc
                    </Link>
                    {categories.thuoc && categories.thuoc.length > 0 && (
                      <div className="column-items">
                        {categories.thuoc.slice(0, 5).map(cat => (
                          <Link 
                            key={cat.id} 
                            to={`/thuoc/${cat.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cột Bệnh lý */}
                  <div className={`mega-menu-column ${activeMobileColumn === 'disease' ? 'active' : ''}`}>
                    <Link 
                      to="/benh-ly" 
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.preventDefault();
                          toggleMobileColumn('disease');
                        } else {
                          closeAllDropdowns();
                        }
                      }}
                      className="column-header"
                    >
                      <FaHeartbeat /> Bệnh lý
                    </Link>
                    {categories.benh_ly && categories.benh_ly.length > 0 && (
                      <div className="column-items">
                        {categories.benh_ly.slice(0, 5).map(cat => (
                          <Link 
                            key={cat.id} 
                            to={`/benh-ly/${cat.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PHẦN PHẢI */}
        <div className="nav-right">
          {user && <NotificationDropdown />}

          {/* Dropdown Người dùng */}
          <div className="nav-item dropdown user-dropdown">
            <button 
              className="user-btn"
              onClick={() => toggleDropdown('user')}
            >
              {renderUserAvatar()}
            </button>

            <div className={`dropdown-menu dropdown-menu-right ${activeDropdown === 'user' ? 'show' : ''}`}>
              {user ? (
                <>
                  <div className="dropdown-user-info">
                    <strong>{user.full_name || user.email}</strong>
                    <span>{user.role}</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/dashboard" onClick={closeAllDropdowns}>
                    <FaTachometerAlt /> Dashboard
                  </Link>
                  <Link to="/ho-so-nguoi-dung" onClick={closeAllDropdowns}>
                    <FaUser /> Thông tin cá nhân
                  </Link>
                  <Link to="/appointments" onClick={closeAllDropdowns}>
                    <FaCalendarAlt /> Lịch hẹn
                  </Link>
                  <Link to="/bai-viet-da-luu" onClick={closeAllDropdowns}>
                    <FaBookmark /> Bài viết đã lưu
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={() => { handleLogout(); closeAllDropdowns(); }} className="dropdown-logout">
                    <FaSignOutAlt /> Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeAllDropdowns}>
                    <FaSignInAlt /> Đăng nhập
                  </Link>
                  <Link to="/register" onClick={closeAllDropdowns} className="dropdown-register">
                    <FaUserPlus /> Đăng ký ngay
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
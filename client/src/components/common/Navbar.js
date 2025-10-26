// client/src/components/common/Navbar.js
// ====================================================================
// PHIÊN BẢN ĐÃ FIX: Đồng bộ authentication với AuthContext
// ====================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaSearch, FaUser, FaBars, FaTimes, FaSignOutAlt, FaChevronDown,
  FaTachometerAlt, FaCalendarAlt, FaUserMd, FaNewspaper, FaPills,
  FaHeartbeat, FaCogs, FaInfoCircle, FaBuilding, FaMicroscope, 
  FaSignInAlt, FaUserPlus, FaBookmark, FaStethoscope, FaComments,
  FaEye, FaFolder, FaGraduationCap, FaSpinner
} from 'react-icons/fa';
import NotificationDropdown from './NotificationDropdown';
import './Navbar.css';
import { useAuth } from '../../contexts/AuthContext'; // ✅ FIX: Import useAuth

// Component riêng để hiển thị avatar người dùng
const UserAvatar = ({ user, userProfile }) => {
  const [isImageError, setIsImageError] = useState(false);

  const currentUser = userProfile || user;

  if (!currentUser) {
    return (
      <div className="navbar-user-avatar-placeholder">
        <FaUser />
      </div>
    );
  }

  if (currentUser.avatar_url && !isImageError) {
    return (
      <>
        <img 
          src={currentUser.avatar_url} 
          alt={currentUser.full_name || currentUser.email} 
          className="navbar-user-avatar"
          onError={() => setIsImageError(true)}
        />
        <div className="navbar-user-avatar-placeholder" style={{ display: 'none' }}>
          {currentUser.full_name?.charAt(0)?.toUpperCase() || 
           currentUser.email?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </>
    );
  }

  const initial = currentUser.full_name?.charAt(0)?.toUpperCase() || 
                 currentUser.email?.charAt(0)?.toUpperCase() || 'U';
  
  return (
    <div className="navbar-user-avatar-placeholder">
      {initial}
    </div>
  );
};

const Navbar = () => {
  // ✅ FIX: Sử dụng useAuth() để lấy thông tin user từ AuthContext
  const { user: authUser, logout: authLogout, isAuthenticated } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // ✅ FIX: Giữ local state để merge với authUser (cho avatar và profile mới nhất)
  const [userProfile, setUserProfile] = useState(null);
  
  const [specialties, setSpecialties] = useState([]);
  const [categories, setCategories] = useState({
    tin_tuc: [], thuoc: [], benh_ly: []
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeMobileColumn, setActiveMobileColumn] = useState(null);
  const [navbarData, setNavbarData] = useState({
    logo_image: '', logo_text: 'Clinic System'
  });
  
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const API_BASE_URL = 'http://localhost:3001';

  // ✅ FIX: Effect để fetch user profile khi authUser thay đổi
  useEffect(() => {
    if (authUser) {
      const token = localStorage.getItem('token');
      if (token) {
        fetchUserProfile(token);
      }
    } else {
      // Khi logout, clear userProfile
      setUserProfile(null);
    }
  }, [authUser]); // Re-run khi authUser thay đổi

  // ✅ FIX: Effect để lắng nghe authStateChanged event
  useEffect(() => {
    const handleAuthChange = () => {
      // Force re-render bằng cách check localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        setUserProfile(null);
      }
    };

    // Lắng nghe event từ AuthContext
    window.addEventListener('authStateChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  // Effect để load data ban đầu
  useEffect(() => {
    fetchSpecialties();
    fetchCategories();
    fetchNavbarData();

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success || response.data.user) {
        const profileData = response.data.user || response.data;
        setUserProfile(profileData);
        
        // ✅ FIX: Cập nhật localStorage để đồng bộ với AuthContext
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { 
          ...currentUser, 
          avatar_url: profileData.avatar_url, 
          full_name: profileData.full_name 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // ✅ FIX: Dispatch event để các component khác biết user đã được cập nhật
        window.dispatchEvent(new Event('authStateChanged'));
      }
    } catch (error) {
      console.error('Lỗi khi lấy profile:', error);
      // ✅ FIX: Nếu token không hợp lệ, logout
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleLogout();
      }
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
      if (response.data.success) setSpecialties(response.data.specialties || []);
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
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim().length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/articles/search/global?q=${encodeURIComponent(query)}`);
        if (response.data.success) {
          setSearchResults(response.data.results);
        }
      } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        if (error.response?.status === 404) {
          console.error('Endpoint /api/articles/search/global chưa được tạo');
        }
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchResults(false);
      setSearchQuery('');
      closeAllDropdowns();
    }
  };

  const handleResultClick = (type, item) => {
    setShowSearchResults(false);
    setSearchQuery('');
    closeAllDropdowns();
    
    const typeMap = { 'tin_tuc': 'tin-tuc', 'thuoc': 'thuoc', 'benh_ly': 'benh-ly' };
    
    switch(type) {
      case 'articles':
        if (item.category_type && typeMap[item.category_type]) {
          navigate(`/${typeMap[item.category_type]}/${item.slug}`);
        } else {
          navigate(`/bai-viet/${item.slug}`);
        }
        break;
      case 'categories':
        if (item.category_type && typeMap[item.category_type]) {
          navigate(`/${typeMap[item.category_type]}/${item.slug}`);
        } else {
          navigate(`/danh-muc/${item.slug}`);
        }
        break;
      case 'specialties':
        navigate(`/chuyen-khoa/${item.slug}`);
        break;
      case 'doctors':
        navigate(`/bac-si/${item.code}`);
        break;
      default:
        break;
    }
  };

  // ✅ FIX: Sử dụng authLogout từ AuthContext
  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      console.log('Đăng xuất từ Navbar');
      authLogout(); // ✅ FIX: Gọi logout từ AuthContext
      closeAllDropdowns();
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  };

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
    if (name !== 'user') setActiveMobileColumn(null);
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
    setActiveMobileColumn(null);
    setIsMenuOpen(false);
    document.body.style.overflow = 'unset';
  };

  const toggleMobileColumn = (column) => {
    setActiveMobileColumn(activeMobileColumn === column ? null : column);
  };

  // ✅ FIX: Sử dụng authUser từ AuthContext thay vì local state
  const currentUser = authUser || userProfile;

  return (
    <nav className="navbar-main">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeAllDropdowns}>
          {navbarData.logo_image ? (
            <img 
              src={`${API_BASE_URL}${navbarData.logo_image}`} 
              alt={navbarData.logo_text} 
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
          ) : null}
          <span style={{ display: navbarData.logo_image ? 'none' : 'block' }}>
            {navbarData.logo_text}
          </span>
        </Link>

        <button 
          className="navbar-mobile-menu-btn"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`navbar-center ${isMenuOpen ? 'active' : ''}`}>
          <div className="navbar-search-container">
            <div className="navbar-search" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="navbar-search-bar">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài viết, bác sĩ..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                />
                {isSearching && <FaSpinner className="navbar-spinner" />}
              </form>

              {showSearchResults && searchQuery.length >= 2 && (
                <div className="navbar-search-dropdown">
                  {isSearching ? (
                    <div className="navbar-loading">
                      <FaSpinner />
                      <p>Đang tìm kiếm...</p>
                    </div>
                  ) : searchResults ? (
                    <>
                      {searchResults.articles && searchResults.articles.length > 0 && (
                        <div className="navbar-search-section">
                          <div className="navbar-section-title">
                            <FaNewspaper /> Bài viết
                          </div>
                          {searchResults.articles.map(article => (
                            <div
                              key={article.id}
                              className="navbar-search-item"
                              onClick={() => handleResultClick('articles', article)}
                            >
                              <div className="navbar-item-icon article">
                                <FaNewspaper />
                              </div>
                              <div className="navbar-item-content">
                                <div className="navbar-item-title">{article.title}</div>
                                {article.summary && (
                                  <div className="navbar-item-desc">
                                    {article.summary.substring(0, 80)}...
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.specialties && searchResults.specialties.length > 0 && (
                        <div className="navbar-search-section">
                          <div className="navbar-section-title">
                            <FaStethoscope /> Chuyên khoa
                          </div>
                          {searchResults.specialties.map(specialty => (
                            <div
                              key={specialty.id}
                              className="navbar-search-item"
                              onClick={() => handleResultClick('specialties', specialty)}
                            >
                              <div className="navbar-item-icon specialty">
                                <FaStethoscope />
                              </div>
                              <div className="navbar-item-content">
                                <div className="navbar-item-title">{specialty.name}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.doctors && searchResults.doctors.length > 0 && (
                        <div className="navbar-search-section">
                          <div className="navbar-section-title">
                            <FaUserMd /> Bác sĩ
                          </div>
                          {searchResults.doctors.map(doctor => (
                            <div
                              key={doctor.id}
                              className="navbar-search-item"
                              onClick={() => handleResultClick('doctors', doctor)}
                            >
                              <div className="navbar-item-avatar">
                                {doctor.avatar_url ? (
                                  <img src={doctor.avatar_url} alt={doctor.full_name} />
                                ) : (
                                  <div className="navbar-avatar-placeholder">
                                    {doctor.full_name?.charAt(0) || 'BS'}
                                  </div>
                                )}
                              </div>
                              <div className="navbar-item-content">
                                <div className="navbar-item-title">{doctor.full_name}</div>
                                {doctor.specialty_name && (
                                  <div className="navbar-item-desc">{doctor.specialty_name}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(!searchResults.articles || searchResults.articles.length === 0) &&
                       (!searchResults.specialties || searchResults.specialties.length === 0) &&
                       (!searchResults.doctors || searchResults.doctors.length === 0) && (
                        <div className="navbar-no-results">
                          <FaSearch />
                          <p>Không tìm thấy kết quả</p>
                          <span>Thử tìm kiếm với từ khóa khác</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="navbar-no-results">
                      <FaSearch />
                      <p>Không tìm thấy kết quả</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="navbar-nav-menu">
            <Link to="/" className="navbar-nav-link" onClick={closeAllDropdowns}>
              Trang chủ
            </Link>

            <div className="navbar-nav-item">
              <button 
                className="navbar-nav-link"
                onClick={() => toggleDropdown('about')}
              >
                Giới thiệu
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'about' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu ${activeDropdown === 'about' ? 'show' : ''}`}>
                <Link to="/gioi-thieu" onClick={closeAllDropdowns}>
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

            <div className="navbar-nav-item navbar-mega">
              <button 
                className="navbar-nav-link"
                onClick={() => toggleDropdown('medical')}
              >
                Y tế
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'medical' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu ${activeDropdown === 'medical' ? 'show' : ''}`}>
                <div className="navbar-mega-menu-grid">
                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'specialties' ? 'active' : ''}`}>
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
                      className="navbar-column-header"
                    >
                      <FaStethoscope /> Chuyên khoa
                    </Link>
                    {specialties.length > 0 && (
                      <div className="navbar-column-items">
                        {specialties.slice(0, 8).map(sp => (
                          <Link 
                            key={sp.id} 
                            to={`/chuyen-khoa/${sp.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {sp.name}
                          </Link>
                        ))}
                        <Link to="/chuyen-khoa" onClick={closeAllDropdowns} className="navbar-view-all">
                          Xem tất cả
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'doctors' ? 'active' : ''}`}>
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
                      className="navbar-column-header"
                    >
                      <FaUserMd /> Bác sĩ
                    </Link>
                    <div className="navbar-column-items">
                      <Link to="/bac-si" onClick={closeAllDropdowns}>
                        Tất cả bác sĩ
                      </Link>
                      <Link to="/bac-si?min_experience=5" onClick={closeAllDropdowns}>
                        Bác sĩ 5+ năm kinh nghiệm
                      </Link>
                      <Link to="/bac-si?min_experience=10" onClick={closeAllDropdowns}>
                        Bác sĩ 10+ năm kinh nghiệm
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="navbar-nav-item navbar-mega">
              <button 
                className="navbar-nav-link"
                onClick={() => toggleDropdown('articles')}
              >
                Cẩm nang y tế
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'articles' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu ${activeDropdown === 'articles' ? 'show' : ''}`}>
                <div className="navbar-mega-menu-grid">
                  <div className="navbar-mega-menu-column">
                    <Link 
                      to="/dien-dan-suc-khoe"
                      className="navbar-column-header"
                      onClick={closeAllDropdowns}
                    >
                      <FaComments /> Diễn đàn sức khỏe
                    </Link>
                  </div>

                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'news' ? 'active' : ''}`}>
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
                      className="navbar-column-header"
                    >
                      <FaNewspaper /> Tin tức
                    </Link>
                    {categories.tin_tuc && categories.tin_tuc.length > 0 && (
                      <div className="navbar-column-items">
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

                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'medicine' ? 'active' : ''}`}>
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
                      className="navbar-column-header"
                    >
                      <FaPills /> Thuốc
                    </Link>
                    {categories.thuoc && categories.thuoc.length > 0 && (
                      <div className="navbar-column-items">
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

                  <div className={`navbar-mega-menu-column ${activeMobileColumn === 'disease' ? 'active' : ''}`}>
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
                      className="navbar-column-header"
                    >
                      <FaHeartbeat /> Bệnh lý
                    </Link>
                    {categories.benh_ly && categories.benh_ly.length > 0 && (
                      <div className="navbar-column-items">
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

        <div className="navbar-right">
          {(isAuthenticated || authUser) && <NotificationDropdown />}

          <div className="navbar-nav-item navbar-user-dropdown">
            <button 
              className="navbar-user-btn"
              onClick={() => toggleDropdown('user')}
            >
              <UserAvatar user={currentUser} userProfile={userProfile} />
            </button>

            <div className={`navbar-dropdown-menu navbar-dropdown-menu-right ${activeDropdown === 'user' ? 'show' : ''}`}>
              {(isAuthenticated || authUser) ? (
                <>
                  <div className="navbar-dropdown-user-info">
                    <strong>{currentUser?.full_name || currentUser?.email || 'User'}</strong>
                    <span>{currentUser?.role || 'Người dùng'}</span>
                  </div>
                  <div className="navbar-dropdown-divider"></div>
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
                  <div className="navbar-dropdown-divider"></div>
                  <button onClick={() => { handleLogout(); closeAllDropdowns(); }} className="navbar-dropdown-logout">
                    <FaSignOutAlt /> Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeAllDropdowns}>
                    <FaSignInAlt /> Đăng nhập
                  </Link>
                  <Link to="/register" onClick={closeAllDropdowns} className="navbar-dropdown-register">
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
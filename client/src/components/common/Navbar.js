// client/src/components/common/Navbar.js
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        fetchUserProfile(token);
      } catch (error) {
        console.error('Lỗi khi phân tích dữ liệu người dùng:', error);
      }
    }

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
        const updatedUser = { ...user, avatar_url: profileData.avatar_url, full_name: profileData.full_name };
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
        // FIX: Dung endpoint dung
        const response = await axios.get(`${API_BASE_URL}/api/articles/search/global?q=${encodeURIComponent(query)}`);
        console.log('Search response:', response.data);
        if (response.data.success) {
          setSearchResults(response.data.results);
        }
      } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        // Neu 404, co nghia la backend chua co endpoint, thong bao cho user
        if (error.response?.status === 404) {
          console.error('Endpoint /api/articles/search/global chua duoc tao. Vui long them ham globalSearch vao articleController.js');
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
      case 'article':
        navigate(`/${typeMap[item.category?.type] || 'tin-tuc'}/${item.slug}`);
        break;
      case 'category':
        navigate(`/${typeMap[item.category_type] || 'tin-tuc'}/${item.slug}`);
        break;
      case 'doctor':
        navigate(`/bac-si/${item.id}`);
        break;
      case 'specialty':
        navigate(`/chuyen-khoa/${item.slug}`);
        break;
      default:
        break;
    }
  };

  const getTotalResults = () => {
    if (!searchResults) return 0;
    return (searchResults.articles?.length || 0) + (searchResults.categories?.length || 0) +
           (searchResults.doctors?.length || 0) + (searchResults.specialties?.length || 0);
  };

  const hasResults = () => {
    if (!searchResults) return false;
    return (searchResults.articles?.length > 0) || (searchResults.categories?.length > 0) ||
           (searchResults.doctors?.length > 0) || (searchResults.specialties?.length > 0);
  };

  const toggleDropdown = (dropdown) => setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  const toggleMobileColumn = (column) => setActiveMobileColumn(activeMobileColumn === column ? null : column);
  const closeAllDropdowns = () => { 
    setActiveDropdown(null); 
    setActiveMobileColumn(null);
    setIsMenuOpen(false); 
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setUserProfile(null);
    navigate('/login');
  };

  return (
    <nav className="navbar-main">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={closeAllDropdowns}>
          {navbarData.logo_image ? (
            <img src={navbarData.logo_image} alt={navbarData.logo_text} />
          ) : (
            <img src={require('../../assets/images/logo.png')} alt="Clinic System" />
          )}
          <span>{navbarData.logo_text}</span>
        </Link>

        <button 
          className="navbar-mobile-menu-btn" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Bật/tắt menu"
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`navbar-center ${isMenuOpen ? 'active' : ''}`}>
          {/* Search */}
        <div className="navbar-search" ref={searchRef}>
          <form onSubmit={handleSearchSubmit}>
            <FaSearch />
            <input 
              type="text" 
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoComplete="off"
            />
            {isSearching && <FaSpinner className="navbar-spinner" />}
          </form>

          {showSearchResults && (
            <div className="navbar-search-dropdown">
              {isSearching ? (
                <div className="navbar-loading">
                  <FaSpinner />
                  <p>Đang tìm kiếm...</p>
                </div>
              ) : hasResults() ? (
                <>
                  <div className="navbar-search-header">
                    Tìm thấy {getTotalResults()} kết quả
                  </div>

                  {searchResults.articles?.length > 0 && (
                    <div className="navbar-search-section">
                      <div className="navbar-section-title">
                        <FaNewspaper /> Bài viết ({searchResults.articles.length})
                      </div>
                      {searchResults.articles.map((item) => (
                        <div key={item.id} className="navbar-search-item" onClick={() => handleResultClick('article', item)}>
                          <div className="navbar-item-icon article"><FaNewspaper /></div>
                          <div className="navbar-item-content">
                            <div className="navbar-item-title">{item.title}</div>
                            {item.category && (
                              <div className="navbar-item-meta">
                                <FaFolder /> {item.category.name} · <FaEye /> {item.views} lượt xem
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.categories?.length > 0 && (
                    <div className="navbar-search-section">
                      <div className="navbar-section-title">
                        <FaFolder /> Danh mục ({searchResults.categories.length})
                      </div>
                      {searchResults.categories.map((item) => (
                        <div key={item.id} className="navbar-search-item" onClick={() => handleResultClick('category', item)}>
                          <div className="navbar-item-icon category"><FaFolder /></div>
                          <div className="navbar-item-content">
                            <div className="navbar-item-title">{item.name}</div>
                            {item.description && <div className="navbar-item-desc">{item.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.doctors?.length > 0 && (
                    <div className="navbar-search-section">
                      <div className="navbar-section-title">
                        <FaUserMd /> Bác sĩ ({searchResults.doctors.length})
                      </div>
                      {searchResults.doctors.map((item) => (
                        <div key={item.id} className="navbar-search-item" onClick={() => handleResultClick('doctor', item)}>
                          <div className="navbar-item-avatar">
                            {item.avatar_url ? (
                              <img src={item.avatar_url} alt={item.full_name} />
                            ) : (
                              <div className="navbar-avatar-placeholder">{item.full_name.charAt(0)}</div>
                            )}
                          </div>
                          <div className="navbar-item-content">
                            <div className="navbar-item-title">BS. {item.full_name}</div>
                            {item.specialty && (
                              <div className="navbar-item-meta">
                                <FaStethoscope /> {item.specialty.name}
                                {item.experience_years > 0 && <> · <FaGraduationCap /> {item.experience_years} năm</>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.specialties?.length > 0 && (
                    <div className="navbar-search-section">
                      <div className="navbar-section-title">
                        <FaStethoscope /> Chuyên khoa ({searchResults.specialties.length})
                      </div>
                      {searchResults.specialties.map((item) => (
                        <div key={item.id} className="navbar-search-item" onClick={() => handleResultClick('specialty', item)}>
                          <div className="navbar-item-icon specialty"><FaStethoscope /></div>
                          <div className="navbar-item-content">
                            <div className="navbar-item-title">{item.name}</div>
                            {item.description && <div className="navbar-item-desc">{item.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="navbar-search-footer">
                    <button onClick={handleSearchSubmit}>Xem tất cả →</button>
                  </div>
                </>
              ) : (
                <div className="navbar-no-results">
                  <FaSearch />
                  <p>Không tìm thấy "{searchQuery}"</p>
                  <span>Thử từ khóa khác</span>
                </div>
              )}
            </div>
          )}
        </div>

          <div className="navbar-nav-menu">
            <div className="navbar-nav-item navbar-dropdown">
              <button 
                className="navbar-nav-link navbar-dropdown-toggle"
                onClick={() => toggleDropdown('intro')}
              >
                Giới thiệu
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'intro' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu ${activeDropdown === 'intro' ? 'show' : ''}`}>
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

            <div className="navbar-nav-item navbar-dropdown navbar-mega">
              <button 
                className="navbar-nav-link navbar-dropdown-toggle"
                onClick={() => toggleDropdown('team')}
              >
                Đội ngũ y tế
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'team' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu navbar-mega-menu ${activeDropdown === 'team' ? 'show' : ''}`}>
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
                        {specialties.slice(0, 5).map(sp => (
                          <Link 
                            key={sp.id} 
                            to={`/chuyen-khoa/${sp.slug}`}
                            onClick={closeAllDropdowns}
                          >
                            {sp.name}
                          </Link>
                        ))}
                        <Link to="/chuyen-khoa" onClick={closeAllDropdowns} className="navbar-view-all">
                          Xem tất cả →
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
                      <Link to="/bac-si?min_experience=15" onClick={closeAllDropdowns}>
                        Bác sĩ 15+ năm kinh nghiệm
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="navbar-nav-item navbar-dropdown navbar-mega">
              <button 
                className="navbar-nav-link navbar-dropdown-toggle"
                onClick={() => toggleDropdown('articles')}
              >
                Cẩm nang y tế
                <FaChevronDown className={`navbar-chevron ${activeDropdown === 'articles' ? 'rotate' : ''}`} />
              </button>
              <div className={`navbar-dropdown-menu navbar-mega-menu ${activeDropdown === 'articles' ? 'show' : ''}`}>
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
          {user && <NotificationDropdown />}

          <div className="navbar-nav-item navbar-dropdown navbar-user-dropdown">
            <button 
              className="navbar-user-btn"
              onClick={() => toggleDropdown('user')}
            >
              <UserAvatar user={user} userProfile={userProfile} />
            </button>

            <div className={`navbar-dropdown-menu navbar-dropdown-menu-right ${activeDropdown === 'user' ? 'show' : ''}`}>
              {user ? (
                <>
                  <div className="navbar-dropdown-user-info">
                    <strong>{user.full_name || user.email}</strong>
                    <span>{user.role}</span>
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
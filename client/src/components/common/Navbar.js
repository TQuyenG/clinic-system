// client/src/components/common/Navbar.js - Updated Version
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  FaMicroscope, FaSignInAlt, FaUserPlus, FaBookmark
} from 'react-icons/fa';
import NotificationDropdown from './NotificationDropdown';
import './Navbar.css';
import logo from '../../assets/images/logo.png';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [user, setUser] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeMobileColumn, setActiveMobileColumn] = useState(null);
  
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    // Load user data
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }

    fetchSpecialties();
    fetchCategories();

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSpecialties = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/specialties');
      const data = await response.json();
      if (data.success) {
        setSpecialties(data.specialties || []);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/categories');
      const data = await response.json();
      if (data.success) {
        const organized = {
          tin_tuc: [],
          thuoc: [],
          benh_ly: []
        };
        
        data.categories.forEach(cat => {
          if (organized[cat.category_type]) {
            organized[cat.category_type].push(cat);
          }
        });
        
        setCategories(organized);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
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
      const response = await fetch(`http://localhost:3001/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results || []);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Error searching:', error);
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

  const groupSearchResults = (results) => {
    const grouped = {
      specialty: [],
      doctor: [],
      article: [],
      medicine: [],
      disease: []
    };

    results.forEach(result => {
      if (grouped[result.type]) {
        grouped[result.type].push(result);
      }
    });

    return grouped;
  };

  const getGroupLabel = (type) => {
    const labels = {
      specialty: 'Chuyên khoa',
      doctor: 'Bác sĩ',
      article: 'Tin tức',
      medicine: 'Thuốc',
      disease: 'Bệnh lý'
    };
    return labels[type] || type;
  };

  const getGroupIcon = (type) => {
    const icons = {
      specialty: <FaHospital />,
      doctor: <FaUserMd />,
      article: <FaNewspaper />,
      medicine: <FaPills />,
      disease: <FaHeartbeat />
    };
    return icons[type] || null;
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* LOGO - Bên trái */}
        <Link to="/" className="logo" onClick={closeAllDropdowns}>
          <img src={logo} alt="Clinic System" />
        </Link>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* CENTER SECTION - Thanh tìm kiếm + Menu */}
        <div className={`nav-center ${isMenuOpen ? 'active' : ''}`}>
          {/* Search Bar */}
          <div className="search-container" ref={searchRef}>
            <form className="search-bar" onSubmit={handleSearchSubmit}>
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </form>

            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {Object.entries(groupSearchResults(searchResults)).map(([type, items]) => {
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={type} className="search-results-group">
                      <div className="search-group-title">
                        {getGroupIcon(type)}
                        {getGroupLabel(type)}
                      </div>
                      {items.map((result, index) => (
                        <Link
                          key={`${type}-${index}`}
                          to={result.url}
                          className="search-result-item"
                          onClick={() => {
                            setShowSearchResults(false);
                            setSearchQuery('');
                            closeAllDropdowns();
                          }}
                        >
                          <span className="result-icon">
                            {result.type === 'doctor' && <FaUserMd />}
                            {result.type === 'specialty' && <FaHospital />}
                            {result.type === 'article' && <FaNewspaper />}
                            {result.type === 'medicine' && <FaPills />}
                            {result.type === 'disease' && <FaHeartbeat />}
                          </span>
                          <div className="result-content">
                            <span className="result-title">{result.title}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {showSearchResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
              <div className="search-results">
                <div className="search-no-results">
                  Không tìm thấy kết quả cho "{searchQuery}"
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
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
                <Link to="/about" onClick={closeAllDropdowns}>
                  <FaInfoCircle /> Về chúng tôi
                </Link>
                <Link to="/services" onClick={closeAllDropdowns}>
                  <FaCogs /> Dịch vụ
                </Link>
                <Link to="/facilities" onClick={closeAllDropdowns}>
                  <FaBuilding /> Phòng khám
                </Link>
                <Link to="/equipment" onClick={closeAllDropdowns}>
                  <FaMicroscope /> Trang thiết bị
                </Link>
              </div>
            </div>

            {/* Đội ngũ bác sĩ */}
            <div className="nav-item dropdown">
              <button 
                className="nav-link dropdown-toggle"
                onClick={() => toggleDropdown('doctors')}
              >
                Đội ngũ bác sĩ
                <FaChevronDown className={`chevron ${activeDropdown === 'doctors' ? 'rotate' : ''}`} />
              </button>
              <div className={`dropdown-menu ${activeDropdown === 'doctors' ? 'show' : ''}`}>
                <Link to="/doctors" onClick={closeAllDropdowns} className="dropdown-header">
                  <FaUserMd /> Tất cả bác sĩ
                </Link>
                <div className="dropdown-divider"></div>
                {specialties.length > 0 ? (
                  specialties.slice(0, 8).map(specialty => (
                    <Link 
                      key={specialty.id} 
                      to={`/doctors?specialty=${specialty.slug}`}
                      onClick={closeAllDropdowns}
                    >
                      <FaHospital /> {specialty.name}
                    </Link>
                  ))
                ) : (
                  <span className="dropdown-empty">Đang tải...</span>
                )}
                {specialties.length > 8 && (
                  <>
                    <div className="dropdown-divider"></div>
                    <Link to="/specialties" onClick={closeAllDropdowns} className="dropdown-footer">
                      Xem tất cả chuyên khoa →
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Cẩm nang y tế */}
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

        {/* RIGHT SECTION - Notification & User */}
        <div className="nav-right">
          {/* Notification - Chỉ hiện khi đã đăng nhập */}
          {user && <NotificationDropdown />}

          {/* User Dropdown */}
          <div className="nav-item dropdown user-dropdown">
            <button 
              className="user-btn"
              onClick={() => toggleDropdown('user')}
            >
              {user ? (
                user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )
              ) : (
                <div className="user-avatar-placeholder">
                  <FaUser />
                </div>
              )}
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
                    <FaUserPlus />Đăng ký ngay
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
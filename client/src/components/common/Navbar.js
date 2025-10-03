// client/src/components/common/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaUser, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import './Navbar.css';
import logo from '../../assets/images/logo.png';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Kiểm tra user đã đăng nhập chưa
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Tìm kiếm:', searchQuery);
    // TODO: Implement search
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="logo">
          <img src={logo} alt="Clinic System Logo" />
          <span>Clinic System</span>
        </Link>

        {/* Search Bar - Desktop */}
        <form className="search-bar" onSubmit={handleSearch}>
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Tìm bác sĩ, chuyên khoa, dịch vụ..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Navigation Menu */}
        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" onClick={() => setIsMenuOpen(false)}>
            Trang chủ
          </Link>
          <Link to="/about" onClick={() => setIsMenuOpen(false)}>
            Giới thiệu
          </Link>
          <Link to="/services" onClick={() => setIsMenuOpen(false)}>
            Dịch vụ
          </Link>
          <Link to="/doctors" onClick={() => setIsMenuOpen(false)}>
            Bác sĩ
          </Link>
          <Link to="/articles" onClick={() => setIsMenuOpen(false)}>
            Cẩm nang
          </Link>
          <Link to="/contact" onClick={() => setIsMenuOpen(false)}>
            Liên hệ
          </Link>
          
          {/* Auth Buttons */}
          <div className="nav-buttons">
            <button className="bell-btn" aria-label="Thông báo">
              <FaBell />
            </button>

            {user ? (
              // Đã đăng nhập
              <>
                <Link 
                  to="/dashboard" 
                  className="auth-btn user-btn" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaUser className="btn-icon" />
                  {user.full_name || user.email}
                </Link>
                <button 
                  className="auth-btn logout" 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                >
                  <FaSignOutAlt className="btn-icon" />
                  Đăng xuất
                </button>
              </>
            ) : (
              // Chưa đăng nhập
              <>
                <Link to="/login" className="auth-btn login" onClick={() => setIsMenuOpen(false)}>
                  <FaUser className="btn-icon" />
                  Đăng nhập
                </Link>
                <Link to="/register" className="auth-btn register" onClick={() => setIsMenuOpen(false)}>
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
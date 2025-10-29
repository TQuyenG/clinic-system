import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaYoutube,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaClock,
  FaHeart
} from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Về chúng tôi */}
        <div className="footer-section">
          <h3>Clinic System</h3>
          <p className="footer-description">
            Hệ thống y tế hàng đầu, mang đến dịch vụ chăm sóc sức khỏe chất lượng cao với đội ngũ bác sĩ giàu kinh nghiệm và trang thiết bị hiện đại.
          </p>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebook />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <FaTwitter />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <FaYoutube />
            </a>
          </div>
        </div>

        {/* Liên kết nhanh */}
        <div className="footer-section">
          <h3>Liên kết nhanh</h3>
          <ul className="footer-links">
            <li><Link to="/about">Giới thiệu</Link></li>
            <li><Link to="/services">Dịch vụ</Link></li>
            <li><Link to="/doctors">Đội ngũ bác sĩ</Link></li>
            <li><Link to="/articles">Cẩm nang y tế</Link></li>
            <li><Link to="/book-appointment">Đặt lịch khám</Link></li>
            <li><Link to="/contact">Liên hệ</Link></li>
          </ul>
        </div>

        {/* Thông tin liên hệ */}
        <div className="footer-section">
          <h3>Thông tin liên hệ</h3>
          <ul className="contact-info">
            <li>
              <FaMapMarkerAlt className="contact-icon" />
              <span>123 Đường Sức Khỏe, Q.1, TP.HCM</span>
            </li>
            <li>
              <FaPhone className="contact-icon" />
              <span>Hotline: 1900 1234</span>
            </li>
            <li>
              <FaEnvelope className="contact-icon" />
              <span>contact@clinicsystem.vn</span>
            </li>
            <li>
              <FaClock className="contact-icon" />
              <span>T2 - T7: 7:00 - 20:00<br />Chủ nhật: 8:00 - 17:00</span>
            </li>
          </ul>
        </div>

        {/* Dịch vụ */}
        <div className="footer-section">
          <h3>Dịch vụ nổi bật</h3>
          <ul className="footer-links">
            <li><Link to="/specialties/noi-khoa">Nội khoa</Link></li>
            <li><Link to="/specialties/nhi-khoa">Nhi khoa</Link></li>
            <li><Link to="/specialties/san-phu-khoa">Sản phụ khoa</Link></li>
            <li><Link to="/specialties/rang-ham-mat">Răng hàm mặt</Link></li>
            <li><Link to="/specialties/tai-mui-hong">Tai mũi họng</Link></li>
            <li><Link to="/emergency">Cấp cứu 24/7</Link></li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-bottom">
        <div className="footer-container">
          <p>
            © {currentYear} Clinic System. Tất cả quyền được bảo lưu. 
            <span className="divider">|</span>
            <Link to="/privacy">Chính sách bảo mật</Link>
            <span className="divider">|</span>
            <Link to="/terms">Điều khoản sử dụng</Link>
          </p>
          <p className="made-with-love">
            Được phát triển với <FaHeart className="heart-icon" /> tại Việt Nam
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
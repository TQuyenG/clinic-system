import React, { useState, useEffect } from 'react';
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
import axios from 'axios';
import './Footer.css';

const API_BASE_URL = 'http://localhost:3001/api';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  // ✅ Thêm state cho footer data
  const [footerData, setFooterData] = useState({
    about_title: 'Clinic System',
    about_description: 'Hệ thống y tế hàng đầu, mang đến dịch vụ chăm sóc sức khỏe chất lượng cao.',
    address: '123 Đường Sức Khỏe, Q.1, TP.HCM',
    hotline: '1900 1234',
    email: 'contact@clinicsystem.vn',
    working_hours: 'T2 - T7: 7:00 - 20:00\nChủ nhật: 8:00 - 17:00',
    social_facebook: '',
    social_twitter: '',
    social_instagram: '',
    social_youtube: '',
    copyright_text: 'Clinic System. Tất cả quyền được bảo lưu.',
    privacy_link: '/privacy',
    terms_link: '/terms'
  });

  // ✅ Fetch footer data từ API
  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/header-nav-footer`);
        if (response.data && response.data.footer) {
          setFooterData(response.data.footer);
        }
      } catch (error) {
        console.error('Error fetching footer data:', error);
      }
    };

    fetchFooterData();
  }, []);

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Về chúng tôi */}
        <div className="footer-section">
          <h3>{footerData.about_title}</h3>
          <p className="footer-description">
            {footerData.about_description}
          </p>
          <div className="social-links">
            {footerData.social_facebook && (
              <a href={footerData.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <FaFacebook />
              </a>
            )}
            {footerData.social_twitter && (
              <a href={footerData.social_twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <FaTwitter />
              </a>
            )}
            {footerData.social_instagram && (
              <a href={footerData.social_instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FaInstagram />
              </a>
            )}
            {footerData.social_youtube && (
              <a href={footerData.social_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <FaYoutube />
              </a>
            )}
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
              <span>{footerData.address}</span>
            </li>
            <li>
              <FaPhone className="contact-icon" />
              <span>Hotline: {footerData.hotline}</span>
            </li>
            <li>
              <FaEnvelope className="contact-icon" />
              <span>{footerData.email}</span>
            </li>
            <li>
              <FaClock className="contact-icon" />
              <span style={{ whiteSpace: 'pre-line' }}>{footerData.working_hours}</span>
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
            © {currentYear} {footerData.copyright_text}
            <span className="divider">|</span>
            <Link to={footerData.privacy_link}>Chính sách bảo mật</Link>
            <span className="divider">|</span>
            <Link to={footerData.terms_link}>Điều khoản sử dụng</Link>
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
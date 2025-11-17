import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as Icons from 'react-icons/fa';
import './PrivacyPolicyPage.css';

const API_BASE_URL = 'http://localhost:3001/api';

const PrivacyPolicyPage = () => {
  const [privacyData, setPrivacyData] = useState({
    hero: { title: '', subtitle: '', last_updated: '' },
    sections: [],
    contact_email: '',
    contact_phone: '',
    contact_address: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrivacyData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/privacy`);
        if (response.data) {
          setPrivacyData(response.data);
        }
      } catch (error) {
        console.error('Error fetching privacy data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacyData();
  }, []);

  if (loading) {
    return (
      <div className="privacy-loading">
        <Icons.FaSpinner className="spinner" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="privacy-policy-page">
      {/* Hero */}
      <section className="privacy-hero">
        <div className="container">
          <Icons.FaLock className="hero-icon" />
          <h1>{privacyData.hero.title || 'Chính sách bảo mật'}</h1>
          <p className="hero-subtitle">
            {privacyData.hero.subtitle || 'Chúng tôi cam kết bảo vệ quyền riêng tư và bảo mật thông tin cá nhân của bạn'}
          </p>
          {privacyData.hero.last_updated && (
            <p className="last-updated">
              <Icons.FaCalendarAlt /> Cập nhật lần cuối: {privacyData.hero.last_updated}
            </p>
          )}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="trust-badges">
        <div className="container">
          <div className="badges-grid">
            <div className="badge">
              <Icons.FaShieldAlt />
              <span>Mã hóa SSL</span>
            </div>
            <div className="badge">
              <Icons.FaLock />
              <span>Bảo mật 256-bit</span>
            </div>
            <div className="badge">
              <Icons.FaUserShield />
              <span>Tuân thủ GDPR</span>
            </div>
            <div className="badge">
              <Icons.FaCheckCircle />
              <span>ISO 27001</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="privacy-content">
        <div className="container">
          {(privacyData.sections || []).map((section, index) => {
            const IconComponent = Icons[section.icon] || Icons.FaInfoCircle;
            return (
              <div key={index} className="privacy-section">
                <div className="section-header">
                  <IconComponent />
                  <h2>{section.title}</h2>
                </div>
                <div className="section-items">
                  {(section.items || []).map((item, idx) => (
                    <div key={idx} className="privacy-item">
                      <h3>{item.subtitle}</h3>
                      <p>{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Cookie Section */}
          <div className="privacy-section cookie-section">
            <div className="section-header">
              <Icons.FaDatabase />
              <h2>Chính sách Cookie</h2>
            </div>
            <p className="cookie-desc">Chúng tôi sử dụng cookie để cải thiện trải nghiệm người dùng</p>
            <div className="cookie-types">
              <div className="cookie-type">
                <div className="cookie-header">
                  <h3>Cookie cần thiết</h3>
                  <span className="required-badge">Bắt buộc</span>
                </div>
                <p>Cần thiết cho hoạt động của website (đăng nhập, giỏ hàng)</p>
              </div>
              <div className="cookie-type">
                <div className="cookie-header">
                  <h3>Cookie phân tích</h3>
                  <span className="optional-badge">Tùy chọn</span>
                </div>
                <p>Giúp chúng tôi hiểu cách người dùng sử dụng website</p>
              </div>
              <div className="cookie-type">
                <div className="cookie-header">
                  <h3>Cookie quảng cáo</h3>
                  <span className="optional-badge">Tùy chọn</span>
                </div>
                <p>Hiển thị quảng cáo phù hợp với sở thích của bạn</p>
              </div>
            </div>
            <button className="btn-manage-cookies">Quản lý Cookie</button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="privacy-contact">
        <div className="container">
          <div className="contact-box">
            <Icons.FaEnvelope className="contact-icon-large" />
            <h2>Câu hỏi về quyền riêng tư?</h2>
            <p>Liên hệ Bộ phận bảo mật dữ liệu của chúng tôi</p>
            <div className="contact-info">
              {privacyData.contact_email && (
                <div className="contact-item">
                  <Icons.FaEnvelope />
                  <strong>Email:</strong> 
                  <a href={`mailto:${privacyData.contact_email}`}>{privacyData.contact_email}</a>
                </div>
              )}
              {privacyData.contact_phone && (
                <div className="contact-item">
                  <Icons.FaPhone />
                  <strong>Điện thoại:</strong> 
                  <a href={`tel:${privacyData.contact_phone}`}>{privacyData.contact_phone}</a>
                </div>
              )}
              {privacyData.contact_address && (
                <div className="contact-item">
                  <Icons.FaMapMarkerAlt />
                  <strong>Địa chỉ:</strong> {privacyData.contact_address}
                </div>
              )}
            </div>
            <button className="btn-contact">Gửi yêu cầu</button>
          </div>
        </div>
      </section>

      {/* Updates Notice */}
      <section className="privacy-updates">
        <div className="container">
          <div className="updates-box">
            <Icons.FaExclamationTriangle />
            <div>
              <h3>Thông báo về cập nhật</h3>
              <p>
                Chúng tôi có thể cập nhật Chính sách bảo mật này theo thời gian. 
                Chúng tôi sẽ thông báo cho bạn về các thay đổi quan trọng qua email 
                hoặc thông báo trên website. Vui lòng xem lại chính sách định kỳ.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as Icons from 'react-icons/fa';
import './TermsPage.css';

const API_BASE_URL = 'http://localhost:3001/api';

const TermsPage = () => {
  const [termsData, setTermsData] = useState({
    hero: { title: '', subtitle: '', effective_date: '' },
    intro: { title: '', content: '' },
    sections: [],
    contact_email: '',
    contact_phone: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTermsData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/terms`);
        if (response.data) {
          setTermsData(response.data);
        }
      } catch (error) {
        console.error('Error fetching terms data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTermsData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleAgree = () => {
    alert('Cảm ơn bạn đã đồng ý với điều khoản dịch vụ của chúng tôi!');
  };

  if (loading) {
    return (
      <div className="terms-loading">
        <Icons.FaSpinner className="spinner" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="terms-page">
      {/* Hero */}
      <section className="terms-hero">
        <div className="container">
          <Icons.FaFileContract className="hero-icon" />
          <h1>{termsData.hero.title || 'Điều khoản dịch vụ'}</h1>
          <p className="hero-subtitle">
            {termsData.hero.subtitle || 'Vui lòng đọc kỹ các điều khoản trước khi sử dụng dịch vụ của chúng tôi'}
          </p>
          {termsData.hero.effective_date && (
            <p className="last-updated">
              <Icons.FaCalendarCheck /> Có hiệu lực từ: {termsData.hero.effective_date}
            </p>
          )}
        </div>
      </section>

      {/* Introduction */}
      {termsData.intro.title && (
        <section className="terms-intro">
          <div className="container">
            <div className="intro-box">
              <h2>{termsData.intro.title}</h2>
              <p>{termsData.intro.content}</p>
            </div>
          </div>
        </section>
      )}

      {/* Terms Content */}
      <section className="terms-content">
        <div className="container">
          {(termsData.sections || []).map((section, index) => {
            const IconComponent = Icons[section.icon] || Icons.FaCheckCircle;
            return (
              <div key={index} className="terms-section">
                <div className="section-header">
                  <IconComponent />
                  <h2>{section.title}</h2>
                </div>
                <div className="section-items">
                  {(section.items || []).map((item, idx) => (
                    <div key={idx} className="terms-item">
                      <h3>{item.subtitle}</h3>
                      <p>{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact Section */}
      {(termsData.contact_email || termsData.contact_phone) && (
        <section className="terms-contact">
          <div className="container">
            <div className="contact-box">
              <Icons.FaQuestionCircle className="contact-icon-large" />
              <h2>Câu hỏi về điều khoản?</h2>
              <p>Nếu bạn có bất kỳ câu hỏi nào về các điều khoản này, vui lòng liên hệ:</p>
              <div className="contact-info">
                {termsData.contact_email && (
                  <div className="contact-item">
                    <Icons.FaEnvelope />
                    <strong>Email:</strong> 
                    <a href={`mailto:${termsData.contact_email}`}>{termsData.contact_email}</a>
                  </div>
                )}
                {termsData.contact_phone && (
                  <div className="contact-item">
                    <Icons.FaPhone />
                    <strong>Điện thoại:</strong> 
                    <a href={`tel:${termsData.contact_phone}`}>{termsData.contact_phone}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Acceptance */}
      <section className="terms-acceptance">
        <div className="container">
          <div className="acceptance-box">
            <Icons.FaUserCheck className="acceptance-icon" />
            <h2>Chấp nhận điều khoản</h2>
            <p>
              Bằng việc tạo tài khoản hoặc sử dụng bất kỳ dịch vụ nào của chúng tôi, 
              bạn xác nhận rằng đã đọc, hiểu và đồng ý với tất cả các điều khoản nêu trên. 
              Nếu có câu hỏi, vui lòng liên hệ với chúng tôi trước khi sử dụng dịch vụ.
            </p>
            <div className="acceptance-buttons">
              <button className="btn-agree" onClick={handleAgree}>
                <Icons.FaCheck /> Tôi đồng ý
              </button>
              <button className="btn-print" onClick={handlePrint}>
                <Icons.FaPrint /> In điều khoản
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;
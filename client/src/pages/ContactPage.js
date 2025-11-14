import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as Icons from 'react-icons/fa';
import './ContactPage.css';

const API_BASE_URL = 'http://localhost:3001/api';

const ContactPage = () => {
  const [contactData, setContactData] = useState({
    hero: { title: '', subtitle: '' },
    info_cards: [],
    departments: [],
    faqs: [],
    map_embed: '',
    directions: []
  });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ type: '', message: '' });
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    const fetchContactData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/settings/contact`);
        if (response.data) {
          setContactData(response.data);
        }
      } catch (error) {
        console.error('Error fetching contact data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContactData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ type: '', message: '' });

    try {
      // Implement form submission logic here
      // await axios.post(`${API_BASE_URL}/contact/submit`, formData);
      
      console.log('Form submitted:', formData);
      setFormStatus({ 
        type: 'success', 
        message: 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.' 
      });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setFormStatus({ type: '', message: '' });
      }, 5000);
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormStatus({ 
        type: 'error', 
        message: 'Có lỗi xảy ra. Vui lòng thử lại!' 
      });
    }
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  if (loading) {
    return (
      <div className="contact-loading">
        <Icons.FaSpinner className="spinner" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="container">
          <h1>{contactData.hero.title || 'Liên hệ với chúng tôi'}</h1>
          <p className="hero-subtitle">
            {contactData.hero.subtitle || 'Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn'}
          </p>
        </div>
      </section>

      {/* Info Cards */}
      <section className="contact-info-section">
        <div className="container">
          <div className="contact-info-grid">
            {(contactData.info_cards || []).map((card, index) => {
              const IconComponent = Icons[card.icon] || Icons.FaPhone;
              return (
                <div 
                  key={index} 
                  className="contact-info-card" 
                  style={{ borderTopColor: card.color || '#4CAF50' }}
                >
                  <div 
                    className="info-icon" 
                    style={{ backgroundColor: card.color || '#4CAF50' }}
                  >
                    <IconComponent />
                  </div>
                  <h3>{card.title}</h3>
                  <div className="info-details">
                    {(card.details || []).map((detail, idx) => (
                      <p key={idx}>{detail}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form & Departments */}
      <section className="contact-form-section">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Form */}
            <div className="form-container">
              <h2>Gửi tin nhắn</h2>
              <p className="form-subtitle">
                Điền thông tin bên dưới, chúng tôi sẽ liên hệ với bạn sớm nhất
              </p>

              {/* Success/Error Message */}
              {formStatus.message && (
                <div className={`form-message ${formStatus.type}`}>
                  {formStatus.type === 'success' ? (
                    <Icons.FaCheckCircle />
                  ) : (
                    <Icons.FaExclamationCircle />
                  )}
                  <span>{formStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Họ và tên *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="example@email.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Số điện thoại</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="0123 456 789"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Chủ đề *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    placeholder="Chủ đề liên hệ"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Nội dung *</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    placeholder="Nhập nội dung tin nhắn..."
                  ></textarea>
                </div>

                <button type="submit" className="btn-submit">
                  <Icons.FaPaperPlane />
                  Gửi tin nhắn
                </button>
              </form>
            </div>

            {/* Map & Directions */}
            <div className="map-container">
              <h2>Bản đồ và hướng dẫn</h2>
              
              {/* Google Map */}
              {contactData.map_embed && (
                <div className="map-placeholder">
                  <iframe
                    src={contactData.map_embed}
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Google Map"
                  ></iframe>
                </div>
              )}

              {/* Directions */}
              {contactData.directions && contactData.directions.length > 0 && (
                <div className="directions">
                  <h3>Hướng dẫn đi lại:</h3>
                  <ul>
                    {contactData.directions.map((direction, index) => (
                      <li key={index}>{direction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Departments */}
      {contactData.departments && contactData.departments.length > 0 && (
        <section className="departments-section">
          <div className="container">
            <h2 className="section-title">Liên hệ các khoa</h2>
            <div className="departments-grid">
              {contactData.departments.map((dept, index) => (
                <div key={index} className="department-card">
                  <Icons.FaHospital className="dept-icon" />
                  <h4>{dept.name}</h4>
                  <a href={`tel:${dept.phone}`}>{dept.phone}</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {contactData.faqs && contactData.faqs.length > 0 && (
        <section className="faq-section">
          <div className="container">
            <h2 className="section-title">Câu hỏi thường gặp</h2>
            <div className="faq-grid">
              {contactData.faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className={`faq-item ${activeFaq === index ? 'active' : ''}`}
                  onClick={() => toggleFaq(index)}
                >
                  <div className="faq-question">
                    <h3>{faq.question}</h3>
                    <Icons.FaChevronDown className="faq-icon" />
                  </div>
                  {activeFaq === index && (
                    <div className="faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Social Media */}
      <section className="social-section">
        <div className="container">
          <h2>Kết nối với chúng tôi</h2>
          <p>Theo dõi chúng tôi trên các mạng xã hội để cập nhật thông tin mới nhất</p>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link facebook">
              <Icons.FaFacebook />
              Facebook
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link instagram">
              <Icons.FaInstagram />
              Instagram
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-link youtube">
              <Icons.FaYoutube />
              Youtube
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
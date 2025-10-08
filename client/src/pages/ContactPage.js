import React, { useState } from 'react';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaFacebookF, FaInstagram, FaYoutube, FaPaperPlane } from 'react-icons/fa';
import './ContactPage.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    }, 3000);
  };

  const contactInfo = [
    {
      icon: <FaPhone />,
      title: 'Điện thoại',
      details: ['Hotline: (028) 3822 1234', 'Cấp cứu: (028) 3822 9999'],
      color: '#4CAF50'
    },
    {
      icon: <FaEnvelope />,
      title: 'Email',
      details: ['info@clinic.vn', 'support@clinic.vn'],
      color: '#2196F3'
    },
    {
      icon: <FaMapMarkerAlt />,
      title: 'Địa chỉ',
      details: ['123 Nguyễn Huệ', 'Quận 1, TP.HCM'],
      color: '#FF5722'
    },
    {
      icon: <FaClock />,
      title: 'Giờ làm việc',
      details: ['Thứ 2 - Thứ 7: 7:00 - 20:00', 'Chủ nhật: 8:00 - 17:00'],
      color: '#9C27B0'
    }
  ];

  const departments = [
    { name: 'Khoa Nội', phone: '(028) 3822 1235' },
    { name: 'Khoa Ngoại', phone: '(028) 3822 1236' },
    { name: 'Khoa Sản', phone: '(028) 3822 1237' },
    { name: 'Khoa Nhi', phone: '(028) 3822 1238' },
    { name: 'Xét nghiệm', phone: '(028) 3822 1239' },
    { name: 'Chẩn đoán hình ảnh', phone: '(028) 3822 1240' }
  ];

  const faqs = [
    {
      question: 'Làm thế nào để đặt lịch khám?',
      answer: 'Bạn có thể đặt lịch qua hotline, website, hoặc trực tiếp tại bệnh viện.'
    },
    {
      question: 'Có nhận bảo hiểm y tế không?',
      answer: 'Có, chúng tôi chấp nhận tất cả các loại bảo hiểm y tế.'
    },
    {
      question: 'Có dịch vụ cấp cứu 24/7 không?',
      answer: 'Có, chúng tôi có phòng cấp cứu hoạt động 24/7.'
    },
    {
      question: 'Có bãi đỗ xe không?',
      answer: 'Có, bãi đỗ xe miễn phí với 50 chỗ xe máy và 20 chỗ ô tô.'
    }
  ];

  return (
    <div className="contact-page">
      {/* Hero */}
      <section className="contact-hero">
        <div className="container">
          <h1>Liên hệ với chúng tôi</h1>
          <p className="hero-subtitle">
            Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="contact-info-section">
        <div className="container">
          <div className="contact-info-grid">
            {contactInfo.map((info, index) => (
              <div key={index} className="contact-info-card" style={{ borderTopColor: info.color }}>
                <div className="info-icon" style={{ color: info.color }}>
                  {info.icon}
                </div>
                <h3>{info.title}</h3>
                {info.details.map((detail, idx) => (
                  <p key={idx}>{detail}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="contact-form-section">
        <div className="container">
          <div className="contact-grid">
            {/* Form */}
            <div className="form-container">
              <h2>Gửi tin nhắn cho chúng tôi</h2>
              <p className="form-subtitle">Điền thông tin bên dưới và chúng tôi sẽ phản hồi trong vòng 24h</p>
              
              {submitted && (
                <div className="success-message">
                  <FaPaperPlane />
                  <span>Cảm ơn bạn! Chúng tôi đã nhận được tin nhắn và sẽ phản hồi sớm.</span>
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
                    onChange={handleChange}
                    required
                    placeholder="Nguyễn Văn A"
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
                      onChange={handleChange}
                      required
                      placeholder="example@email.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Số điện thoại *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="0901234567"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Chủ đề</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                  >
                    <option value="">Chọn chủ đề</option>
                    <option value="appointment">Đặt lịch khám</option>
                    <option value="inquiry">Tư vấn dịch vụ</option>
                    <option value="complaint">Góp ý - Khiếu nại</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Nội dung *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="6"
                    placeholder="Nhập nội dung tin nhắn của bạn..."
                  ></textarea>
                </div>

                <button type="submit" className="btn-submit">
                  <FaPaperPlane />
                  <span>Gửi tin nhắn</span>
                </button>
              </form>
            </div>

            {/* Map */}
            <div className="map-container">
              <h2>Vị trí của chúng tôi</h2>
              <div className="map-placeholder">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.4976115404916!2d106.70296931533395!3d10.776089362181547!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f4b3330bcc7%3A0xb30b6b26855a4e2a!2zTmd1eeG7hW4gSHXhu4csIFF14bqtbiAxLCBUaMOgbmggcGjhu5EgSOG7kyBDaMOtIE1pbmg!5e0!3m2!1svi!2s!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Bản đồ vị trí"
                ></iframe>
              </div>
              
              <div className="directions">
                <h3>Hướng dẫn đi lại</h3>
                <ul>
                  <li>🚇 Gần ga metro Bến Thành (300m)</li>
                  <li>🚌 Các tuyến bus: 03, 14, 36, 93</li>
                  <li>🚗 Có bãi đỗ xe miễn phí</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="departments-section">
        <div className="container">
          <h2 className="section-title">Liên hệ các khoa</h2>
          <div className="departments-grid">
            {departments.map((dept, index) => (
              <div key={index} className="department-card">
                <FaPhone className="dept-icon" />
                <h4>{dept.name}</h4>
                <a href={`tel:${dept.phone.replace(/\s/g, '')}`}>{dept.phone}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="faq-section">
        <div className="container">
          <h2 className="section-title">Câu hỏi thường gặp</h2>
          <div className="faq-grid">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item">
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="social-section">
        <div className="container">
          <h2>Kết nối với chúng tôi</h2>
          <p>Theo dõi chúng tôi trên mạng xã hội để cập nhật thông tin sức khỏe</p>
          <div className="social-links">
            <a href="#facebook" className="social-link facebook">
              <FaFacebookF />
              <span>Facebook</span>
            </a>
            <a href="#instagram" className="social-link instagram">
              <FaInstagram />
              <span>Instagram</span>
            </a>
            <a href="#youtube" className="social-link youtube">
              <FaYoutube />
              <span>Youtube</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
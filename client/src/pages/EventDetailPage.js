// EventDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaCalendarAlt, FaMapMarkerAlt, FaArrowLeft, FaEye, FaShareAlt } from 'react-icons/fa';
import './EventDetailPage.css';

const typeLabels = {
  event: 'Sự kiện',
  promotion: 'Khuyến mãi',
  news: 'Tin tức',
  notification: 'Thông báo'
};

const EventDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => { fetchEventDetail(); }, [slug]);

  const fetchEventDetail = async () => {
    try {
      const response = await api.get(`/marketing/events/${slug}`);
      if (response.data.success) {
        setEvent(response.data.event);
        setSelectedImage(response.data.event.banner_url || response.data.event.thumbnail);
      }
    } catch (err) {
      console.error('Lỗi:', err);
      setError('Không tìm thấy sự kiện hoặc sự kiện đã kết thúc.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event.title, text: event.description, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép link!');
    }
  };

  if (loading) return (
    <div className="edp-loading">
      <div className="edp-spinner" />
      <p className="edp-loading__text">Đang tải nội dung...</p>
    </div>
  );

  if (error) return (
    <div className="edp-error">
      <h2 className="edp-error__title">{error}</h2>
      <Link to="/su-kien" className="edp-error__link">Quay lại danh sách</Link>
    </div>
  );

  if (!event) return null;

  const isEnded = new Date(event.end_date) < new Date();

  return (
    <div className="edp-page">
      {/* Breadcrumb */}
      <div className="edp-breadcrumb">
        <Link to="/" className="edp-breadcrumb__link">Trang chủ</Link>
        <span className="edp-breadcrumb__sep">/</span>
        <Link to="/su-kien" className="edp-breadcrumb__link">Sự kiện</Link>
        <span className="edp-breadcrumb__sep">/</span>
        <span>{event.title}</span>
      </div>

      <div className="edp-container">
        {/* Back */}
        <button onClick={() => navigate('/su-kien')} className="edp-btn-back">
          <FaArrowLeft /> Quay lại
        </button>

        {/* Header */}
        <div className="edp-event-header">
          <div className="edp-badge-row">
            <span className={`edp-type-badge edp-type-badge--${event.event_type}`}>
              {typeLabels[event.event_type] || event.event_type}
            </span>
            {isEnded && <span className="edp-status-badge--ended">Đã kết thúc</span>}
          </div>

          <h1 className="edp-event-title">{event.title}</h1>

          <div className="edp-meta">
            <div className="edp-meta__item">
              <FaCalendarAlt className="edp-meta__icon" />
              <span>
                {new Date(event.start_date).toLocaleDateString('vi-VN')} –{' '}
                {new Date(event.end_date).toLocaleDateString('vi-VN')}
              </span>
            </div>
            {event.location && (
              <div className="edp-meta__item">
                <FaMapMarkerAlt className="edp-meta__icon" />
                <span>{event.location}</span>
              </div>
            )}
            <div className="edp-meta__item">
              <FaEye className="edp-meta__icon" />
              <span>{event.views || 0} lượt xem</span>
            </div>
            <button className="edp-btn-share" onClick={handleShare}>
              <FaShareAlt /> Chia sẻ
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="edp-image-section">
          <div className="edp-main-image">
            <img
              className="edp-main-image__img"
              src={selectedImage || '/images/event-placeholder.jpg'}
              alt={event.title}
              onError={(e) => (e.target.src = '/images/event-placeholder.jpg')}
            />
          </div>

          {event.gallery && event.gallery.length > 0 && (
            <div className="edp-thumbs">
              {event.banner_url && (
                <img
                  src={event.banner_url}
                  alt="Banner"
                  className={`edp-thumb ${selectedImage === event.banner_url ? 'edp-thumb--active' : ''}`}
                  onClick={() => setSelectedImage(event.banner_url)}
                  onError={(e) => (e.target.style.display = 'none')}
                />
              )}
              {event.thumbnail && event.thumbnail !== event.banner_url && (
                <img
                  src={event.thumbnail}
                  alt="Thumbnail"
                  className={`edp-thumb ${selectedImage === event.thumbnail ? 'edp-thumb--active' : ''}`}
                  onClick={() => setSelectedImage(event.thumbnail)}
                  onError={(e) => (e.target.style.display = 'none')}
                />
              )}
              {event.gallery.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Gallery ${index + 1}`}
                  className={`edp-thumb ${selectedImage === img ? 'edp-thumb--active' : ''}`}
                  onClick={() => setSelectedImage(img)}
                  onError={(e) => (e.target.style.display = 'none')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="edp-content">
          {event.description && (
            <div className="edp-desc-box">
              <div className="edp-desc-box__title">Mô tả ngắn</div>
              <p className="edp-desc-box__text">{event.description}</p>
            </div>
          )}

          <div className="edp-full-content">
            <h3 className="edp-full-content__title">Chi tiết sự kiện</h3>
            <div
              className="edp-html-content"
              dangerouslySetInnerHTML={{ __html: event.content || event.description }}
            />
          </div>

          {/* CTA */}
          <div className="edp-cta">
            <button
              className="edp-cta__btn"
              onClick={() => {
                if (event.cta_config?.link) {
                  if (event.cta_config.type === 'external') {
                    window.open(event.cta_config.link, '_blank');
                  } else {
                    navigate(event.cta_config.link);
                  }
                } else {
                  navigate('/dat-lich-hen');
                }
              }}
            >
              {event.cta_config?.text || 'Đăng ký ngay'}
            </button>
          </div>
        </div>

        {/* Related */}
        <div className="edp-related">
          <h3 className="edp-related__title">Sự kiện liên quan</h3>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
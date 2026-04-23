import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaArrowLeft, FaEye, FaShareAlt } from 'react-icons/fa';
import './EventDetailPage.css';

const EventDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchEventDetail();
  }, [slug]);

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
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép link!');
    }
  };

  if (loading) return (
    <div className="event-loading">
      <div className="spinner"></div>
      <p>Đang tải nội dung...</p>
    </div>
  );

  if (error) return (
    <div className="event-error">
      <h2>{error}</h2>
      <Link to="/su-kien" className="btn-back">Quay lại danh sách</Link>
    </div>
  );

  if (!event) return null;

  return (
    <div className="event-detail-page">
      {/* Header với breadcrumb */}
      <div className="event-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link to="/su-kien">Sự kiện</Link>
        <span>/</span>
        <span>{event.title}</span>
      </div>

      <div className="event-detail-container">
        {/* Back button */}
        <button onClick={() => navigate('/su-kien')} className="btn-back-detail">
          <FaArrowLeft /> Quay lại
        </button>

        {/* Event Header */}
        <div className="event-detail-header">
          <div className="event-badge-container">
            <span className={`event-type-badge ${event.event_type}`}>
              {event.event_type === 'event' ? 'Sự kiện' : 
               event.event_type === 'promotion' ? 'Khuyến mãi' : 
               event.event_type === 'news' ? 'Tin tức' : 'Thông báo'}
            </span>
            {new Date(event.end_date) < new Date() && (
              <span className="event-status-badge ended">Đã kết thúc</span>
            )}
          </div>
          
          <h1 className="event-title">{event.title}</h1>
          
          <div className="event-meta-info">
            <div className="meta-item">
              <FaCalendarAlt />
              <span>{new Date(event.start_date).toLocaleDateString('vi-VN')} - {new Date(event.end_date).toLocaleDateString('vi-VN')}</span>
            </div>
            {event.location && (
              <div className="meta-item">
                <FaMapMarkerAlt />
                <span>{event.location}</span>
              </div>
            )}
            <div className="meta-item">
              <FaEye />
              <span>{event.views || 0} lượt xem</span>
            </div>
            <button className="btn-share" onClick={handleShare}>
              <FaShareAlt /> Chia sẻ
            </button>
          </div>
        </div>

        {/* Main Image Gallery */}
        <div className="event-image-section">
          <div className="main-image-container">
            <img 
              src={selectedImage || '/images/event-placeholder.jpg'} 
              alt={event.title}
              onError={(e) => e.target.src = '/images/event-placeholder.jpg'}
            />
          </div>
          
          {/* Gallery Thumbnails */}
          {event.gallery && event.gallery.length > 0 && (
            <div className="image-gallery-thumbnails">
              {/* Banner/Thumbnail chính */}
              {event.banner_url && (
                <img 
                  src={event.banner_url}
                  alt="Banner"
                  className={selectedImage === event.banner_url ? 'active' : ''}
                  onClick={() => setSelectedImage(event.banner_url)}
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              {event.thumbnail && event.thumbnail !== event.banner_url && (
                <img 
                  src={event.thumbnail}
                  alt="Thumbnail"
                  className={selectedImage === event.thumbnail ? 'active' : ''}
                  onClick={() => setSelectedImage(event.thumbnail)}
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              {/* Gallery images */}
              {event.gallery.map((img, index) => (
                <img 
                  key={index}
                  src={img}
                  alt={`Gallery ${index + 1}`}
                  className={selectedImage === img ? 'active' : ''}
                  onClick={() => setSelectedImage(img)}
                  onError={(e) => e.target.style.display = 'none'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Event Content */}
        <div className="event-content-section">
          {event.description && (
            <div className="event-description">
              <h3>Mô tả ngắn</h3>
              <p>{event.description}</p>
            </div>
          )}

          <div className="event-full-content">
            <h3>Chi tiết sự kiện</h3>
            <div 
              className="content-html" 
              dangerouslySetInnerHTML={{ __html: event.content || event.description }} 
            />
          </div>

          {/* CTA Button */}
          <div className="event-cta-section">
            <button 
              className="btn-cta-primary" 
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

        {/* Related Events */}
        <div className="related-events">
          <h3>Sự kiện liên quan</h3>
          {/* Có thể thêm logic load sự kiện liên quan sau */}
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
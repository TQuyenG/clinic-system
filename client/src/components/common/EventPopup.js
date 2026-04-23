
import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './EventPopup.css';

const EventPopup = ({ data, onClose }) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (data?.id) {
      api.post(`/marketing/events/${data.id}/track`, { type: 'view' }).catch(() => {});
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [data]);

  if (!data) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleAction = () => {
    api.post(`/marketing/events/${data.id}/track`, { type: 'click' }).catch(() => {});
    
    const ctaLink = data.cta_config?.link;
    if (ctaLink) {
      if (ctaLink.startsWith('http')) {
        window.open(ctaLink, '_blank');
      } else {
        navigate(ctaLink);
      }
    } else {
      navigate(`/su-kien/${data.slug}`);
    }
    handleClose();
  };

  return (
    <div className={`event-popup-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`event-popup-card ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="popup-close-btn" onClick={handleClose} aria-label="Close">
          <FaTimes />
        </button>

        <div className="popup-image-container" onClick={handleAction}>
          <img 
            src={data.thumbnail?.startsWith('http') 
              ? data.thumbnail 
              : `http://localhost:3001${data.thumbnail}`} 
            alt={data.title} 
            className="popup-image"
            onError={(e) => {
              // Nếu ảnh lỗi, hiển thị một ảnh mặc định hoặc ẩn đi
              e.target.src = 'https://via.placeholder.com/600x400?text=Event+Image';
            }}
          />
          <div className="popup-image-overlay">
            <span className="popup-click-hint">Nhấn để xem chi tiết</span>
          </div>
        </div>

        <div className="popup-content">
          <div className="popup-badge-group">
            <span className={`popup-badge ${data.event_type}`}>
              {data.event_type === 'event' ? 'Sự kiện' : 
               data.event_type === 'promotion' ? 'Khuyến mãi' : 
               data.event_type === 'news' ? 'Tin tức' : 'Thông báo'}
            </span>
          </div>

          <h2 className="popup-title" style={{ fontSize: '1.5rem', marginBottom: '12px', color: '#111827' }}>
            {data.title}
          </h2>
                    
          {data.description && (
            <p className="popup-description" style={{ color: '#4b5563', lineHeight: '1.6', marginBottom: '20px' }}>
              {data.description}
            </p>
          )}

          <div className="popup-meta" style={{ display: 'flex', gap: '15px', marginBottom: '25px', fontSize: '0.9rem', color: '#6b7280' }}>
            <span className="popup-date" style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: '6px' }}>
              <FaIcons.FaCalendarAlt style={{ marginRight: '6px', color: '#10b981' }} />
              {new Date(data.start_date).toLocaleDateString('vi-VN')}
            </span>
            {data.location && (
              <span className="popup-location" style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: '6px' }}>
                <FaIcons.FaMapMarkerAlt style={{ marginRight: '6px', color: '#ef4444' }} />
                {data.location}
              </span>
            )}
          </div>

          <button className="popup-cta-btn" onClick={handleAction}>
            {data.cta_config?.text || 'Xem chi tiết'}
            <span className="btn-arrow">→</span>
          </button>

          <button className="popup-close-text" onClick={handleClose}>
            Đóng thông báo
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPopup;
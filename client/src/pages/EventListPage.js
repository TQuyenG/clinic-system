// EventListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaTh, FaList, FaEye, FaMouse } from 'react-icons/fa';
import './EventListPage.css';

const typeLabels = {
  event: 'Sự kiện',
  promotion: 'Khuyến mãi',
  news: 'Tin tức',
  notification: 'Thông báo'
};

const EventListPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    event_type: 'all',
    status: '',
    sort_by: 'start_date',
    order: 'DESC'
  });
  const [viewMode, setViewMode] = useState('grid');
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, total_pages: 0 });

  useEffect(() => { fetchEvents(); }, [searchTerm, filters, pagination.page]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/marketing/events', {
        params: { search: searchTerm, page: pagination.page, limit: pagination.limit, ...filters }
      });
      if (response.data.success) {
        setEvents(response.data.events);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          total_pages: response.data.total_pages
        }));
      }
    } catch (error) {
      console.error('Lỗi tải sự kiện:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    if (now < start) return { text: 'Sắp diễn ra', cls: 'upcoming' };
    if (now > end) return { text: 'Đã kết thúc', cls: 'ended' };
    return { text: 'Đang diễn ra', cls: 'ongoing' };
  };

  const renderPagination = () => {
    if (pagination.total_pages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= pagination.total_pages; i++) {
      const show = i === 1 || i === pagination.total_pages ||
        (i >= pagination.page - 1 && i <= pagination.page + 1);
      const ellipsis = i === pagination.page - 2 || i === pagination.page + 2;
      if (show) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`elp-pagination__num ${pagination.page === i ? 'elp-pagination__num--active' : ''}`}
          >{i}</button>
        );
      } else if (ellipsis) {
        pages.push(<span key={i} className="elp-pagination__ellipsis">…</span>);
      }
    }
    return (
      <div className="elp-pagination">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="elp-pagination__btn"
        >← Trước</button>
        <div className="elp-pagination__numbers">{pages}</div>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.total_pages}
          className="elp-pagination__btn"
        >Sau →</button>
      </div>
    );
  };

  return (
    <div className="elp-page">
      {/* Hero Header */}
      <div className="elp-hero">
        <div className="elp-hero__inner">
          <h1 className="elp-hero__title">Tin tức & Sự kiện</h1>
          <p className="elp-hero__sub">Cập nhật những thông tin y tế và chương trình ưu đãi mới nhất</p>
        </div>
      </div>

      <div className="elp-container">
        {/* Controls */}
        <div className="elp-controls">
          <form onSubmit={handleSearch} className="elp-search">
            <input
              className="elp-search__input"
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="elp-search__btn"><FaSearch /></button>
          </form>

          <div className="elp-filters">
            <select
              className="elp-filter-select"
              value={filters.event_type}
              onChange={(e) => handleFilterChange('event_type', e.target.value)}
            >
              <option value="all">Tất cả loại</option>
              <option value="event">Sự kiện</option>
              <option value="promotion">Khuyến mãi</option>
              <option value="news">Tin tức</option>
              <option value="notification">Thông báo</option>
            </select>

            <select
              className="elp-filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="ended">Đã kết thúc</option>
            </select>

            <select
              className="elp-filter-select"
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
            >
              <option value="start_date">Ngày diễn ra</option>
              <option value="created_at">Ngày tạo</option>
              <option value="views">Lượt xem</option>
              <option value="clicks">Lượt nhấp</option>
            </select>

            <div className="elp-view-toggle">
              <button
                className={`elp-view-toggle__btn ${viewMode === 'grid' ? 'elp-view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Dạng lưới"
              ><FaTh /></button>
              <button
                className={`elp-view-toggle__btn ${viewMode === 'list' ? 'elp-view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Dạng danh sách"
              ><FaList /></button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="elp-loading-wrap">
            <div className="elp-spinner" />
            <p className="elp-loading-wrap__text">Đang tải sự kiện...</p>
          </div>
        ) : events.length > 0 ? (
          <>
            <div className={`elp-${viewMode}`}>
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div key={event.id} className={`elp-card elp-card--${viewMode}`}>
                    <div className="elp-card__image-wrap">
                      <img
                        className="elp-card__img"
                        src={event.thumbnail || event.banner_url || '/images/event-placeholder.jpg'}
                        alt={event.title}
                        onError={(e) => (e.target.src = '/images/event-placeholder.jpg')}
                      />
                      <div className="elp-card__date-badge">
                        <span className="elp-card__date-badge__day">
                          {new Date(event.start_date).getDate()}
                        </span>
                        <span className="elp-card__date-badge__month">
                          Th{new Date(event.start_date).getMonth() + 1}
                        </span>
                      </div>
                      <span className={`elp-card__status-tag elp-card__status-tag--${status.cls}`}>
                        {status.text}
                      </span>
                    </div>

                    <div className="elp-card__body">
                      <span className={`elp-type-tag elp-type-tag--${event.event_type}`}>
                        {typeLabels[event.event_type] || event.event_type}
                      </span>

                      <Link to={`/su-kien/${event.slug || event.id}`} className="elp-card__title-link">
                        <h3 className="elp-card__title">{event.title}</h3>
                      </Link>

                      <div className="elp-card__meta">
                        <span className="elp-card__meta-item">
                          <FaCalendarAlt className="elp-card__meta-icon" />
                          {new Date(event.start_date).toLocaleDateString('vi-VN')}
                        </span>
                        {event.location && (
                          <span className="elp-card__meta-item">
                            <FaMapMarkerAlt className="elp-card__meta-icon" />
                            {event.location}
                          </span>
                        )}
                      </div>

                      <p className="elp-card__desc">
                        {event.description?.substring(0, 110)}
                        {event.description?.length > 110 ? '...' : ''}
                      </p>

                      <div className="elp-card__footer">
                        <div className="elp-card__stats">
                          <span className="elp-card__stat">
                            <FaEye className="elp-card__stat-icon" /> {event.views || 0}
                          </span>
                          <span className="elp-card__stat">
                            <FaMouse className="elp-card__stat-icon" /> {event.clicks || 0}
                          </span>
                        </div>
                        <Link to={`/su-kien/${event.slug || event.id}`} className="elp-card__read-more">
                          Xem chi tiết →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {renderPagination()}

            <p className="elp-results-info">
              Hiển thị {events.length} / {pagination.total} sự kiện
            </p>
          </>
        ) : (
          <div className="elp-empty">
            <div className="elp-empty__icon">📭</div>
            <h3 className="elp-empty__title">Không tìm thấy sự kiện nào</h3>
            <p className="elp-empty__sub">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventListPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaFilter, FaTh, FaList, FaEye, FaMouse } from 'react-icons/fa';
import './EventListPage.css';

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
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    total_pages: 0
  });

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, filters, pagination.page]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      const response = await api.get('/marketing/events', { params });
      
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
    fetchEvents();
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

    if (now < start) return { text: 'Sắp diễn ra', class: 'upcoming' };
    if (now > end) return { text: 'Đã kết thúc', class: 'ended' };
    return { text: 'Đang diễn ra', class: 'ongoing' };
  };

  return (
    <div className="event-list-page">
      {/* Banner Header */}
      <div className="event-page-header">
        <div className="header-content">
          <h1>Tin tức & Sự kiện</h1>
          <p>Cập nhật những thông tin y tế và chương trình ưu đãi mới nhất</p>
        </div>
      </div>

      <div className="event-container">
        {/* Search & Filter Bar */}
        <div className="event-controls">
          <form onSubmit={handleSearch} className="event-search-bar">
            <input 
              type="text" 
              placeholder="Tìm kiếm sự kiện, khuyến mãi..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit"><FaSearch /></button>
          </form>

          <div className="event-filters">
            <select 
              value={filters.event_type} 
              onChange={(e) => handleFilterChange('event_type', e.target.value)}
              className="filter-select"
            >
              <option value="all">Tất cả loại</option>
              <option value="event">Sự kiện</option>
              <option value="promotion">Khuyến mãi</option>
              <option value="news">Tin tức</option>
              <option value="notification">Thông báo</option>
            </select>

            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="ended">Đã kết thúc</option>
            </select>

            <select 
              value={filters.sort_by} 
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="filter-select"
            >
              <option value="start_date">Ngày diễn ra</option>
              <option value="created_at">Ngày tạo</option>
              <option value="views">Lượt xem</option>
              <option value="clicks">Lượt nhấp</option>
            </select>

            <div className="view-toggle">
              <button 
                className={viewMode === 'grid' ? 'active' : ''} 
                onClick={() => setViewMode('grid')}
                title="Xem dạng lưới"
              >
                <FaTh />
              </button>
              <button 
                className={viewMode === 'list' ? 'active' : ''} 
                onClick={() => setViewMode('list')}
                title="Xem dạng danh sách"
              >
                <FaList />
              </button>
            </div>
          </div>
        </div>

        {/* Events Display */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Đang tải sự kiện...</p>
          </div>
        ) : events.length > 0 ? (
          <>
            <div className={`event-${viewMode}`}>
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div key={event.id} className={`event-card ${viewMode}`}>
                    <div className="event-card-image">
                      <img 
                        src={event.thumbnail || event.banner_url || '/images/event-placeholder.jpg'} 
                        alt={event.title}
                        onError={(e) => e.target.src = '/images/event-placeholder.jpg'}
                      />
                      <div className="event-date-badge">
                        <span className="day">{new Date(event.start_date).getDate()}</span>
                        <span className="month">Th{new Date(event.start_date).getMonth() + 1}</span>
                      </div>
                      <span className={`event-status-tag ${status.class}`}>
                        {status.text}
                      </span>
                    </div>

                    <div className="event-card-content">
                      <div className="event-card-header">
                        <span className={`event-type-tag ${event.event_type}`}>
                          {event.event_type === 'event' ? 'Sự kiện' : 
                           event.event_type === 'promotion' ? 'Khuyến mãi' : 
                           event.event_type === 'news' ? 'Tin tức' : 'Thông báo'}
                        </span>
                      </div>

                      <Link to={`/su-kien/${event.slug || event.id}`} className="event-title-link">
                        <h3>{event.title}</h3>
                      </Link>

                      <div className="event-meta">
                        <span><FaCalendarAlt /> {new Date(event.start_date).toLocaleDateString('vi-VN')}</span>
                        {event.location && (
                          <span><FaMapMarkerAlt /> {event.location}</span>
                        )}
                      </div>

                      <p className="event-desc">
                        {event.description?.substring(0, 120)}
                        {event.description?.length > 120 ? '...' : ''}
                      </p>

                      <div className="event-card-footer">
                        <div className="event-stats">
                          <span><FaEye /> {event.views || 0}</span>
                          <span><FaMouse /> {event.clicks || 0}</span>
                        </div>
                        <Link to={`/su-kien/${event.slug || event.id}`} className="event-read-more">
                          Xem chi tiết →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="pagination-btn"
                >
                  ← Trước
                </button>

                <div className="pagination-numbers">
                  {[...Array(pagination.total_pages)].map((_, index) => {
                    const pageNum = index + 1;
                    // Show first, last, current, and adjacent pages
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.total_pages ||
                      (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`pagination-number ${pagination.page === pageNum ? 'active' : ''}`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === pagination.page - 2 ||
                      pageNum === pagination.page + 2
                    ) {
                      return <span key={pageNum} className="pagination-ellipsis">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.total_pages}
                  className="pagination-btn"
                >
                  Sau →
                </button>
              </div>
            )}

            {/* Results info */}
            <div className="results-info">
              Hiển thị {events.length} trong tổng số {pagination.total} sự kiện
            </div>
          </>
        ) : (
          <div className="no-events">
            <img src="/images/no-results.svg" alt="No results" />
            <h3>Không tìm thấy sự kiện nào</h3>
            <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventListPage;
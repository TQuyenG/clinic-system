// ✅ TẠO FILE MỚI
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FaEye, FaMouse, FaChartLine, FaTrophy } from 'react-icons/fa';
import './EventStatisticsPage.css';

const EventStatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const params = dateRange.start_date && dateRange.end_date ? dateRange : {};
      const response = await api.get('/marketing/events/stats', { params });
      
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchStats();
  };

  if (loading) {
    return <div className="loading">Đang tải thống kê...</div>;
  }

  if (!stats) {
    return <div className="error">Không thể tải dữ liệu thống kê</div>;
  }

  return (
    <div className="event-statistics-page">
      <div className="page-header">
        <h1>Thống kê Sự kiện & Tiếp thị</h1>
      </div>

      {/* Filter */}
      <div className="filter-section">
        <form onSubmit={handleFilterSubmit}>
          <div className="date-inputs">
            <input 
              type="date" 
              value={dateRange.start_date}
              onChange={(e) => setDateRange({...dateRange, start_date: e.target.value})}
              placeholder="Từ ngày"
            />
            <span>đến</span>
            <input 
              type="date" 
              value={dateRange.end_date}
              onChange={(e) => setDateRange({...dateRange, end_date: e.target.value})}
              placeholder="Đến ngày"
            />
            <button type="submit">Lọc</button>
            <button 
              type="button" 
              onClick={() => {
                setDateRange({ start_date: '', end_date: '' });
                setTimeout(fetchStats, 100);
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        </form>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: '#dbeafe'}}>
            <FaChartLine color="#1e40af" />
          </div>
          <div className="stat-content">
            <h3>Tổng sự kiện</h3>
            <p className="stat-number">{stats.total_events}</p>
            <small>{stats.active_events} đang hoạt động</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#d1fae5'}}>
            <FaEye color="#065f46" />
          </div>
          <div className="stat-content">
            <h3>Tổng lượt xem</h3>
            <p className="stat-number">{stats.total_views.toLocaleString()}</p>
            <small>Trên tất cả sự kiện</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#fef3c7'}}>
            <FaMouse color="#92400e" />
          </div>
          <div className="stat-content">
            <h3>Tổng lượt click</h3>
            <p className="stat-number">{stats.total_clicks.toLocaleString()}</p>
            <small>Click vào CTA</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#e0e7ff'}}>
            <FaTrophy color="#3730a3" />
          </div>
          <div className="stat-content">
            <h3>Tỷ lệ CTR</h3>
            <p className="stat-number">{stats.avg_ctr}</p>
            <small>Click-through Rate</small>
          </div>
        </div>
      </div>

      {/* Top Events */}
      <div className="top-events-section">
        <h2>Top 5 Sự kiện hiệu quả nhất</h2>
        <div className="top-events-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Lượt xem</th>
                <th>Lượt click</th>
                <th>CTR</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_events.map((event, index) => (
                <tr key={event.id}>
                  <td>
                    <span className={`rank rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td><strong>{event.title}</strong></td>
                  <td>
                    <span className={`badge ${event.event_type}`}>
                      {event.event_type}
                    </span>
                  </td>
                  <td>{event.views.toLocaleString()}</td>
                  <td>{event.clicks.toLocaleString()}</td>
                  <td>
                    <strong>
                      {event.views > 0 
                        ? ((event.clicks / event.views) * 100).toFixed(2) + '%' 
                        : '0%'}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EventStatisticsPage;
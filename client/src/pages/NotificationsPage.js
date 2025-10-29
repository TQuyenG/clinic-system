// client/src/pages/NotificationPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FaBell, FaCheck, FaCheckDouble, FaTrash, FaFileAlt, 
  FaExclamationCircle, FaInfoCircle, FaSpinner
} from 'react-icons/fa';
import './NotificationPage.css';

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const navigate = useNavigate();

  const API_BASE_URL = 'http://localhost:3002';

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const unreadOnly = filter === 'unread' ? '?unread_only=true' : '';
      
      const response = await axios.get(`${API_BASE_URL}/api/notifications${unreadOnly}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        let data = response.data.notifications;
        
        if (filter === 'read') {
          data = data.filter(n => n.is_read);
        }
        
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_BASE_URL}/api/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${API_BASE_URL}/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    if (!window.confirm('Xóa tất cả thông báo đã đọc?')) return;

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${API_BASE_URL}/api/notifications/delete-all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications(prev => prev.filter(notif => !notif.is_read));
    } catch (error) {
      console.error('Error deleting all read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'article':
        return <FaFileAlt className="notif-icon article" />;
      case 'system':
        return <FaExclamationCircle className="notif-icon system" />;
      default:
        return <FaInfoCircle className="notif-icon default" />;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diff = Math.floor((now - notifDate) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    
    return notifDate.toLocaleDateString('vi-VN');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notification-page">
      <div className="notification-container">
        <div className="notification-header">
          <div className="header-left">
            <FaBell className="page-icon" />
            <h1>Thông báo</h1>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount} chưa đọc</span>
            )}
          </div>
          <div className="header-actions">
            {unreadCount > 0 && (
              <button className="btn-header" onClick={markAllAsRead}>
                <FaCheckDouble /> Đánh dấu tất cả đã đọc
              </button>
            )}
            <button className="btn-header btn-danger" onClick={deleteAllRead}>
              <FaTrash /> Xóa đã đọc
            </button>
          </div>
        </div>

        <div className="notification-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả ({notifications.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Chưa đọc ({unreadCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Đã đọc ({notifications.length - unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <FaSpinner className="spinner" />
            <p>Đang tải thông báo...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <FaBell className="empty-icon" />
            <h3>Không có thông báo</h3>
            <p>Bạn chưa có thông báo nào</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className={`notification-card ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon-wrapper">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="notification-content">
                  <p className="notification-message">{notification.message}</p>
                  <span className="notification-time">{formatTime(notification.created_at)}</span>
                </div>

                <div className="notification-actions">
                  {!notification.is_read && (
                    <button
                      className="action-btn mark-read"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      title="Đánh dấu đã đọc"
                    >
                      <FaCheck />
                    </button>
                  )}
                  <button
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="Xóa"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
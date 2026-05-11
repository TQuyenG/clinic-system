// client/src/pages/MyGroupsManagementPage.js
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import { FaUsers, FaCrown, FaComments, FaEllipsisV, FaEdit, FaTrash } from 'react-icons/fa';
import './MyGroupsManagementPage.css';

const GROUP_ICONS_MAP = {
  FaUsers: <FaUsers />, FaComments: <FaComments />, FaCrown: <FaCrown />
};

// Custom Alert Component
const CustomAlert = ({ type = 'info', title = '', message = '', show = false, onClose = () => {}, autoCloseDuration = 5000 }) => {
  useEffect(() => {
    if (show && autoCloseDuration > 0) {
      const timer = setTimeout(() => onClose(), autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDuration, onClose]);

  if (!show) return null;

  return (
    <div className="mygroupspage-alert-overlay" onClick={onClose}>
      <div className={`mygroupspage-alert mygroupspage-alert--${type}`} onClick={(e) => e.stopPropagation()}>
        <div className="mygroupspage-alert-header">
          <h3 className="mygroupspage-alert-title">{title}</h3>
        </div>
        {message && <p className="mygroupspage-alert-message">{message}</p>}
        <div className="mygroupspage-alert-actions">
          <button className={`mygroupspage-btn-primary mygroupspage-alert-btn--${type}`} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT: MyGroupsManagementPage
// ==========================================
const MyGroupsManagementPage = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  const navigate = useNavigate();

  // States
  const [myCreatedGroups, setMyCreatedGroups] = useState([]);
  const [myJoinedGroups, setMyJoinedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: 'info', title: '', message: '' });

  // Fetch My Groups
  useEffect(() => {
    if (!user) return;
    
    const fetchMyGroups = async () => {
      setLoading(true);
      try {
        const res = await communityService.getMyGroups();
        if (res.data.success) {
          setMyCreatedGroups(res.data.data.createdGroups || []);
          setMyJoinedGroups(res.data.data.joinedGroups || []);
        }
      } catch (e) {
        console.error('Error fetching groups:', e);
        setAlert({
          show: true,
          type: 'error',
          title: 'Lỗi',
          message: 'Không thể tải danh sách nhóm'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMyGroups();
  }, [user]);

  const handleViewGroup = (group) => {
    navigate(`/cong-dong/nhom/${group.slug}`);
  };

  const handleEditGroup = (group) => {
    // Navigate to edit group page when ready
    navigate(`/cong-dong/nhom/${group.slug}/chinh-sua`);
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhóm này?')) return;
    
    try {
      const res = await communityService.deleteGroup(groupId);
      if (res.data.success) {
        setMyCreatedGroups(prev => prev.filter(g => g.id !== groupId));
        setAlert({
          show: true,
          type: 'success',
          title: 'Thành công',
          message: 'Nhóm đã được xóa'
        });
      }
    } catch (e) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể xóa nhóm. Vui lòng thử lại'
      });
    }
  };

  const handleLeaveGroup = async (groupId) => {
    if (!window.confirm('Bạn có chắc muốn rời khỏi nhóm này?')) return;
    
    try {
      const res = await communityService.leaveGroup(groupId);
      if (res.data.success) {
        setMyJoinedGroups(prev => prev.filter(g => g.id !== groupId));
        setAlert({
          show: true,
          type: 'success',
          title: 'Thành công',
          message: 'Bạn đã rời khỏi nhóm'
        });
      }
    } catch (e) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể rời khỏi nhóm. Vui lòng thử lại'
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="mygroupspage-status-badge mygroupspage-status-active">✓ Đang hoạt động</span>;
      case 'pending':
        return <span className="mygroupspage-status-badge mygroupspage-status-pending">Đang chờ duyệt</span>;
      case 'suspended':
      case 'rejected':
        return <span className="mygroupspage-status-badge mygroupspage-status-rejected">❌ Bị từ chối/Đình chỉ</span>;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="mygroupspage-container">
        <div className="mygroupspage-empty-state">
          <FaUsers size={48} />
          <h3>Vui lòng đăng nhập</h3>
          <p>Bạn cần đăng nhập để xem nhóm của bạn</p>
          <button className="mygroupspage-btn-primary" onClick={() => navigate('/login')}>
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mygroupspage">
      {/* Header Banner */}
      <header className="mygroupspage-banner">
        <div className="mygroupspage-banner-bg"></div>
        <div className="mygroupspage-banner-inner mygroupspage-container">
          <div className="mygroupspage-banner-content">
            <h1 className="mygroupspage-banner-title">Nhóm của tôi</h1>
            <p className="mygroupspage-banner-desc">
              Quản lý các nhóm bạn tạo và các nhóm mà bạn tham gia
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mygroupspage-container mygroupspage-content">
        {loading ? (
          <div className="mygroupspage-loading">
            <div className="mygroupspage-spinner"></div>
            Đang tải dữ liệu...
          </div>
        ) : (
          <>
            {/* Created Groups Section */}
            <section className="mygroupspage-section">
              <h2 className="mygroupspage-section-title">
                <FaCrown /> Nhóm do tôi tạo ({myCreatedGroups.length})
              </h2>

              {myCreatedGroups.length === 0 ? (
                <div className="mygroupspage-empty-state-section">
                  <FaCrown size={32} />
                  <p>Bạn chưa tạo nhóm nào</p>
                  <button 
                    className="mygroupspage-btn-primary"
                    onClick={() => navigate('/cong-dong', { state: { openCreateModal: true } })}
                  >
                    + Tạo nhóm mới
                  </button>
                </div>
              ) : (
                <div className="mygroupspage-groups-grid">
                  {myCreatedGroups.map(group => (
                    <div key={group.id} className="mygroupspage-group-card">
                      {/* Group Cover */}
                      <div 
                        className="mygroupspage-group-cover"
                        style={{
                          background: group.cover_image 
                            ? `url(${group.cover_image.startsWith('http') ? group.cover_image : `http://localhost:3001${group.cover_image}`}) center/cover`
                            : 'linear-gradient(135deg, #4CAF50, #2E7D32)'
                        }}
                      >
                        <span className="mygroupspage-group-icon">
                          {!group.cover_image && (GROUP_ICONS_MAP[group.icon] || <FaUsers />)}
                        </span>
                      </div>

                      {/* Group Body */}
                      <div className="mygroupspage-group-body">
                        <h3 className="mygroupspage-group-name">{group.name}</h3>

                        {/* Status Badge */}
                        <div className="mygroupspage-group-status">
                          {getStatusBadge(group.status)}
                        </div>

                        {/* Rejection Reason */}
                        {group.rejection_reason && (
                          <p className="mygroupspage-group-rejection">
                            <strong>Lý do:</strong> {group.rejection_reason}
                          </p>
                        )}

                        {/* Group Description */}
                        <p className="mygroupspage-group-description">
                          {group.description || 'Nhóm cộng đồng sức khỏe'}
                        </p>

                        {/* Group Meta Info */}
                        <div className="mygroupspage-group-meta">
                          <span><FaUsers /> {group.members_count || 0} thành viên</span>
                          <span>{group.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                        </div>

                        {/* Actions */}
                        <div className="mygroupspage-group-actions">
                          {group.status === 'active' ? (
                            <>
                              <button 
                                className="mygroupspage-btn-primary"
                                onClick={() => handleViewGroup(group)}
                              >
                                Xem nhóm
                              </button>
                              <button 
                                className="mygroupspage-btn-outline"
                                onClick={() => handleEditGroup(group)}
                              >
                                <FaEdit /> Chỉnh sửa
                              </button>
                              <button 
                                className="mygroupspage-btn-danger"
                                onClick={() => handleDeleteGroup(group.id)}
                              >
                                <FaTrash /> Xóa
                              </button>
                            </>
                          ) : (
                            <button className="mygroupspage-btn-muted" disabled>
                              Chưa thể truy cập
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Joined Groups Section */}
            <section className="mygroupspage-section">
              <h2 className="mygroupspage-section-title">
                <FaUsers /> Nhóm tôi tham gia ({myJoinedGroups.length})
              </h2>

              {myJoinedGroups.length === 0 ? (
                <div className="mygroupspage-empty-state-section">
                  <FaUsers size={32} />
                  <p>Bạn chưa tham gia nhóm nào</p>
                  <button 
                    className="mygroupspage-btn-primary"
                    onClick={() => navigate('/cong-dong')}
                  >
                    Khám phá nhóm
                  </button>
                </div>
              ) : (
                <div className="mygroupspage-groups-grid">
                  {myJoinedGroups.map(group => (
                    <div key={group.id} className="mygroupspage-group-card">
                      {/* Group Cover */}
                      <div 
                        className="mygroupspage-group-cover"
                        style={{
                          background: group.cover_image 
                            ? `url(${group.cover_image.startsWith('http') ? group.cover_image : `http://localhost:3001${group.cover_image}`}) center/cover`
                            : 'linear-gradient(135deg, #4CAF50, #2E7D32)'
                        }}
                      >
                        <span className="mygroupspage-group-icon">
                          {!group.cover_image && (GROUP_ICONS_MAP[group.icon] || <FaUsers />)}
                        </span>
                      </div>

                      {/* Group Body */}
                      <div className="mygroupspage-group-body">
                        <h3 className="mygroupspage-group-name">{group.name}</h3>
                        <p className="mygroupspage-group-description">
                          {group.description || 'Nhóm cộng đồng sức khỏe'}
                        </p>

                        {/* Group Meta Info */}
                        <div className="mygroupspage-group-meta">
                          <span><FaUsers /> {group.members_count || 0} thành viên</span>
                          <span>{group.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
                        </div>

                        {/* Actions */}
                        <div className="mygroupspage-group-actions">
                          <button 
                            className="mygroupspage-btn-primary"
                            onClick={() => handleViewGroup(group)}
                          >
                            Vào nhóm
                          </button>
                          <button 
                            className="mygroupspage-btn-danger"
                            onClick={() => handleLeaveGroup(group.id)}
                          >
                            Rời nhóm
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Alert Component */}
      <CustomAlert
        type={alert.type}
        title={alert.title}
        message={alert.message}
        show={alert.show}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </div>
  );
};

export default MyGroupsManagementPage;

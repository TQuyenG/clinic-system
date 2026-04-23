// client/src/pages/CommunityHomePage.jsx
// ───────────────────────────────────────────────────────
// Trang chính: Danh sách nhóm cộng đồng
// - PUBLIC: Ai cũng xem được danh sách
// - Bộ lọc: Official, Community, tìm kiếm
// - CTA: Tạo nhóm (chỉ Doctor/Staff/Admin), Tham gia nhóm
// ───────────────────────────────────────────────────────

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import './CommunityHomePage.css';

const CommunityHomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useContext(AuthContext);

  // STATE
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // '' | 'official' | 'community'
  const [showCreateModal, setShowCreateModal] = useState(false);

  const LIMIT = 12;

  // FETCH danh sách nhóm
  const fetchGroups = async (pageNum = 1, searchText = '', type = '') => {
    try {
      setLoading(true);
      const params = { page: pageNum, limit: LIMIT };
      if (searchText) params.search = searchText;
      if (type) params.type = type;

      const response = await communityService.getGroups(params);
      setGroups(response.data.groups);
      setTotalGroups(response.data.total);
      setPage(pageNum);
    } catch (error) {
      console.error('Lỗi tải danh sách nhóm:', error);
      // Hiện error toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(1, search, typeFilter);
  }, []);

  // SEARCH + FILTER
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchGroups(1, search, typeFilter);
  };

  const handleTypeFilterChange = (type) => {
    setTypeFilter(type);
    setPage(1);
    fetchGroups(1, search, type);
  };

  // PAGINATION
  const totalPages = Math.ceil(totalGroups / LIMIT);
  const handleNextPage = () => {
    if (page < totalPages) {
      fetchGroups(page + 1, search, typeFilter);
    }
  };
  const handlePrevPage = () => {
    if (page > 1) {
      fetchGroups(page - 1, search, typeFilter);
    }
  };

  // ĐIỀU KIỆN hiển thị "Tạo nhóm": chỉ doctor, staff, admin
  const canCreateGroup = isAuthenticated && ['doctor', 'admin', 'staff'].includes(user?.role);

  return (
    <div className="community-home-page">
      {/* HEADER */}
      <div className="community-header">
        <div className="community-header-content">
          <h1>👥 Cộng Đồng Y Tế</h1>
          <p>Tham gia nhóm cộng đồng, chia sẻ kinh nghiệm và học hỏi từ bác sĩ và cộng đồng</p>
        </div>

        {/* CTA: Tạo nhóm */}
        {canCreateGroup && (
          <button
            className="btn-primary btn-lg"
            onClick={() => setShowCreateModal(true)}
          >
            + Tạo Nhóm Mới
          </button>
        )}
      </div>

      {/* SEARCH + FILTER */}
      <div className="community-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Tìm kiếm nhóm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn-secondary">
            🔍 Tìm
          </button>
        </form>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${!typeFilter ? 'active' : ''}`}
            onClick={() => handleTypeFilterChange('')}
          >
            Tất Cả
          </button>
          <button
            className={`filter-tab ${typeFilter === 'official' ? 'active' : ''}`}
            onClick={() => handleTypeFilterChange('official')}
          >
            ✅ Chính Thức
          </button>
          <button
            className={`filter-tab ${typeFilter === 'community' ? 'active' : ''}`}
            onClick={() => handleTypeFilterChange('community')}
          >
            👥 Cộng Đồng
          </button>
        </div>
      </div>

      {/* DANH SÁCH NHÓM */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Đang tải nhóm...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <p>😔 Không có nhóm nào được tìm thấy</p>
          {canCreateGroup && (
            <button
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Tạo nhóm đầu tiên của bạn
            </button>
          )}
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onJoinClick={() => navigate(`/cong-dong/nhom/${group.slug}`)}
            />
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-secondary"
            disabled={page === 1}
            onClick={handlePrevPage}
          >
            ← Trang trước
          </button>
          <span className="pagination-info">
            Trang {page} / {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page === totalPages}
            onClick={handleNextPage}
          >
            Trang sau →
          </button>
        </div>
      )}

      {/* MODAL: Tạo nhóm */}
      {showCreateModal && canCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchGroups(1, search, typeFilter);
          }}
        />
      )}
    </div>
  );
};

// ───────────────────────────────────────────────────────
// COMPONENT: GroupCard
// ───────────────────────────────────────────────────────
const GroupCard = ({ group, onJoinClick }) => {
  return (
    <div className="group-card">
      {/* Cover image */}
      <div className="group-card-cover">
        {group.cover_image ? (
          <img src={group.cover_image} alt={group.name} />
        ) : (
          <div className="placeholder-cover">{group.icon || '👥'}</div>
        )}

        {/* Badge: Official hoặc Community */}
        <div className={`group-badge ${group.type}`}>
          {group.type === 'official' ? '✅ Chính Thức' : '👥 Cộng Đồng'}
        </div>
      </div>

      {/* Nội dung card */}
      <div className="group-card-content">
        <h3 className="group-name">{group.name}</h3>
        <p className="group-description">{group.description || 'Không có mô tả'}</p>

        {/* Thông tin bác sĩ phụ trách */}
        {group.doctor && (
          <div className="group-doctor">
            <img
              src={group.doctor.user?.avatar_url || '/default-avatar.png'}
              alt={group.doctor.user?.full_name}
              className="doctor-avatar"
            />
            <div className="doctor-info">
              <span className="doctor-label">Bác sĩ phụ trách</span>
              <span className="doctor-name">{group.doctor.user?.full_name}</span>
            </div>
          </div>
        )}

        {/* Stats: Members, Posts */}
        <div className="group-stats">
          <span>👥 {group.members_count} thành viên</span>
          <span>📝 {group.posts_count} bài đăng</span>
        </div>

        {/* Privacy badge */}
        <div className="group-privacy">
          {group.privacy === 'public' && '🔓 Công khai'}
          {group.privacy === 'private' && '🔒 Riêng tư'}
          {group.privacy === 'invite_only' && '📨 Chỉ qua lời mời'}
        </div>
      </div>

      {/* CTA: Join/View */}
      <button className="btn-primary btn-full" onClick={onJoinClick}>
        Xem Chi Tiết →
      </button>
    </div>
  );
};

// ───────────────────────────────────────────────────────
// MODAL: CreateGroupModal
// ───────────────────────────────────────────────────────
const CreateGroupModal = ({ onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'public',
    doctor_id: '',
    requires_post_approval: true
  });
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch danh sách bác sĩ khi modal mở
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        // TODO: Tạo endpoint lấy danh sách bác sĩ active
        // Tạm thời mock, bạn cần gọi API thực
        const response = await fetch('/api/doctors?status=active');
        const data = await response.json();
        setDoctors(data.data || []);
      } catch (err) {
        console.error('Lỗi tải danh sách bác sĩ:', err);
      }
    };
    fetchDoctors();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên nhóm');
      return;
    }
    if (!formData.doctor_id) {
      setError('Vui lòng chọn bác sĩ phụ trách');
      return;
    }

    setLoading(true);
    try {
      await communityService.createGroup({
        ...formData,
        doctor_id: parseInt(formData.doctor_id)
      });

      // Toast success
      alert('✅ Tạo nhóm thành công! Nhóm đang chờ Admin duyệt.');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi tạo nhóm');
      console.error('Lỗi:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Tạo Nhóm Cộng Đồng Mới</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          {/* Tên nhóm */}
          <div className="form-group">
            <label htmlFor="name">Tên Nhóm *</label>
            <input
              id="name"
              type="text"
              name="name"
              placeholder="Ví dụ: Nhóm Tư Vấn Sức Khỏe Tim Mạch"
              value={formData.name}
              onChange={handleChange}
              maxLength="255"
              required
            />
          </div>

          {/* Mô tả */}
          <div className="form-group">
            <label htmlFor="description">Mô Tả Nhóm</label>
            <textarea
              id="description"
              name="description"
              placeholder="Mô tả mục đích, quy tắc của nhóm..."
              value={formData.description}
              onChange={handleChange}
              rows="4"
            />
          </div>

          {/* Bác sĩ phụ trách (BẮT BUỘC) */}
          <div className="form-group">
            <label htmlFor="doctor_id">Bác Sĩ Phụ Trách * (Bắt Buộc)</label>
            <select
              id="doctor_id"
              name="doctor_id"
              value={formData.doctor_id}
              onChange={handleChange}
              required
            >
              <option value="">-- Chọn bác sĩ --</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.user?.full_name} ({doc.speciality})
                </option>
              ))}
            </select>
            <small>Nhóm sẽ bị suspend nếu bác sĩ này rời đi</small>
          </div>

          {/* Quyền riêng tư */}
          <div className="form-group">
            <label htmlFor="privacy">Quyền Riêng Tư</label>
            <select
              id="privacy"
              name="privacy"
              value={formData.privacy}
              onChange={handleChange}
            >
              <option value="public">🔓 Công khai (Ai cũng join được)</option>
              <option value="private">🔒 Riêng tư (Cần phê duyệt)</option>
              <option value="invite_only">📨 Chỉ qua lời mời</option>
            </select>
          </div>

          {/* Kiểm duyệt bài đăng */}
          <div className="form-group">
            <label htmlFor="requires_post_approval">
              <input
                id="requires_post_approval"
                type="checkbox"
                name="requires_post_approval"
                checked={formData.requires_post_approval}
                onChange={handleChange}
              />
              <span>Yêu cầu duyệt bài đăng trước khi hiển thị</span>
            </label>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang tạo...' : '✓ Tạo Nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunityHomePage;
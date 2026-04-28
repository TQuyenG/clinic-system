// client/src/pages/CommunityHomePage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import communityService from '../services/communityService';
import {
  FaUsers, FaSearch, FaPlus, FaChevronLeft, FaChevronRight,
  FaCheckCircle, FaLock, FaEnvelope, FaLockOpen, FaTimes,
  FaUserMd, FaNewspaper, FaFilter, FaShieldAlt, FaSadTear,
  FaSpinner, FaCheckSquare
} from 'react-icons/fa';
import './CommunityHomePage.css';

const CommunityHomePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useContext(AuthContext);

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const LIMIT = 12;

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(1, search, typeFilter);
  }, []);

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

  const totalPages = Math.ceil(totalGroups / LIMIT);

  const canCreateGroup = isAuthenticated && ['doctor', 'admin', 'staff'].includes(user?.role);

  return (
    <div className="chp-page">
      {/* ── HEADER ── */}
      <div className="chp-header">
        <FaUsers className="chp-header-icon" />
        <div className="chp-header-content">
          <h1>Cộng Đồng Y Tế</h1>
          <p>Tham gia nhóm cộng đồng, chia sẻ kinh nghiệm và học hỏi từ bác sĩ và cộng đồng</p>
        </div>
        {canCreateGroup && (
          <button className="chp-btn-primary" onClick={() => setShowCreateModal(true)}>
            <FaPlus /> Tạo Nhóm Mới
          </button>
        )}
      </div>

      {/* ── SEARCH + FILTER ── */}
      <div className="chp-controls">
        <form onSubmit={handleSearch} className="chp-search-form">
          <div className="chp-search-wrapper">
            <FaSearch className="chp-search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm nhóm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="chp-search-input"
            />
          </div>
          <button type="submit" className="chp-btn-secondary">
            <FaSearch /> Tìm
          </button>
        </form>

        <div className="chp-filter-tabs">
          <button
            className={`chp-filter-tab${!typeFilter ? ' chp-filter-tab--active' : ''}`}
            onClick={() => handleTypeFilterChange('')}
          >
            <FaFilter /> Tất Cả
          </button>
          <button
            className={`chp-filter-tab${typeFilter === 'official' ? ' chp-filter-tab--active' : ''}`}
            onClick={() => handleTypeFilterChange('official')}
          >
            <FaShieldAlt /> Chính Thức
          </button>
          <button
            className={`chp-filter-tab${typeFilter === 'community' ? ' chp-filter-tab--active' : ''}`}
            onClick={() => handleTypeFilterChange('community')}
          >
            <FaUsers /> Cộng Đồng
          </button>
        </div>
      </div>

      {/* ── DANH SÁCH NHÓM ── */}
      {loading ? (
        <div className="chp-loading">
          <div className="chp-spinner"></div>
          <p>Đang tải nhóm...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="chp-empty">
          <div className="chp-empty-icon"><FaSadTear /></div>
          <p>Không có nhóm nào được tìm thấy</p>
          {canCreateGroup && (
            <button className="chp-btn-primary" onClick={() => setShowCreateModal(true)}>
              <FaPlus /> Tạo nhóm đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="chp-groups-grid">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onJoinClick={() => navigate(`/cong-dong/nhom/${group.slug}`)}
            />
          ))}
        </div>
      )}

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="chp-pagination">
          <button
            className="chp-btn-secondary"
            disabled={page === 1}
            onClick={() => fetchGroups(page - 1, search, typeFilter)}
          >
            <FaChevronLeft /> Trước
          </button>
          <span className="chp-pagination-info">Trang {page} / {totalPages}</span>
          <button
            className="chp-btn-secondary"
            disabled={page === totalPages}
            onClick={() => fetchGroups(page + 1, search, typeFilter)}
          >
            Sau <FaChevronRight />
          </button>
        </div>
      )}

      {/* ── MODAL TẠO NHÓM ── */}
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
  const privacyConfig = {
    public:      { icon: <FaLockOpen />,  label: 'Công khai' },
    private:     { icon: <FaLock />,      label: 'Riêng tư' },
    invite_only: { icon: <FaEnvelope />,  label: 'Lời mời' },
  };
  const privacy = privacyConfig[group.privacy] || privacyConfig.public;

  return (
    <div className="chp-group-card">
      <div className="chp-card-cover">
        {group.cover_image ? (
          <img src={group.cover_image} alt={group.name} />
        ) : (
          <div className="chp-card-cover-placeholder">
            <FaUsers />
          </div>
        )}
        <div className={`chp-card-badge ${group.type === 'official' ? 'chp-badge-official' : 'chp-badge-community'}`}>
          {group.type === 'official'
            ? <><FaShieldAlt /> Chính Thức</>
            : <><FaUsers /> Cộng Đồng</>
          }
        </div>
      </div>

      <div className="chp-card-content">
        <h3 className="chp-card-name">{group.name}</h3>
        <p className="chp-card-desc">{group.description || 'Không có mô tả'}</p>

        {group.doctor && (
          <div className="chp-card-doctor">
            <img
              src={group.doctor.user?.avatar_url || '/default-avatar.png'}
              alt={group.doctor.user?.full_name}
              className="chp-doctor-avatar"
            />
            <div className="chp-doctor-info">
              <span className="chp-doctor-label">Bác sĩ phụ trách</span>
              <span className="chp-doctor-name">{group.doctor.user?.full_name}</span>
            </div>
          </div>
        )}

        <div className="chp-card-stats">
          <span className="chp-stat-item"><FaUsers /> {group.members_count} thành viên</span>
          <span className="chp-stat-item"><FaNewspaper /> {group.posts_count} bài đăng</span>
        </div>

        <div className="chp-card-privacy">
          {privacy.icon} {privacy.label}
        </div>
      </div>

      <button className="chp-btn-primary chp-btn-full" onClick={onJoinClick}>
        Xem Chi Tiết <FaChevronRight />
      </button>
    </div>
  );
};

// ───────────────────────────────────────────────────────
// MODAL: CreateGroupModal
// ───────────────────────────────────────────────────────
const CreateGroupModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'public',
    specialty_id: '',
    doctor_id: '',
    requires_post_approval: true
  });
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch specialties khi component mount
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await fetch('/api/specialties');
        const data = await response.json();
        setSpecialties(data.data || []);
      } catch (err) {
        console.error('Lỗi tải danh sách chuyên khoa:', err);
      }
    };
    fetchSpecialties();
  }, []);

  // Fetch doctors khi specialty_id thay đổi
  useEffect(() => {
    if (!formData.specialty_id) {
      setDoctors([]);
      return;
    }

    const fetchDoctorsBySpecialty = async () => {
      try {
        const response = await fetch(`/api/users/doctors?status=active&specialty_id=${formData.specialty_id}`);
        const data = await response.json();
        setDoctors(data.doctors || []);
        // Reset doctor_id khi thay đổi specialty
        setFormData(prev => ({ ...prev, doctor_id: '' }));
      } catch (err) {
        console.error('Lỗi tải danh sách bác sĩ:', err);
        setDoctors([]);
      }
    };
    fetchDoctorsBySpecialty();
  }, [formData.specialty_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Vui lòng nhập tên nhóm'); return; }
    if (!formData.specialty_id) { setError('Vui lòng chọn chuyên khoa'); return; }
    if (!formData.doctor_id)   { setError('Vui lòng chọn bác sĩ phụ trách'); return; }

    setLoading(true);
    try {
      await communityService.createGroup({ 
        name: formData.name,
        description: formData.description,
        privacy: formData.privacy,
        doctor_id: parseInt(formData.doctor_id),
        requires_post_approval: formData.requires_post_approval
      });
      alert('Tạo nhóm thành công! Nhóm đang chờ Admin duyệt.');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi tạo nhóm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chp-modal-overlay" onClick={onClose}>
      <div className="chp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chp-modal-header">
          <h2><FaUsers style={{ marginRight: 8 }} />Tạo Nhóm Cộng Đồng</h2>
          <button className="chp-modal-close" onClick={onClose}><FaTimes /></button>
        </div>

        <form onSubmit={handleSubmit} className="chp-modal-form">
          {error && <div className="chp-error-msg">{error}</div>}

          <div className="chp-form-group">
            <label htmlFor="name"><FaUsers /> Tên Nhóm *</label>
            <input id="name" type="text" name="name"
              placeholder="Ví dụ: Nhóm Tư Vấn Sức Khỏe Tim Mạch"
              value={formData.name} onChange={handleChange} maxLength="255" required />
          </div>

          <div className="chp-form-group">
            <label htmlFor="description"><FaNewspaper /> Mô Tả Nhóm</label>
            <textarea id="description" name="description" rows="3"
              placeholder="Mô tả mục đích, quy tắc của nhóm..."
              value={formData.description} onChange={handleChange} />
          </div>

          <div className="chp-form-group">
            <label htmlFor="specialty_id"><FaFilter /> Chuyên Khoa *</label>
            <select id="specialty_id" name="specialty_id" value={formData.specialty_id} onChange={handleChange} required>
              <option value="">-- Chọn chuyên khoa --</option>
              {specialties.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
            <small>Chọn chuyên khoa trước để lọc danh sách bác sĩ phù hợp</small>
          </div>

          <div className="chp-form-group">
            <label htmlFor="doctor_id"><FaUserMd /> Bác Sĩ Phụ Trách *</label>
            {!formData.specialty_id ? (
              <div style={{ padding: '10px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', color: '#856404', fontSize: '13px' }}>
                Vui lòng chọn chuyên khoa trước
              </div>
            ) : doctors.length === 0 ? (
              <div style={{ padding: '10px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', color: '#721c24', fontSize: '13px' }}>
                Không có bác sĩ nào cho chuyên khoa này
              </div>
            ) : (
              <select id="doctor_id" name="doctor_id" value={formData.doctor_id} onChange={handleChange} required>
                <option value="">-- Chọn bác sĩ --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.user?.full_name} ({doc.title || 'Bác sĩ'})
                  </option>
                ))}
              </select>
            )}
            <small>Nhóm sẽ bị tạm ngưng nếu bác sĩ này rời đi</small>
          </div>

          <div className="chp-form-group">
            <label htmlFor="privacy"><FaLock /> Quyền Riêng Tư</label>
            <select id="privacy" name="privacy" value={formData.privacy} onChange={handleChange}>
              <option value="public">Công khai — Ai cũng tham gia được</option>
              <option value="private">Riêng tư — Cần phê duyệt</option>
              <option value="invite_only">Chỉ qua lời mời</option>
            </select>
          </div>

          <label className="chp-form-checkbox">
            <input type="checkbox" name="requires_post_approval"
              checked={formData.requires_post_approval} onChange={handleChange} />
            <FaCheckSquare /> Yêu cầu duyệt bài đăng trước khi hiển thị
          </label>

          <div className="chp-modal-actions">
            <button type="button" className="chp-btn-secondary" onClick={onClose} disabled={loading}>
              <FaTimes /> Hủy
            </button>
            <button type="submit" className="chp-btn-primary" disabled={loading || !formData.specialty_id || !formData.doctor_id}>
              {loading ? <><FaSpinner /> Đang tạo...</> : <><FaCheckCircle /> Tạo Nhóm</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommunityHomePage;
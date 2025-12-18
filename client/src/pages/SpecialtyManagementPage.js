// ============================================
// SpecialtyManagementPage.js - Redesigned
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash,
  FaTimes,
  FaStethoscope,
  FaHospital,
  FaUserMd,
  FaCalendarAlt,
  FaInfoCircle,
  FaSearch,
  FaSortUp,
  FaSortDown,
  FaSort
} from 'react-icons/fa';
import './SpecialtyManagementPage.css';

const SpecialtyManagementPage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSpecialty, setCurrentSpecialty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: ''
  });

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/specialties');
      if (response.data.success) {
        setSpecialties(response.data.specialties);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
      alert('Lỗi khi tải danh sách chuyên khoa');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'name' && !editMode) {
      const slug = value.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setCurrentSpecialty(null);
    setFormData({ name: '', description: '', slug: '' });
    setShowModal(true);
  };

  const openEditModal = (specialty) => {
    setEditMode(true);
    setCurrentSpecialty(specialty);
    setFormData({
      name: specialty.name,
      description: specialty.description || '',
      slug: specialty.slug || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: '', description: '', slug: '' });
    setCurrentSpecialty(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên chuyên khoa');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      if (editMode) {
        await axios.put(
          `http://localhost:3001/api/specialties/${currentSpecialty.id}`,
          formData,
          config
        );
        alert('Cập nhật chuyên khoa thành công!');
      } else {
        await axios.post(
          'http://localhost:3001/api/specialties',
          formData,
          config
        );
        alert('Tạo chuyên khoa thành công!');
      }

      closeModal();
      fetchSpecialties();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa chuyên khoa "${name}"?\n\nLưu ý: Không thể xóa nếu còn bác sĩ liên quan.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.delete(`http://localhost:3001/api/specialties/${id}`, config);
      alert('Xóa chuyên khoa thành công!');
      fetchSpecialties();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted and filtered data
  const getSortedAndFilteredData = () => {
    let filtered = specialties.filter(spec => 
      spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (spec.slug && spec.slug.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'doctorCount') {
          aVal = aVal || 0;
          bVal = bVal || 0;
        }

        if (sortConfig.key === 'created_at') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  };

  const filteredSpecialties = getSortedAndFilteredData();

  // Calculate statistics
  const totalSpecialties = specialties.length;
  const totalDoctors = specialties.reduce((sum, spec) => sum + (spec.doctorCount || 0), 0);
  const avgDoctorsPerSpecialty = totalSpecialties > 0 ? Math.round(totalDoctors / totalSpecialties) : 0;

  // Sort icon component
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <FaSort className="spec-sort-icon" />;
    }
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="spec-sort-icon active" /> : 
      <FaSortDown className="spec-sort-icon active" />;
  };

  if (loading) {
    return (
      <div className="spec-page">
        <div className="spec-loading">
          <div className="spec-spinner"></div>
          <p className="spec-loading-text">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="spec-page">
      <div className="spec-container">
        {/* Header */}
        <div className="spec-header">
          <div className="spec-header-content">
            <div className="spec-title-section">
              <h1 className="spec-title">
                <FaStethoscope className="spec-title-icon" />
                Quản lý Chuyên khoa
              </h1>
              <p className="spec-subtitle">
                Quản lý danh sách chuyên khoa y tế và phân bổ bác sĩ
              </p>
            </div>
            <button className="spec-btn spec-btn-primary" onClick={openCreateModal}>
              <FaPlus /> Thêm chuyên khoa
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="spec-stats">
          <div className="spec-stat-card">
            <div className="spec-stat-icon spec-stat-primary">
              <FaHospital />
            </div>
            <div className="spec-stat-content">
              <p className="spec-stat-label">Tổng chuyên khoa</p>
              <p className="spec-stat-value">{totalSpecialties}</p>
            </div>
          </div>

          <div className="spec-stat-card">
            <div className="spec-stat-icon spec-stat-success">
              <FaUserMd />
            </div>
            <div className="spec-stat-content">
              <p className="spec-stat-label">Tổng bác sĩ</p>
              <p className="spec-stat-value">{totalDoctors}</p>
            </div>
          </div>

          <div className="spec-stat-card">
            <div className="spec-stat-icon spec-stat-info">
              <FaStethoscope />
            </div>
            <div className="spec-stat-content">
              <p className="spec-stat-label">Trung bình BS/Khoa</p>
              <p className="spec-stat-value">{avgDoctorsPerSpecialty}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="spec-search-bar">
          <FaSearch className="spec-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm chuyên khoa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="spec-search-input"
          />
          {searchTerm && (
            <button 
              className="spec-search-clear"
              onClick={() => setSearchTerm('')}
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="spec-table-wrapper">
          <div className="spec-table-container">
            <table className="spec-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                    ID <SortIcon columnKey="id" />
                  </th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    Tên chuyên khoa <SortIcon columnKey="name" />
                  </th>
                  <th>Slug</th>
                  <th>Mô tả</th>
                  <th onClick={() => handleSort('doctorCount')} style={{ cursor: 'pointer' }}>
                    Số bác sĩ <SortIcon columnKey="doctorCount" />
                  </th>
                  <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                    Ngày tạo <SortIcon columnKey="created_at" />
                  </th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpecialties.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="spec-table-empty">
                      <FaInfoCircle className="spec-empty-icon" />
                      {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có chuyên khoa nào'}
                    </td>
                  </tr>
                ) : (
                  filteredSpecialties.map(specialty => (
                    <tr key={specialty.id}>
                      <td className="spec-table-id">{specialty.id}</td>
                      <td className="spec-table-name">{specialty.name}</td>
                      <td><code className="spec-code">{specialty.slug}</code></td>
                      <td className="spec-table-desc">
                        {specialty.description || <span className="spec-text-muted">Chưa có mô tả</span>}
                      </td>
                      <td>
                        <span className="spec-badge">
                          {specialty.doctorCount || 0}
                        </span>
                      </td>
                      <td className="spec-table-date">
                        <FaCalendarAlt className="spec-date-icon" />
                        {new Date(specialty.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <div className="spec-table-actions">
                          <button
                            className="spec-btn-icon spec-btn-edit"
                            onClick={() => openEditModal(specialty)}
                            title="Sửa"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="spec-btn-icon spec-btn-delete"
                            onClick={() => handleDelete(specialty.id, specialty.name)}
                            title="Xóa"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="spec-modal-overlay" onClick={closeModal}>
            <div className="spec-modal" onClick={(e) => e.stopPropagation()}>
              <div className="spec-modal-header">
                <h2 className="spec-modal-title">
                  {editMode ? (
                    <><FaEdit /> Chỉnh sửa chuyên khoa</>
                  ) : (
                    <><FaPlus /> Thêm chuyên khoa mới</>
                  )}
                </h2>
                <button className="spec-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="spec-modal-body">
                  <div className="spec-form-group">
                    <label htmlFor="spec-name" className="spec-form-label">
                      Tên chuyên khoa <span className="spec-required">*</span>
                    </label>
                    <input
                      id="spec-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="VD: Tim mạch, Nội khoa, Ngoại khoa..."
                      required
                      className="spec-form-control"
                    />
                    <small className="spec-form-hint">
                      Hãy viết hoa chữ cái đầu mỗi từ
                    </small>
                  </div>

                  <div className="spec-form-group">
                    <label htmlFor="spec-slug" className="spec-form-label">
                      Slug <small className="spec-text-muted">(URL thân thiện)</small>
                    </label>
                    <input
                      id="spec-slug"
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="tim-mach"
                      className="spec-form-control"
                    />
                    <small className="spec-form-hint">
                      Tự động tạo từ tên nếu để trống
                    </small>
                  </div>

                  <div className="spec-form-group">
                    <label htmlFor="spec-desc" className="spec-form-label">Mô tả</label>
                    <textarea
                      id="spec-desc"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Mô tả về chuyên khoa, chuyên môn điều trị..."
                      className="spec-form-control spec-form-textarea"
                    />
                  </div>
                </div>

                <div className="spec-modal-footer">
                  <button 
                    type="button" 
                    className="spec-btn spec-btn-secondary" 
                    onClick={closeModal}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="spec-btn spec-btn-primary">
                    {editMode ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecialtyManagementPage;
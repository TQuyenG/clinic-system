// ============================================
// SpecialtyManagementPage.js - Improved Design
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
  FaTable,
  FaCalendarAlt,
  FaInfoCircle
} from 'react-icons/fa';
import './SpecialtyManagementPage.css';

const SpecialtyManagementPage = () => {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSpecialty, setCurrentSpecialty] = useState(null);
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
      const response = await axios.get('http://localhost:3002/api/specialties');
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
          `http://localhost:3002/api/specialties/${currentSpecialty.id}`,
          formData,
          config
        );
        alert('Cập nhật chuyên khoa thành công!');
      } else {
        await axios.post(
          'http://localhost:3002/api/specialties',
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

      await axios.delete(`http://localhost:3002/api/specialties/${id}`, config);
      alert('Xóa chuyên khoa thành công!');
      fetchSpecialties();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  // Calculate statistics
  const totalSpecialties = specialties.length;
  const totalDoctors = specialties.reduce((sum, spec) => sum + (spec.doctorCount || 0), 0);
  const avgDoctorsPerSpecialty = totalSpecialties > 0 ? Math.round(totalDoctors / totalSpecialties) : 0;

  if (loading) {
    return (
      <div className="specialty-mgmt-page">
        <div className="specialty-mgmt-loading">
          <div className="specialty-mgmt-spinner"></div>
          <p className="specialty-mgmt-loading-text">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="specialty-mgmt-page">
      <div className="specialty-mgmt-container">
        {/* Header */}
        <div className="specialty-mgmt-header">
          <div className="specialty-mgmt-header-content">
            <div className="specialty-mgmt-title-section">
              <h1 className="specialty-mgmt-title">
                <FaStethoscope className="specialty-mgmt-title-icon" />
                Quản lý Chuyên khoa
              </h1>
              <p className="specialty-mgmt-subtitle">
                Quản lý danh sách chuyên khoa y tế và phân bổ bác sĩ
              </p>
            </div>
            <button className="specialty-mgmt-btn specialty-mgmt-btn-primary" onClick={openCreateModal}>
              <FaPlus /> Thêm chuyên khoa
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="specialty-mgmt-info-cards">
          <div className="specialty-mgmt-info-card">
            <div className="specialty-mgmt-info-icon">
              <FaHospital />
            </div>
            <div className="specialty-mgmt-info-content">
              <p className="specialty-mgmt-info-label">Tổng chuyên khoa</p>
              <p className="specialty-mgmt-info-value">{totalSpecialties}</p>
            </div>
          </div>

          <div className="specialty-mgmt-info-card">
            <div className="specialty-mgmt-info-icon">
              <FaUserMd />
            </div>
            <div className="specialty-mgmt-info-content">
              <p className="specialty-mgmt-info-label">Tổng bác sĩ</p>
              <p className="specialty-mgmt-info-value">{totalDoctors}</p>
            </div>
          </div>

          <div className="specialty-mgmt-info-card">
            <div className="specialty-mgmt-info-icon">
              <FaStethoscope />
            </div>
            <div className="specialty-mgmt-info-content">
              <p className="specialty-mgmt-info-label">Trung bình BS/Khoa</p>
              <p className="specialty-mgmt-info-value">{avgDoctorsPerSpecialty}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="specialty-mgmt-table-wrapper">
          <div className="specialty-mgmt-table-header">
            <h3 className="specialty-mgmt-table-title">
              <FaTable /> Danh sách chuyên khoa
            </h3>
          </div>

          <div className="specialty-mgmt-table-container">
            <table className="specialty-mgmt-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên chuyên khoa</th>
                  <th>Slug</th>
                  <th>Mô tả</th>
                  <th>Số bác sĩ</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {specialties.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="specialty-mgmt-table-empty">
                      <FaInfoCircle className="specialty-mgmt-table-empty-icon" />
                      Chưa có chuyên khoa nào
                    </td>
                  </tr>
                ) : (
                  specialties.map(specialty => (
                    <tr key={specialty.id}>
                      <td>{specialty.id}</td>
                      <td className="specialty-mgmt-table-name">{specialty.name}</td>
                      <td><code>{specialty.slug}</code></td>
                      <td>{specialty.description || <span style={{ color: 'var(--spec-text-lighter)', fontStyle: 'italic' }}>Chưa có mô tả</span>}</td>
                      <td>
                        <span className="specialty-mgmt-table-badge">
                          {specialty.doctorCount || 0}
                        </span>
                      </td>
                      <td className="specialty-mgmt-table-date">
                        <FaCalendarAlt style={{ marginRight: '0.5rem', fontSize: '0.875rem' }} />
                        {new Date(specialty.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <div className="specialty-mgmt-table-actions">
                          <button
                            className="specialty-mgmt-btn specialty-mgmt-btn-sm specialty-mgmt-btn-edit"
                            onClick={() => openEditModal(specialty)}
                          >
                            <FaEdit /> Sửa
                          </button>
                          <button
                            className="specialty-mgmt-btn specialty-mgmt-btn-sm specialty-mgmt-btn-delete"
                            onClick={() => handleDelete(specialty.id, specialty.name)}
                          >
                            <FaTrash /> Xóa
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
          <div className="specialty-mgmt-modal-overlay" onClick={closeModal}>
            <div className="specialty-mgmt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="specialty-mgmt-modal-header">
                <h2 className="specialty-mgmt-modal-title">
                  {editMode ? (
                    <><FaEdit /> Chỉnh sửa chuyên khoa</>
                  ) : (
                    <><FaPlus /> Thêm chuyên khoa mới</>
                  )}
                </h2>
                <button className="specialty-mgmt-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="specialty-mgmt-modal-body">
                  <div className="specialty-mgmt-form-group">
                    <label htmlFor="spec-name" className="specialty-mgmt-form-label">
                      Tên chuyên khoa <span className="specialty-mgmt-form-required">*</span>
                    </label>
                    <input
                      id="spec-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="VD: Tim mạch, Nội khoa, Ngoại khoa..."
                      required
                      className="specialty-mgmt-form-control"
                    />
                  </div>

                  <div className="specialty-mgmt-form-group">
                    <label htmlFor="spec-slug" className="specialty-mgmt-form-label">
                      Slug <small style={{ color: 'var(--spec-text-light)' }}>(URL thân thiện)</small>
                    </label>
                    <input
                      id="spec-slug"
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="tim-mach"
                      className="specialty-mgmt-form-control"
                    />
                    <small className="specialty-mgmt-form-hint">
                      Tự động tạo từ tên nếu để trống
                    </small>
                  </div>

                  <div className="specialty-mgmt-form-group">
                    <label htmlFor="spec-desc" className="specialty-mgmt-form-label">Mô tả</label>
                    <textarea
                      id="spec-desc"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Mô tả về chuyên khoa, chuyên môn điều trị..."
                      className="specialty-mgmt-form-control specialty-mgmt-form-textarea"
                    />
                  </div>
                </div>

                <div className="specialty-mgmt-modal-footer">
                  <button 
                    type="button" 
                    className="specialty-mgmt-btn specialty-mgmt-btn-secondary" 
                    onClick={closeModal}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="specialty-mgmt-btn specialty-mgmt-btn-primary">
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
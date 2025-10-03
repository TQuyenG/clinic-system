// client/src/pages/SpecialtyManagementPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

    // Tự động tạo slug từ tên
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
    if (!window.confirm(`Bạn có chắc muốn xóa chuyên khoa "${name}"?`)) {
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

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="specialty-management">
      <div className="page-header">
        <h1>Quản lý Chuyên khoa</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Thêm chuyên khoa mới
        </button>
      </div>

      <div className="specialty-table-container">
        <table className="specialty-table">
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
                <td colSpan="7" style={{ textAlign: 'center' }}>
                  Chưa có chuyên khoa nào
                </td>
              </tr>
            ) : (
              specialties.map(specialty => (
                <tr key={specialty.id}>
                  <td>{specialty.id}</td>
                  <td><strong>{specialty.name}</strong></td>
                  <td><code>{specialty.slug}</code></td>
                  <td>{specialty.description || 'Chưa có mô tả'}</td>
                  <td>{specialty.doctorCount || 0}</td>
                  <td>{new Date(specialty.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-edit"
                      onClick={() => openEditModal(specialty)}
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-sm btn-delete"
                      onClick={() => handleDelete(specialty.id, specialty.name)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal thêm/sửa */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Chỉnh sửa chuyên khoa' : 'Thêm chuyên khoa mới'}</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên chuyên khoa <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="VD: Tim mạch, Nội khoa..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Slug (URL thân thiện)</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="VD: tim-mach"
                />
                <small>Tự động tạo nếu để trống</small>
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Mô tả về chuyên khoa..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editMode ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialtyManagementPage;
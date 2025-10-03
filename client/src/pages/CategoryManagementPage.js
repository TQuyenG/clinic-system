// client/src/pages/CategoryManagementPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CategoryManagementPage.css';

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [selectedParent, setSelectedParent] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    parent_id: '',
    slug: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchParentCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/categories');
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Lỗi khi tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  const fetchParentCategories = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/categories/parents');
      if (response.data.success) {
        setParentCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Error fetching parent categories:', error);
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

  const openCreateModal = (parentId = '') => {
    setEditMode(false);
    setCurrentCategory(null);
    setFormData({ name: '', parent_id: parentId, slug: '' });
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditMode(true);
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      parent_id: category.parent_id || '',
      slug: category.slug || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ name: '', parent_id: '', slug: '' });
    setCurrentCategory(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const submitData = {
        ...formData,
        parent_id: formData.parent_id || null
      };

      if (editMode) {
        await axios.put(
          `http://localhost:3001/api/categories/${currentCategory.id}`,
          submitData,
          config
        );
        alert('Cập nhật danh mục thành công!');
      } else {
        await axios.post(
          'http://localhost:3001/api/categories',
          submitData,
          config
        );
        alert('Tạo danh mục thành công!');
      }

      closeModal();
      fetchCategories();
      fetchParentCategories();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.delete(`http://localhost:3001/api/categories/${id}`, config);
      alert('Xóa danh mục thành công!');
      fetchCategories();
      fetchParentCategories();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  // Lọc danh mục theo parent
  const filteredCategories = selectedParent === 'all' 
    ? categories 
    : categories.filter(cat => {
        if (selectedParent === 'root') {
          return cat.parent_id === null;
        }
        return cat.parent_id === parseInt(selectedParent);
      });

  // Tổ chức categories theo cấu trúc cây
  const organizeCategories = () => {
    const roots = categories.filter(cat => cat.parent_id === null);
    return roots.map(root => ({
      ...root,
      children: categories.filter(cat => cat.parent_id === root.id)
    }));
  };

  const organizedCategories = organizeCategories();

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="category-management">
      <div className="page-header">
        <h1>Quản lý Danh mục Bài viết</h1>
        <button className="btn btn-primary" onClick={() => openCreateModal()}>
          + Thêm danh mục mới
        </button>
      </div>

      <div className="filter-section">
        <label>Lọc theo danh mục cha:</label>
        <select 
          value={selectedParent} 
          onChange={(e) => setSelectedParent(e.target.value)}
          className="filter-select"
        >
          <option value="all">Tất cả</option>
          <option value="root">Danh mục gốc (Tin tức, Thuốc, Bệnh lý)</option>
          {parentCategories.map(parent => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
      </div>

      <div className="category-tree-view">
        <h3>Cấu trúc danh mục (Dạng cây)</h3>
        {organizedCategories.map(root => (
          <div key={root.id} className="category-tree-root">
            <div className="category-tree-item root-item">
              <div className="category-info">
                <strong>{root.name}</strong>
                <span className="category-slug">({root.slug})</span>
                <span className="child-count">{root.children?.length || 0} danh mục con</span>
              </div>
              <div className="category-actions">
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => openCreateModal(root.id)}
                >
                  + Thêm con
                </button>
                <button
                  className="btn btn-sm btn-edit"
                  onClick={() => openEditModal(root)}
                >
                  Sửa
                </button>
                <button
                  className="btn btn-sm btn-delete"
                  onClick={() => handleDelete(root.id, root.name)}
                >
                  Xóa
                </button>
              </div>
            </div>

            {root.children && root.children.length > 0 && (
              <div className="category-children">
                {root.children.map(child => (
                  <div key={child.id} className="category-tree-item child-item">
                    <div className="category-info">
                      <span className="child-marker">└─</span>
                      <strong>{child.name}</strong>
                      <span className="category-slug">({child.slug})</span>
                    </div>
                    <div className="category-actions">
                      <button
                        className="btn btn-sm btn-edit"
                        onClick={() => openEditModal(child)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDelete(child.id, child.name)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="category-table-container">
        <h3>Danh sách chi tiết</h3>
        <table className="category-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên danh mục</th>
              <th>Slug</th>
              <th>Danh mục cha</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  Không có danh mục nào
                </td>
              </tr>
            ) : (
              filteredCategories.map(category => {
                const parent = parentCategories.find(p => p.id === category.parent_id);
                return (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td>
                      <strong>{category.name}</strong>
                      {category.parent_id === null && (
                        <span className="badge badge-primary">Gốc</span>
                      )}
                    </td>
                    <td><code>{category.slug}</code></td>
                    <td>{parent ? parent.name : '-'}</td>
                    <td>{new Date(category.created_at).toLocaleDateString('vi-VN')}</td>
                    <td>
                      {category.parent_id === null && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => openCreateModal(category.id)}
                        >
                          + Con
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-edit"
                        onClick={() => openEditModal(category)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDelete(category.id, category.name)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal thêm/sửa */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên danh mục <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="VD: Thuốc xương khớp, Bệnh tim..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Danh mục cha</label>
                <select
                  name="parent_id"
                  value={formData.parent_id}
                  onChange={handleInputChange}
                >
                  <option value="">-- Không (Danh mục gốc) --</option>
                  {parentCategories.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
                </select>
                <small>Chọn "Tin tức", "Thuốc" hoặc "Bệnh lý" để tạo danh mục con</small>
              </div>

              <div className="form-group">
                <label>Slug (URL thân thiện)</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="VD: thuoc-xuong-khop"
                />
                <small>Tự động tạo nếu để trống</small>
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

export default CategoryManagementPage;
// ============================================
// client/src/pages/CategoryManagementPage.js
// Trang quản lý danh mục - Giao diện hoàn chỉnh
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaFolder, 
  FaList, 
  FaSearch,
  FaTimes,
  FaPills,
  FaHeartbeat,
  FaNewspaper,
  FaInfoCircle
} from 'react-icons/fa';
import './CategoryManagementPage.css';

const CategoryManagementPage = () => {
  // State quản lý dữ liệu
  const [categories, setCategories] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid hoặc table
  
  // State form data
  const [formData, setFormData] = useState({
    category_type: '',
    name: '',
    slug: '',
    description: ''
  });

  // Cấu hình loại danh mục với icon và màu sắc
  const CATEGORY_CONFIG = {
    tin_tuc: { 
      label: 'Tin tức', 
      icon: FaNewspaper,
      color: '#3b82f6',
      bgColor: '#dbeafe' 
    },
    thuoc: { 
      label: 'Thuốc', 
      icon: FaPills,
      color: '#10b981',
      bgColor: '#d1fae5' 
    },
    benh_ly: { 
      label: 'Bệnh lý', 
      icon: FaHeartbeat,
      color: '#ef4444',
      bgColor: '#fee2e2' 
    }
  };

  // Load dữ liệu khi component mount
  useEffect(() => {
    fetchCategories();
    fetchCategoryTypes();
  }, []);

  // API: Lấy tất cả danh mục
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

  // API: Lấy thống kê loại danh mục
  const fetchCategoryTypes = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/categories/types');
      if (response.data.success) {
        setCategoryTypes(response.data.types);
      }
    } catch (error) {
      console.error('Error fetching category types:', error);
    }
  };

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Tự động tạo slug từ tên (chỉ khi tạo mới)
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

  // Mở modal tạo danh mục
  const openCreateModal = () => {
    setEditMode(false);
    setCurrentCategory(null);
    setFormData({ 
      category_type: '', 
      name: '', 
      slug: '', 
      description: '' 
    });
    setShowModal(true);
  };

  // Mở modal sửa danh mục
  const openEditModal = (category) => {
    setEditMode(true);
    setCurrentCategory(category);
    setFormData({
      category_type: category.category_type || '',
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || ''
    });
    setShowModal(true);
  };

  // Đóng modal
  const closeModal = () => {
    setShowModal(false);
    setFormData({ 
      category_type: '', 
      name: '', 
      slug: '', 
      description: '' 
    });
    setCurrentCategory(null);
  };

  // Submit form tạo/sửa
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    if (!formData.category_type) {
      alert('Vui lòng chọn loại danh mục');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      if (editMode) {
        await axios.put(
          `http://localhost:3001/api/categories/${currentCategory.id}`,
          formData,
          config
        );
        alert('Cập nhật danh mục thành công!');
      } else {
        await axios.post(
          'http://localhost:3001/api/categories',
          formData,
          config
        );
        alert('Tạo danh mục thành công!');
      }

      closeModal();
      fetchCategories();
      fetchCategoryTypes();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  // Xóa danh mục
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${name}"?\n\nLưu ý: Không thể xóa nếu còn bài viết liên quan.`)) {
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
      fetchCategoryTypes();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  // Lọc danh mục theo loại và tìm kiếm
  const filteredCategories = categories.filter(cat => {
    const matchType = selectedType === 'all' || cat.category_type === selectedType;
    const matchSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        cat.slug.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  // Tổ chức categories theo loại
  const organizeByType = () => {
    const organized = {};
    
    Object.keys(CATEGORY_CONFIG).forEach(type => {
      organized[type] = {
        ...CATEGORY_CONFIG[type],
        items: categories.filter(cat => cat.category_type === type)
      };
    });

    return organized;
  };

  const organizedCategories = organizeByType();

  // Hiển thị loading
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="category-management">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>Quản lý Danh mục</h1>
          <p className="page-subtitle">
            Quản lý danh mục cho: Tin tức, Thuốc, Bệnh lý
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <FaPlus /> Thêm danh mục
        </button>
      </div>

      {/* Thống kê nhanh */}
      <div className="stats-grid">
        {categoryTypes.map(type => {
          const config = CATEGORY_CONFIG[type.type];
          const Icon = config?.icon || FaFolder;
          return (
            <div 
              key={type.type} 
              className="stat-card"
              style={{ borderLeftColor: config?.color }}
            >
              <div 
                className="stat-icon"
                style={{ 
                  backgroundColor: config?.bgColor,
                  color: config?.color 
                }}
              >
                <Icon />
              </div>
              <div className="stat-info">
                <h3>{type.label}</h3>
                <p className="stat-number">{type.count}</p>
                <p className="stat-label">danh mục</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="filter-toolbar">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              <FaTimes />
            </button>
          )}
        </div>

        <div className="filter-group">
          <label htmlFor="type-filter">
            <FaList /> Lọc:
          </label>
          <select 
            id="type-filter"
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tất cả</option>
            {Object.entries(CATEGORY_CONFIG).map(([type, config]) => (
              <option key={type} value={type}>{config.label}</option>
            ))}
          </select>
        </div>

        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Xem dạng lưới"
          >
            <FaFolder />
          </button>
          <button 
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Xem dạng bảng"
          >
            <FaList />
          </button>
        </div>
      </div>

      {/* Hiển thị theo view mode */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="categories-grid-view">
          {Object.entries(organizedCategories).map(([type, data]) => {
            const Icon = data.icon;
            return (
              <div key={type} className="type-section">
                <div className="type-section-header">
                  <h3>
                    <Icon style={{ color: data.color }} />
                    {data.label}
                  </h3>
                  <span className="type-count" style={{ backgroundColor: data.bgColor, color: data.color }}>
                    {data.items.length}
                  </span>
                </div>
                <div className="category-cards">
                  {data.items.length === 0 ? (
                    <p className="empty-state">
                      <FaInfoCircle /> Chưa có danh mục nào
                    </p>
                  ) : (
                    data.items
                      .filter(cat => 
                        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(cat => (
                        <div key={cat.id} className="category-card">
                          <div className="card-header" style={{ borderLeftColor: data.color }}>
                            <h4>{cat.name}</h4>
                            <div className="card-actions">
                              <button
                                className="icon-btn edit"
                                onClick={() => openEditModal(cat)}
                                title="Sửa"
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="icon-btn delete"
                                onClick={() => handleDelete(cat.id, cat.name)}
                                title="Xóa"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                          <div className="card-body">
                            <code className="card-slug">{cat.slug}</code>
                            {cat.description && (
                              <p className="card-description">{cat.description}</p>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Loại</th>
                <th>Tên danh mục</th>
                <th>Slug</th>
                <th>Mô tả</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-row">
                    <FaInfoCircle /> Không tìm thấy danh mục nào
                  </td>
                </tr>
              ) : (
                filteredCategories.map(cat => {
                  const config = CATEGORY_CONFIG[cat.category_type];
                  const Icon = config?.icon || FaFolder;
                  return (
                    <tr key={cat.id}>
                      <td>{cat.id}</td>
                      <td>
                        <span 
                          className="type-badge"
                          style={{ 
                            backgroundColor: config?.bgColor,
                            color: config?.color 
                          }}
                        >
                          <Icon /> {cat.category_type_label}
                        </span>
                      </td>
                      <td><strong>{cat.name}</strong></td>
                      <td><code>{cat.slug}</code></td>
                      <td className="description-cell">
                        {cat.description || <span className="text-muted">-</span>}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() => openEditModal(cat)}
                          >
                            <FaEdit /> Sửa
                          </button>
                          <button
                            className="btn btn-sm btn-delete"
                            onClick={() => handleDelete(cat.id, cat.name)}
                          >
                            <FaTrash /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal thêm/sửa */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editMode ? (
                  <><FaEdit /> Chỉnh sửa danh mục</>
                ) : (
                  <><FaPlus /> Thêm danh mục mới</>
                )}
              </h2>
              <button className="modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label htmlFor="category_type">
                  Loại danh mục <span className="required">*</span>
                </label>
                <select
                  id="category_type"
                  name="category_type"
                  value={formData.category_type}
                  onChange={handleInputChange}
                  required
                  className="form-control"
                >
                  <option value="">-- Chọn loại --</option>
                  {Object.entries(CATEGORY_CONFIG).map(([type, config]) => (
                    <option key={type} value={type}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <small className="form-hint">
                  Chọn loại danh mục: Tin tức, Thuốc hoặc Bệnh lý
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="name">
                  Tên danh mục <span className="required">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="VD: Thuốc xương khớp, Bệnh tim mạch..."
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="slug">
                  Slug <small className="text-muted">(URL thân thiện)</small>
                </label>
                <input
                  id="slug"
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="thuoc-xuong-khop"
                  className="form-control"
                />
                <small className="form-hint">
                  Tự động tạo từ tên nếu để trống
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="description">Mô tả</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả ngắn về danh mục..."
                  rows="4"
                  className="form-control"
                />
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeModal}
                >
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
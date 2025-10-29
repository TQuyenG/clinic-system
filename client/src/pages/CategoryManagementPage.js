// ============================================
// CategoryManagementPage.js - Improved Design
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
  FaInfoCircle,
  FaLayerGroup,
  FaTable,
  FaFilter
} from 'react-icons/fa';
import './CategoryManagementPage.css';

const CategoryManagementPage = () => {
  // State management
  const [categories, setCategories] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  
  const [formData, setFormData] = useState({
    category_type: '',
    name: '',
    slug: '',
    description: ''
  });

  // Category configuration with icons and colors
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

  useEffect(() => {
    fetchCategories();
    fetchCategoryTypes();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3002/api/categories');
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

  const fetchCategoryTypes = async () => {
    try {
      const response = await axios.get('http://localhost:3002/api/categories/types');
      if (response.data.success) {
        setCategoryTypes(response.data.types);
      }
    } catch (error) {
      console.error('Error fetching category types:', error);
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
    setCurrentCategory(null);
    setFormData({ 
      category_type: '', 
      name: '', 
      slug: '', 
      description: '' 
    });
    setShowModal(true);
  };

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
          `http://localhost:3002/api/categories/${currentCategory.id}`,
          formData,
          config
        );
        alert('Cập nhật danh mục thành công!');
      } else {
        await axios.post(
          'http://localhost:3002/api/categories',
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

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${name}"?\n\nLưu ý: Không thể xóa nếu còn bài viết liên quan.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.delete(`http://localhost:3002/api/categories/${id}`, config);
      alert('Xóa danh mục thành công!');
      fetchCategories();
      fetchCategoryTypes();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  const filteredCategories = categories.filter(cat => {
    const matchType = selectedType === 'all' || cat.category_type === selectedType;
    const matchSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        cat.slug.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

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

  if (loading) {
    return (
      <div className="category-mgmt-page">
        <div className="category-mgmt-loading">
          <div className="category-mgmt-spinner"></div>
          <p className="category-mgmt-loading-text">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-mgmt-page">
      <div className="category-mgmt-container">
        {/* Header */}
        <div className="category-mgmt-header">
          <div className="category-mgmt-header-content">
            <div className="category-mgmt-title-section">
              <h1 className="category-mgmt-title">
                <FaLayerGroup className="category-mgmt-title-icon" />
                Quản lý Danh mục
              </h1>
              <p className="category-mgmt-subtitle">
                Quản lý danh mục cho: Tin tức, Thuốc, Bệnh lý
              </p>
            </div>
            <button className="category-mgmt-btn category-mgmt-btn-primary" onClick={openCreateModal}>
              <FaPlus /> Thêm danh mục
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="category-mgmt-stats">
          {categoryTypes.map(type => {
            const config = CATEGORY_CONFIG[type.type];
            const Icon = config?.icon || FaFolder;
            return (
              <div 
                key={type.type} 
                className="category-mgmt-stat-card"
                style={{ 
                  '--stat-color': config?.color,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.setProperty('--hover-border', config?.color);
                }}
              >
                <style>
                  {`.category-mgmt-stat-card:hover::before { background: ${config?.color} !important; }`}
                </style>
                <div 
                  className="category-mgmt-stat-icon"
                  style={{ 
                    backgroundColor: config?.bgColor,
                    color: config?.color 
                  }}
                >
                  <Icon />
                </div>
                <div className="category-mgmt-stat-info">
                  <p className="category-mgmt-stat-label">{type.label}</p>
                  <p className="category-mgmt-stat-number">{type.count}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="category-mgmt-toolbar">
          <div className="category-mgmt-toolbar-row">
            <div className="category-mgmt-search-wrapper">
              <FaSearch className="category-mgmt-search-icon" />
              <input
                type="text"
                placeholder="Tìm kiếm danh mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="category-mgmt-search-input"
              />
              {searchTerm && (
                <button 
                  className="category-mgmt-search-clear"
                  onClick={() => setSearchTerm('')}
                >
                  <FaTimes />
                </button>
              )}
            </div>

            <div className="category-mgmt-filter-group">
              <label htmlFor="category-type-filter" className="category-mgmt-filter-label">
                <FaFilter /> Lọc:
              </label>
              <select 
                id="category-type-filter"
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="category-mgmt-filter-select"
              >
                <option value="all">Tất cả</option>
                {Object.entries(CATEGORY_CONFIG).map(([type, config]) => (
                  <option key={type} value={type}>{config.label}</option>
                ))}
              </select>
            </div>

            <div className="category-mgmt-view-toggle">
              <button 
                className={`category-mgmt-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Xem dạng lưới"
              >
                <FaFolder />
              </button>
              <button 
                className={`category-mgmt-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Xem dạng bảng"
              >
                <FaTable />
              </button>
            </div>
          </div>
        </div>

        {/* Content Views */}
        {viewMode === 'grid' ? (
          /* Grid View */
          <div className="category-mgmt-grid-view">
            {Object.entries(organizedCategories).map(([type, data]) => {
              const Icon = data.icon;
              const filteredItems = data.items.filter(cat => 
                cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
              );

              return (
                <div key={type} className="category-mgmt-type-section">
                  <div className="category-mgmt-type-header">
                    <h3 className="category-mgmt-type-title">
                      <Icon style={{ color: data.color }} />
                      {data.label}
                    </h3>
                    <span 
                      className="category-mgmt-type-count" 
                      style={{ backgroundColor: data.bgColor, color: data.color }}
                    >
                      {filteredItems.length}
                    </span>
                  </div>
                  <div className="category-mgmt-cards-grid">
                    {filteredItems.length === 0 ? (
                      <div className="category-mgmt-empty-state">
                        <FaInfoCircle className="category-mgmt-empty-icon" />
                        <span>Chưa có danh mục nào</span>
                      </div>
                    ) : (
                      filteredItems.map(cat => (
                        <div key={cat.id} className="category-mgmt-card">
                          <div 
                            className="category-mgmt-card-header" 
                            style={{ borderLeftColor: data.color }}
                          >
                            <h4 className="category-mgmt-card-title">{cat.name}</h4>
                            <div className="category-mgmt-card-actions">
                              <button
                                className="category-mgmt-icon-btn edit"
                                onClick={() => openEditModal(cat)}
                                title="Sửa"
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="category-mgmt-icon-btn delete"
                                onClick={() => handleDelete(cat.id, cat.name)}
                                title="Xóa"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                          <div className="category-mgmt-card-body">
                            <code className="category-mgmt-card-slug">{cat.slug}</code>
                            {cat.description && (
                              <p className="category-mgmt-card-description">{cat.description}</p>
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
          <div className="category-mgmt-table-container">
            <table className="category-mgmt-table">
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
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
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
                            className="category-mgmt-type-badge"
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
                        <td>
                          {cat.description || <span style={{ color: 'var(--cat-text-lighter)', fontStyle: 'italic' }}>-</span>}
                        </td>
                        <td>
                          <div className="category-mgmt-table-actions">
                            <button
                              className="category-mgmt-btn category-mgmt-btn-sm category-mgmt-btn-edit"
                              onClick={() => openEditModal(cat)}
                            >
                              <FaEdit /> Sửa
                            </button>
                            <button
                              className="category-mgmt-btn category-mgmt-btn-sm category-mgmt-btn-delete"
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

        {/* Modal */}
        {showModal && (
          <div className="category-mgmt-modal-overlay" onClick={closeModal}>
            <div className="category-mgmt-modal" onClick={(e) => e.stopPropagation()}>
              <div className="category-mgmt-modal-header">
                <h2 className="category-mgmt-modal-title">
                  {editMode ? (
                    <><FaEdit /> Chỉnh sửa danh mục</>
                  ) : (
                    <><FaPlus /> Thêm danh mục mới</>
                  )}
                </h2>
                <button className="category-mgmt-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="category-mgmt-modal-body">
                  <div className="category-mgmt-form-group">
                    <label htmlFor="cat-type" className="category-mgmt-form-label">
                      Loại danh mục <span className="category-mgmt-form-required">*</span>
                    </label>
                    <select
                      id="cat-type"
                      name="category_type"
                      value={formData.category_type}
                      onChange={handleInputChange}
                      required
                      className="category-mgmt-form-control category-mgmt-form-select"
                    >
                      <option value="">-- Chọn loại --</option>
                      {Object.entries(CATEGORY_CONFIG).map(([type, config]) => (
                        <option key={type} value={type}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                    <small className="category-mgmt-form-hint">
                      Chọn loại danh mục: Tin tức, Thuốc hoặc Bệnh lý
                    </small>
                  </div>

                  <div className="category-mgmt-form-group">
                    <label htmlFor="cat-name" className="category-mgmt-form-label">
                      Tên danh mục <span className="category-mgmt-form-required">*</span>
                    </label>
                    <input
                      id="cat-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="VD: Thuốc xương khớp, Bệnh tim mạch..."
                      required
                      className="category-mgmt-form-control"
                    />
                  </div>

                  <div className="category-mgmt-form-group">
                    <label htmlFor="cat-slug" className="category-mgmt-form-label">
                      Slug <small style={{ color: 'var(--cat-text-light)' }}>(URL thân thiện)</small>
                    </label>
                    <input
                      id="cat-slug"
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="thuoc-xuong-khop"
                      className="category-mgmt-form-control"
                    />
                    <small className="category-mgmt-form-hint">
                      Tự động tạo từ tên nếu để trống
                    </small>
                  </div>

                  <div className="category-mgmt-form-group">
                    <label htmlFor="cat-desc" className="category-mgmt-form-label">Mô tả</label>
                    <textarea
                      id="cat-desc"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Mô tả ngắn về danh mục..."
                      rows="4"
                      className="category-mgmt-form-control category-mgmt-form-textarea"
                    />
                  </div>
                </div>

                <div className="category-mgmt-modal-footer">
                  <button 
                    type="button" 
                    className="category-mgmt-btn category-mgmt-btn-secondary" 
                    onClick={closeModal}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="category-mgmt-btn category-mgmt-btn-primary">
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

export default CategoryManagementPage;
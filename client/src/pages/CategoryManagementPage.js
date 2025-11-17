// ============================================
// CategoryManagementPage.js - Redesigned
// ============================================

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaFolder, 
  FaSearch,
  FaTimes,
  FaPills,
  FaHeartbeat,
  FaNewspaper,
  FaInfoCircle,
  FaLayerGroup,
  FaFilter,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaCalendarAlt
} from 'react-icons/fa';
import './CategoryManagementPage.css';

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const [formData, setFormData] = useState({
    category_type: '',
    name: '',
    slug: '',
    description: ''
  });

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
    let filtered = categories.filter(cat => {
      const matchType = selectedType === 'all' || cat.category_type === selectedType;
      const matchSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (cat.slug && cat.slug.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchSearch;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

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

  const filteredCategories = getSortedAndFilteredData();

  // Sort icon component
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <FaSort className="cat-sort-icon" />;
    }
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="cat-sort-icon active" /> : 
      <FaSortDown className="cat-sort-icon active" />;
  };

  if (loading) {
    return (
      <div className="cat-page">
        <div className="cat-loading">
          <div className="cat-spinner"></div>
          <p className="cat-loading-text">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cat-page">
      <div className="cat-container">
        {/* Header */}
        <div className="cat-header">
          <div className="cat-header-content">
            <div className="cat-title-section">
              <h1 className="cat-title">
                <FaLayerGroup className="cat-title-icon" />
                Quản lý Danh mục
              </h1>
              <p className="cat-subtitle">
                Quản lý danh mục cho: Tin tức, Thuốc, Bệnh lý
              </p>
            </div>
            <button className="cat-btn cat-btn-primary" onClick={openCreateModal}>
              <FaPlus /> Thêm danh mục
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="cat-stats">
          {categoryTypes.map(type => {
            const config = CATEGORY_CONFIG[type.type];
            const Icon = config?.icon || FaFolder;
            return (
              <div key={type.type} className="cat-stat-card">
                <div 
                  className="cat-stat-icon"
                  style={{ 
                    backgroundColor: config?.bgColor,
                    color: config?.color 
                  }}
                >
                  <Icon />
                </div>
                <div className="cat-stat-content">
                  <p className="cat-stat-label">{type.label}</p>
                  <p className="cat-stat-value">{type.count}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="cat-toolbar">
          <div className="cat-search-bar">
            <FaSearch className="cat-search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cat-search-input"
            />
            {searchTerm && (
              <button 
                className="cat-search-clear"
                onClick={() => setSearchTerm('')}
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="cat-filter-group">
            <FaFilter className="cat-filter-icon" />
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="cat-filter-select"
            >
              <option value="all">Tất cả</option>
              {Object.entries(CATEGORY_CONFIG).map(([type, config]) => (
                <option key={type} value={type}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="cat-table-wrapper">
          <div className="cat-table-container">
            <table className="cat-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                    ID <SortIcon columnKey="id" />
                  </th>
                  <th onClick={() => handleSort('category_type')} style={{ cursor: 'pointer' }}>
                    Loại <SortIcon columnKey="category_type" />
                  </th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    Tên danh mục <SortIcon columnKey="name" />
                  </th>
                  <th>Slug</th>
                  <th>Mô tả</th>
                  <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                    Ngày tạo <SortIcon columnKey="created_at" />
                  </th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="cat-table-empty">
                      <FaInfoCircle className="cat-empty-icon" />
                      {searchTerm || selectedType !== 'all' ? 'Không tìm thấy kết quả' : 'Chưa có danh mục nào'}
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map(cat => {
                    const config = CATEGORY_CONFIG[cat.category_type];
                    const Icon = config?.icon || FaFolder;
                    return (
                      <tr key={cat.id}>
                        <td className="cat-table-id">{cat.id}</td>
                        <td>
                          <span 
                            className="cat-type-badge"
                            style={{ 
                              backgroundColor: config?.bgColor,
                              color: config?.color 
                            }}
                          >
                            <Icon /> {cat.category_type_label}
                          </span>
                        </td>
                        <td className="cat-table-name">{cat.name}</td>
                        <td><code className="cat-code">{cat.slug}</code></td>
                        <td className="cat-table-desc">
                          {cat.description || <span className="cat-text-muted">-</span>}
                        </td>
                        <td className="cat-table-date">
                          <FaCalendarAlt className="cat-date-icon" />
                          {new Date(cat.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td>
                          <div className="cat-table-actions">
                            <button
                              className="cat-btn-icon cat-btn-edit"
                              onClick={() => openEditModal(cat)}
                              title="Sửa"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="cat-btn-icon cat-btn-delete"
                              onClick={() => handleDelete(cat.id, cat.name)}
                              title="Xóa"
                            >
                              <FaTrash />
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
        </div>

        {/* Modal */}
        {showModal && (
          <div className="cat-modal-overlay" onClick={closeModal}>
            <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
              <div className="cat-modal-header">
                <h2 className="cat-modal-title">
                  {editMode ? (
                    <><FaEdit /> Chỉnh sửa danh mục</>
                  ) : (
                    <><FaPlus /> Thêm danh mục mới</>
                  )}
                </h2>
                <button className="cat-modal-close" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="cat-modal-body">
                  <div className="cat-form-group">
                    <label htmlFor="cat-type" className="cat-form-label">
                      Loại danh mục <span className="cat-required">*</span>
                    </label>
                    <select
                      id="cat-type"
                      name="category_type"
                      value={formData.category_type}
                      onChange={handleInputChange}
                      required
                      className="cat-form-control cat-form-select"
                    >
                      <option value="">-- Chọn loại --</option>
                      {Object.entries(CATEGORY_CONFIG).map(([type, config]) => (
                        <option key={type} value={type}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                    <small className="cat-form-hint">
                      Chọn loại danh mục: Tin tức, Thuốc hoặc Bệnh lý
                    </small>
                  </div>

                  <div className="cat-form-group">
                    <label htmlFor="cat-name" className="cat-form-label">
                      Tên danh mục <span className="cat-required">*</span>
                    </label>
                    <input
                      id="cat-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="VD: Thuốc xương khớp, Bệnh tim mạch..."
                      required
                      className="cat-form-control"
                    />
                    <small className="cat-form-hint">
                      Viết hoa chữ cái đầu mỗi từ (VD: Tim Mạch, Nội Khoa)
                    </small>
                  </div>

                  <div className="cat-form-group">
                    <label htmlFor="cat-slug" className="cat-form-label">
                      Slug <small className="cat-text-muted">(URL thân thiện)</small>
                    </label>
                    <input
                      id="cat-slug"
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      placeholder="thuoc-xuong-khop"
                      className="cat-form-control"
                    />
                    <small className="cat-form-hint">
                      Tự động tạo từ tên nếu để trống
                    </small>
                  </div>

                  <div className="cat-form-group">
                    <label htmlFor="cat-desc" className="cat-form-label">Mô tả</label>
                    <textarea
                      id="cat-desc"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Mô tả ngắn về danh mục..."
                      rows="3"
                      className="cat-form-control cat-form-textarea"
                    />
                  </div>
                </div>

                <div className="cat-modal-footer">
                  <button 
                    type="button" 
                    className="cat-btn cat-btn-secondary" 
                    onClick={closeModal}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="cat-btn cat-btn-primary">
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
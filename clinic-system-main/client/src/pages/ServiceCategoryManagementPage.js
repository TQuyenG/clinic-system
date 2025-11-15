// client/src/pages/ServiceCategoryManagementPage.js
import React, { useState, useEffect, useMemo } from 'react';
import serviceCategoryService from '../services/serviceCategoryService';
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaEdit, 
  FaTrashAlt, 
  FaTimes, 
  FaFilter, 
  FaSearch, 
  FaSort, 
  FaSortUp, 
  FaSortDown, 
  FaCheckSquare, 
  FaSquare,
  FaEye, 
  FaEyeSlash, 
  FaRedo, 
  FaImage,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from 'react-icons/fa';
import './ServiceCategoryManagementPage.css';

const ServiceCategoryManagementPage = () => {
  // State chính
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    is_active: true,
  });

  // State upload ảnh
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState('url'); // 'url' hoặc 'file'

  // State filter & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  
  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // State bulk actions
  const [selectedItems, setSelectedItems] = useState([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Tải dữ liệu khi component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Lấy danh sách danh mục từ API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await serviceCategoryService.getAdminServiceCategories();
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách danh mục.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Lọc và sắp xếp dữ liệu
  const filteredCategories = useMemo(() => {
    let filtered = [...categories];

    // Lọc theo từ khóa tìm kiếm
    if (searchTerm) {
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cat =>
        statusFilter === 'active' ? cat.is_active : !cat.is_active
      );
    }

    // Sắp xếp
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'serviceCount') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [categories, searchTerm, statusFilter, sortConfig]);

  // Phân trang
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  // Xử lý sắp xếp
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Icon sắp xếp
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="service-category-mgnt-sort-icon" />;
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="service-category-mgnt-sort-icon service-category-mgnt-active" /> : 
      <FaSortDown className="service-category-mgnt-sort-icon service-category-mgnt-active" />;
  };

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', description: '', image_url: '', is_active: true });
    setCurrentCategory(null);
    setIsEditMode(false);
    setSelectedImage(null);
    setImagePreview('');
    setUploadMode('url');
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (category) => {
    setIsEditMode(true);
    setCurrentCategory({...category}); // Tạo bản sao của category để lưu trữ dữ liệu cũ
    setFormData({
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || '',
      is_active: category.is_active,
    });
    setImagePreview(category.image_url || '');
    setShowModal(true);
  };

  // Đóng modal
  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Xử lý thay đổi select
  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === 'true'
    }));
  };

  // Xử lý upload ảnh
  const handleImageUpload = async (file) => {
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      setUploading(true);
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          image_url: data.imageUrl
        }));
        setImagePreview(data.imageUrl);
        toast.success('Upload ảnh thành công!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast.error('Lỗi khi upload ảnh');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Xử lý chọn file
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước file không được vượt quá 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Xử lý kéo thả file
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect({ target: { files: [file] } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục.');
      return;
    }

    try {
      let response;
      if (isEditMode && currentCategory) {
        // Tạo object chứa những trường đã thay đổi
        const changedFields = {};
        Object.keys(formData).forEach(key => {
          if (formData[key] !== currentCategory[key]) {
            changedFields[key] = formData[key];
          }
        });

        if (Object.keys(changedFields).length === 0) {
          toast.info('Không có thông tin nào được thay đổi.');
          return;
        }

        response = await serviceCategoryService.updateServiceCategory(currentCategory.id, changedFields);
        if (response.data.success) {
          toast.success('Cập nhật danh mục thành công!');
          // Cập nhật lại dữ liệu trong state
          setCategories(categories.map(cat => 
            cat.id === currentCategory.id 
              ? { ...cat, ...changedFields }
              : cat
          ));
        }
      } else {
        response = await serviceCategoryService.createServiceCategory(formData);
        if (response.data.success) {
          toast.success('Tạo danh mục mới thành công!');
          // Thêm danh mục mới vào state
          setCategories([response.data.data, ...categories]);
        }
      }

      handleCloseModal();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra.';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  // Xử lý xóa
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?`)) {
      return;
    }

    try {
      const response = await serviceCategoryService.deleteServiceCategory(id);
      if (response.data.success) {
        toast.success('Xóa danh mục thành công!');
        fetchCategories();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Không thể xóa danh mục.';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  // Xử lý toggle trạng thái
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const response = await serviceCategoryService.updateServiceCategory(id, {
        is_active: !currentStatus
      });
      
      if (response.data.success) {
        toast.success(`${!currentStatus ? 'Kích hoạt' : 'Vô hiệu hóa'} danh mục thành công!`);
        fetchCategories();
      }
    } catch (error) {
      toast.error('Không thể thay đổi trạng thái danh mục.');
      console.error(error);
    }
  };

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(paginatedCategories.map(cat => cat.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một mục để xóa.');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedItems.length} danh mục đã chọn?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedItems.map(id => serviceCategoryService.deleteServiceCategory(id))
      );
      toast.success(`Đã xóa ${selectedItems.length} danh mục.`);
      setSelectedItems([]);
      fetchCategories();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa các danh mục.');
      console.error(error);
    }
  };

  // Pagination handlers
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="service-category-mgnt-page">
        <div className="service-category-mgnt-loading">
          <div className="service-category-mgnt-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="service-category-mgnt-page">
      {/* Header */}
      <div className="service-category-mgnt-header">
        <div className="service-category-mgnt-header-left">
          <h1>Quản lý Danh mục Dịch vụ</h1>
          <span className="service-category-mgnt-count">
            {filteredCategories.length} danh mục
          </span>
        </div>
        <div className="service-category-mgnt-header-right">
          <button 
            className="service-category-mgnt-btn service-category-mgnt-btn-refresh"
            onClick={fetchCategories}
            title="Làm mới"
          >
            <FaRedo />
          </button>
          <button 
            className="service-category-mgnt-btn service-category-mgnt-btn-success" 
            onClick={handleOpenCreateModal}
          >
            <FaPlus /> Thêm danh mục
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="service-category-mgnt-filters">
        <div className="service-category-mgnt-search-box">
          <FaSearch className="service-category-mgnt-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="service-category-mgnt-search-input"
          />
        </div>

        <button
          className="service-category-mgnt-btn service-category-mgnt-btn-secondary"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <FaFilter /> Bộ lọc
        </button>

        {selectedItems.length > 0 && (
          <button
            className="service-category-mgnt-btn service-category-mgnt-btn-danger"
            onClick={handleBulkDelete}
          >
            <FaTrashAlt /> Xóa ({selectedItems.length})
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="service-category-mgnt-advanced-filters">
          <div className="service-category-mgnt-filter-group">
            <label>Trạng thái:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="service-category-mgnt-select"
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm ngưng</option>
            </select>
          </div>

          <button
            className="service-category-mgnt-btn service-category-mgnt-btn-secondary"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setShowAdvancedFilters(false);
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Table */}
      <div className="service-category-mgnt-table-container">
        <table className="service-category-mgnt-table">
          <thead>
            <tr>
              <th className="service-category-mgnt-checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedItems.length === paginatedCategories.length && paginatedCategories.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th onClick={() => handleSort('id')} className="service-category-mgnt-sortable">
                ID {getSortIcon('id')}
              </th>
              <th onClick={() => handleSort('name')} className="service-category-mgnt-sortable">
                Tên danh mục {getSortIcon('name')}
              </th>
              <th>Hình ảnh</th>
              <th onClick={() => handleSort('serviceCount')} className="service-category-mgnt-sortable">
                Số dịch vụ {getSortIcon('serviceCount')}
              </th>
              <th onClick={() => handleSort('is_active')} className="service-category-mgnt-sortable">
                Trạng thái {getSortIcon('is_active')}
              </th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCategories.length > 0 ? (
              paginatedCategories.map(cat => (
                <tr key={cat.id}>
                  <td className="service-category-mgnt-checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(cat.id)}
                      onChange={() => handleSelectItem(cat.id)}
                    />
                  </td>
                  <td data-label="ID">{cat.id}</td>
                  <td data-label="Tên danh mục">
                    <div className="service-category-mgnt-name-cell">
                      <strong>{cat.name}</strong>
                      {cat.description && (
                        <small>{cat.description.substring(0, 50)}...</small>
                      )}
                    </div>
                  </td>
                  <td data-label="Hình ảnh">
                    {cat.image_url ? (
                      <img 
                        src={cat.image_url} 
                        alt={cat.name}
                        className="service-category-mgnt-thumbnail"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/60x40?text=No+Image';
                        }}
                      />
                    ) : (
                      <span className="service-category-mgnt-no-image">Không có ảnh</span>
                    )}
                  </td>
                  <td data-label="Số dịch vụ">
                    <span className="service-category-mgnt-badge service-category-mgnt-badge-info">
                      {cat.serviceCount || 0}
                    </span>
                  </td>
                  <td data-label="Trạng thái">
                    <span 
                      className={`service-category-mgnt-status ${cat.is_active ? 'service-category-mgnt-active' : 'service-category-mgnt-inactive'}`}
                      onClick={() => handleToggleStatus(cat.id, cat.is_active)}
                      title="Click để thay đổi trạng thái"
                    >
                      {cat.is_active ? (
                        <><FaEye /> Hoạt động</>
                      ) : (
                        <><FaEyeSlash /> Tạm ngưng</>
                      )}
                    </span>
                  </td>
                  <td data-label="Hành động" className="service-category-mgnt-action-buttons">
                    <button 
                      onClick={() => handleOpenEditModal(cat)} 
                      className="service-category-mgnt-btn-action service-category-mgnt-btn-edit" 
                      title="Chỉnh sửa"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id, cat.name)} 
                      className="service-category-mgnt-btn-action service-category-mgnt-btn-delete" 
                      title="Xóa"
                    >
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="service-category-mgnt-no-data">
                  <div className="service-category-mgnt-no-data-content">
                    <span className="service-category-mgnt-no-data-icon">📭</span>
                    <p>Không tìm thấy danh mục nào</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="service-category-mgnt-pagination">
          <button 
            className="service-category-mgnt-pagination-btn"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            title="Trang đầu"
          >
            <FaAngleDoubleLeft />
          </button>
          
          <button 
            className="service-category-mgnt-pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            title="Trang trước"
          >
            <FaChevronLeft />
          </button>
          
          <div className="service-category-mgnt-pagination-numbers">
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    className={`service-category-mgnt-pagination-number ${currentPage === page ? 'service-category-mgnt-active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="service-category-mgnt-pagination-dots">...</span>;
              }
              return null;
            })}
          </div>

          <button 
            className="service-category-mgnt-pagination-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Trang sau"
          >
            <FaChevronRight />
          </button>

          <button 
            className="service-category-mgnt-pagination-btn"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Trang cuối"
          >
            <FaAngleDoubleRight />
          </button>

          <span className="service-category-mgnt-pagination-info">
            Trang {currentPage} / {totalPages}
          </span>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="service-category-mgnt-modal-overlay" onClick={handleCloseModal}>
          <div className="service-category-mgnt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="service-category-mgnt-modal-header">
              <h2>
                {isEditMode ? 'Chỉnh sửa Danh mục' : 'Tạo Danh mục mới'}
              </h2>
              <button onClick={handleCloseModal} className="service-category-mgnt-btn-close-modal">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="service-category-mgnt-modal-body">
                {/* Tên danh mục */}
                <div className="service-category-mgnt-form-group">
                  <label htmlFor="name">
                    Tên Danh mục <span className="service-category-mgnt-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="VD: Gói khám sức khỏe tổng quát"
                    required
                    className="service-category-mgnt-input"
                  />
                </div>

                {/* Mô tả */}
                <div className="service-category-mgnt-form-group">
                  <label htmlFor="description">Mô tả ngắn</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Mô tả về nhóm dịch vụ này..."
                    className="service-category-mgnt-textarea"
                  ></textarea>
                </div>

                {/* Upload ảnh */}
                <div className="service-category-mgnt-form-group">
                  <label>Ảnh đại diện</label>
                  <div className="service-category-mgnt-image-upload-group">
                    <div className="service-category-mgnt-upload-tabs">
                      <button
                        type="button"
                        className={`service-category-mgnt-upload-tab ${uploadMode === 'url' ? 'service-category-mgnt-active' : ''}`}
                        onClick={() => setUploadMode('url')}
                      >
                        URL Link
                      </button>
                      <button
                        type="button"
                        className={`service-category-mgnt-upload-tab ${uploadMode === 'file' ? 'service-category-mgnt-active' : ''}`}
                        onClick={() => setUploadMode('file')}
                      >
                        <FaImage /> Upload File
                      </button>
                    </div>

                    {uploadMode === 'url' ? (
                      <input
                        type="url"
                        id="image_url"
                        name="image_url"
                        value={formData.image_url}
                        onChange={handleInputChange}
                        placeholder="https://example.com/image.jpg"
                        className="service-category-mgnt-input"
                      />
                    ) : (
                      <div>
                        <div 
                          className={`service-category-mgnt-upload-area ${uploading ? 'service-category-mgnt-uploading' : ''}`}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onClick={() => document.getElementById('fileInput').click()}
                        >
                          <FaImage className="service-category-mgnt-upload-icon" />
                          <p className="service-category-mgnt-upload-text">
                            {uploading ? 'Đang upload...' : 'Kéo thả ảnh vào đây hoặc click để chọn'}
                          </p>
                          <p className="service-category-mgnt-upload-hint">PNG, JPG, JPEG (tối đa 5MB)</p>
                        </div>
                        <input
                          type="file"
                          id="fileInput"
                          className="service-category-mgnt-file-input"
                          accept="image/*"
                          onChange={handleFileSelect}
                        />
                        {selectedImage && (
                          <button
                            type="button"
                            className="service-category-mgnt-btn service-category-mgnt-btn-primary"
                            onClick={() => handleImageUpload(selectedImage)}
                            disabled={uploading}
                            style={{ marginTop: '0.75rem' }}
                          >
                            {uploading ? 'Đang upload...' : 'Upload ảnh'}
                          </button>
                        )}
                      </div>
                    )}

                    {(formData.image_url || imagePreview) && (
                      <div className="service-category-mgnt-image-preview">
                        <img 
                          src={imagePreview || formData.image_url} 
                          alt="Preview" 
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/200x120?text=Invalid+URL';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Trạng thái */}
                <div className="service-category-mgnt-form-group">
                  <label htmlFor="is_active">Trạng thái</label>
                  <select
                    id="is_active"
                    name="is_active"
                    value={formData.is_active}
                    onChange={handleSelectChange}
                    className="service-category-mgnt-select"
                  >
                    <option value="true">Hoạt động</option>
                    <option value="false">Tạm ngưng</option>
                  </select>
                </div>
              </div>
              
              <div className="service-category-mgnt-modal-footer">
                <button 
                  type="button" 
                  className="service-category-mgnt-btn service-category-mgnt-btn-secondary" 
                  onClick={handleCloseModal}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="service-category-mgnt-btn service-category-mgnt-btn-primary"
                >
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCategoryManagementPage;
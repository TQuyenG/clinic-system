// client/src/pages/ServiceManagementPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import serviceCategoryService from '../services/serviceCategoryService';
import ServiceModal from '../components/service/ServiceModal';
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaEdit, 
  FaTrashAlt, 
  FaEye, 
  FaSearch, 
  FaSortUp, 
  FaSortDown, 
  FaCheckSquare, 
  FaSquare,
  FaEyeSlash, 
  FaDownload, 
  FaRedo, 
  FaTimes,
  FaChartBar,
  FaCheckCircle,
  FaPause,
  FaMoneyBillWave,
  FaFilter,
  FaExclamationTriangle,
  FaUserMd,
  FaThList,
  FaToggleOn,
  FaTag
} from 'react-icons/fa';
import './ServiceManagementPage.css';

const ServiceManagementPage = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(null);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ 
    category: '', 
    status: '',
    priceRange: 'all'
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk Actions States
  const [selectedItems, setSelectedItems] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [services]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch categories
      let categoriesData = [];
      try {
        const catResponse = await serviceCategoryService.getAdminServiceCategories();
        
        if (catResponse.data.success) {
          categoriesData = catResponse.data.data;
          setCategories(categoriesData);
        } else {
          throw new Error(catResponse.data.message || 'Không thể tải danh mục.');
        }
      } catch (catError) {
        throw new Error(`Lỗi tải danh mục: ${catError.response?.data?.message || catError.message}`);
      }

      // Fetch services
      try {
        const servResponse = await api.get('/services/admin/all');
        
        if (servResponse.data.success) {
          const servicesData = servResponse.data.data;
          setServices(servicesData);
        } else {
          throw new Error(servResponse.data.message || 'Không thể tải dịch vụ.');
        }
      } catch (servError) {
        throw new Error(`Lỗi tải dịch vụ: ${servError.response?.data?.message || servError.message}`);
      }
      
    } catch (err) {
      const errorMessage = err.message || 'Lỗi không xác định';
      setError(errorMessage);
      toast.error(errorMessage, {
        position: 'bottom-right',
        autoClose: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = services.length;
    const active = services.filter(s => s.status === 'active').length;
    const inactive = total - active;
    const totalRevenue = services.reduce((sum, s) => sum + (s.price || 0), 0);

    setStats({ total, active, inactive, totalRevenue });
  };

  // Filtered and Sorted Data
  const filteredServices = useMemo(() => {
    let filtered = [...services];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (service.short_description && service.short_description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(service => 
        service.category_id === parseInt(filters.category)
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(service => service.status === filters.status);
    }

    // Price range filter
    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(service => {
        const price = service.price || 0;
        if (filters.priceRange === 'low') return price < 500000;
        if (filters.priceRange === 'medium') return price >= 500000 && price <= 2000000;
        if (filters.priceRange === 'high') return price > 2000000;
        return true;
      });
    }

    // Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key === 'category') {
          aValue = a.category?.name || '';
          bValue = b.category?.name || '';
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [services, searchTerm, filters, sortConfig]);

  // Paginated Data
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredServices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === paginatedServices.length && paginatedServices.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedServices.map(s => s.id));
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedServiceId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (id) => {
    setSelectedServiceId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedServiceId(null);
  };

  const handleModalSuccess = () => {
    fetchInitialData();
    setSelectedItems([]);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa dịch vụ "${name}"?`)) return;

    try {
      await api.delete(`/services/${id}`);
      toast.success('Xóa dịch vụ thành công!', {
        position: 'bottom-right'
      });
      fetchInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa dịch vụ', {
        position: 'bottom-right'
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedItems.length} dịch vụ đã chọn?`)) return;

    try {
      await Promise.all(selectedItems.map(id => api.delete(`/services/${id}`)));
      toast.success(`Đã xóa ${selectedItems.length} dịch vụ!`, {
        position: 'bottom-right'
      });
      setSelectedItems([]);
      fetchInitialData();
    } catch (error) {
      toast.error('Lỗi khi xóa dịch vụ', {
        position: 'bottom-right'
      });
    }
  };

  const handleBulkStatusChange = async (status) => {
    try {
      await Promise.all(
        selectedItems.map(id => 
          api.put(`/services/${id}`, { status })
        )
      );
      toast.success(`Đã cập nhật trạng thái ${selectedItems.length} dịch vụ!`, {
        position: 'bottom-right'
      });
      setSelectedItems([]);
      fetchInitialData();
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái', {
        position: 'bottom-right'
      });
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Tên', 'Danh mục', 'Giá', 'Thời gian', 'Trạng thái'],
      ...filteredServices.map(s => [
        s.id,
        s.name,
        s.category?.name || '',
        s.price,
        s.duration,
        s.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `services_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Xuất dữ liệu thành công!', {
      position: 'bottom-right'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  // Loading State
  if (loading) {
    return (
      <div className="servicemgmt-page">
        <div className="servicemgmt-loading">
          <div className="servicemgmt-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="servicemgmt-page">
        <div className="servicemgmt-error">
          <div className="servicemgmt-error-icon">
            <FaExclamationTriangle />
          </div>
          <h2 className="servicemgmt-error-title">Có lỗi xảy ra</h2>
          <p className="servicemgmt-error-message">{error}</p>
          <button 
            onClick={fetchInitialData}
            className="servicemgmt-btn servicemgmt-btn-primary"
          >
            <FaRedo /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="servicemgmt-page">
      <div className="servicemgmt-container">
        {/* HEADER */}
        <div className="servicemgmt-header">
          <div className="servicemgmt-header-left">
            <h1 className="servicemgmt-title">Quản lý Dịch vụ</h1>
            <p className="servicemgmt-subtitle">
              Quản lý toàn bộ dịch vụ y tế của phòng khám
            </p>
          </div>
          <div>
            <button 
              onClick={handleOpenCreateModal}
              className="servicemgmt-btn servicemgmt-btn-primary"
            >
              <FaPlus /> Thêm dịch vụ
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="servicemgmt-stats-grid">
          <div className="servicemgmt-stat-card servicemgmt-stat-primary">
            <div className="servicemgmt-stat-icon">
              <FaChartBar />
            </div>
            <div className="servicemgmt-stat-content">
              <p className="servicemgmt-stat-label">Tổng dịch vụ</p>
              <h3 className="servicemgmt-stat-value">{stats.total}</h3>
            </div>
          </div>

          <div className="servicemgmt-stat-card servicemgmt-stat-success">
            <div className="servicemgmt-stat-icon">
              <FaCheckCircle />
            </div>
            <div className="servicemgmt-stat-content">
              <p className="servicemgmt-stat-label">Đang hoạt động</p>
              <h3 className="servicemgmt-stat-value">{stats.active}</h3>
            </div>
          </div>

          <div className="servicemgmt-stat-card servicemgmt-stat-warning">
            <div className="servicemgmt-stat-icon">
              <FaPause />
            </div>
            <div className="servicemgmt-stat-content">
              <p className="servicemgmt-stat-label">Tạm ngưng</p>
              <h3 className="servicemgmt-stat-value">{stats.inactive}</h3>
            </div>
          </div>

          <div className="servicemgmt-stat-card servicemgmt-stat-info">
            <div className="servicemgmt-stat-icon">
              <FaMoneyBillWave />
            </div>
            <div className="servicemgmt-stat-content">
              <p className="servicemgmt-stat-label">Tổng giá trị</p>
              <h3 className="servicemgmt-stat-value">{formatCurrency(stats.totalRevenue)}</h3>
            </div>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="servicemgmt-filters-card">
          <div className="servicemgmt-search-box">
            <FaSearch className="servicemgmt-search-icon" />
            <input
              type="text"
              className="servicemgmt-search-input"
              placeholder="Tìm kiếm dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="servicemgmt-clear-search">
                <FaTimes />
              </button>
            )}
          </div>

          <div className="servicemgmt-filters">
            <div className="servicemgmt-filter-item">
              <FaThList className="servicemgmt-filter-icon" />
              <select
                className="servicemgmt-select"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="servicemgmt-filter-item">
              <FaToggleOn className="servicemgmt-filter-icon" />
              <select
                className="servicemgmt-select"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </div>

            <div className="servicemgmt-filter-item">
              <FaTag className="servicemgmt-filter-icon" />
              <select
                className="servicemgmt-select"
                value={filters.priceRange}
                onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
              >
                <option value="all">Tất cả giá</option>
                <option value="low">Dưới 500k</option>
                <option value="medium">500k - 2tr</option>
                <option value="high">Trên 2tr</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="servicemgmt-bulk-actions">
              <span className="servicemgmt-bulk-count">
                Đã chọn {selectedItems.length} dịch vụ
              </span>
              <div className="servicemgmt-bulk-actions-wrapper">
                <button 
                  onClick={() => handleBulkStatusChange('active')}
                  className="servicemgmt-bulk-btn servicemgmt-bulk-activate"
                >
                  <FaCheckCircle /> Kích hoạt
                </button>
                <button 
                  onClick={() => handleBulkStatusChange('inactive')}
                  className="servicemgmt-bulk-btn servicemgmt-bulk-deactivate"
                >
                  <FaEyeSlash /> Tạm ngưng
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="servicemgmt-bulk-btn servicemgmt-bulk-delete"
                >
                  <FaTrashAlt /> Xóa
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="servicemgmt-table-card">
          <div className="servicemgmt-table-header">
            <div className="servicemgmt-table-header-left">
              <span className="servicemgmt-results-count">
                Hiển thị {paginatedServices.length} / {filteredServices.length} dịch vụ
              </span>
            </div>
            <div className="servicemgmt-table-header-right">
              <button 
                className="servicemgmt-btn servicemgmt-btn-secondary"
                onClick={handleExport}
              >
                <FaDownload /> Xuất
              </button>
              <button 
                className="servicemgmt-btn servicemgmt-btn-secondary"
                onClick={fetchInitialData}
              >
                <FaRedo /> Làm mới
              </button>
            </div>
          </div>

          <div className="servicemgmt-table-wrapper">
            <table className="servicemgmt-table">
              <thead>
                <tr>
                  <th className="servicemgmt-th-checkbox">
                    <button onClick={handleSelectAll} className="servicemgmt-checkbox-btn">
                      {selectedItems.length === paginatedServices.length && paginatedServices.length > 0 ? 
                        <FaCheckSquare /> : <FaSquare />}
                    </button>
                  </th>
                  <th onClick={() => handleSort('name')} className="servicemgmt-sortable">
                    Tên dịch vụ {getSortIcon('name')}
                  </th>
                  <th onClick={() => handleSort('category')} className="servicemgmt-sortable">
                    Danh mục {getSortIcon('category')}
                  </th>
                  <th onClick={() => handleSort('price')} className="servicemgmt-sortable servicemgmt-th-price">
                    Giá {getSortIcon('price')}
                  </th>
                  <th onClick={() => handleSort('duration')} className="servicemgmt-sortable servicemgmt-th-duration">
                    Thời gian {getSortIcon('duration')}
                  </th>
                  <th className="servicemgmt-th-doctors">Bác sĩ</th>
                  <th onClick={() => handleSort('status')} className="servicemgmt-sortable servicemgmt-th-status">
                    Trạng thái {getSortIcon('status')}
                  </th>
                  <th className="servicemgmt-th-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedServices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="servicemgmt-no-data">
                      Không tìm thấy dịch vụ nào
                    </td>
                  </tr>
                ) : (
                  paginatedServices.map(service => (
                    <tr key={service.id}>
                      <td>
                        <button 
                          onClick={() => handleSelectItem(service.id)}
                          className="servicemgmt-checkbox-btn"
                        >
                          {selectedItems.includes(service.id) ? 
                            <FaCheckSquare /> : <FaSquare />}
                        </button>
                      </td>
                      <td>
                        <div className="servicemgmt-service-name">
                          {service.image_url && (
                            <img 
                              src={service.image_url} 
                              alt={service.name}
                              className="servicemgmt-service-thumb"
                            />
                          )}
                          <span>{service.name}</span>
                        </div>
                      </td>
                      <td className="servicemgmt-category">{service.category?.name || 'N/A'}</td>
                      <td className="servicemgmt-price">{formatCurrency(service.price)}</td>
                      <td className="servicemgmt-duration">{service.duration} phút</td>
                      <td className="servicemgmt-doctors">
                        {service.doctors && service.doctors.length > 0 ? (
                          <span className="servicemgmt-doctors-badge">
                            <FaUserMd /> {service.doctors.length}
                          </span>
                        ) : (
                          <span className="servicemgmt-no-doctors">Chưa có</span>
                        )}
                      </td>
                      <td>
                        <span className={`servicemgmt-status ${service.status === 'active' ? 'servicemgmt-status-active' : 'servicemgmt-status-inactive'}`}>
                          {service.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td>
                        <div className="servicemgmt-actions">
                          <Link 
                            to={`/dich-vu/${service.id}`}
                            className="servicemgmt-action-btn servicemgmt-action-view"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </Link>
                          <button 
                            onClick={() => handleOpenEditModal(service.id)}
                            className="servicemgmt-action-btn servicemgmt-action-edit"
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDelete(service.id, service.name)}
                            className="servicemgmt-action-btn servicemgmt-action-delete"
                            title="Xóa"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="servicemgmt-pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="servicemgmt-pagination-btn"
              >
                Trước
              </button>
              
              <div className="servicemgmt-pagination-pages">
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
                        onClick={() => setCurrentPage(page)}
                        className={`servicemgmt-pagination-btn ${currentPage === page ? 'servicemgmt-active' : ''}`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="servicemgmt-pagination-dots">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="servicemgmt-pagination-btn"
              >
                Sau
              </button>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="servicemgmt-pagination-select"
              >
                <option value={5}>5 / trang</option>
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      <ServiceModal
        isOpen={isModalOpen}
        serviceId={selectedServiceId}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default ServiceManagementPage;
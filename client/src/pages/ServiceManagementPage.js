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
  FaSort, 
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
  FaUserMd
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

  /**
   * ✅ Fetch data với error logging chi tiết
   */
  const fetchInitialData = async () => {
    console.log('[ServiceManagement] Starting to fetch initial data...');
    setLoading(true);
    setError(null);
    
    try {
      console.log('[ServiceManagement] Fetching categories and services...');
      
      // Fetch categories
      let categoriesData = [];
      try {
        const catResponse = await serviceCategoryService.getAdminServiceCategories();
        console.log('[ServiceManagement] Categories response:', catResponse.data);
        
        if (catResponse.data.success) {
          categoriesData = catResponse.data.data;
          setCategories(categoriesData);
          console.log('[ServiceManagement] ✅ Categories loaded:', categoriesData.length);
        } else {
          console.warn('[ServiceManagement] ⚠️ Categories response not successful:', catResponse.data);
          throw new Error(catResponse.data.message || 'Không thể tải danh mục.');
        }
      } catch (catError) {
        console.error('[ServiceManagement] ❌ Error loading categories:', {
          message: catError.message,
          response: catError.response?.data,
          status: catError.response?.status
        });
        throw new Error(`Lỗi tải danh mục: ${catError.response?.data?.message || catError.message}`);
      }

      // Fetch services - Sử dụng trực tiếp api.get thay vì serviceService
      try {
        console.log('[ServiceManagement] Calling API: GET /services/admin/all');
        const servResponse = await api.get('/services/admin/all');
        console.log('[ServiceManagement] Services response:', servResponse.data);
        
        if (servResponse.data.success) {
          const servicesData = servResponse.data.data;
          setServices(servicesData);
          console.log('[ServiceManagement] ✅ Services loaded:', servicesData.length);
          
          // Log chi tiết từng service
          servicesData.forEach((service, index) => {
            console.log(`[ServiceManagement] Service ${index + 1}:`, {
              id: service.id,
              name: service.name,
              category: service.category?.name,
              doctorIds: service.doctor_ids,
              doctorsCount: service.doctors?.length || 0
            });
          });
        } else {
          console.warn('[ServiceManagement] ⚠️ Services response not successful:', servResponse.data);
          throw new Error(servResponse.data.message || 'Không thể tải dịch vụ.');
        }
      } catch (servError) {
        console.error('[ServiceManagement] ❌ Error loading services:', {
          message: servError.message,
          response: servError.response?.data,
          status: servError.response?.status,
          url: servError.config?.url
        });
        throw new Error(`Lỗi tải dịch vụ: ${servError.response?.data?.message || servError.message}`);
      }

      console.log('[ServiceManagement] ✅ All data loaded successfully');
      
    } catch (err) {
      const errorMessage = err.message || 'Lỗi không xác định';
      console.error('[ServiceManagement] ❌ FATAL ERROR:', {
        message: errorMessage,
        stack: err.stack
      });
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      console.log('[ServiceManagement] Loading completed');
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

  // Pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const handleSelectAll = () => {
    if (selectedItems.length === paginatedServices.length && paginatedServices.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(paginatedServices.map(s => s.id));
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ✅ MODAL HANDLERS - ĐÃ CẬP NHẬT
  const handleOpenCreateModal = () => {
    console.log('[ServiceManagement] Opening create modal');
    setSelectedServiceId(null);
    setIsModalOpen(true); // ✅ Set isModalOpen = true
  };

  const handleOpenEditModal = (serviceId) => {
    console.log('[ServiceManagement] Opening edit modal for service:', serviceId);
    setSelectedServiceId(serviceId);
    setIsModalOpen(true); // ✅ Set isModalOpen = true
  };

  const handleCloseModal = () => {
    console.log('[ServiceManagement] Closing modal');
    setIsModalOpen(false);
    setSelectedServiceId(null);
  };

  const handleModalSuccess = () => {
    console.log('[ServiceManagement] Modal success, reloading data...');
    fetchInitialData();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/services/${id}`);
      toast.success('Xóa dịch vụ thành công!');
      fetchInitialData();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa dịch vụ');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một dịch vụ');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedItems.length} dịch vụ đã chọn?`)) {
      return;
    }

    try {
      await Promise.all(selectedItems.map(id => api.delete(`/services/${id}`)));
      toast.success(`Đã xóa ${selectedItems.length} dịch vụ thành công!`);
      setSelectedItems([]);
      fetchInitialData();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Có lỗi xảy ra khi xóa dịch vụ');
    }
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedItems.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một dịch vụ');
      return;
    }

    try {
      await Promise.all(
        selectedItems.map(id =>
          api.put(`/services/${id}`, { status })
        )
      );
      toast.success(`Đã cập nhật trạng thái cho ${selectedItems.length} dịch vụ!`);
      setSelectedItems([]);
      fetchInitialData();
    } catch (error) {
      console.error('Bulk status change error:', error);
      toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Tên dịch vụ', 'Danh mục', 'Giá', 'Thời gian', 'Trạng thái'].join(','),
      ...filteredServices.map(s =>
        [s.id, s.name, s.category?.name || 'N/A', s.price, s.duration, s.status].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `services-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="servicemgmt-loading">
        <div className="servicemgmt-spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="servicemgmt-error">
        <FaExclamationTriangle />
        <h2>Lỗi khi tải dữ liệu</h2>
        <p>{error}</p>
        <button onClick={fetchInitialData} className="servicemgmt-btn servicemgmt-btn-primary">
          <FaRedo /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="servicemgmt-page">
      <div className="servicemgmt-container">
        {/* HEADER */}
        <div className="servicemgmt-header">
          <div className="servicemgmt-header-left">
            <h1>Quản lý Dịch vụ</h1>
            <p className="servicemgmt-subtitle">
              Quản lý tất cả dịch vụ y tế của hệ thống
            </p>
          </div>
          <div className="servicemgmt-header-right">
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
          <div className="servicemgmt-stat-card">
            <div className="servicemgmt-stat-icon servicemgmt-stat-total">
              <FaChartBar />
            </div>
            <div className="servicemgmt-stat-info">
              <span className="servicemgmt-stat-label">Tổng dịch vụ</span>
              <span className="servicemgmt-stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="servicemgmt-stat-card">
            <div className="servicemgmt-stat-icon servicemgmt-stat-active">
              <FaCheckCircle />
            </div>
            <div className="servicemgmt-stat-info">
              <span className="servicemgmt-stat-label">Đang hoạt động</span>
              <span className="servicemgmt-stat-value">{stats.active}</span>
            </div>
          </div>

          <div className="servicemgmt-stat-card">
            <div className="servicemgmt-stat-icon servicemgmt-stat-inactive">
              <FaPause />
            </div>
            <div className="servicemgmt-stat-info">
              <span className="servicemgmt-stat-label">Tạm ngưng</span>
              <span className="servicemgmt-stat-value">{stats.inactive}</span>
            </div>
          </div>

          <div className="servicemgmt-stat-card">
            <div className="servicemgmt-stat-icon servicemgmt-stat-revenue">
              <FaMoneyBillWave />
            </div>
            <div className="servicemgmt-stat-info">
              <span className="servicemgmt-stat-label">Tổng giá trị</span>
              <span className="servicemgmt-stat-value">{formatCurrency(stats.totalRevenue)}</span>
            </div>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="servicemgmt-filters-card">
          <div className="servicemgmt-search-box">
            <FaSearch />
            <input
              type="text"
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
            <div className="servicemgmt-filter-group">
              <FaFilter />
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="servicemgmt-filter-group">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
            </div>

            <div className="servicemgmt-filter-group">
              <select
                value={filters.priceRange}
                onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
              >
                <option value="all">Tất cả giá</option>
                <option value="low">Dưới 500k</option>
                <option value="medium">500k - 2tr</option>
                <option value="high">Trên 2tr</option>
              </select>
            </div>

            {(filters.category || filters.status || filters.priceRange !== 'all') && (
              <button
                onClick={() => setFilters({ category: '', status: '', priceRange: 'all' })}
                className="servicemgmt-clear-filters"
              >
                <FaTimes /> Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* BULK ACTIONS */}
        {selectedItems.length > 0 && (
          <div className="servicemgmt-bulk-actions">
            <span className="servicemgmt-bulk-selected">
              Đã chọn: <strong>{selectedItems.length}</strong> dịch vụ
            </span>
            <div className="servicemgmt-bulk-buttons">
              <button onClick={() => handleBulkStatusChange('active')}>
                <FaCheckCircle /> Kích hoạt
              </button>
              <button onClick={() => handleBulkStatusChange('inactive')}>
                <FaEyeSlash /> Tạm ngưng
              </button>
              <button onClick={handleBulkDelete} className="servicemgmt-bulk-delete">
                <FaTrashAlt /> Xóa
              </button>
            </div>
          </div>
        )}

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

      {/* MODAL - ✅ UPDATED: Truyền đúng prop isOpen */}
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
// client/src/components/common/consultation/ConsultationPackageManagement.js
// ✅ ĐÃ SỬA LỖI (FIXED FULL CODE)

import React, { useState, useEffect, useCallback } from 'react';
// SỬA LỖI: Đường dẫn service đúng
import consultationService from '../../services/consultationService';
import { 
  FaCog, 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaEye, 
  FaPlus,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash
} from 'react-icons/fa';
// Import CSS mới
import './ConsultationPackageManagement.css';

export const ConsultationPackageManagement = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState({});

  // SỬA LỖI 1: State khởi tạo cho Logic B
  const [createData, setCreateData] = useState({
    package_name: '',
    description: '',
    package_type: 'chat',
    duration_minutes: 30,
    price: 100000,
    notes: '',
    is_active: true
  });
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all' // Sẽ sửa filter này để dùng package_type
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        is_active: filters.status === 'all' ? undefined : filters.status === 'active',
        package_type: filters.type === 'all' ? undefined : filters.type
      };
      
      const response = await consultationService.getAllPackages(params);
      console.log('API response:', response.data); 
      
      if (response.data.success) {
        const packagesData = response.data.data.packages || [];
        setPackages(packagesData);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total,
          totalPages: response.data.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      alert('❌ Lỗi khi tải danh sách gói dịch vụ');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleCreatePackage = async () => {
    try {
      if (!createData.package_name) {
        alert('❌ Vui lòng nhập tên gói dịch vụ');
        return;
      }

      // SỬA LỖI 2: Dùng logic B (đã sửa ở lượt trước)
      if (!createData.package_type) {
         alert('❌ Vui lòng chọn hình thức tư vấn');
         return;
      }

      // SỬA LỖI 3: Phải dùng `createData`, không phải `editData`
      const dataToSend = {
        package_name: createData.package_name,
        description: createData.description,
        package_type: createData.package_type,
        duration_minutes: parseInt(createData.duration_minutes),
        price: parseFloat(createData.price) || 0,
        notes: createData.notes,
        is_active: true
      };

      console.log('📤 Sending create package data:', dataToSend);

      const response = await consultationService.createPackage(dataToSend);
      
      if (response.data.success) {
        alert('✅ Tạo gói dịch vụ mới thành công!');
        setShowCreateModal(false);
        resetCreateForm();
        fetchPackages();
      }
    } catch (error) {
      console.error('Error creating package:', error);
      alert('❌ Lỗi khi tạo gói dịch vụ: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdatePackage = async () => {
    try {
      if (!editData.package_name) {
        alert('❌ Vui lòng nhập tên gói dịch vụ');
        return;
      }
      
      // SỬA LỖI 4: Xóa bỏ kiểm tra allow_chat (Logic A)

      // SỬA LỖI 5: Gửi đúng data Logic B
      const dataToSend = {
        package_name: editData.package_name,
        description: editData.description,
        package_type: editData.package_type,
        duration_minutes: parseInt(editData.duration_minutes),
        price: parseFloat(editData.price) || 0,
        notes: editData.notes,
        is_active: editData.is_active
      };

      console.log('📤 Sending update package data:', dataToSend); 

      const response = await consultationService.updatePackage(selectedPackage.id, dataToSend);
      
      if (response.data.success) {
        alert('✅ Cập nhật gói dịch vụ thành công!');
        setShowEditModal(false);
        fetchPackages();
      }
    } catch (error) {
      console.error('Error updating package:', error);
      alert('❌ Lỗi khi cập nhật: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeletePackage = async (pkg) => {
    if (!window.confirm(`⚠️ Bạn có chắc muốn xóa gói "${pkg.package_name}"?`)) {
      return;
    }

    try {
      await consultationService.deletePackage(pkg.id);
      alert('✅ Xóa gói dịch vụ thành công!');
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('❌ Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleStatus = async (pkg) => {
    if (!window.confirm(`Bạn có chắc muốn ${pkg.is_active ? 'TẮT' : 'BẬT'} gói dịch vụ này?`)) {
      return;
    }

    try {
      // Gửi toàn bộ data mới, chỉ thay đổi is_active
      await consultationService.updatePackage(pkg.id, {
        package_name: pkg.package_name,
        description: pkg.description,
        package_type: pkg.package_type,
        duration_minutes: pkg.duration_minutes,
        price: pkg.price,
        notes: pkg.notes,
        is_active: !pkg.is_active // <-- Thay đổi
      });
      
      alert(`✅ Đã ${pkg.is_active ? 'tắt' : 'bật'} gói dịch vụ thành công!`);
      fetchPackages();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('❌ Lỗi khi thay đổi trạng thái');
    }
  };

  // SỬA LỖI 6: Dùng state Logic B
  const resetCreateForm = () => {
    setCreateData({
      package_name: '',
      description: '',
      package_type: 'chat',
      duration_minutes: 30,
      price: 100000,
      notes: '',
      is_active: true
    });
  };

  const openEditModal = (pkg) => {
    console.log('Opening EditModal with package:', pkg); // Debug
    setSelectedPackage(pkg);
    
    // SỬA LỖI 7: Dùng state Logic B
    setEditData({
      package_name: pkg.package_name || '',
      description: pkg.description || '',
      package_type: pkg.package_type || 'chat',
      duration_minutes: pkg.duration_minutes || 30,
      price: pkg.price ?? 100000,
      notes: pkg.notes || '',
      is_active: Boolean(pkg.is_active)
    });
    setShowEditModal(true);
  };

  const getFilteredPackages = () => {
    let filtered = [...packages];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(pkg => 
        pkg.package_name?.toLowerCase().includes(searchLower) ||
        pkg.package_code?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(pkg => 
        filters.status === 'active' ? pkg.is_active : !pkg.is_active
      );
    }

    // SỬA LỖI 8: Filter theo package_type (Logic B)
    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.package_type === filters.type);
    }

    return filtered;
  };

  // SỬA LỖI 9: Render stats theo Logic B
  const renderStats = () => {
    const total = pagination.total; // Lấy từ pagination
    const active = packages.filter(p => p.is_active).length; // Tạm tính
    const chatEnabled = packages.filter(p => p.package_type === 'chat').length;
    const videoEnabled = packages.filter(p => p.package_type === 'video').length;

    return (
      <div className="consultation-package-management-stats">
        <div className="consultation-package-management-stat-card">
          <div className="consultation-package-management-stat-icon">📦</div>
          <div className="consultation-package-management-stat-info">
            <div className="consultation-package-management-stat-value">{total}</div>
            <div className="consultation-package-management-stat-label">Tổng gói</div>
          </div>
        </div>
        <div className="consultation-package-management-stat-card consultation-package-management-stat-success">
          <div className="consultation-package-management-stat-icon">✅</div>
          <div className="consultation-package-management-stat-info">
            <div className="consultation-package-management-stat-value">{active}</div>
            <div className="consultation-package-management-stat-label">Đang hoạt động (trang này)</div>
          </div>
        </div>
        <div className="consultation-package-management-stat-card consultation-package-management-stat-info">
          <div className="consultation-package-management-stat-icon">💬</div>
          <div className="consultation-package-management-stat-info">
            <div className="consultation-package-management-stat-value">{chatEnabled}</div>
            <div className="consultation-package-management-stat-label">Gói Chat (trang này)</div>
          </div>
        </div>
        <div className="consultation-package-management-stat-card consultation-package-management-stat-warning">
          <div className="consultation-package-management-stat-icon">📹</div>
          <div className="consultation-package-management-stat-info">
            <div className="consultation-package-management-stat-value">{videoEnabled}</div>
            <div className="consultation-package-management-stat-label">Gói Video (trang này)</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="consultation-package-management-container">
      <div className="consultation-package-management-header">
        <div className="consultation-package-management-header-left">
          <FaCog className="consultation-package-management-header-icon" />
          <h2>Quản lý gói dịch vụ tư vấn</h2>
        </div>
        <button 
          className="consultation-package-management-btn consultation-package-management-btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <FaPlus /> Thêm gói dịch vụ
        </button>
      </div>

      {renderStats()}

      <div className="consultation-package-management-filters">
        <div className="consultation-package-management-search-box">
          <FaSearch className="consultation-package-management-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên gói, mã gói..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="consultation-package-management-filter-input"
          />
        </div>

        <div className="consultation-package-management-filter-group">
          <FaFilter className="consultation-package-management-filter-icon" />
          
          <select 
            value={filters.status} 
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="consultation-package-management-filter-select"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>

          <select 
            value={filters.type} 
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="consultation-package-management-filter-select"
          >
            <option value="all">Tất cả hình thức</option>
            <option value="chat">💬 Chat Realtime</option>
            <option value="video">📹 Video Call</option>
            <option value="offline">🏥 Tại bệnh viện</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="consultation-package-management-loading-container">
          <div className="consultation-package-management-spinner"></div>
          <p>Đang tải danh sách gói dịch vụ...</p>
        </div>
      ) : (
        <>
          <div className="consultation-package-management-table-wrapper">
            <table className="consultation-package-management-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên gói</th>
                  <th>Mã gói</th>
                  <th>Hình thức</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Phí</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? ( // SỬA LỖI: Dùng `packages` thay vì `getFilteredPackages()`
                  <tr>
                    <td colSpan="8" className="consultation-package-management-no-data">
                      <div className="consultation-package-management-no-data-message">
                        <FaTimesCircle />
                        <p>Không tìm thấy gói dịch vụ nào</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg, index) => ( // SỬA LỖI: Dùng `packages`
                    <tr key={pkg.id}>
                      <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                      <td>
                        <div className="consultation-package-management-package-name-cell">
                          <strong>{pkg.package_name}</strong>
                          {pkg.description && (
                            <span className="consultation-package-management-package-desc">{pkg.description}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="consultation-package-management-code-badge">{pkg.package_code}</span>
                      </td>
                      
                      {/* SỬA LỖI 10: Hiển thị Logic B */}
                      <td>
                        <div className="consultation-package-management-service-badges">
                          {pkg.package_type === 'chat' && <span className="consultation-package-management-service-badge consultation-package-management-chat">💬 Chat</span>}
                          {pkg.package_type === 'video' && <span className="consultation-package-management-service-badge consultation-package-management-video">📹 Video</span>}
                          {pkg.package_type === 'offline' && <span className="consultation-package-management-service-badge consultation-package-management-disabled">🏥 Offline</span>}
                        </div>
                      </td>
                      <td>
                        <div className="consultation-package-management-duration-cell">
                          {pkg.duration_minutes} phút
                        </div>
                      </td>
                      
                      <td>
                        <button
                          className={`consultation-package-management-status-toggle ${pkg.is_active ? 'consultation-package-management-active' : 'consultation-package-management-inactive'}`}
                          onClick={() => handleToggleStatus(pkg)}
                        >
                          {pkg.is_active ? (
                            <>
                              <FaCheckCircle /> Hoạt động
                            </>
                          ) : (
                            <>
                              <FaTimesCircle /> Tạm ngưng
                            </>
                          )}
                        </button>
                      </td>
                      
                      {/* SỬA LỖI 11: Hiển thị Logic B */}
                      <td>
                        <div className="consultation-package-management-fee-cell">
                           <div className="consultation-package-management-fee-item">
                             {parseFloat(pkg.price) === 0 ? 'MIỄN PHÍ' : `${parseFloat(pkg.price).toLocaleString()}đ`}
                           </div>
                        </div>
                      </td>
                      
                      <td>
                        <div className="consultation-package-management-action-buttons">
                          <button 
                            className="consultation-package-management-btn-action consultation-package-management-btn-view"
                            onClick={() => {
                              setSelectedPackage(pkg);
                              setShowDetailModal(true);
                            }}
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          <button 
                            className="consultation-package-management-btn-action consultation-package-management-btn-edit"
                            onClick={() => openEditModal(pkg)}
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="consultation-package-management-btn-action consultation-package-management-btn-delete"
                            onClick={() => handleDeletePackage(pkg)}
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

          {pagination.totalPages > 1 && ( // SỬA LỖI: Thêm check
            <div className="consultation-package-management-pagination">
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="consultation-package-management-pagination-btn"
              >
                « Trước
              </button>
              
              <span className="consultation-package-management-pagination-info">
                Trang {pagination.page} / {pagination.totalPages} 
                ({pagination.total} gói)
              </span>
              
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="consultation-package-management-pagination-btn"
              >
                Sau »
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL CHI TIẾT */}
      {showDetailModal && selectedPackage && (
        <DetailModal 
          package={selectedPackage}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* MODAL CHỈNH SỬA */}
      {showEditModal && selectedPackage && (
        <EditModal
          key={selectedPackage.id} // Ép re-render
          package={selectedPackage}
          editData={editData}
          setEditData={setEditData}
          onSave={handleUpdatePackage}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* MODAL TẠO MỚI */}
      {showCreateModal && (
        <CreateModal
          createData={createData}
          setCreateData={setCreateData}
          onSave={handleCreatePackage}
          onClose={() => {
            setShowCreateModal(false);
            resetCreateForm();
          }}
        />
      )}
    </div>
  );
};

// ==================== MODAL CHI TIẾT (Logic B) ====================
const DetailModal = ({ package: pkg, onClose }) => {
  return (
    <div className="consultation-package-management-modal-overlay" onClick={onClose}>
      <div className="consultation-package-management-modal-content consultation-package-management-modal-detail" onClick={(e) => e.stopPropagation()}>
        <div className="consultation-package-management-modal-header">
          <h3>📋 Chi tiết gói dịch vụ</h3>
          <button className="consultation-package-management-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="consultation-package-management-modal-body">
          <div className="consultation-package-management-detail-section">
            <h4>Thông tin cơ bản</h4>
            <div className="consultation-package-management-detail-grid">
              <div className="consultation-package-management-detail-item">
                <label>Tên gói:</label>
                <span>{pkg.package_name}</span>
              </div>
              <div className="consultation-package-management-detail-item">
                <label>Mã gói:</label>
                <span className="consultation-package-management-code-badge">{pkg.package_code}</span>
              </div>
              <div className="consultation-package-management-detail-item">
                <label>Trạng thái:</label>
                <span className={pkg.is_active ? 'consultation-package-management-status-active' : 'consultation-package-management-status-inactive'}>
                  {pkg.is_active ? '✅ Đang hoạt động' : '❌ Tạm ngưng'}
                </span>
              </div>
            </div>
          </div>

          {pkg.description && (
            <div className="consultation-package-management-detail-section">
              <h4>Mô tả</h4>
              <p className="consultation-package-management-notes-text">{pkg.description}</p>
            </div>
          )}

          {/* SỬA LỖI 12: Hiển thị Logic B */}
          <div className="consultation-package-management-detail-section">
            <h4>Cấu hình gói</h4>
            <div className="consultation-package-management-price-table">
              <div className="consultation-package-management-price-row">
                <span>Hình thức:</span>
                <strong>
                  {pkg.package_type === 'chat' && '💬 Chat Realtime'}
                  {pkg.package_type === 'video' && '📹 Video Call'}
                  {pkg.package_type === 'offline' && '🏥 Tại bệnh viện'}
                </strong>
              </div>
              <div className="consultation-package-management-price-row">
                <span>Thời lượng:</span>
                <strong>{pkg.duration_minutes} phút</strong>
              </div>
              <div className="consultation-package-management-price-row">
                <span>Phí:</span>
                <strong className="consultation-package-management-fee-amount">
                  {parseFloat(pkg.price) === 0 ? 'MIỄN PHÍ' : `${parseFloat(pkg.price).toLocaleString()}đ`}
                </strong>
              </div>
            </div>
          </div>

          {pkg.notes && (
            <div className="consultation-package-management-detail-section">
              <h4>Ghi chú</h4>
              <p className="consultation-package-management-notes-text">{pkg.notes}</p>
            </div>
          )}
        </div>
        <div className="consultation-package-management-modal-footer">
          <button className="consultation-package-management-btn consultation-package-management-btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== MODAL CHỈNH SỬA (Logic B) ====================
const EditModal = ({ package: pkg, editData, setEditData, onSave, onClose }) => {
  // Debug state changes
  useEffect(() => {
    console.log('EditModal state:', editData);
  }, [editData]);

  return (
    <div className="consultation-package-management-modal-overlay" onClick={onClose}>
      <div className="consultation-package-management-modal-content consultation-package-management-modal-edit" onClick={(e) => e.stopPropagation()}>
        <div className="consultation-package-management-modal-header">
          <h3>✏️ Chỉnh sửa gói dịch vụ</h3>
          <button className="consultation-package-management-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="consultation-package-management-modal-body">
          {/* SỬA LỖI 13: Thêm Tên gói và Mô tả vào EditModal */}
          <div className="consultation-package-management-form-section">
            <h4>Thông tin cơ bản</h4>
            <div className="consultation-package-management-form-row">
              <div className="consultation-package-management-form-group consultation-package-management-full-width">
                <label className="consultation-package-management-required">Tên gói dịch vụ</label>
                <input
                  type="text"
                  className="consultation-package-management-form-input"
                  placeholder="VD: Tư vấn nhanh 15 phút"
                  value={editData.package_name}
                  onChange={(e) => setEditData(prev => ({ ...prev, package_name: e.target.value }))}
                />
              </div>
              <div className="consultation-package-management-form-group consultation-package-management-full-width">
                <label>Mô tả</label>
                <textarea
                  className="consultation-package-management-form-textarea"
                  placeholder="Mô tả chi tiết về gói dịch vụ"
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                />
              </div>
            </div>
          </div>
          
          <div className="consultation-package-management-form-section">
            <h4>Cấu hình gói</h4>
            <div className="consultation-package-management-form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'flex-end' }}>
              <div className="consultation-package-management-form-group">
                <label className="consultation-package-management-required">Hình thức</label>
                <select
                  className="consultation-package-management-form-input" 
                  value={editData.package_type}
                  onChange={(e) => setEditData(prev => ({ ...prev, package_type: e.target.value }))}
                >
                  <option value="chat">💬 Chat Real-time</option>
                  <option value="video">📹 Video Call</option>
                  <option value="offline">🏥 Tại bệnh viện</option>
                </select>
              </div>

              <div className="consultation-package-management-form-group">
                <label className="consultation-package-management-required">Thời lượng (phút)</label>
                <input
                  type="number"
                  className="consultation-package-management-form-input"
                  value={editData.duration_minutes}
                  onChange={(e) => setEditData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                  min="5"
                  step="5"
                />
              </div>

              <div className="consultation-package-management-form-group">
                <label className="consultation-package-management-required">Giá tiền (VNĐ)</label>
                <input
                  type="number"
                  className="consultation-package-management-form-input"
                  value={editData.price}
                  onChange={(e) => setEditData(prev => ({ ...prev, price: e.target.value }))}
                  min="0"
                  step="10000"
                />
              </div>
            </div>
          </div>
          
          {/* SỬA LỖI 14: Xóa bỏ khối 'createData' trùng lặp */}
          
          <div className="consultation-package-management-form-section">
            <h4>Ghi chú</h4>
            <div className="consultation-package-management-form-group consultation-package-management-full-width">
              <textarea
                className="consultation-package-management-form-textarea"
                placeholder="Ghi chú thêm (nếu có)"
                value={editData.notes || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
              />
            </div>
          </div>
        </div>
        <div className="consultation-package-management-modal-footer">
          <button className="consultation-package-management-btn consultation-package-management-btn-secondary" onClick={onClose}>
            <FaTimes /> Hủy
          </button>
          <button className="consultation-package-management-btn consultation-package-management-btn-primary" onClick={onSave}>
            <FaSave /> Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== MODAL TẠO MỚI (Logic B) ====================
const CreateModal = ({ createData, setCreateData, onSave, onClose }) => {
  return (
    <div className="consultation-package-management-modal-overlay" onClick={onClose}>
      <div className="consultation-package-management-modal-content consultation-package-management-modal-create" onClick={(e) => e.stopPropagation()}>
        <div className="consultation-package-management-modal-header">
          <h3>➕ Thêm gói dịch vụ mới</h3>
          <button className="consultation-package-management-modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="consultation-package-management-modal-body">
          <div className="consultation-package-management-form-section">
            <h4>Thông tin cơ bản</h4>
            <div className="consultation-package-management-form-row">
              <div className="consultation-package-management-form-group consultation-package-management-full-width">
                <label className="consultation-package-management-required">Tên gói dịch vụ</label>
                <input
                  type="text"
                  className="consultation-package-management-form-input"
                  placeholder="VD: Tư vấn nhanh 15 phút"
                  value={createData.package_name}
                  onChange={(e) => setCreateData(prev => ({ ...prev, package_name: e.target.value }))}
                />
              </div>
              <div className="consultation-package-management-form-group consultation-package-management-full-width">
                <label>Mô tả</label>
                <textarea
                  className="consultation-package-management-form-textarea"
                  placeholder="Mô tả chi tiết về gói dịch vụ"
                  value={createData.description}
                  onChange={(e) => setCreateData(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* SỬA LỖI 15: Thay thế giao diện Logic A bằng Logic B */}
          <div className="consultation-package-management-form-section">
            <h4>Cấu hình gói</h4>
            <div className="consultation-package-management-form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'flex-end' }}>
              <div className="consultation-package-management-form-group">
                <label className="consultation-package-management-required">Hình thức</label>
                <select
                  className="consultation-package-management-form-input"
                  value={createData.package_type}
                  onChange={(e) => setCreateData(prev => ({ ...prev, package_type: e.target.value }))}
                >
                  <option value="chat">💬 Chat Real-time</option>
                  <option value="video">📹 Video Call</option>
                  <option value="offline">🏥 Tại bệnh viện</option>
                </select>
              </div>

              <div className="consultation-package-management-form-group">
                <label className="consultation-package-management-required">Thời lượng (phút)</label>
                <input
                  type="number"
                  className="consultation-package-management-form-input"
                  placeholder="30"
                  value={createData.duration_minutes}
                  onChange={(e) => setCreateData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                  min="5"
                  step="5"
                />
              </div>

              <div className="consultation-package-management-form-group">
                <label className="consultation-package-management-required">Giá tiền (VNĐ)</label>
                <input
                  type="number"
                  className="consultation-package-management-form-input"
                  placeholder="100000"
                  value={createData.price}
                  onChange={(e) => setCreateData(prev => ({ ...prev, price: e.target.value }))}
                  min="0"
                  step="10000"
                />
              </div>
            </div>
          </div>

          <div className="consultation-package-management-form-section">
            <h4>Ghi chú</h4>
            <div className="consultation-package-management-form-group consultation-package-management-full-width">
              <textarea
                className="consultation-package-management-form-textarea"
                placeholder="Ghi chú thêm (nếu có)"
                value={createData.notes}
                onChange={(e) => setCreateData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
              />
            </div>
          </div>
        </div>
        <div className="consultation-package-management-modal-footer">
          <button className="consultation-package-management-btn consultation-package-management-btn-secondary" onClick={onClose}>
            <FaTimes /> Hủy
          </button>
          <button className="consultation-package-management-btn consultation-package-management-btn-primary" onClick={onSave}>
            <FaSave /> Tạo gói dịch vụ
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationPackageManagement;
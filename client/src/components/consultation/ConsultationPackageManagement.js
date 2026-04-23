// client/src/components/common/consultation/ConsultationPackageManagement.js

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import consultationService from '../../services/consultationService';
import specialtyService from '../../services/specialtyService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FaCog, FaEdit, FaSave, FaTimes, FaEye, FaPlus, FaSearch, FaFilter, 
  FaCheckCircle, FaTimesCircle, FaTrash, FaBox, FaCommentDots, 
  FaVideo, FaHospital, FaClipboardList, FaExclamationTriangle,
  FaChevronLeft, FaChevronRight, FaInfoCircle, FaUserMd, FaUsers
} from 'react-icons/fa';
import Select from 'react-select';
import './ConsultationPackageManagement.css';

export const ConsultationPackageManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Permission checks
  const hasPermission = (module, permission) => {
    if (isAdmin) return true;
    if (!user?.role_info?.permissions) return false;
    const modulePerms = user.role_info.permissions[module];
    if (!modulePerms) return false;
    return Array.isArray(modulePerms) ? modulePerms.includes(permission) : false;
  };

  const canCreate = isAdmin || hasPermission('consultation_pricing', 'create');
  const canEdit = isAdmin || hasPermission('consultation_pricing', 'edit');
  const canDelete = isAdmin || hasPermission('consultation_pricing', 'delete');
  const canHide = isAdmin || hasPermission('consultation_pricing', 'hide');
  const canSetPrice = isAdmin || hasPermission('consultation_pricing', 'set_price');

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editData, setEditData] = useState({});

  // Thêm state cho doctors
  const [allDoctors, setAllDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  
  // Thêm state cho specialties và filter
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState([]);

  const [createData, setCreateData] = useState({
    package_name: '',
    description: '',
    package_type: 'chat',
    duration_minutes: 30,
    price: 100000,
    notes: '',
    is_active: true,
    doctor_codes: [] // Thêm field doctor_codes
  });
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all'
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
      // Sử dụng toast hoặc custom alert thay vì window.alert để đẹp hơn (tạm thời giữ alert theo logic cũ nhưng bỏ emoji)
      alert('Lỗi khi tải danh sách gói dịch vụ');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchPackages();
    fetchDoctors(); // Load danh sách bác sĩ
    fetchSpecialties(); // Load danh sách chuyên khoa
  }, [fetchPackages]);

  // Hàm load danh sách chuyên khoa
  const fetchSpecialties = async () => {
    try {
      const specRes = await specialtyService.getPublicSpecialties();
      if (specRes.data.success) {
        setSpecialties(specRes.data.specialties || []);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  // Hàm load danh sách bác sĩ
  const fetchDoctors = async () => {
    try {
      const docRes = await axios.get('http://localhost:3001/api/users/doctors/public');
      
      if (docRes.data.success) {
        const rawDoctors = docRes.data.doctors || [];
        const doctorOptions = rawDoctors.map(doc => {
          const specialtyId = doc.specialty_id || null;
          let specialtyName = doc.specialty_name || '';
          if (specialtyName === 'Chưa phân chuyên khoa') {
            specialtyName = '';
          }
          
          return {
            value: doc.code, // Sử dụng code thay vì id
            label: `BS. ${doc.full_name}${specialtyName ? ` - ${specialtyName}` : ''}`,
            code: doc.code,
            full_name: doc.full_name,
            specialtyId: specialtyId,
            specialtyName: specialtyName
          };
        });
        setAllDoctors(doctorOptions);
        setFilteredDoctors(doctorOptions);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  // useEffect để filter doctors theo chuyên khoa
  useEffect(() => {
    if (selectedSpecialtyFilter.length === 0) {
      setFilteredDoctors(allDoctors);
    } else {
      const selectedIds = selectedSpecialtyFilter.map(f => String(f.value));
      const filtered = allDoctors.filter(doc => {
        if (doc.specialtyId === null || doc.specialtyId === undefined) {
          return false;
        }
        return selectedIds.includes(String(doc.specialtyId));
      });
      setFilteredDoctors(filtered);
    }
  }, [selectedSpecialtyFilter, allDoctors]);

  const handleCreatePackage = async () => {
    try {
      if (!createData.package_name) {
        alert('Vui lòng nhập tên gói dịch vụ');
        return;
      }
      if (!createData.package_type) {
         alert('Vui lòng chọn hình thức tư vấn');
         return;
      }

      const dataToSend = {
        package_name: createData.package_name,
        description: createData.description,
        package_type: createData.package_type,
        duration_minutes: parseInt(createData.duration_minutes),
        price: parseFloat(createData.price) || 0,
        notes: createData.notes,
        is_active: true,
        doctor_codes: selectedDoctors.map(d => d.code) // Thêm doctor_codes
      };

      const response = await consultationService.createPackage(dataToSend);
      
      if (response.data.success) {
        alert('Tạo gói dịch vụ mới thành công!');
        setShowCreateModal(false);
        resetCreateForm();
        fetchPackages();
      }
    } catch (error) {
      console.error('Error creating package:', error);
      alert('Lỗi khi tạo gói dịch vụ: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdatePackage = async () => {
    try {
      if (!editData.package_name) {
        alert('Vui lòng nhập tên gói dịch vụ');
        return;
      }
      
      const dataToSend = {
        package_name: editData.package_name,
        description: editData.description,
        package_type: editData.package_type,
        duration_minutes: parseInt(editData.duration_minutes),
        price: parseFloat(editData.price) || 0,
        notes: editData.notes,
        is_active: editData.is_active,
        doctor_codes: selectedDoctors.map(d => d.code) // Thêm doctor_codes
      };

      const response = await consultationService.updatePackage(selectedPackage.id, dataToSend);
      
      if (response.data.success) {
        alert('Cập nhật gói dịch vụ thành công!');
        setShowEditModal(false);
        fetchPackages();
      }
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Lỗi khi cập nhật: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeletePackage = async (pkg) => {
    if (!window.confirm(`Bạn có chắc muốn xóa gói "${pkg.package_name}"?`)) {
      return;
    }

    try {
      await consultationService.deletePackage(pkg.id);
      alert('Xóa gói dịch vụ thành công!');
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleStatus = async (pkg) => {
    // Không dùng confirm mặc định để trải nghiệm mượt hơn, hoặc dùng custom modal
    // Ở đây tạm giữ confirm nhưng bỏ emoji
    if (!window.confirm(`Bạn có chắc muốn ${pkg.is_active ? 'TẮT' : 'BẬT'} gói dịch vụ này?`)) {
      return;
    }

    try {
      await consultationService.updatePackage(pkg.id, {
        ...pkg,
        is_active: !pkg.is_active
      });
      fetchPackages();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Lỗi khi thay đổi trạng thái');
    }
  };

  const resetCreateForm = () => {
    setCreateData({
      package_name: '',
      description: '',
      package_type: 'chat',
      duration_minutes: 30,
      price: 100000,
      notes: '',
      is_active: true,
      doctor_codes: []
    });
    setSelectedDoctors([]); // Reset selected doctors
  };

  const openEditModal = (pkg) => {
    setSelectedPackage(pkg);
    setEditData({
      package_name: pkg.package_name || '',
      description: pkg.description || '',
      package_type: pkg.package_type || 'chat',
      duration_minutes: pkg.duration_minutes || 30,
      price: pkg.price ?? 100000,
      notes: pkg.notes || '',
      is_active: Boolean(pkg.is_active)
    });
    
    // Load selected doctors từ package
    if (pkg.doctor_codes && Array.isArray(pkg.doctor_codes)) {
      const selected = allDoctors.filter(d => pkg.doctor_codes.includes(d.code));
      setSelectedDoctors(selected);
    } else {
      setSelectedDoctors([]);
    }
    
    setShowEditModal(true);
  };

  // Hàm chọn nhanh tất cả bác sĩ đã lọc
  const selectAllFilteredDoctors = () => {
    if (selectedDoctors.length === filteredDoctors.length && filteredDoctors.length > 0) {
      // Nếu đã chọn hết thì bỏ chọn tất cả
      setSelectedDoctors([]);
    } else {
      // Chọn tất cả bác sĩ đã lọc
      setSelectedDoctors(filteredDoctors);
    }
  };

  const renderStats = () => {
    const total = pagination.total;
    const active = packages.filter(p => p.is_active).length;
    const chatEnabled = packages.filter(p => p.package_type === 'chat').length;
    const videoEnabled = packages.filter(p => p.package_type === 'video').length;

    return (
      <div className="cpm-stats">
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrapper cpm-bg-primary">
            <FaBox className="cpm-stat-icon" />
          </div>
          <div className="cpm-stat-info">
            <div className="cpm-stat-value">{total}</div>
            <div className="cpm-stat-label">Tổng gói</div>
          </div>
        </div>
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrapper cpm-bg-success">
            <FaCheckCircle className="cpm-stat-icon" />
          </div>
          <div className="cpm-stat-info">
            <div className="cpm-stat-value">{active}</div>
            <div className="cpm-stat-label">Hoạt động</div>
          </div>
        </div>
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrapper cpm-bg-info">
            <FaCommentDots className="cpm-stat-icon" />
          </div>
          <div className="cpm-stat-info">
            <div className="cpm-stat-value">{chatEnabled}</div>
            <div className="cpm-stat-label">Chat</div>
          </div>
        </div>
        <div className="cpm-stat-card">
          <div className="cpm-stat-icon-wrapper cpm-bg-warning">
            <FaVideo className="cpm-stat-icon" />
          </div>
          <div className="cpm-stat-info">
            <div className="cpm-stat-value">{videoEnabled}</div>
            <div className="cpm-stat-label">Video</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cpm-container">
      <div className="cpm-header">
        <div className="cpm-header-left">
          <FaClipboardList className="cpm-header-icon" />
          <h2>Quản lý gói dịch vụ</h2>
        </div>
        {canCreate && (
          <button 
            className="cpm-btn cpm-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> <span>Thêm mới</span>
          </button>
        )}
      </div>

      {renderStats()}

      <div className="cpm-filters">
        <div className="cpm-search-box">
          <FaSearch className="cpm-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="cpm-input"
          />
        </div>

        <div className="cpm-filter-group">
          <div className="cpm-select-wrapper">
             <FaFilter className="cpm-select-icon"/>
             <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="cpm-select"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
          </div>

          <div className="cpm-select-wrapper">
             <FaCog className="cpm-select-icon"/>
             <select 
                value={filters.type} 
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="cpm-select"
              >
                <option value="all">Tất cả hình thức</option>
                <option value="chat">Chat Realtime</option>
                <option value="video">Video Call</option>
                <option value="offline">Tại bệnh viện</option>
              </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="cpm-loading">
          <div className="cpm-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          <div className="cpm-table-container">
            <div className="cpm-table-wrapper">
              <table className="cpm-table">
                <thead>
                  <tr>
                    <th style={{width: '50px'}}>#</th>
                    <th>Tên gói dịch vụ</th>
                    <th>Mã gói</th>
                    <th>Hình thức</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Chi phí</th>
                    <th style={{textAlign: 'center'}}>Bác sĩ</th>
                    <th style={{textAlign: 'right'}}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="cpm-no-data">
                        <div className="cpm-no-data-content">
                          <FaExclamationTriangle />
                          <p>Không có dữ liệu</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    packages.map((pkg, index) => (
                      <tr key={pkg.id}>
                        <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                        <td>
                          <div className="cpm-cell-primary">
                            <strong>{pkg.package_name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="cpm-code">{pkg.package_code}</span>
                        </td>
                        <td>
                          <div className="cpm-type-badge">
                            {pkg.package_type === 'chat' && <><FaCommentDots className="cpm-text-info"/> <span>Chat</span></>}
                            {pkg.package_type === 'video' && <><FaVideo className="cpm-text-warning"/> <span>Video</span></>}
                            {pkg.package_type === 'offline' && <><FaHospital className="cpm-text-muted"/> <span>Offline</span></>}
                          </div>
                        </td>
                        <td>{pkg.duration_minutes}p</td>
                        <td>
                          {canHide ? (
                            <button
                              className={`cpm-status-badge ${pkg.is_active ? 'cpm-status-active' : 'cpm-status-inactive'}`}
                              onClick={() => handleToggleStatus(pkg)}
                            >
                              {pkg.is_active ? <FaCheckCircle /> : <FaTimesCircle />}
                              <span>{pkg.is_active ? 'Hoạt động' : 'Đã tắt'}</span>
                            </button>
                          ) : (
                            <div className={`cpm-status-badge ${pkg.is_active ? 'cpm-status-active' : 'cpm-status-inactive'}`}>
                              {pkg.is_active ? <FaCheckCircle /> : <FaTimesCircle />}
                              <span>{pkg.is_active ? 'Hoạt động' : 'Đã tắt'}</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="cpm-price">
                             {parseFloat(pkg.price) === 0 ? 'Miễn phí' : `${parseFloat(pkg.price).toLocaleString()}đ`}
                          </div>
                        </td>
                        <td style={{textAlign: 'center'}}>
                          <div className="cpm-doctor-count">
                            <FaUserMd style={{marginRight: '5px', color: '#22c55e'}} />
                            <span>
                              {pkg.doctor_codes && Array.isArray(pkg.doctor_codes) && pkg.doctor_codes.length > 0 
                                ? pkg.doctor_codes.length 
                                : 'Tất cả'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="cpm-actions">
                            <Link to={`/dich-vu?tab=consultation`} className="cpm-btn-icon cpm-text-info" title="Xem">
                              <FaEye />
                            </Link>
                            {canEdit && (
                              <button className="cpm-btn-icon cpm-text-warning" onClick={() => openEditModal(pkg)} title="Sửa">
                                <FaEdit />
                              </button>
                            )}
                            {canDelete && (
                              <button className="cpm-btn-icon cpm-text-danger" onClick={() => handleDeletePackage(pkg)} title="Xóa">
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="cpm-pagination">
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="cpm-page-btn"
              >
                <FaChevronLeft />
              </button>
              
              <span className="cpm-page-info">
                Trang <strong>{pagination.page}</strong> / {pagination.totalPages}
              </span>
              
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="cpm-page-btn"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPackage && (
        <ModalWrapper title="Chi tiết gói dịch vụ" onClose={() => setShowDetailModal(false)}>
          <div className="cpm-detail-grid">
            <div className="cpm-detail-group">
              <label>Tên gói:</label>
              <div>{selectedPackage.package_name}</div>
            </div>
            <div className="cpm-detail-group">
              <label>Mã gói:</label>
              <span className="cpm-code">{selectedPackage.package_code}</span>
            </div>
            <div className="cpm-detail-group">
              <label>Trạng thái:</label>
              <span className={selectedPackage.is_active ? 'cpm-text-success' : 'cpm-text-danger'}>
                {selectedPackage.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
              </span>
            </div>
            <div className="cpm-detail-group full-width">
              <label>Mô tả:</label>
              <div className="cpm-text-block">{selectedPackage.description || 'Không có mô tả'}</div>
            </div>
            <div className="cpm-divider"></div>
            <div className="cpm-detail-row">
               <span>Hình thức:</span>
               <strong>{selectedPackage.package_type.toUpperCase()}</strong>
            </div>
            <div className="cpm-detail-row">
               <span>Thời lượng:</span>
               <strong>{selectedPackage.duration_minutes} phút</strong>
            </div>
            <div className="cpm-detail-row">
               <span>Giá:</span>
               <strong className="cpm-text-primary">
                 {parseFloat(selectedPackage.price).toLocaleString()} VNĐ
               </strong>
            </div>
            {selectedPackage.notes && (
              <div className="cpm-detail-group full-width" style={{marginTop: '10px'}}>
                <label>Ghi chú:</label>
                <div className="cpm-text-block sm">{selectedPackage.notes}</div>
              </div>
            )}
          </div>
          <div className="cpm-modal-footer">
            <button className="cpm-btn cpm-btn-secondary" onClick={() => setShowDetailModal(false)}>Đóng</button>
          </div>
        </ModalWrapper>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPackage && (
        <ModalWrapper title="Chỉnh sửa gói" onClose={() => setShowEditModal(false)}>
          <PackageForm 
            data={editData} 
            setData={setEditData} 
            onSubmit={handleUpdatePackage}
            onCancel={() => setShowEditModal(false)}
            isEdit={true}
            allDoctors={allDoctors}
            selectedDoctors={selectedDoctors}
            setSelectedDoctors={setSelectedDoctors}
            specialties={specialties}
            selectedSpecialtyFilter={selectedSpecialtyFilter}
            setSelectedSpecialtyFilter={setSelectedSpecialtyFilter}
            filteredDoctors={filteredDoctors}
            selectAllFilteredDoctors={selectAllFilteredDoctors}
          />
        </ModalWrapper>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ModalWrapper title="Thêm gói mới" onClose={() => setShowCreateModal(false)}>
          <PackageForm 
            data={createData} 
            setData={setCreateData} 
            onSubmit={handleCreatePackage}
            onCancel={() => { setShowCreateModal(false); resetCreateForm(); }}
            allDoctors={allDoctors}
            selectedDoctors={selectedDoctors}
            setSelectedDoctors={setSelectedDoctors}
            specialties={specialties}
            selectedSpecialtyFilter={selectedSpecialtyFilter}
            setSelectedSpecialtyFilter={setSelectedSpecialtyFilter}
            filteredDoctors={filteredDoctors}
            selectAllFilteredDoctors={selectAllFilteredDoctors}
          />
        </ModalWrapper>
      )}
    </div>
  );
};

// Component con: Form dùng chung (để giảm lặp code)
const PackageForm = ({ 
  data, 
  setData, 
  onSubmit, 
  onCancel, 
  isEdit, 
  allDoctors, 
  selectedDoctors, 
  setSelectedDoctors,
  specialties,
  selectedSpecialtyFilter,
  setSelectedSpecialtyFilter,
  filteredDoctors,
  selectAllFilteredDoctors
}) => (
  <div className="cpm-form">
    <div className="cpm-form-row">
      <div className="cpm-form-group full">
        <label>Tên gói <span className="cpm-req">*</span></label>
        <input 
          className="cpm-input" 
          value={data.package_name} 
          onChange={e => setData({...data, package_name: e.target.value})}
          placeholder="Ví dụ: Tư vấn Online"
        />
      </div>
      <div className="cpm-form-group full">
        <label>Mô tả</label>
        <textarea 
          className="cpm-input cpm-textarea" 
          value={data.description} 
          onChange={e => setData({...data, description: e.target.value})}
          rows="2"
        />
      </div>
    </div>
    <div className="cpm-form-row three-col">
       <div className="cpm-form-group">
         <label>Hình thức <span className="cpm-req">*</span></label>
         <select 
            className="cpm-select"
            value={data.package_type}
            onChange={e => setData({...data, package_type: e.target.value})}
         >
           <option value="chat">Chat</option>
           <option value="video">Video Call</option>
           <option value="offline">Tại viện</option>
         </select>
       </div>
       <div className="cpm-form-group">
         <label>Thời lượng (phút) <span className="cpm-req">*</span></label>
         <input 
            type="number" className="cpm-input"
            value={data.duration_minutes}
            onChange={e => setData({...data, duration_minutes: e.target.value})}
         />
       </div>
       <div className="cpm-form-group">
         <label>Giá (VNĐ)</label>
         <input 
            type="number" className="cpm-input"
            value={data.price}
            onChange={e => setData({...data, price: e.target.value})}
         />
       </div>
    </div>
    
    {/* Bộ lọc chuyên khoa */}
    <div className="cpm-form-group full">
      <label>
        <FaFilter style={{ marginRight: '8px', color: '#22c55e' }} />
        Lọc theo chuyên khoa
      </label>
      <Select
        isMulti
        options={specialties}
        value={selectedSpecialtyFilter}
        onChange={setSelectedSpecialtyFilter}
        placeholder="Chọn chuyên khoa để lọc..."
        noOptionsMessage={() => 'Không tìm thấy chuyên khoa'}
        className="cpm-react-select"
        classNamePrefix="cpm-select"
        styles={{
          control: (base) => ({
            ...base,
            minHeight: '42px',
            borderColor: '#d1d5db',
            '&:hover': { borderColor: '#22c55e' }
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: '#e0f2fe',
            borderRadius: '6px'
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: '#0c4a6e',
            fontWeight: '500'
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: '#0284c7',
            ':hover': { backgroundColor: '#bae6fd', color: '#0369a1' }
          })
        }}
      />
    </div>

    {/* Nút chọn nhanh tất cả bác sĩ đã lọc */}
    {filteredDoctors.length > 0 && (
      <div className="cpm-form-group full" style={{ marginTop: '-8px', marginBottom: '8px' }}>
        <button
          type="button"
          className="cpm-btn cpm-btn-secondary"
          onClick={selectAllFilteredDoctors}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaUsers />
          {selectedDoctors.length === filteredDoctors.length && filteredDoctors.length > 0
            ? 'Bỏ chọn tất cả'
            : `Chọn tất cả đã lọc (${filteredDoctors.length} bác sĩ)`}
        </button>
      </div>
    )}
    
    {/* Phần chọn bác sĩ - giống ServiceModal */}
    <div className="cpm-form-group full">
      <label>
        <FaUserMd style={{ marginRight: '8px', color: '#22c55e' }} />
        Chọn bác sĩ thực hiện
      </label>
      <Select
        isMulti
        options={filteredDoctors}
        value={selectedDoctors}
        onChange={setSelectedDoctors}
        placeholder="Chọn bác sĩ..."
        noOptionsMessage={() => 'Không tìm thấy bác sĩ'}
        className="cpm-react-select"
        classNamePrefix="cpm-select"
        styles={{
          control: (base) => ({
            ...base,
            minHeight: '42px',
            borderColor: '#d1d5db',
            '&:hover': { borderColor: '#22c55e' }
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: '#dcfce7',
            borderRadius: '6px'
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: '#14532d',
            fontWeight: '500'
          }),
          multiValueRemove: (base) => ({
            ...base,
            color: '#16a34a',
            ':hover': { backgroundColor: '#bbf7d0', color: '#15803d' }
          })
        }}
      />
      <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
        {selectedDoctors.length === 0 
          ? 'Nếu không chọn, tất cả bác sĩ đều có thể thực hiện dịch vụ này' 
          : `Đã chọn ${selectedDoctors.length} bác sĩ`}
      </small>
    </div>
    
    <div className="cpm-form-group full">
      <label>Ghi chú nội bộ</label>
      <textarea 
        className="cpm-input cpm-textarea" 
        value={data.notes} 
        onChange={e => setData({...data, notes: e.target.value})}
        rows="2"
      />
    </div>
    <div className="cpm-modal-footer">
      <button className="cpm-btn cpm-btn-secondary" onClick={onCancel}><FaTimes/> Hủy</button>
      <button className="cpm-btn cpm-btn-primary" onClick={onSubmit}><FaSave/> Lưu</button>
    </div>
  </div>
);

// Component con: Modal Wrapper
const ModalWrapper = ({ title, children, onClose }) => (
  <div className="cpm-modal-overlay" onClick={onClose}>
    <div className="cpm-modal-box" onClick={e => e.stopPropagation()}>
      <div className="cpm-modal-header">
        <h3>{title}</h3>
        <button onClick={onClose}><FaTimes /></button>
      </div>
      <div className="cpm-modal-body">
        {children}
      </div>
    </div>
  </div>
);

export default ConsultationPackageManagement;
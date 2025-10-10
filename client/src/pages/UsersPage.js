// client/src/pages/UsersPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  FaUserPlus, 
  FaSearch, 
  FaFilter, 
  FaEdit, 
  FaTrash, 
  FaLock, 
  FaUnlock,
  FaKey,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCheckSquare,
  FaSquare,
  FaFileExcel,
  FaFileCsv,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import './UsersPage.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: '',
    role: '',
    is_active: '',
    is_verified: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 0
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [bulkPassword, setBulkPassword] = useState('');
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    address: '',
    gender: '',
    dob: '',
    role: 'patient',
    specialty_id: ''
  });
  
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchUsers();
    fetchSpecialties();
  }, [pagination.page, pagination.limit, filters, sortConfig]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const res = await axios.get('http://localhost:3001/api/users/search', {
        params,
        ...axiosConfig
      });

      if (res.data.success) {
        let sortedUsers = [...res.data.users];
        
        if (sortConfig.key) {
          sortedUsers.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];
            
            if (sortConfig.key === 'id' || sortConfig.key === 'created_at') {
              aVal = Number(aVal) || aVal;
              bVal = Number(bVal) || bVal;
            }
            
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
        
        setUsers(sortedUsers);
        setPagination(prev => ({
          ...prev,
          total: res.data.total,
          totalPages: res.data.totalPages
        }));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        localStorage.clear();
        navigate('/login');
      } else {
        alert('Lỗi: ' + (error.response?.data?.message || error.message));
      }
      setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/specialties');
      if (res.data.success) {
        setSpecialties(res.data.specialties);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Bạn có chắc muốn ${currentStatus ? 'khóa' : 'mở khóa'} tài khoản này?`)) {
      return;
    }
    try {
      await axios.put(
        `http://localhost:3001/api/users/${userId}/toggle-status`,
        { is_active: !currentStatus },
        axiosConfig
      );
      alert('Cập nhật trạng thái thành công');
      fetchUsers();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      alert('Vui lòng chọn ít nhất một người dùng');
      return;
    }

    if (action === 'delete') {
      if (!window.confirm(`Bạn có chắc muốn xóa ${selectedUsers.length} người dùng? Hành động không thể hoàn tác!`)) {
        return;
      }
      try {
        await Promise.all(selectedUsers.map(id => 
          axios.delete(`http://localhost:3001/api/users/${id}`, axiosConfig)
        ));
        alert('Xóa thành công!');
        setSelectedUsers([]);
        fetchUsers();
      } catch (error) {
        alert('Lỗi: ' + (error.response?.data?.message || error.message));
      }
    } else if (action === 'lock') {
      try {
        await Promise.all(selectedUsers.map(id => 
          axios.put(`http://localhost:3001/api/users/${id}/toggle-status`, { is_active: false }, axiosConfig)
        ));
        alert('Khóa tài khoản thành công!');
        setSelectedUsers([]);
        fetchUsers();
      } catch (error) {
        alert('Lỗi: ' + (error.response?.data?.message || error.message));
      }
    } else if (action === 'unlock') {
      try {
        await Promise.all(selectedUsers.map(id => 
          axios.put(`http://localhost:3001/api/users/${id}/toggle-status`, { is_active: true }, axiosConfig)
        ));
        alert('Mở khóa tài khoản thành công!');
        setSelectedUsers([]);
        fetchUsers();
      } catch (error) {
        alert('Lỗi: ' + (error.response?.data?.message || error.message));
      }
    } else if (action === 'resetPassword') {
      setModalType('bulkPassword');
      setShowModal(true);
    }
  };

  const handleBulkPasswordReset = async () => {
    if (!bulkPassword || bulkPassword.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (!window.confirm(`Đặt mật khẩu mới cho ${selectedUsers.length} tài khoản?`)) {
      return;
    }
    try {
      // Gửi yêu cầu đặt lại mật khẩu cho từng user
      await Promise.all(selectedUsers.map(async (id) => {
        await axios.put(
          `http://localhost:3001/api/users/${id}/reset-password-admin`,
          { new_password: bulkPassword },
          axiosConfig
        );
      }));
      
      alert('Đặt lại mật khẩu thành công!');
      setShowModal(false);
      setBulkPassword('');
      setSelectedUsers([]);
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const openCreateModal = () => {
    setModalType('create');
    setNewUserData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      address: '',
      gender: '',
      dob: '',
      role: 'patient',
      specialty_id: ''
    });
    setShowModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.password) {
      alert('Email và mật khẩu là bắt buộc');
      return;
    }
    try {
      const response = await axios.post(
        'http://localhost:3001/api/users/register',
        newUserData,
        axiosConfig
      );
      if (response.data.success) {
        alert('Tạo người dùng thành công!');
        setShowModal(false);
        fetchUsers();
      }
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (user) => {
    setModalType('edit');
    setEditingUser({ ...user });
    setShowModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updateData = {
        full_name: editingUser.full_name || null,
        phone: editingUser.phone || null,
        address: editingUser.address || null,
        gender: editingUser.gender || null,
        dob: editingUser.dob && editingUser.dob !== 'Invalid date' ? editingUser.dob : null,
        role: editingUser.role,
        specialty_id: editingUser.role === 'doctor' ? editingUser.specialty_id : undefined
      };
      await axios.put(
        `http://localhost:3001/api/users/${editingUser.id}`,
        updateData,
        axiosConfig
      );
      alert('Cập nhật thành công');
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    try {
      await axios.delete(`http://localhost:3001/api/users/${userId}`, axiosConfig);
      alert('Xóa thành công');
      fetchUsers();
    } catch (error) {
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="users-sort-icon" />;
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="users-sort-icon users-sort-active" /> : 
      <FaSortDown className="users-sort-icon users-sort-active" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = users.map(user => ({
      'ID': user.id,
      'Email': user.email,
      'Họ tên': user.full_name || '-',
      'SĐT': user.phone || '-',
      'Địa chỉ': user.address || '-',
      'Giới tính': user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : user.gender === 'other' ? 'Khác' : '-',
      'Ngày sinh': formatDate(user.dob),
      'Vai trò': user.role,
      'Trạng thái': user.is_active ? 'Hoạt động' : 'Khóa',
      'Xác thực': user.is_verified ? 'Đã xác thực' : 'Chưa xác thực',
      'Ngày tạo': formatDate(user.created_at),
      'Đăng nhập': formatDate(user.last_login)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    
    const fileName = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Email', 'Họ tên', 'SĐT', 'Địa chỉ', 'Giới tính', 'Ngày sinh', 'Vai trò', 'Trạng thái', 'Xác thực', 'Ngày tạo', 'Đăng nhập'];
    
    const rows = users.map(user => [
      user.id,
      user.email,
      user.full_name || '-',
      user.phone || '-',
      user.address || '-',
      user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : user.gender === 'other' ? 'Khác' : '-',
      formatDate(user.dob),
      user.role,
      user.is_active ? 'Hoạt động' : 'Khóa',
      user.is_verified ? 'Đã xác thực' : 'Chưa xác thực',
      formatDate(user.created_at),
      formatDate(user.last_login)
    ]);

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="users-page">
      <div className="users-header">
        <div className="users-header-left">
          <h1>Quản lý người dùng</h1>
          <span className="users-count">{pagination.total} người dùng</span>
        </div>
        <div className="users-header-right">
          <button onClick={openCreateModal} className="users-btn users-btn-success">
            <FaUserPlus /> Thêm người dùng
          </button>
          <button onClick={() => navigate('/dashboard')} className="users-btn users-btn-secondary">
            <FaChevronLeft /> Quay lại
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="users-filters">
        <div className="users-search-box">
          <FaSearch className="users-search-icon" />
          <input
            type="text"
            name="keyword"
            placeholder="Tìm kiếm theo email, tên, số điện thoại..."
            value={filters.keyword}
            onChange={handleFilterChange}
            className="users-search-input"
          />
        </div>
        
        <div className="users-filter-header">
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="users-btn users-btn-filter"
          >
            <FaFilter /> Bộ lọc nâng cao {showAdvancedFilters ? <FaChevronUp /> : <FaChevronDown />}
          </button>
          
          {(filters.role || filters.is_active || filters.is_verified) && (
            <button 
              onClick={() => setFilters({ keyword: filters.keyword, role: '', is_active: '', is_verified: '' })} 
              className="users-btn users-btn-clear"
            >
              <FaTimes /> Xóa lọc
            </button>
          )}
        </div>

        {showAdvancedFilters && (
          <div className="users-filter-advanced">
            <div className="users-filter-grid">
              <div className="users-filter-item">
                <label>Vai trò</label>
                <select name="role" value={filters.role} onChange={handleFilterChange} className="users-select">
                  <option value="">Tất cả vai trò</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="doctor">Doctor</option>
                  <option value="patient">Patient</option>
                </select>
              </div>

              <div className="users-filter-item">
                <label>Trạng thái</label>
                <select name="is_active" value={filters.is_active} onChange={handleFilterChange} className="users-select">
                  <option value="">Tất cả trạng thái</option>
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Bị khóa</option>
                </select>
              </div>

              <div className="users-filter-item">
                <label>Xác thực</label>
                <select name="is_verified" value={filters.is_verified} onChange={handleFilterChange} className="users-select">
                  <option value="">Tất cả xác thực</option>
                  <option value="true">Đã xác thực</option>
                  <option value="false">Chưa xác thực</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {selectedUsers.length > 0 && (
          <div className="users-bulk-actions">
            <span className="users-selected-count">
              <FaCheckSquare /> Đã chọn {selectedUsers.length} người dùng
            </span>
            <div className="users-bulk-btns">
              <button onClick={() => handleBulkAction('unlock')} className="users-btn users-btn-sm users-btn-info">
                <FaUnlock /> Mở khóa
              </button>
              <button onClick={() => handleBulkAction('lock')} className="users-btn users-btn-sm users-btn-warning">
                <FaLock /> Khóa
              </button>
              <button onClick={() => handleBulkAction('resetPassword')} className="users-btn users-btn-sm users-btn-primary">
                <FaKey /> Đặt lại MK
              </button>
              <button onClick={() => handleBulkAction('delete')} className="users-btn users-btn-sm users-btn-danger">
                <FaTrash /> Xóa
              </button>
              <button onClick={() => setSelectedUsers([])} className="users-btn users-btn-sm users-btn-secondary">
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        <div className="users-export-actions">
          <button onClick={exportToExcel} className="users-btn users-btn-export users-btn-excel">
            <FaFileExcel /> Xuất Excel
          </button>
          <button onClick={exportToCSV} className="users-btn users-btn-export users-btn-csv">
            <FaFileCsv /> Xuất CSV
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="users-loading">
          <div className="users-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          <div className="users-table-wrapper">
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="users-th-checkbox users-th-sticky">
                      {selectedUsers.length === users.length && users.length > 0 ? 
                        <FaCheckSquare onClick={handleSelectAll} className="users-checkbox-icon" /> :
                        <FaSquare onClick={handleSelectAll} className="users-checkbox-icon" />
                      }
                    </th>
                    <th onClick={() => handleSort('id')} className="users-th-sortable users-th-sticky users-th-id">
                      ID {getSortIcon('id')}
                    </th>
                    <th onClick={() => handleSort('email')} className="users-th-sortable users-th-sticky users-th-email">
                      Email {getSortIcon('email')}
                    </th>
                    <th onClick={() => handleSort('full_name')} className="users-th-sortable">
                      Họ tên {getSortIcon('full_name')}
                    </th>
                    <th>SĐT</th>
                    <th>Địa chỉ</th>
                    <th>Giới tính</th>
                    <th>Ngày sinh</th>
                    <th onClick={() => handleSort('role')} className="users-th-sortable">
                      Vai trò {getSortIcon('role')}
                    </th>
                    <th>Trạng thái</th>
                    <th>Xác thực</th>
                    <th onClick={() => handleSort('created_at')} className="users-th-sortable">
                      Ngày tạo {getSortIcon('created_at')}
                    </th>
                    <th>Đăng nhập</th>
                    <th className="users-th-actions">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="14" className="users-td-empty">
                        Không tìm thấy người dùng nào
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr 
                        key={user.id} 
                        className={selectedUsers.includes(user.id) ? 'users-tr-selected' : ''}
                      >
                        <td className="users-td-sticky">
                          {selectedUsers.includes(user.id) ?
                            <FaCheckSquare onClick={() => handleSelectUser(user.id)} className="users-checkbox-icon users-checkbox-checked" /> :
                            <FaSquare onClick={() => handleSelectUser(user.id)} className="users-checkbox-icon" />
                          }
                        </td>
                        <td className="users-td-id users-td-sticky users-td-sticky-id">{user.id}</td>
                        <td className="users-td-email users-td-sticky users-td-sticky-email">{user.email}</td>
                        <td>{user.full_name || '-'}</td>
                        <td>{user.phone || '-'}</td>
                        <td className="users-td-address">{user.address || '-'}</td>
                        <td>
                          {user.gender === 'male' ? 'Nam' : 
                           user.gender === 'female' ? 'Nữ' : 
                           user.gender === 'other' ? 'Khác' : '-'}
                        </td>
                        <td>{formatDate(user.dob)}</td>
                        <td>
                          <span className={`users-badge users-badge-${user.role}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`users-status ${user.is_active ? 'users-status-active' : 'users-status-inactive'}`}>
                            {user.is_active ? 'Hoạt động' : 'Khóa'}
                          </span>
                        </td>
                        <td>
                          <span className={`users-status ${user.is_verified ? 'users-status-verified' : 'users-status-unverified'}`}>
                            {user.is_verified ? '✓' : '✗'}
                          </span>
                        </td>
                        <td>{formatDate(user.created_at)}</td>
                        <td>{formatDate(user.last_login)}</td>
                        <td className="users-td-actions">
                          <button onClick={() => handleEdit(user)} className="users-btn-icon" title="Sửa">
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(user.id, user.is_active)} 
                            className="users-btn-icon"
                            title={user.is_active ? 'Khóa' : 'Mở khóa'}
                          >
                            {user.is_active ? <FaLock /> : <FaUnlock />}
                          </button>
                          <button onClick={() => handleDelete(user.id)} className="users-btn-icon users-btn-icon-danger" title="Xóa">
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="users-pagination">
            <div className="users-pagination-info">
              Hiển thị {users.length} / {pagination.total} người dùng
            </div>
            <div className="users-pagination-controls">
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                disabled={pagination.page === 1}
                className="users-btn-page"
                title="Trang đầu"
              >
                <FaAngleDoubleLeft />
              </button>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="users-btn-page"
                title="Trang trước"
              >
                <FaChevronLeft />
              </button>
              <span className="users-page-number">
                Trang {pagination.page} / {pagination.totalPages}
              </span>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="users-btn-page"
                title="Trang sau"
              >
                <FaChevronRight />
              </button>
              <button 
                onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                disabled={pagination.page >= pagination.totalPages}
                className="users-btn-page"
                title="Trang cuối"
              >
                <FaAngleDoubleRight />
              </button>
              <select 
                value={pagination.limit} 
                onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="users-limit-select"
              >
                <option value="10">10/trang</option>
                <option value="15">15/trang</option>
                <option value="25">25/trang</option>
                <option value="50">50/trang</option>
                <option value="100">100/trang</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="users-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="users-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <h2>
                {modalType === 'create' && 'Thêm người dùng mới'}
                {modalType === 'edit' && 'Chỉnh sửa người dùng'}
                {modalType === 'bulkPassword' && `Đặt mật khẩu cho ${selectedUsers.length} tài khoản`}
              </h2>
              <button className="users-modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="users-modal-body">
              {modalType === 'create' && (
                <form onSubmit={handleCreateUser}>
                  <div className="users-form-section">
                    <h3 className="users-form-section-title">Thông tin đăng nhập</h3>
                    <div className="users-form-row">
                      <div className="users-form-group">
                        <label>Email <span className="users-required">*</span></label>
                        <input 
                          type="email" 
                          value={newUserData.email} 
                          onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                          required
                          className="users-input"
                        />
                      </div>
                      <div className="users-form-group">
                        <label>Mật khẩu <span className="users-required">*</span></label>
                        <input 
                          type="password" 
                          value={newUserData.password} 
                          onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                          required
                          minLength="6"
                          className="users-input"
                          placeholder="Ít nhất 6 ký tự"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="users-form-section">
                    <h3 className="users-form-section-title">Thông tin cá nhân</h3>
                    <div className="users-form-row">
                      <div className="users-form-group">
                        <label>Họ và tên</label>
                        <input 
                          type="text" 
                          value={newUserData.full_name} 
                          onChange={(e) => setNewUserData({...newUserData, full_name: e.target.value})}
                          className="users-input"
                        />
                      </div>
                      <div className="users-form-group">
                        <label>Số điện thoại</label>
                        <input 
                          type="text" 
                          value={newUserData.phone} 
                          onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                          className="users-input"
                        />
                      </div>
                    </div>
                    <div className="users-form-group">
                      <label>Địa chỉ</label>
                      <input 
                        type="text" 
                        value={newUserData.address} 
                        onChange={(e) => setNewUserData({...newUserData, address: e.target.value})}
                        className="users-input"
                      />
                    </div>
                    <div className="users-form-row">
                      <div className="users-form-group">
                        <label>Giới tính</label>
                        <select 
                          value={newUserData.gender} 
                          onChange={(e) => setNewUserData({...newUserData, gender: e.target.value})}
                          className="users-select"
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="other">Khác</option>
                        </select>
                      </div>
                      <div className="users-form-group">
                        <label>Ngày sinh</label>
                        <input 
                          type="date" 
                          value={newUserData.dob} 
                          onChange={(e) => setNewUserData({...newUserData, dob: e.target.value})}
                          className="users-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="users-form-section">
                    <h3 className="users-form-section-title">Vai trò & Phân quyền</h3>
                    <div className="users-form-row">
                      <div className="users-form-group">
                        <label>Vai trò</label>
                        <select 
                          value={newUserData.role} 
                          onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                          className="users-select"
                        >
                          <option value="patient">Patient</option>
                          <option value="staff">Staff</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      {newUserData.role === 'doctor' && (
                        <div className="users-form-group">
                          <label>Chuyên khoa</label>
                          <select 
                            value={newUserData.specialty_id} 
                            onChange={(e) => setNewUserData({...newUserData, specialty_id: e.target.value})}
                            className="users-select"
                          >
                            <option value="">-- Chọn chuyên khoa --</option>
                            {specialties.map(spec => (
                              <option key={spec.id} value={spec.id}>{spec.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="users-modal-footer">
                    <button type="submit" className="users-btn users-btn-success">
                      <FaUserPlus /> Tạo người dùng
                    </button>
                    <button type="button" onClick={() => setShowModal(false)} className="users-btn users-btn-secondary">
                      <FaTimes /> Hủy
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'edit' && editingUser && (
                <div>
                  <div className="users-form-section">
                    <h3 className="users-form-section-title">Thông tin đăng nhập</h3>
                    <div className="users-form-group">
                      <label>Email</label>
                      <input 
                        type="email" 
                        value={editingUser.email} 
                        disabled 
                        className="users-input users-input-disabled" 
                      />
                    </div>
                  </div>

                  <div className="users-form-section">
                    <h3 className="users-form-section-title">Thông tin cá nhân</h3>
                    <div className="users-form-row">
                      <div className="users-form-group">
                        <label>Họ và tên</label>
                        <input 
                          type="text" 
                          value={editingUser.full_name || ''} 
                          onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                          className="users-input"
                        />
                      </div>
                      <div className="users-form-group">
                        <label>Số điện thoại</label>
                        <input 
                          type="text" 
                          value={editingUser.phone || ''} 
                          onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                          className="users-input"
                        />
                      </div>
                    </div>
                    <div className="users-form-group">
                      <label>Địa chỉ</label>
                      <input 
                        type="text" 
                        value={editingUser.address || ''} 
                        onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                        className="users-input"
                      />
                    </div>
                    <div className="users-form-row">
                      <div className="users-form-group">
                        <label>Giới tính</label>
                        <select 
                          value={editingUser.gender || ''} 
                          onChange={(e) => setEditingUser({...editingUser, gender: e.target.value})}
                          className="users-select"
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                          <option value="other">Khác</option>
                        </select>
                      </div>
                      <div className="users-form-group">
                        <label>Ngày sinh</label>
                        <input 
                          type="date" 
                          value={editingUser.dob ? editingUser.dob.split('T')[0] : ''} 
                          onChange={(e) => setEditingUser({...editingUser, dob: e.target.value})}
                          className="users-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="users-form-section">
                    <h3 className="users-form-section-title">Vai trò & Phân quyền</h3>
                    <div className="users-form-row">
                      <div className="users-form-group">
                        <label>Vai trò</label>
                        <select 
                          value={editingUser.role} 
                          onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                          className="users-select"
                        >
                          <option value="patient">Patient</option>
                          <option value="staff">Staff</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      {editingUser.role === 'doctor' && (
                        <div className="users-form-group">
                          <label>Chuyên khoa</label>
                          <select 
                            value={editingUser.specialty_id || ''} 
                            onChange={(e) => setEditingUser({...editingUser, specialty_id: e.target.value})}
                            className="users-select"
                          >
                            <option value="">-- Chọn chuyên khoa --</option>
                            {specialties.map(spec => (
                              <option key={spec.id} value={spec.id}>{spec.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="users-modal-footer">
                    <button onClick={handleSaveEdit} className="users-btn users-btn-primary">
                      <FaEdit /> Lưu thay đổi
                    </button>
                    <button onClick={() => setShowModal(false)} className="users-btn users-btn-secondary">
                      <FaTimes /> Hủy
                    </button>
                  </div>
                </div>
              )}

              {modalType === 'bulkPassword' && (
                <div>
                  <div className="users-form-section">
                    <div className="users-form-group">
                      <label>Mật khẩu mới <span className="users-required">*</span></label>
                      <input 
                        type="password" 
                        value={bulkPassword} 
                        onChange={(e) => setBulkPassword(e.target.value)}
                        placeholder="Ít nhất 6 ký tự"
                        minLength="6"
                        className="users-input"
                      />
                      <small className="users-form-hint">
                        Mật khẩu này sẽ được áp dụng cho {selectedUsers.length} tài khoản đã chọn
                      </small>
                    </div>
                  </div>
                  <div className="users-modal-footer">
                    <button onClick={handleBulkPasswordReset} className="users-btn users-btn-primary">
                      <FaKey /> Xác nhận đặt lại
                    </button>
                    <button onClick={() => setShowModal(false)} className="users-btn users-btn-secondary">
                      <FaTimes /> Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
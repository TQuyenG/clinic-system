// client/src/pages/UsersPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'edit', 'create', 'bulkPassword'
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
  }, [pagination.page, filters, sortConfig]);

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
        
        // Sắp xếp
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
    if (!window.confirm(`Đặt mật khẩu "${bulkPassword}" cho ${selectedUsers.length} tài khoản?`)) {
      return;
    }
    try {
      // Gọi API reset password cho từng user (cần tạo endpoint mới hoặc dùng update)
      await Promise.all(selectedUsers.map(id => 
        axios.put(`http://localhost:3001/api/users/${id}`, { password: bulkPassword }, axiosConfig)
      ));
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
        ...editingUser,
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
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Quản lý người dùng ({pagination.total})</h1>
        <div className="header-actions">
          <button onClick={openCreateModal} className="btn btn-success">
            + Thêm người dùng
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Quay lại Dashboard
          </button>
        </div>
      </div>

      {/* Bộ lọc nâng cao */}
      <div className="filters-section">
        <div className="filters-row">
          <input
            type="text"
            name="keyword"
            placeholder="🔍 Tìm theo email, tên, SĐT..."
            value={filters.keyword}
            onChange={handleFilterChange}
            className="filter-input"
          />
          
          <select name="role" value={filters.role} onChange={handleFilterChange} className="filter-select">
            <option value="">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="doctor">Doctor</option>
            <option value="patient">Patient</option>
          </select>

          <select name="is_active" value={filters.is_active} onChange={handleFilterChange} className="filter-select">
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Bị khóa</option>
          </select>

          <select name="is_verified" value={filters.is_verified} onChange={handleFilterChange} className="filter-select">
            <option value="">Tất cả xác thực</option>
            <option value="true">Đã xác thực</option>
            <option value="false">Chưa xác thực</option>
          </select>

          <button onClick={() => setFilters({ keyword: '', role: '', is_active: '', is_verified: '' })} className="btn btn-clear">
            Xóa lọc
          </button>
        </div>

        {/* Thao tác hàng loạt */}
        {selectedUsers.length > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">Đã chọn {selectedUsers.length} người dùng</span>
            <button onClick={() => handleBulkAction('lock')} className="btn btn-warning btn-sm">
              🔒 Khóa
            </button>
            <button onClick={() => handleBulkAction('unlock')} className="btn btn-info btn-sm">
              🔓 Mở khóa
            </button>
            <button onClick={() => handleBulkAction('resetPassword')} className="btn btn-primary btn-sm">
              🔑 Đặt lại mật khẩu
            </button>
            <button onClick={() => handleBulkAction('delete')} className="btn btn-danger btn-sm">
              🗑️ Xóa
            </button>
            <button onClick={() => setSelectedUsers([])} className="btn btn-secondary btn-sm">
              Bỏ chọn
            </button>
          </div>
        )}
      </div>

      {/* Bảng danh sách */}
      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th onClick={() => handleSort('id')} className="sortable">
                    ID {getSortIcon('id')}
                  </th>
                  <th onClick={() => handleSort('email')} className="sortable">
                    Email {getSortIcon('email')}
                  </th>
                  <th onClick={() => handleSort('full_name')} className="sortable">
                    Họ tên {getSortIcon('full_name')}
                  </th>
                  <th>SĐT</th>
                  <th onClick={() => handleSort('role')} className="sortable">
                    Vai trò {getSortIcon('role')}
                  </th>
                  <th>Trạng thái</th>
                  <th>Xác thực</th>
                  <th onClick={() => handleSort('created_at')} className="sortable">
                    Ngày tạo {getSortIcon('created_at')}
                  </th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center' }}>Không tìm thấy người dùng</td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className={selectedUsers.includes(user.id) ? 'selected-row' : ''}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </td>
                      <td>{user.id}</td>
                      <td>{user.email}</td>
                      <td>{user.full_name || '-'}</td>
                      <td>{user.phone || '-'}</td>
                      <td>
                        <span className={`badge badge-${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>
                          {user.is_active ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td>
                        <span className={`status ${user.is_verified ? 'verified' : 'unverified'}`}>
                          {user.is_verified ? '✓' : '✗'}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                      <td className="actions">
                        <button onClick={() => handleEdit(user)} className="btn-icon" title="Sửa">
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.is_active)} 
                          className="btn-icon"
                          title={user.is_active ? 'Khóa' : 'Mở khóa'}
                        >
                          {user.is_active ? '🔒' : '🔓'}
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="btn-icon" title="Xóa">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="pagination">
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
              disabled={pagination.page === 1}
              className="btn-page"
            >
              ⏮ Đầu
            </button>
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="btn-page"
            >
              ← Trước
            </button>
            <span className="page-info">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="btn-page"
            >
              Sau →
            </button>
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
              disabled={pagination.page >= pagination.totalPages}
              className="btn-page"
            >
              Cuối ⏭
            </button>
            <select 
              value={pagination.limit} 
              onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
              className="limit-select"
            >
              <option value="10">10 / trang</option>
              <option value="20">20 / trang</option>
              <option value="50">50 / trang</option>
              <option value="100">100 / trang</option>
            </select>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalType === 'create' && 'Thêm người dùng mới'}
                {modalType === 'edit' && 'Chỉnh sửa người dùng'}
                {modalType === 'bulkPassword' && `Đặt mật khẩu cho ${selectedUsers.length} tài khoản`}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            {modalType === 'create' && (
              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label>Email: <span className="required">*</span></label>
                  <input 
                    type="email" 
                    value={newUserData.email} 
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu: <span className="required">*</span></label>
                  <input 
                    type="password" 
                    value={newUserData.password} 
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    required
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label>Họ tên:</label>
                  <input 
                    type="text" 
                    value={newUserData.full_name} 
                    onChange={(e) => setNewUserData({...newUserData, full_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại:</label>
                  <input 
                    type="text" 
                    value={newUserData.phone} 
                    onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Vai trò:</label>
                  <select 
                    value={newUserData.role} 
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                  >
                    <option value="patient">Patient</option>
                    <option value="staff">Staff</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {newUserData.role === 'doctor' && (
                  <div className="form-group">
                    <label>Chuyên khoa:</label>
                    <select 
                      value={newUserData.specialty_id} 
                      onChange={(e) => setNewUserData({...newUserData, specialty_id: e.target.value})}
                    >
                      <option value="">-- Chọn chuyên khoa --</option>
                      {specialties.map(spec => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="modal-actions">
                  <button type="submit" className="btn btn-success">Tạo người dùng</button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Hủy</button>
                </div>
              </form>
            )}

            {modalType === 'edit' && editingUser && (
              <div>
                <div className="form-group">
                  <label>Email:</label>
                  <input type="email" value={editingUser.email} disabled className="input-disabled" />
                </div>
                <div className="form-group">
                  <label>Họ tên:</label>
                  <input 
                    type="text" 
                    value={editingUser.full_name || ''} 
                    onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại:</label>
                  <input 
                    type="text" 
                    value={editingUser.phone || ''} 
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Địa chỉ:</label>
                  <input 
                    type="text" 
                    value={editingUser.address || ''} 
                    onChange={(e) => setEditingUser({...editingUser, address: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Giới tính:</label>
                  <select 
                    value={editingUser.gender || ''} 
                    onChange={(e) => setEditingUser({...editingUser, gender: e.target.value})}
                  >
                    <option value="">Chọn giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Vai trò:</label>
                  <select 
                    value={editingUser.role} 
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  >
                    <option value="patient">Patient</option>
                    <option value="staff">Staff</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {editingUser.role === 'doctor' && (
                  <div className="form-group">
                    <label>Chuyên khoa:</label>
                    <select 
                      value={editingUser.specialty_id || ''} 
                      onChange={(e) => setEditingUser({...editingUser, specialty_id: e.target.value})}
                    >
                      <option value="">-- Chọn chuyên khoa --</option>
                      {specialties.map(spec => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="modal-actions">
                  <button onClick={handleSaveEdit} className="btn btn-primary">Lưu</button>
                  <button onClick={() => setShowModal(false)} className="btn btn-secondary">Hủy</button>
                </div>
              </div>
            )}

            {modalType === 'bulkPassword' && (
              <div>
                <div className="form-group">
                  <label>Mật khẩu mới: <span className="required">*</span></label>
                  <input 
                    type="password" 
                    value={bulkPassword} 
                    onChange={(e) => setBulkPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    minLength="6"
                  />
                  <small>Mật khẩu này sẽ được áp dụng cho {selectedUsers.length} tài khoản đã chọn</small>
                </div>
                <div className="modal-actions">
                  <button onClick={handleBulkPasswordReset} className="btn btn-primary">Xác nhận</button>
                  <button onClick={() => setShowModal(false)} className="btn btn-secondary">Hủy</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
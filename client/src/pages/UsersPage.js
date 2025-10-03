// client/src/pages/UsersPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: '',
    role: '',
    is_active: '',
    is_verified: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users with filters:', filters);
      console.log('Token:', token);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      // Loại bỏ các filter rỗng
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      console.log('Final params:', params);

      const res = await axios.get('http://localhost:3001/api/users/search', {
        params,
        ...axiosConfig
      });

      console.log('Response:', res.data);

      if (res.data.success) {
        setUsers(res.data.users);
        setPagination(prev => ({
          ...prev,
          total: res.data.total,
          totalPages: res.data.totalPages
        }));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Phiên đăng nhập hết hạn hoặc không có quyền. Vui lòng đăng nhập lại.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        alert('Lỗi khi tải danh sách: ' + (error.response?.data?.message || error.message));
      }
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset về trang 1 khi filter
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
      console.error('Error:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (user) => {
    setEditingUser({ ...user });
    setShowModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(
        `http://localhost:3001/api/users/${editingUser.id}`,
        editingUser,
        axiosConfig
      );
      alert('Cập nhật thông tin thành công');
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn xóa người dùng này? Hành động không thể hoàn tác!')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/users/${userId}`, axiosConfig);
      alert('Xóa người dùng thành công');
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      alert('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Quản lý người dùng</h1>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          Quay lại Dashboard
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="filters">
        <input
          type="text"
          name="keyword"
          placeholder="Tìm theo email, tên, SĐT..."
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

        <button onClick={() => setFilters({ keyword: '', role: '', is_active: '', is_verified: '' })} className="btn-clear">
          Xóa bộ lọc
        </button>
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
                  <th>ID</th>
                  <th>Email</th>
                  <th>Họ tên</th>
                  <th>SĐT</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Xác thực</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
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
                        {user.is_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="actions">
                      <button onClick={() => handleEdit(user)} className="btn-edit" title="Sửa">
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user.id, user.is_active)} 
                        className={`btn-toggle ${user.is_active ? 'lock' : 'unlock'}`}
                        title={user.is_active ? 'Khóa' : 'Mở khóa'}
                      >
                        {user.is_active ? '🔒' : '🔓'}
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="btn-delete" title="Xóa">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="pagination">
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="btn-page"
            >
              Trang trước
            </button>
            <span className="page-info">
              Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total} người dùng)
            </span>
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="btn-page"
            >
              Trang sau
            </button>
          </div>
        </>
      )}

      {/* Modal chỉnh sửa */}
      {showModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Chỉnh sửa người dùng</h2>
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
            <div className="modal-actions">
              <button onClick={handleSaveEdit} className="btn-save">Lưu</button>
              <button onClick={() => setShowModal(false)} className="btn-cancel">Hủy</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .users-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .btn-back {
          background: #95a5a6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .filters {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .filter-input, .filter-select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          flex: 1;
          min-width: 200px;
        }
        .btn-clear {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .table-container {
          background: white;
          border-radius: 8px;
          overflow-x: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
        }
        .users-table th {
          background: #34495e;
          color: white;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
        }
        .users-table td {
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }
        .users-table tbody tr:hover {
          background: #f8f9fa;
        }
        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-admin { background: #e74c3c; color: white; }
        .badge-staff { background: #3498db; color: white; }
        .badge-doctor { background: #2ecc71; color: white; }
        .badge-patient { background: #95a5a6; color: white; }
        .status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .status.active { background: #d4edda; color: #155724; }
        .status.inactive { background: #f8d7da; color: #721c24; }
        .status.verified { background: #d1ecf1; color: #0c5460; }
        .status.unverified { background: #fff3cd; color: #856404; }
        .actions {
          display: flex;
          gap: 0.5rem;
        }
        .actions button {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0.25rem;
          transition: transform 0.2s;
        }
        .actions button:hover {
          transform: scale(1.2);
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
        }
        .btn-page {
          background: #3498db;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-page:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        .page-info {
          font-weight: 600;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .input-disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }
        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
        .btn-save {
          background: #2ecc71;
          color: white;
          border: none;
          padding: 0.5rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-cancel {
          background: #95a5a6;
          color: white;
          border: none;
          padding: 0.5rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .loading {
          text-align: center;
          padding: 3rem;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
};

export default UsersPage;
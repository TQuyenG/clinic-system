// client/src/pages/StaffManagementPage.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import './StaffManagementPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StaffManagementPage = () => {
  const [user, setUser] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [assignedDoctorIds, setAssignedDoctorIds] = useState([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([]);

  const [loading, setLoading] = useState({
    staff: false,
    doctors: false,
    assigned: false,
    submit: false
  });

  // ========== INIT ==========
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      toast.error('Vui lòng đăng nhập');
      window.location.href = '/login';
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      
      if (userData.role !== 'admin') {
        toast.error('Bạn không có quyền truy cập trang này');
        window.location.href = '/';
        return;
      }

      setUser(userData);
      loadStaffList();
      loadDoctorsList();
    } catch (error) {
      console.error('Parse user error:', error);
      window.location.href = '/login';
    }
  }, []);

  // ========== LOAD DATA ==========
  const loadStaffList = async () => {
    try {
      setLoading(prev => ({ ...prev, staff: true }));
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${API_URL}/staff`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setStaffList(response.data.data);
      }
    } catch (error) {
      console.error('Load staff error:', error);
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(prev => ({ ...prev, staff: false }));
    }
  };

  const loadDoctorsList = async () => {
    try {
      setLoading(prev => ({ ...prev, doctors: true }));
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${API_URL}/doctors`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setDoctorsList(response.data.data);
      }
    } catch (error) {
      console.error('Load doctors error:', error);
      toast.error('Không thể tải danh sách bác sĩ');
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  };

  const loadAssignedDoctors = async (staffId) => {
    try {
      setLoading(prev => ({ ...prev, assigned: true }));
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${API_URL}/staff/${staffId}/doctors`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const ids = response.data.data.map(d => d.id);
        setAssignedDoctorIds(ids);
        setSelectedDoctorIds(ids);
      }
    } catch (error) {
      console.error('Load assigned doctors error:', error);
      setAssignedDoctorIds([]);
      setSelectedDoctorIds([]);
    } finally {
      setLoading(prev => ({ ...prev, assigned: false }));
    }
  };

  // ========== HANDLERS ==========
  const handleStaffSelect = (staff) => {
    setSelectedStaff(staff);
    loadAssignedDoctors(staff.id);
  };

  const handleDoctorToggle = (doctorId) => {
    setSelectedDoctorIds(prev => {
      if (prev.includes(doctorId)) {
        return prev.filter(id => id !== doctorId);
      } else {
        return [...prev, doctorId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedDoctorIds(doctorsList.map(d => d.id));
  };

  const handleDeselectAll = () => {
    setSelectedDoctorIds([]);
  };

  const handleSaveAssignment = async () => {
    if (!selectedStaff) {
      toast.error('Vui lòng chọn nhân viên');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, submit: true }));
      const token = localStorage.getItem('token');

      const response = await axios.put(
        `${API_URL}/staff/${selectedStaff.id}/assign-doctors`,
        { doctor_ids: selectedDoctorIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Phân công bác sĩ thành công');
        setAssignedDoctorIds(selectedDoctorIds);
        loadStaffList(); // Reload để cập nhật số lượng
      }
    } catch (error) {
      console.error('Assign doctors error:', error);
      toast.error(error.response?.data?.message || 'Không thể phân công bác sĩ');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const handleCancel = () => {
    setSelectedDoctorIds(assignedDoctorIds);
  };

  // ========== HELPERS ==========
  const hasChanges = () => {
    if (selectedDoctorIds.length !== assignedDoctorIds.length) return true;
    return !selectedDoctorIds.every(id => assignedDoctorIds.includes(id));
  };

  const getAssignedCount = (staff) => {
    if (!staff.managed_doctors || !staff.managed_doctors.doctor_ids) return 0;
    return staff.managed_doctors.doctor_ids.length;
  };

  // ========== RENDER ==========
  if (!user) {
    return <div className="loading-page">Đang tải...</div>;
  }

  return (
    <div className="staff-management-page">
      <div className="management-container">
        <h1 className="page-title">Phân công bác sĩ cho nhân viên</h1>

        <div className="management-layout">
          {/* LEFT: STAFF LIST */}
          <div className="staff-panel">
            <div className="panel-header">
              <h2>Danh sách nhân viên</h2>
              <span className="count-badge">{staffList.length}</span>
            </div>

            {loading.staff ? (
              <div className="loading">Đang tải...</div>
            ) : (
              <div className="staff-list">
                {staffList.length === 0 ? (
                  <div className="empty-state">Chưa có nhân viên nào</div>
                ) : (
                  staffList.map(staff => (
                    <div
                      key={staff.id}
                      className={`staff-item ${selectedStaff?.id === staff.id ? 'active' : ''}`}
                      onClick={() => handleStaffSelect(staff)}
                    >
                      <div className="staff-info">
                        <div className="staff-name">
                          👔 {staff.user?.full_name}
                        </div>
                        <div className="staff-code">{staff.code}</div>
                        {staff.department && (
                          <div className="staff-department">{staff.department}</div>
                        )}
                      </div>
                      <div className="assigned-count">
                        {getAssignedCount(staff)} bác sĩ
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* RIGHT: DOCTORS SELECTION */}
          <div className="doctors-panel">
            {!selectedStaff ? (
              <div className="placeholder-state">
                <div className="placeholder-icon">👈</div>
                <p>Chọn nhân viên bên trái để phân công bác sĩ</p>
              </div>
            ) : (
              <>
                <div className="panel-header">
                  <div>
                    <h2>Phân công bác sĩ cho</h2>
                    <p className="selected-staff-name">{selectedStaff.user?.full_name}</p>
                  </div>
                  <div className="selection-actions">
                    <button className="btn-select-action" onClick={handleSelectAll}>
                      Chọn tất cả
                    </button>
                    <button className="btn-select-action" onClick={handleDeselectAll}>
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                {loading.assigned || loading.doctors ? (
                  <div className="loading">Đang tải danh sách bác sĩ...</div>
                ) : (
                  <>
                    <div className="doctors-grid">
                      {doctorsList.map(doctor => (
                        <label key={doctor.id} className="doctor-checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedDoctorIds.includes(doctor.id)}
                            onChange={() => handleDoctorToggle(doctor.id)}
                          />
                          <div className="doctor-info">
                            <div className="doctor-name">
                              👨‍⚕️ BS. {doctor.user?.full_name}
                            </div>
                            <div className="doctor-code">{doctor.code}</div>
                            {doctor.specialty && (
                              <div className="doctor-specialty">
                                {doctor.specialty.name}
                              </div>
                            )}
                            {doctor.experience_years && (
                              <div className="doctor-experience">
                                Kinh nghiệm: {doctor.experience_years} năm
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="selection-summary">
                      Đã chọn: <strong>{selectedDoctorIds.length}</strong> / {doctorsList.length} bác sĩ
                    </div>

                    {hasChanges() && (
                      <div className="action-buttons">
                        <button
                          className="btn-cancel-changes"
                          onClick={handleCancel}
                          disabled={loading.submit}
                        >
                          Hủy thay đổi
                        </button>
                        <button
                          className="btn-save-assignment"
                          onClick={handleSaveAssignment}
                          disabled={loading.submit}
                        >
                          {loading.submit ? 'Đang lưu...' : 'Lưu phân công'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffManagementPage;
// Path: client/src/components/consultation/ConsultationPackageManagement.js
// ============================================================================

import React, { useState, useEffect } from 'react';
import consultationService from '../../services/consultationService';
import { FaCog, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

export const ConsultationPackageManagement = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await consultationService.getAllPackages();
      if (response.data.success) {
        setPackages(response.data.data.packages);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (pkg) => {
    setEditingId(pkg.id);
    setEditData({
      chat_fee: pkg.chat_fee,
      video_fee: pkg.video_fee,
      offline_fee: pkg.offline_fee,
      allow_chat: pkg.allow_chat,
      allow_video: pkg.allow_video,
      allow_offline: pkg.allow_offline
    });
  };

  const saveEdit = async (doctorId) => {
    try {
      await consultationService.updateDoctorPackage(doctorId, editData);
      alert('Cập nhật gói dịch vụ thành công');
      setEditingId(null);
      fetchPackages();
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Lỗi khi cập nhật gói dịch vụ');
    }
  };

  return (
    <div className="package-management">
      <div className="package-header">
        <h3><FaCog /> Quản lý gói dịch vụ</h3>
      </div>

      {loading ? (
        <div className="loading-state">Đang tải...</div>
      ) : (
        <div className="packages-table-container">
          <table className="packages-table">
            <thead>
              <tr>
                <th>Bác sĩ</th>
                <th>Chuyên khoa</th>
                <th>Phí Chat</th>
                <th>Phí Video</th>
                <th>Phí Offline</th>
                <th>Cho phép</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td>{pkg.doctor?.full_name}</td>
                  <td>{pkg.doctor?.Doctor?.Specialty?.name}</td>
                  <td>
                    {editingId === pkg.id ? (
                      <input 
                        type="number"
                        value={editData.chat_fee}
                        onChange={(e) => setEditData({...editData, chat_fee: e.target.value})}
                      />
                    ) : (
                      `${pkg.chat_fee?.toLocaleString()}đ`
                    )}
                  </td>
                  <td>
                    {editingId === pkg.id ? (
                      <input 
                        type="number"
                        value={editData.video_fee}
                        onChange={(e) => setEditData({...editData, video_fee: e.target.value})}
                      />
                    ) : (
                      `${pkg.video_fee?.toLocaleString()}đ`
                    )}
                  </td>
                  <td>
                    {editingId === pkg.id ? (
                      <input 
                        type="number"
                        value={editData.offline_fee}
                        onChange={(e) => setEditData({...editData, offline_fee: e.target.value})}
                      />
                    ) : (
                      `${pkg.offline_fee?.toLocaleString()}đ`
                    )}
                  </td>
                  <td>
                    {pkg.allow_chat && '💬 '}
                    {pkg.allow_video && '📹 '}
                    {pkg.allow_offline && '🏥'}
                  </td>
                  <td>
                    {editingId === pkg.id ? (
                      <>
                        <button 
                          className="btn-icon btn-success"
                          onClick={() => saveEdit(pkg.doctor_id)}
                        >
                          <FaSave />
                        </button>
                        <button 
                          className="btn-icon btn-danger"
                          onClick={() => setEditingId(null)}
                        >
                          <FaTimes />
                        </button>
                      </>
                    ) : (
                      <button 
                        className="btn-icon"
                        onClick={() => startEdit(pkg)}
                      >
                        <FaEdit />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

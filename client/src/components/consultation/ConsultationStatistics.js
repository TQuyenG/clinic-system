// Path: client/src/components/consultation/ConsultationStatistics.js
// ============================================================================

import React, { useState, useEffect } from 'react';
import consultationService from '../../services/consultationService';
import { FaChartBar, FaChartPie, FaChartLine, FaUserMd, FaUser } from 'react-icons/fa';

export const ConsultationStatistics = () => {
  const [overview, setOverview] = useState(null);
  const [doctorStats, setDoctorStats] = useState([]);
  const [patientStats, setPatientStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, doctors, patients

  useEffect(() => {
    fetchStatistics();
  }, [activeTab]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        const response = await consultationService.getSystemStatisticsOverview();
        if (response.data.success) {
          setOverview(response.data.data);
        }
      } else if (activeTab === 'doctors') {
        const response = await consultationService.getDoctorStatistics();
        if (response.data.success) {
          setDoctorStats(response.data.data.doctors);
        }
      } else if (activeTab === 'patients') {
        const response = await consultationService.getPatientStatistics();
        if (response.data.success) {
          setPatientStats(response.data.data.patients);
        }
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="consultation-statistics">
      <div className="statistics-tabs">
        <button 
          className={`stat-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaChartBar /> Tổng quan
        </button>
        <button 
          className={`stat-tab ${activeTab === 'doctors' ? 'active' : ''}`}
          onClick={() => setActiveTab('doctors')}
        >
          <FaUserMd /> Theo bác sĩ
        </button>
        <button 
          className={`stat-tab ${activeTab === 'patients' ? 'active' : ''}`}
          onClick={() => setActiveTab('patients')}
        >
          <FaUser /> Theo bệnh nhân
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Đang tải thống kê...</div>
      ) : (
        <div className="statistics-content">
          {activeTab === 'overview' && overview && (
            <div className="overview-stats">
              <div className="stat-grid">
                <div className="stat-item">
                  <h4>Tổng tư vấn</h4>
                  <p className="stat-number">{overview.total_consultations}</p>
                </div>
                <div className="stat-item">
                  <h4>Doanh thu</h4>
                  <p className="stat-number">{overview.total_revenue?.toLocaleString()}đ</p>
                </div>
                <div className="stat-item">
                  <h4>Tỷ lệ hoàn tiền</h4>
                  <p className="stat-number">{overview.refund_rate}%</p>
                </div>
                <div className="stat-item">
                  <h4>Đánh giá TB</h4>
                  <p className="stat-number">{overview.avg_rating}⭐</p>
                </div>
              </div>

              {/* Charts */}
              <div className="charts-row">
                <div className="chart-container">
                  <h4>Theo trạng thái</h4>
                  {overview.by_status?.map((item) => (
                    <div key={item.status} className="chart-bar">
                      <span>{item.status}</span>
                      <div className="bar" style={{ width: `${item.count * 10}%` }}>
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="chart-container">
                  <h4>Theo loại</h4>
                  {overview.by_type?.map((item) => (
                    <div key={item.consultation_type} className="chart-bar">
                      <span>{item.consultation_type}</span>
                      <div className="bar" style={{ width: `${item.count * 10}%` }}>
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'doctors' && (
            <div className="doctor-statistics">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Bác sĩ</th>
                    <th>Tổng tư vấn</th>
                    <th>Hoàn thành</th>
                    <th>Tỷ lệ hoàn thành</th>
                    <th>Đánh giá TB</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorStats.map((stat) => (
                    <tr key={stat.doctor.id}>
                      <td>
                        <div className="doctor-cell">
                          <img src={stat.doctor.avatar_url || '/default-avatar.png'} alt="" />
                          <span>{stat.doctor.full_name}</span>
                        </div>
                      </td>
                      <td>{stat.total_consultations}</td>
                      <td>{stat.completed}</td>
                      <td>{stat.completion_rate}%</td>
                      <td>{stat.avg_rating}⭐ ({stat.total_reviews})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="patient-statistics">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Bệnh nhân</th>
                    <th>Số buổi tư vấn</th>
                    <th>Gói phổ biến</th>
                    <th>Tổng chi tiêu</th>
                  </tr>
                </thead>
                <tbody>
                  {patientStats.map((stat) => (
                    <tr key={stat.patient_id}>
                      <td>{stat.patient?.full_name}</td>
                      <td>{stat.total_consultations}</td>
                      <td>{stat.most_used_package}</td>
                      <td>{stat.total_spent?.toLocaleString()}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
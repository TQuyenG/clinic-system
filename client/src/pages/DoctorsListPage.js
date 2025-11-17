import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaTimes, FaFilter, FaUserMd, FaAward, FaStethoscope } from 'react-icons/fa';
import './DoctorsListPage.css';

const DoctorsListPage = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    specialty_id: '',
    min_experience: '',
    search: '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({});

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchSpecialties();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [filters]);

  const fetchSpecialties = async () => {
    try {
      // SỬA: Đúng endpoint
      const response = await axios.get(`${API_BASE_URL}/api/specialties`);
      if (response.data.success) {
        setSpecialties(response.data.specialties || []);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v !== '')
      ).toString();

      // SỬA: Sử dụng endpoint public đúng
      const response = await axios.get(`${API_BASE_URL}/api/users/doctors/public?${params}`);

      if (response.data.success) {
        setDoctors(response.data.doctors || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Nếu lỗi, set doctors về mảng rỗng
      setDoctors([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      specialty_id: '',
      min_experience: '',
      search: '',
      page: 1,
      limit: 12
    });
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  if (loading && filters.page === 1) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Đang tải danh sách bác sĩ...</p>
      </div>
    );
  }

  return (
    <div className="doctors-list-page">
      <div className="page-header">
        <h1>Đội Ngũ Bác Sĩ</h1>
        <p className="subtitle">Gặp gỡ những bác sĩ xuất sắc của chúng tôi</p>
      </div>

      <div className="filters-section">
        <div className="filters-header">
          <h3><FaFilter /> Bộ lọc</h3>
          {(filters.specialty_id || filters.min_experience || filters.search) && (
            <button className="btn-clear" onClick={clearFilters}>
              <FaTimes /> Xóa lọc
            </button>
          )}
        </div>

        <div className="filters-grid">
          <div className="filter-item">
            <label>Tìm kiếm</label>
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Tìm theo tên hoặc email..."
              />
            </div>
          </div>

          <div className="filter-item">
            <label>Chuyên khoa</label>
            <select
              name="specialty_id"
              value={filters.specialty_id}
              onChange={handleFilterChange}
            >
              <option value="">Tất cả chuyên khoa</option>
              {specialties.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Kinh nghiệm tối thiểu</label>
            <select
              name="min_experience"
              value={filters.min_experience}
              onChange={handleFilterChange}
            >
              <option value="">Tất cả</option>
              <option value="3">Từ 3 năm</option>
              <option value="5">Từ 5 năm</option>
              <option value="10">Từ 10 năm</option>
              <option value="15">Từ 15 năm</option>
            </select>
          </div>
        </div>
      </div>

      {doctors.length === 0 ? (
        <div className="empty-state">
          <FaUserMd size={64} color="#94a3b8" />
          <h3>Không tìm thấy bác sĩ nào</h3>
          <p>Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác</p>
        </div>
      ) : (
        <>
          <div className="doctors-grid">
            {doctors.map(doctor => (
              <div
                key={doctor.id}
                className="doctor-card"
                onClick={() => navigate(`/bac-si/${doctor.code}`)}
              >
                <div className="doctor-avatar">
                  <img
                    src={doctor.avatar_url}
                    alt={doctor.full_name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200?text=Doctor';
                    }}
                  />
                </div>
                <div className="doctor-info">
                  <h3>{doctor.full_name}</h3>
                  <p className="doctor-code">Mã BS: {doctor.code}</p>
                  <p className="doctor-specialty">
                    <FaStethoscope /> {doctor.specialty_name}
                  </p>
                  {doctor.experience_years > 0 && (
                    <p className="doctor-experience">
                      <FaAward /> {doctor.experience_years} năm kinh nghiệm
                    </p>
                  )}
                  {doctor.bio && (
                    <p className="doctor-bio">{doctor.bio.substring(0, 80)}...</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
              >
                Trước
              </button>

              <div className="page-numbers">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={filters.page === i + 1 ? 'active' : ''}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === pagination.totalPages}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DoctorsListPage;
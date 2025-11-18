import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaTimes, FaFilter, FaUserMd, FaStar, FaStethoscope, FaHospital, FaCalendarAlt } from 'react-icons/fa';
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

      const response = await axios.get(`${API_BASE_URL}/api/users/doctors/public?${params}`);

      if (response.data.success) {
        setDoctors(response.data.doctors || []);
        setPagination(response.data.pagination || {});
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && filters.page === 1) {
    return (
      <div className="doctors-list-page">
        <div className="doctors-list-page__loading">
          <div className="doctors-list-page__spinner"></div>
          <p className="doctors-list-page__loading-text">Đang tải danh sách bác sĩ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doctors-list-page">
      <div className="doctors-list-page__header">
        <h1 className="doctors-list-page__title">Danh sách Bác sĩ - Chuyên gia</h1>
        <p className="doctors-list-page__subtitle">Đội ngũ bác sĩ chuyên môn cao, tận tâm với bệnh nhân</p>
      </div>

      <div className="doctors-list-page__filters">
        <div className="doctors-list-page__filters-header">
          <h3 className="doctors-list-page__filters-title">
            <FaFilter /> Bộ lọc tìm kiếm
          </h3>
          {(filters.specialty_id || filters.min_experience || filters.search) && (
            <button className="doctors-list-page__btn-clear" onClick={clearFilters}>
              <FaTimes /> Xóa lọc
            </button>
          )}
        </div>

        <div className="doctors-list-page__filters-grid">
          <div className="doctors-list-page__filter-item">
            <label className="doctors-list-page__filter-label">Tìm kiếm</label>
            <div className="doctors-list-page__search-box">
              <FaSearch className="doctors-list-page__search-icon" />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Tìm theo tên hoặc email..."
                className="doctors-list-page__filter-input"
              />
            </div>
          </div>

          <div className="doctors-list-page__filter-item">
            <label className="doctors-list-page__filter-label">Chuyên khoa</label>
            <select
              name="specialty_id"
              value={filters.specialty_id}
              onChange={handleFilterChange}
              className="doctors-list-page__filter-select"
            >
              <option value="">Tất cả chuyên khoa</option>
              {specialties.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>

          <div className="doctors-list-page__filter-item">
            <label className="doctors-list-page__filter-label">Kinh nghiệm tối thiểu</label>
            <select
              name="min_experience"
              value={filters.min_experience}
              onChange={handleFilterChange}
              className="doctors-list-page__filter-select"
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
        <div className="doctors-list-page__empty">
          <FaUserMd size={48} color="#cbd5e1" />
          <h3 className="doctors-list-page__empty-title">Không tìm thấy bác sĩ nào</h3>
          <p className="doctors-list-page__empty-text">Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác</p>
        </div>
      ) : (
        <>
          <div className="doctors-list-page__grid">
            {doctors.map(doctor => (
              <div
                key={doctor.id}
                className="doctors-list-page__card"
                onClick={() => navigate(`/bac-si/${doctor.code}`)}
              >
                <div className="doctors-list-page__avatar-wrapper">
                  <div className="doctors-list-page__avatar">
                    <img
                      src={doctor.avatar_url}
                      alt={doctor.full_name}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200?text=Doctor';
                      }}
                    />
                  </div>
                </div>

                <div className="doctors-list-page__info">
                  <h3 className="doctors-list-page__name">{doctor.full_name}</h3>
                  
                  <div className="doctors-list-page__rating">
                    <FaStar />
                    <FaStar />
                    <FaStar />
                    <FaStar />
                    <FaStar />
                    <span className="doctors-list-page__rating-text">5 trên 5</span>
                  </div>

                  <div className="doctors-list-page__detail">
                    <FaStethoscope />
                    <span className="doctors-list-page__detail-text">
                      {doctor.experience_years > 0 
                        ? `Giáo sư, Tiến sĩ,` 
                        : 'Bác sĩ,'}
                    </span>
                  </div>

                  <div className="doctors-list-page__detail">
                    <FaStethoscope />
                    <span className="doctors-list-page__detail-text">
                      {doctor.specialty?.name || doctor.specialty_name || 'Chưa có chuyên khoa'}
                    </span>
                  </div>

                  <div className="doctors-list-page__detail">
                    <FaHospital />
                    <span className="doctors-list-page__detail-text">
                      Bệnh viện Y học cổ truyền
                    </span>
                  </div>

                  <button 
                    className="doctors-list-page__btn-book"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle booking
                    }}
                  >
                    <FaCalendarAlt /> Đăng ký khám
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="doctors-list-page__pagination">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
                className="doctors-list-page__pagination-btn"
              >
                Trước
              </button>

              <div className="doctors-list-page__page-numbers">
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={`doctors-list-page__pagination-btn ${
                      filters.page === i + 1 ? 'doctors-list-page__pagination-btn--active' : ''
                    }`}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === pagination.totalPages}
                className="doctors-list-page__pagination-btn"
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
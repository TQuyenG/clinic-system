import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaTimes, FaStethoscope, FaUsers } from 'react-icons/fa';
import './SpecialtiesListPage.css';

const SpecialtiesListPage = () => {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredSpecialties, setFilteredSpecialties] = useState([]);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchSpecialties();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = specialties.filter(sp =>
        sp.name.toLowerCase().includes(search.toLowerCase()) ||
        sp.description?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredSpecialties(filtered);
    } else {
      setFilteredSpecialties(specialties);
    }
  }, [search, specialties]);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/specialties`);
      
      if (response.data.success) {
        setSpecialties(response.data.specialties || []);
        setFilteredSpecialties(response.data.specialties || []);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
      setSpecialties([]);
      setFilteredSpecialties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearch('');
  };

  if (loading) {
    return (
      <div className="specialties-list-page">
        <div className="specialties-list-page__loading">
          <div className="specialties-list-page__spinner"></div>
          <p className="specialties-list-page__loading-text">Đang tải danh sách chuyên khoa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="specialties-list-page">
      <div className="specialties-list-page__header">
        <h1 className="specialties-list-page__title">Các Chuyên Khoa</h1>
        <p className="specialties-list-page__subtitle">Đa dạng chuyên khoa với đội ngũ bác sĩ chuyên môn cao</p>
      </div>

      <div className="specialties-list-page__search">
        <div className="specialties-list-page__search-header">
          <h3 className="specialties-list-page__search-title">
            <FaSearch /> Tìm kiếm chuyên khoa
          </h3>
        </div>

        <div className="specialties-list-page__search-box">
          <FaSearch className="specialties-list-page__search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm chuyên khoa..."
            className="specialties-list-page__search-input"
          />
          {search && (
            <button className="specialties-list-page__btn-clear" onClick={handleClearSearch}>
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {filteredSpecialties.length === 0 ? (
        <div className="specialties-list-page__empty">
          <FaStethoscope size={48} color="#cbd5e1" />
          <h3 className="specialties-list-page__empty-title">Không tìm thấy chuyên khoa nào</h3>
          <p className="specialties-list-page__empty-text">Thử thay đổi từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="specialties-list-page__grid">
          {filteredSpecialties.map(specialty => (
            <div
              key={specialty.id}
              className="specialties-list-page__card"
              onClick={() => navigate(`/chuyen-khoa/${specialty.slug}`)}
            >
              <div className="specialties-list-page__icon">
                <FaStethoscope />
              </div>
              
              <h3 className="specialties-list-page__name">{specialty.name}</h3>
              
              <p className="specialties-list-page__description">
                {specialty.description || 'Chuyên khoa chất lượng cao với đội ngũ bác sĩ giàu kinh nghiệm'}
              </p>
              
              <div className="specialties-list-page__stats">
                <FaUsers />
                <span>{specialty.doctorCount || 0} bác sĩ</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpecialtiesListPage;
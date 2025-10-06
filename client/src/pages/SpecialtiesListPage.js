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
      const response = await axios.get('http://localhost:3001/api/specialties');
      
      if (response.data.success) {
        setSpecialties(response.data.specialties || []);
        setFilteredSpecialties(response.data.specialties || []);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSpecialtyIcon = () => <FaStethoscope />;

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Đang tải danh sách chuyên khoa...</p>
      </div>
    );
  }

  return (
    <div className="specialties-list-page">
      <div className="page-header">
        <h1>Các Chuyên Khoa</h1>
        <p className="subtitle">Đa dạng chuyên khoa với đội ngũ bác sĩ chuyên môn cao</p>
      </div>

      <div className="search-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm chuyên khoa..."
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch('')}>
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {filteredSpecialties.length === 0 ? (
        <div className="empty-state">
          <FaStethoscope size={64} color="#94a3b8" />
          <h3>Không tìm thấy chuyên khoa nào</h3>
          <p>Thử thay đổi từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="specialties-grid">
          {filteredSpecialties.map(specialty => (
            <div
              key={specialty.id}
              className="specialty-card"
              onClick={() => navigate(`/chuyen-khoa/${specialty.slug}`)}
            >
              <div className="specialty-icon">
                {getSpecialtyIcon()}
              </div>
              <h3>{specialty.name}</h3>
              <p className="specialty-description">
                {specialty.description || 'Chuyên khoa chất lượng cao'}
              </p>
              <div className="specialty-stats">
                <span>
                  <FaUsers /> {specialty.doctorCount || 0} bác sĩ
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpecialtiesListPage;
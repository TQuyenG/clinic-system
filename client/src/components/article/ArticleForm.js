// client/src/components/article/ArticleForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const ArticleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category_id: '',
    tags_json: []
  });
  
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchArticle();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/articles/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/articles/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const article = response.data.article;
      setFormData({
        title: article.title,
        content: article.content,
        category_id: article.category_id || '',
        tags_json: article.tags_json || []
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Lỗi tải bài viết');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleTagInput = async (e) => {
    const value = e.target.value;
    setTagInput(value);

    // Gợi ý tags từ DB khi nhập >= 2 ký tự
    if (value.length >= 2) {
      try {
        const response = await axios.get(`/api/articles/tags/suggest?q=${value}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setSuggestedTags(response.data.tags || []);
      } catch (error) {
        console.error('Error fetching tag suggestions:', error);
      }
    } else {
      setSuggestedTags([]);
    }
  };

  const addTag = (tag) => {
    if (!formData.tags_json.includes(tag)) {
      setFormData({
        ...formData,
        tags_json: [...formData.tags_json, tag]
      });
    }
    setTagInput('');
    setSuggestedTags([]);
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags_json: formData.tags_json.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title || !formData.content) {
      setError('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (id) {
        // Cập nhật bài viết
        await axios.put(`/api/articles/${id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Cập nhật bài viết thành công! Chờ admin duyệt lại.');
      } else {
        // Tạo bài viết mới
        await axios.post('/api/articles', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Tạo bài viết thành công! Chờ admin duyệt.');
      }

      setTimeout(() => navigate('/articles/manage'), 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Lỗi xử lý bài viết');
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return <div className="loading-spinner">Đang tải...</div>;
  }

  return (
    <div className="article-form-container">
      <h2>{id ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Tiêu đề *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Nhập tiêu đề bài viết"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category_id">Danh mục</label>
          <select
            id="category_id"
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
          >
            <option value="">-- Chọn danh mục --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                [{cat.category_type === 'tin_tuc' ? 'Tin tức' : 
                  cat.category_type === 'thuoc' ? 'Thuốc' : 'Bệnh lý'}] {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="content">Nội dung *</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Nhập nội dung bài viết"
            rows="15"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags</label>
          <div className="tags-input-wrapper">
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={handleTagInput}
              placeholder="Nhập tag và nhấn Enter"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (tagInput.trim()) addTag(tagInput.trim());
                }
              }}
            />
            {suggestedTags.length > 0 && (
              <div className="tag-suggestions">
                {suggestedTags.slice(0, 5).map((tag, idx) => (
                  <div 
                    key={idx} 
                    className="tag-suggestion"
                    onClick={() => addTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tags-list">
            {formData.tags_json.map((tag, idx) => (
              <span key={idx} className="tag">
                {tag}
                <button 
                  type="button" 
                  onClick={() => removeTag(tag)}
                  className="tag-remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Đang xử lý...' : id ? 'Cập nhật' : 'Tạo bài viết'}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/articles/manage')}
            className="btn btn-secondary"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArticleForm;
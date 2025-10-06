import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ArticleDetailPage from './ArticleDetailPage';
import CategoryArticlesPage from './CategoryArticlesPage';

const ArticleOrCategoryPage = ({ type }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3001';

  useEffect(() => {
    fetchContent();
  }, [slug, type]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/articles/${type}/${slug}`
      );

      if (response.data.success) {
        setContent(response.data.data);
        setContentType(response.data.type);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      if (error.response?.status === 404) {
        navigate('/404');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <div className="spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  if (contentType === 'article') {
    return <ArticleDetailPage article={content} categoryType={type} />;
  }

  if (contentType === 'category') {
    return <CategoryArticlesPage category={content} categoryType={type} />;
  }

  return null;
};

export default ArticleOrCategoryPage;
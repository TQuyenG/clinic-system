import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Sử dụng axios instance của bạn
import { toast } from 'react-toastify';
import { FaBullhorn, FaGift, FaTrash, FaPlus, FaToggleOn, FaToggleOff, FaUpload, FaFilter, FaEdit, FaEye, FaChartBar, FaGamepad, FaTicketAlt, FaTimes, FaStar, FaExchangeAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const MarketingManagementPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('promotions');
  const [events, setEvents] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  // State cho Chế độ Sửa
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // Form State (Giữ nguyên cấu trúc cũ)
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', start_date: '', end_date: '', 
    is_popup: false, thumbnail: '', banner_url: '',
    event_type: 'event', popup_delay: 0, cta_text: '', cta_link: ''
  });
  // SAU KHI SỬA
  const [newPromo, setNewPromo] = useState({
    code: '', name: '', description: '', discount_value: 0, discount_type: 'percentage',
    usage_limit: 100, start_date: '', end_date: '', 
    min_order_value: 0, max_discount_amount: 0, apply_for: 'all',
    is_game_reward: false, game_type: 'lucky_wheel', game_probability: 0,
    applicable_ids: [],
    reward_type: 'voucher', external_code: '', reward_image_url: '',
    is_exchange_reward: false, exchange_points: 0 // ✅ THÊM 2 BIẾN NÀY CHO ĐỔI ĐIỂM
  });

  // STATE CHO TÍNH NĂNG CHỌN DANH SÁCH CHI TIẾT
  const [selectionData, setSelectionData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingSelection, setLoadingSelection] = useState(false);

  
  // --- HÀM XỬ LÝ MỚI ---
  // LOGIC TỰ ĐỘNG LẤY DANH SÁCH & LỌC TÌM KIẾM
  useEffect(() => {
    if (newPromo.apply_for && newPromo.apply_for !== 'all') {
      setLoadingSelection(true);
      setNewPromo(prev => ({ ...prev, applicable_ids: [] })); // Reset lựa chọn cũ
      
      api.get(`/marketing/promotions/selection-data?type=${newPromo.apply_for}`)
        .then(res => {
          if (res.data.success) setSelectionData(res.data.data);
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingSelection(false));
    } else {
      setSelectionData([]);
      setNewPromo(prev => ({ ...prev, applicable_ids: [] }));
    }
  }, [newPromo.apply_for]);

  const filteredData = selectionData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleId = (id) => {
    setNewPromo(prev => {
      const isSelected = prev.applicable_ids.includes(id);
      return {
        ...prev,
        applicable_ids: isSelected 
          ? prev.applicable_ids.filter(item => item !== id) 
          : [...prev.applicable_ids, id]
      };
    });
  };

  const handleSelectAllFiltered = (e) => {
    e.preventDefault();
    const ids = filteredData.map(item => item.id);
    setNewPromo(prev => ({
      ...prev,
      applicable_ids: Array.from(new Set([...prev.applicable_ids, ...ids]))
    }));
  };

  const handleDeselectAllFiltered = (e) => {
    e.preventDefault();
    const idsToDeselect = filteredData.map(item => item.id);
    setNewPromo(prev => ({
      ...prev,
      applicable_ids: prev.applicable_ids.filter(id => !idsToDeselect.includes(id))
    }));
  };

  // 1. Reset form về mặc định
  const resetForm = () => {
    setNewEvent({
        title: '', description: '', start_date: '', end_date: '', 
        is_popup: false, thumbnail: '', banner_url: '',
        event_type: 'event', popup_delay: 0, cta_text: '', cta_link: ''
    });
    // SAU KHI SỬA
    setNewPromo({
        code: '', name: '', discount_value: 0, discount_type: 'percentage',
        usage_limit: 100, start_date: '', end_date: '', 
        min_order_value: 0, max_discount_amount: 0, apply_for: 'all',
        is_game_reward: false, game_type: 'lucky_wheel', game_probability: 0,
        applicable_ids: [],
        is_exchange_reward: false, exchange_points: 0 // ✅ THÊM VÀO ĐÂY
    });
    setSearchTerm('');
    setIsEditing(false);
    setSelectedId(null);
  };

  // 2. Mở Modal ở chế độ Sửa
  // Hàm mở modal để sửa
  const handleEdit = (item, type) => {
    setIsEditing(true);
    setSelectedId(item.id);
    if (type === 'events') {
        setNewEvent({
            ...item,
            start_date: item.start_date ? item.start_date.split('T')[0] : '',
            end_date: item.end_date ? item.end_date.split('T')[0] : '',
            popup_delay: item.popup_config?.delay || 0,
            cta_text: item.cta_config?.text || '',
            cta_link: item.cta_config?.link || ''
        });
    } else {
        setNewPromo({
            ...item,
            start_date: item.start_date ? item.start_date.split('T')[0] : '',
            end_date: item.end_date ? item.end_date.split('T')[0] : ''
        });
    }
    setShowModal(true);
  };

  // Sửa hàm Create Event để hỗ trợ Update
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/marketing/events/${selectedId}`, newEvent);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/marketing/events', newEvent);
        toast.success('Tạo mới thành công');
      }
      setShowModal(false);
      resetForm();
      fetchEvents();
    } catch (err) { toast.error('Lỗi xử lý'); }
  };

  // Sửa hàm Create Promo tương tự
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    
    // Xử lý payload gửi đi
    const payload = {
        ...newPromo,
        applicable_ids: newPromo.apply_for === 'all' ? [] : newPromo.applicable_ids
    };

    try {
      if (isEditing) {
        await api.put(`/marketing/promotions/${selectedId}`, payload);
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/marketing/promotions', payload);
        toast.success('Tạo mới thành công');
      }
      setShowModal(false);
      resetForm();
      fetchPromotions();
    } catch (err) { toast.error('Lỗi xử lý'); }
  };
    // 4. Bật/Tắt nhanh
  const handleToggleStatus = async (id) => {
    try {
      await api.put(`/marketing/events/${id}/toggle`);
      // Update state cục bộ để giao diện phản hồi ngay
      setEvents(events.map(ev => ev.id === id ? { ...ev, is_active: !ev.is_active } : ev));
      toast.success('Đã cập nhật trạng thái');
    } catch (err) { toast.error('Lỗi cập nhật'); }
  };

  // 5. Nút Xem chi tiết
  const handleView = (slug) => {
      // Mở tab mới
      window.open(`/su-kien/${slug}`, '_blank');
  };
  // Hàm đóng modal
  const handleCloseModal = () => {
      setShowModal(false);
      resetForm();
  };

  // 7. Fetch Events
  const fetchEvents = async () => {
    try {
      const res = await api.get('/marketing/events?limit=100');
      if (res.data.success) setEvents(res.data.events);
    } catch (err) { console.error(err); }
  };

  // 8. Fetch Promotions
  const fetchPromotions = async () => {
    try {
      const res = await api.get('/marketing/promotions');
      if (res.data.success) setPromotions(res.data.promotions);
    } catch (err) { console.error(err); }
  };

  // 9. Handle Delete
  const handleDelete = async (id, type) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa?')) return;
    try {
      if (type === 'events') {
        await api.delete(`/marketing/events/${id}`);
        setEvents(events.filter(e => e.id !== id));
      } else {
        await api.delete(`/marketing/promotions/${id}`);
        setPromotions(promotions.filter(p => p.id !== id));
      }
      toast.success('Xóa thành công');
    } catch (err) { toast.error('Lỗi xóa dữ liệu'); }
  };

  // 10. Handle File Upload
  // 10. Handle File Upload
  const handleFileUpload = async (e, fieldType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    // SỬA QUAN TRỌNG: Đổi 'file' thành 'image' để khớp với Backend
    formData.append('image', file);
    
    try {
      // SỬA QUAN TRỌNG: Đổi endpoint thành '/upload/image'
      // Bỏ headers thủ công để interceptor trong api.js tự xử lý boundary
      const res = await api.post('/upload/image', formData);
      
      if (activeTab === 'events') {
        // Dùng callback để đảm bảo state được cập nhật mới nhất
        setNewEvent(prev => ({ ...prev, [fieldType]: res.data.url }));
      } else {
        setNewPromo(prev => ({ ...prev, [fieldType]: res.data.url }));
      }
      toast.success('Tải ảnh thành công');
    } catch (err) { 
      console.error(err);
      toast.error('Lỗi tải ảnh: ' + (err.response?.data?.message || err.message)); 
    }
  };

  // 11. useEffect for fetching data
  useEffect(() => {
    if (activeTab === 'events') fetchEvents();
    else fetchPromotions();
  }, [activeTab]);

  return (
    <div className="marketing-management-page-container">
      {/* Header gọn gàng hơn */}
      <div className="marketing-management-page-tabs-sm">
          <button 
            className={`marketing-management-page-tab-btn-sm ${activeTab === 'promotions' ? 'active' : ''}`}
            onClick={() => setActiveTab('promotions')}
          >
            <FaTicketAlt /> Quản lý Voucher
          </button>
          <button 
            className={`marketing-management-page-tab-btn-sm ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => setActiveTab('games')}
          >
            <FaGamepad /> Vòng quay & Game
          </button>
          <button 
            className={`marketing-management-page-tab-btn-sm ${activeTab === 'loyalty' ? 'active' : ''}`}
            onClick={() => setActiveTab('loyalty')}
          >
            <FaPlus /> Điểm danh & Tích điểm
          </button>
        </div>

      <div className="marketing-management-page-content-wrapper">
        {/* TAB SỰ KIỆN */}
        {activeTab === 'events' && (
          <>
            {/* Thanh công cụ: Bộ lọc, Tìm kiếm, Nút thêm */}
            <div className="marketing-management-page-toolbar">
              <div className="marketing-management-page-filters-group">
                 <div className="marketing-management-page-filter-item">
                    <FaFilter className="filter-icon"/>
                    <select onChange={(e) => setFilterType(e.target.value)} className="marketing-management-page-select-sm">
                      <option value="all">Tất cả loại</option>
                      <option value="event">Sự kiện</option>
                      <option value="promotion">Khuyến mãi</option>
                      <option value="notification">Thông báo</option>
                    </select>
                 </div>
                 {/* Placeholder Tìm kiếm giao diện (Không có logic) */}
                 <div className="marketing-management-page-search-box">
                    <input type="text" placeholder="Tìm kiếm sự kiện..." className="marketing-management-page-input-sm" />
                 </div>
              </div>
              <button className="marketing-management-page-btn-create" onClick={() => { resetForm(); setShowModal(true); }}>
                <FaPlus /> Thêm Sự kiện
              </button>
            </div>

            {/* Bảng dữ liệu được thu nhỏ */}
            <div className="marketing-management-page-table-container">
              <table className="marketing-management-page-table">
                <thead>
                  <tr>
                    <th style={{width: '5%'}}>#</th> {/* Thêm cột STT */}
                    <th style={{width: '8%'}}>Ảnh</th>
                    <th style={{width: '25%'}}>Thông tin chính</th>
                    <th style={{width: '10%'}}>Loại</th>
                    <th style={{width: '10%'}}>Popup</th>
                    <th style={{width: '10%'}}>Trạng thái</th>
                    {/* Thêm các cột thống kê placeholder */}
                    <th style={{width: '8%'}} title="Lượt xem">Views</th> 
                    <th style={{width: '8%'}} title="Lượt nhấn">Clicks</th>
                    <th style={{width: '16%'}}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {events.filter(ev => filterType === 'all' || ev.event_type === filterType).map((ev, index) => (
                    <tr key={ev.id}>
                      <td>{index + 1}</td> {/* STT giả định */}
                      <td>
                        <img src={ev.thumbnail || '/images/placeholder.png'} alt="" className="marketing-management-page-table-thumb" />
                      </td>
                      <td>
                        <strong className="marketing-management-page-text-highlight">{ev.title}</strong>
                        <div className="marketing-management-page-text-muted-sm" style={{ marginTop: '4px', lineHeight: '1.6' }}>
                          Từ: <span style={{color: '#00b894', fontWeight: '600'}}>{new Date(ev.start_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span><br/>
                          Đến: <span style={{color: '#d63031', fontWeight: '600'}}>{new Date(ev.end_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td><span className={`marketing-management-page-badge-type ${ev.event_type}`}>{ev.event_type}</span></td>
                      <td>
                        {ev.is_popup ? <span className="marketing-management-page-badge-popup-on">Bật</span> : <span className="marketing-management-page-text-muted-sm">-</span>}
                      </td>
                      <td>
                        <button className="marketing-management-page-btn-icon-toggle" onClick={() => handleToggleStatus(ev.id)}>
                          {ev.is_active ? <FaToggleOn size={20} color="#388e3c"/> : <FaToggleOff size={20} color="#9e9e9e"/>}
                        </button>
                      </td>
                      <td className="marketing-management-page-text-center">{ev.views || 0}</td>
                      <td className="marketing-management-page-text-center">{ev.clicks || 0}</td>
                      <td>
                        <div className="marketing-management-page-table-actions">
                          <button className="marketing-management-page-btn-icon-action edit" title="Chỉnh sửa" onClick={() => handleEdit(ev, 'events')}>
                            <FaEdit />
                          </button>
                          <button className="marketing-management-page-btn-icon-action view" title="Xem chi tiết" onClick={() => handleView(ev.slug)}>
                            <FaEye />
                          </button>
                          {/* Nút thống kê tạm thời chưa có logic riêng, có thể ẩn hoặc giữ nguyên */}
                          <button className="marketing-management-page-btn-icon-action delete" onClick={() => handleDelete(ev.id, 'events')} title="Xóa">
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB KHUYẾN MÃI */}
        {activeTab === 'promotions' && (
          <>
           <div className="marketing-management-page-toolbar" style={{justifyContent: 'flex-end'}}>
              {/* Placeholder Tìm kiếm giao diện */}
              <div className="marketing-management-page-search-box" style={{marginRight: 'auto'}}>
                  <input type="text" placeholder="Tìm mã voucher..." className="marketing-management-page-input-sm" />
              </div>
              <button className="marketing-management-page-btn-create" onClick={() => { resetForm(); setShowModal(true); }}>
                <FaPlus /> Tạo Voucher
              </button>
            </div>

            <div className="marketing-management-page-table-container">
              <table className="marketing-management-page-table">
                <thead>
                  <tr>
                    <th style={{width: '5%'}}>#</th>
                    <th style={{width: '15%'}}>Mã Code</th>
                    <th style={{width: '25%'}}>Chương trình</th>
                    <th style={{width: '10%'}}>Giảm giá</th>
                    <th style={{width: '15%'}}>Loại hình</th>
                    <th style={{width: '10%'}} title="Tỷ lệ rơi trong game">Tỷ lệ</th>
                    <th style={{width: '10%'}}>Đã dùng</th>
                    <th style={{width: '10%'}}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p, index) => (
                    <tr key={p.id}>
                      <td>{index + 1}</td>
                      <td><code className="marketing-management-page-code-tag">{p.code}</code></td>
                      <td>
                        <div className="marketing-management-page-text-highlight" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                           {p.name}
                           {new Date() < new Date(p.start_date) ? (
                               <span style={{ padding: '2px 8px', background: '#fff3cd', color: '#856404', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>⏳ Chưa bắt đầu</span>
                           ) : new Date() > new Date(p.end_date) ? (
                               <span style={{ padding: '2px 8px', background: '#f8d7da', color: '#721c24', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>🛑 Đã hết hạn</span>
                           ) : (
                               <span style={{ padding: '2px 8px', background: '#d4edda', color: '#155724', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>✅ Đang chạy</span>
                           )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#636e72', marginTop: '6px', lineHeight: '1.6' }}>
                          Bắt đầu: <span style={{color: '#00b894', fontWeight: '600'}}>{new Date(p.start_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span><br/>
                          Hết hạn: <span style={{color: '#d63031', fontWeight: '600'}}>{new Date(p.end_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td>
                        {p.discount_type === 'percentage' ? `${p.discount_value}%` : `${parseInt(p.discount_value).toLocaleString()}đ`}
                      </td>
                      <td>
                        {p.is_game_reward ? 
                          <span className="marketing-management-page-badge-game"><FaGamepad/> Quà Game ({p.game_type})</span> : 
                          <span className="marketing-management-page-badge-voucher"><FaTicketAlt/> Voucher thường</span>
                        }
                      </td>
                      <td className="marketing-management-page-text-center">{p.is_game_reward ? `${p.game_probability}%` : '-'}</td>
                      <td className="marketing-management-page-text-center">
                          <span style={{fontSize: '0.9em'}}>{p.usage_count} / {p.usage_limit}</span>
                          {/* Thanh progress bar nhỏ */}
                          <div style={{height: '4px', background: '#e0e0e0', borderRadius: '2px', marginTop: '2px'}}>
                             <div style={{width: `${Math.min((p.usage_count/p.usage_limit)*100, 100)}%`, height: '100%', background: '#388e3c', borderRadius: '2px'}}></div>
                          </div>
                      </td>
                      <td>
                        <div className="marketing-management-page-table-actions">
                            <button className="marketing-management-page-btn-icon-action edit" title="Chỉnh sửa" onClick={() => handleEdit(p, 'promotions')}>
                                <FaEdit />
                            </button>
                            <button className="marketing-management-page-btn-icon-action delete" onClick={() => handleDelete(p.id, 'promotions')} title="Xóa">
                                <FaTrash />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB VÒNG QUAY & GAME (Sửa lỗi trắng màn hình) */}
        {activeTab === 'games' && (
          <>
           <div className="marketing-management-page-toolbar">
              <h3>Quản lý phần thưởng Vòng quay</h3>
              <button className="marketing-management-page-btn-create" onClick={() => { resetForm(); setNewPromo({...newPromo, is_game_reward: true}); setShowModal(true); }}>
                <FaPlus /> Thêm Quà Vòng Quay
              </button>
            </div>
            <div className="marketing-management-page-table-container">
              <table className="marketing-management-page-table">
                <thead>
                  <tr>
                    <th>Mã Code</th>
                    <th>Tên Quà Tặng</th>
                    <th>Tỷ lệ trúng</th>
                    <th>Đã trúng / Giới hạn</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.filter(p => p.is_game_reward).length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Chưa có phần thưởng nào cho game</td></tr>
                  ) : promotions.filter(p => p.is_game_reward).map((p) => (
                    <tr key={p.id}>
                      <td><code className="marketing-management-page-code-tag">{p.code}</code></td>
                      <td className="marketing-management-page-text-highlight">{p.name}</td>
                      <td><strong>{p.game_probability}%</strong></td>
                      <td>{p.usage_count} / {p.usage_limit}</td>
                      <td>
                          {new Date() < new Date(p.start_date) ? (
                              <span style={{ padding: '4px 10px', background: '#fff3cd', color: '#856404', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>Chưa bắt đầu</span>
                          ) : new Date() > new Date(p.end_date) ? (
                              <span style={{ padding: '4px 10px', background: '#f8d7da', color: '#721c24', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>Đã hết hạn</span>
                          ) : (
                              <span style={{ padding: '4px 10px', background: '#d4edda', color: '#155724', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>Đang chạy</span>
                          )}
                          <div style={{ fontSize: '0.75rem', color: '#636e72', marginTop: '6px' }}>
                            Đến: <b>{new Date(p.end_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</b>
                          </div>
                      </td>
                      <td>
                        <button className="marketing-management-page-btn-icon-action edit" onClick={() => handleEdit(p, 'promotions')}><FaEdit /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {/* TAB CẤU HÌNH TÍCH ĐIỂM */}
        {/* TAB CẤU HÌNH TÍCH ĐIỂM & QUẢN LÝ QUÀ ĐỔI ĐIỂM */}
        {activeTab === 'loyalty' && (
          <>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginTop: '20px' }}>
               <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '25px', color: '#2d3436' }}>
                 <FaStar style={{ color: '#f6b93b', marginRight: '10px' }}/> Cấu hình Hệ thống Điểm thưởng
               </h3>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* QUY TẮC 1: ĐIỂM DANH */}
                  <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                      <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#0984e3' }}>
                         🎁 Điểm nhận được khi Điểm danh:
                      </label>
                      <input type="number" defaultValue={10} className="marketing-management-page-input-sm full-width" style={{ fontSize: '1.1rem', fontWeight: 'bold' }} />
                      <small style={{ color: '#64748b', marginTop: '8px', display: 'block', lineHeight: '1.5' }}>Khách hàng nhận được số điểm này mỗi ngày khi đăng nhập và bấm điểm danh.</small>
                  </div>

                  {/* QUY TẮC 2: VÒNG QUAY MAY MẮN (ĐÃ ĐƯỢC PHỤC HỒI) */}
                  <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                     <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px', color: '#d63031' }}>
                        🎡 Phí quay Vòng quay may mắn:
                     </label>
                     <input type="number" defaultValue={10} className="marketing-management-page-input-sm full-width" style={{ fontSize: '1.1rem', fontWeight: 'bold' }} />
                     <small style={{ color: '#64748b', marginTop: '8px', display: 'block', lineHeight: '1.5' }}>Số điểm bị trừ đi mỗi lần khách hàng tham gia quay thưởng.</small>
                  </div>
               </div>
            </div>


            {/* BẢNG DANH SÁCH QUÀ ĐỔI ĐIỂM */}
            <div className="marketing-management-page-toolbar" style={{ marginTop: '30px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FaExchangeAlt color="#00b894"/> Quản lý Cửa Hàng Đổi Điểm</h3>
              <button className="marketing-management-page-btn-create" onClick={() => { 
                  resetForm(); 
                  // Mở form nhưng gán cứng nó là quà đổi điểm
                  setNewPromo({...newPromo, is_exchange_reward: true, exchange_points: 50}); 
                  setShowModal(true); 
              }}>
                <FaPlus /> Tạo Quà Đổi Điểm
              </button>
            </div>
            
            <div className="marketing-management-page-table-container">
              <table className="marketing-management-page-table">
                <thead>
                  <tr>
                    <th>Mã Code</th>
                    <th>Tên Quà Tặng</th>
                    <th>Thuộc ưu đãi (Danh mục)</th>
                    <th>Điểm yêu cầu</th>
                    <th>Đã đổi / Giới hạn</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.filter(p => p.is_exchange_reward).length === 0 ? (
                    <tr><td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#636e72'}}>Chưa có phần thưởng nào trong Cửa hàng đổi điểm</td></tr>
                  ) : promotions.filter(p => p.is_exchange_reward).map((p) => (
                    <tr key={p.id}>
                      <td><code className="marketing-management-page-code-tag">{p.code}</code></td>
                      <td className="marketing-management-page-text-highlight">{p.name}</td>
                      <td>
                        <span style={{ background: '#f1f2f6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', color: '#2d3436' }}>
                          {p.apply_for === 'all' ? 'Tất cả Dịch vụ' : p.apply_for === 'service' ? 'Dịch vụ Khám' : p.apply_for === 'medicine' ? 'Hiệu Thuốc' : p.apply_for === 'consultation' ? 'Tư vấn Online' : 'Freeship'}
                        </span>
                      </td>
                      <td><strong style={{color: '#d35400', fontSize: '1.1rem'}}><FaStar color="#f6b93b"/> {p.exchange_points} Điểm</strong></td>
                      <td>{p.usage_count} / {p.usage_limit}</td>
                      <td>{new Date() > new Date(p.end_date) ? <span style={{color: 'red'}}>Hết hạn</span> : <span style={{color: 'green'}}>Đang chạy</span>}</td>
                      <td>
                        <div className="marketing-management-page-table-actions">
                          <button className="marketing-management-page-btn-icon-action edit" onClick={() => handleEdit(p, 'promotions')}><FaEdit /></button>
                          <button className="marketing-management-page-btn-icon-action delete" onClick={() => handleDelete(p.id, 'promotions')}><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL TẠO MỚI - Giao diện nhỏ gọn, tinh tế */}
      {showModal && (
        <div className="marketing-management-page-modal-overlay">
          <div className="marketing-management-page-modal-content animate-modal-in">
            <div className="marketing-management-page-modal-header">
               <h3>
                  {activeTab === 'events' 
                    ? (isEditing ? 'Cập nhật Sự Kiện' : 'Tạo Sự Kiện Mới') 
                    : (isEditing ? 'Cập nhật Khuyến Mãi' : 'Tạo Khuyến Mãi Mới')}
                </h3>
               <button className="marketing-management-page-modal-close-btn" onClick={() => setShowModal(false)}><FaTimes/></button>
            </div>
            
            <div className="marketing-management-page-modal-body scrollable-modal-body">
            {activeTab === 'events' ? (
              <form onSubmit={handleCreateEvent} className="marketing-management-page-form-compact">
                {/* Hàng 1: Loại & Tiêu đề */}
                <div className="marketing-management-page-form-row dense">
                   <label className="marketing-management-page-label-sm" style={{flex: '0 0 30%'}}>
                     Loại sự kiện:
                     <select className="marketing-management-page-select-sm full-width" onChange={e => setNewEvent({...newEvent, event_type: e.target.value})}>
                       <option value="event">Sự kiện</option>
                       <option value="promotion">Khuyến mãi</option>
                       <option value="notification">Thông báo</option>
                     </select>
                   </label>
                   <label className="marketing-management-page-label-sm" style={{flex: 1}}>
                     Tiêu đề chính <span className="text-danger">*</span>:
                     <input type="text" className="marketing-management-page-input-sm full-width important-field" required onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="VD: Hội thảo tim mạch..." />
                   </label>
                </div>

                {/* Hàng 2: Upload ảnh */}
                <div className="marketing-management-page-form-row dense label-top">
                  <label className="marketing-management-page-label-sm">
                    Ảnh Thumbnail (Nhỏ):
                    <div className="marketing-management-page-upload-wrapper-sm">
                      <label htmlFor="thumb-upload" className="marketing-management-page-btn-upload-sm"><FaUpload/> Chọn file</label>
                      <input id="thumb-upload" type="file" hidden onChange={(e) => handleFileUpload(e, 'thumbnail')} />
                      {newEvent.thumbnail && <span className="marketing-management-page-upload-success text-truncate">Đã chọn ảnh</span>}
                    </div>
                  </label>
                  <label className="marketing-management-page-label-sm">
                    Ảnh Banner (Lớn - Chi tiết):
                    <div className="marketing-management-page-upload-wrapper-sm">
                      <label htmlFor="banner-upload" className="marketing-management-page-btn-upload-sm"><FaUpload/> Chọn file</label>
                      <input id="banner-upload" type="file" hidden onChange={(e) => handleFileUpload(e, 'banner_url')} />
                      {newEvent.banner_url && <span className="marketing-management-page-upload-success text-truncate">Đã chọn ảnh</span>}
                    </div>
                  </label>
                </div>

                <label className="marketing-management-page-label-sm label-top">
                    Mô tả ngắn <span className="text-danger">*</span>:
                    <textarea className="marketing-management-page-textarea-sm full-width" required rows="2" onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="Tóm tắt nội dung hiển thị trên thẻ..."></textarea>
                </label>
                
                {/* Hàng 3: Thời gian */}
                <div className="marketing-management-page-form-section-header-sm">Thời gian diễn ra</div>
                <div className="marketing-management-page-form-row dense bg-pastel-green p-2 rounded">
                  <label className="marketing-management-page-label-sm">
                    Bắt đầu <span className="text-danger">*</span>: 
                    <input type="date" className="marketing-management-page-input-sm" required onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} />
                  </label>
                  <label className="marketing-management-page-label-sm">
                    Kết thúc <span className="text-danger">*</span>: 
                    <input type="date" className="marketing-management-page-input-sm" required onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} />
                  </label>
                </div>

                {/* Cấu hình Nâng cao (Rút gọn) */}
                <div className="marketing-management-page-advanced-config-box-sm mt-3">
                  <div className="marketing-management-page-form-section-header-sm">Cấu hình Hiển thị & Hành động</div>
                  
                  <div className="marketing-management-page-form-row dense align-center">
                    <label className="marketing-management-page-checkbox-label-sm important-highlight">
                        <input type="checkbox" onChange={e => setNewEvent({...newEvent, is_popup: e.target.checked})} />
                        Bật Popup trang chủ
                    </label>
                    {newEvent.is_popup && (
                       <label className="marketing-management-page-label-sm ml-auto flex-row align-center">
                           Độ trễ (giây): 
                           <input type="number" min="0" className="marketing-management-page-input-sm ml-2" style={{width: '60px'}} onChange={e => setNewEvent({...newEvent, popup_delay: e.target.value})} defaultValue={0} />
                       </label>
                    )}
                  </div>
                  
                  <div className="marketing-management-page-form-row dense mt-2">
                    <label className="marketing-management-page-label-sm" style={{flex: 1}}>
                        Nút kêu gọi (CTA): 
                        <input type="text" className="marketing-management-page-input-sm full-width" placeholder="VD: Xem chi tiết" onChange={e => setNewEvent({...newEvent, cta_text: e.target.value})} />
                    </label>
                    <label className="marketing-management-page-label-sm" style={{flex: 2}}>
                        Đường dẫn CTA (Link): 
                        <input type="text" className="marketing-management-page-input-sm full-width" placeholder="Để trống nếu link vào bài viết" onChange={e => setNewEvent({...newEvent, cta_link: e.target.value})} />
                    </label>
                  </div>
                </div>

                <div className="marketing-management-page-modal-footer sticky-footer">
                  <button className="marketing-management-page-modal-close-btn" onClick={handleCloseModal}><FaTimes/></button>
                  <button type="submit" className="marketing-management-page-btn-primary-sm">
                    {isEditing ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            ) : (
              // FORM VOUCHER - Giao diện nhỏ gọn
              <form onSubmit={handleCreatePromo} className="marketing-management-page-form-compact">
                <div className="marketing-management-page-form-section-header-sm">Thông tin cơ bản</div>
                <div className="marketing-management-page-form-row dense bg-pastel-green p-2 rounded">
                    <label className="marketing-management-page-label-sm" style={{flex: 1}}>
                        Mã Code <span className="text-danger">*</span>:
                        <input type="text" placeholder="VD: KHOE2026" required className="marketing-management-page-input-sm full-width important-field code-input"
                            value={newPromo.code}
                            onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} />
                    </label>
                    <label className="marketing-management-page-label-sm" style={{flex: 2}}>
                        Tên chương trình <span className="text-danger">*</span>:
                        <input type="text" placeholder="VD: Ưu đãi mùa dịch..." required className="marketing-management-page-input-sm full-width"
                            value={newPromo.name}
                            onChange={e => setNewPromo({...newPromo, name: e.target.value})} />
                    </label>
                </div>

                {/* BỔ SUNG Ô NHẬP MÔ TẢ ĐIỀU KIỆN */}
                <div className="marketing-management-page-form-row mt-2">
                    <label className="marketing-management-page-label-sm full-width">
                        Mô tả chi tiết / Điều kiện áp dụng:
                        <textarea placeholder="Ghi rõ điều kiện để hiển thị ở nút 'Xem chi tiết' cho khách hàng..." 
                            className="marketing-management-page-textarea-sm full-width" rows="2"
                            value={newPromo.description}
                            onChange={e => setNewPromo({...newPromo, description: e.target.value})} />
                    </label>
                </div>

                <div className="marketing-management-page-form-row dense label-top mt-2">
                    <label className="marketing-management-page-label-sm">
                        Ngày bắt đầu <span className="text-danger">*</span>:
                        <input type="date" required className="marketing-management-page-input-sm full-width"
                            value={newPromo.start_date}
                            onChange={e => setNewPromo({...newPromo, start_date: e.target.value})} />
                    </label>
                    <label className="marketing-management-page-label-sm">
                        Ngày kết thúc <span className="text-danger">*</span>:
                        <input type="date" required className="marketing-management-page-input-sm full-width"
                            value={newPromo.end_date}
                            onChange={e => setNewPromo({...newPromo, end_date: e.target.value})} />
                    </label>
                </div>

                <div className="marketing-management-page-form-section-header-sm mt-3">Giá trị & Điều kiện</div>
                <div className="marketing-management-page-form-row dense label-top border-pastel rounded p-2">
                    <div style={{flex: 1}}>
                        <label className="marketing-management-page-label-sm">Loại giảm:</label>
                        <select className="marketing-management-page-select-sm full-width"
                            value={newPromo.discount_type}
                            onChange={e => setNewPromo({...newPromo, discount_type: e.target.value})}>
                            <option value="percentage">Theo %</option>
                            <option value="fixed_amount">Số tiền (VNĐ)</option>
                        </select>
                        <input type="number" required min="0" className="marketing-management-page-input-sm full-width mt-1 important-field" placeholder="Giá trị giảm"
                            value={newPromo.discount_value}
                            onChange={e => setNewPromo({...newPromo, discount_value: e.target.value})} />
                    </div>
                    <div style={{flex: 1}}>
                         <label className="marketing-management-page-label-sm">Số lượng phát hành:</label>
                         <input type="number" required min="1" className="marketing-management-page-input-sm full-width mt-auto"
                            value={newPromo.usage_limit}
                            onChange={e => setNewPromo({...newPromo, usage_limit: e.target.value})} />
                    </div>
                </div>

                <div className="marketing-management-page-form-row dense label-top border-pastel rounded p-2 mt-2">
                     <label className="marketing-management-page-label-sm" style={{flex:1}}>
                        Đơn tối thiểu (VNĐ):
                        <input type="number" min="0" placeholder="0 = Không giới hạn" className="marketing-management-page-input-sm full-width"
                            value={newPromo.min_order_value}
                            onChange={e => setNewPromo({...newPromo, min_order_value: e.target.value})} />
                    </label>
                    {newPromo.discount_type === 'percentage' && (
                        <label className="marketing-management-page-label-sm" style={{flex:1}}>
                            Giảm tối đa (VNĐ):
                            <input type="number" min="0" placeholder="0 = Không giới hạn" className="marketing-management-page-input-sm full-width"
                                value={newPromo.max_discount_amount}
                                onChange={e => setNewPromo({...newPromo, max_discount_amount: e.target.value})} />
                        </label>
                    )}
                     <label className="marketing-management-page-label-sm" style={{flex:1}}>
                        Áp dụng cho:
                        <select className="marketing-management-page-select-sm full-width"
                            value={newPromo.apply_for}
                            onChange={e => setNewPromo({...newPromo, apply_for: e.target.value})}>
                            <option value="all">Tất cả</option>
                            <option value="service">Chỉ dịch vụ khám</option>
                            <option value="medicine">Chỉ mua thuốc</option>
                            <option value="consultation">Chỉ gói tư vấn</option>
                            {/* BỔ SUNG DÒNG DƯỚI ĐÂY */}
                            <option value="shipping">Miễn phí giao hàng (Freeship)</option>
                        </select>
                    </label>
                </div>

                {/* --- GIAO DIỆN CHỌN DANH SÁCH CHI TIẾT --- */}
                {newPromo.apply_for !== 'all' && (
                  <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', background: '#f8fafc', marginTop: '10px' }}>
                    <h5 style={{ margin: '0 0 10px 0', color: '#334155', fontSize: '14px' }}>Chọn danh sách áp dụng cụ thể:</h5>
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input 
                        type="text" 
                        placeholder="🔍 Tìm kiếm theo tên..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                      <button onClick={handleSelectAllFiltered} style={{ background: '#00b894', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Chọn tất cả kết quả</button>
                      <button onClick={handleDeselectAllFiltered} style={{ background: '#d63031', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Bỏ chọn</button>
                    </div>

                    <p style={{ fontSize: '13px', marginBottom: '8px' }}>Đã chọn: <b style={{ color: '#00b894' }}>{newPromo.applicable_ids.length}</b> mục</p>

                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', background: '#fff' }}>
                      {loadingSelection ? <p style={{ textAlign: 'center', color: '#64748b', margin: 0 }}>Đang tải dữ liệu...</p> : filteredData.length === 0 ? <p style={{ textAlign: 'center', color: '#64748b', margin: 0 }}>Không tìm thấy kết quả.</p> : (
                        filteredData.map(item => (
                          <label key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={newPromo.applicable_ids.includes(item.id)}
                              onChange={() => handleToggleId(item.id)}
                              style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ flex: 1, fontSize: '13px' }}>{item.name}</span>
                            <span style={{ color: '#64748b', fontWeight: 'bold', fontSize: '13px' }}>{Number(item.price).toLocaleString('vi-VN')}đ</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                // SAU KHI SỬA
                {/* ✅ BỔ SUNG: CẤU HÌNH ĐỔI ĐIỂM */}
                <div className="marketing-management-page-game-config-box-sm mt-3" style={{ border: '1px dashed #00b894', background: '#f4fffb' }}>
                    <label className="marketing-management-page-checkbox-label-sm" style={{ color: '#00b894', fontWeight: 'bold' }}>
                        <FaStar style={{marginRight:'5px'}}/>
                        <input type="checkbox" 
                            checked={newPromo.is_exchange_reward || false}
                            onChange={e => setNewPromo({...newPromo, is_exchange_reward: e.target.checked})} />
                        Dành riêng cho Cửa Hàng Đổi Điểm?
                    </label>
                    
                    {newPromo.is_exchange_reward && (
                      <div className="marketing-management-page-form-row dense mt-2 pl-3">
                          <label className="marketing-management-page-label-sm" style={{flex: 1}}>
                              Số điểm cần để đổi <span className="text-danger">*</span>:
                              <input type="number" min="1" placeholder="VD: 50, 100, 200..." className="marketing-management-page-input-sm full-width important-field"
                                  value={newPromo.exchange_points || ''}
                                  onChange={e => setNewPromo({...newPromo, exchange_points: e.target.value})} />
                          </label>
                      </div>
                    )}
                </div>

                {/* --- Cấu hình Game cũ giữ nguyên bên dưới --- */}
                {/* NẾU LÀ QUÀ ĐỔI ĐIỂM -> HIỆN KHỐI NHẬP ĐIỂM TO RÕ RÀNG */}
                {newPromo.is_exchange_reward ? (
                    <div style={{ background: '#fff9e6', border: '2px dashed #f6b93b', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#d35400', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <FaStar color="#f6b93b"/> CẤU HÌNH CHO CỬA HÀNG ĐỔI ĐIỂM
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#636e72', marginBottom: '15px' }}>
                           * Lưu ý: Hãy đảm bảo bạn đã chọn <b>"Áp dụng cho"</b> ở phía trên (VD: Hiệu thuốc, Dịch vụ khám...) để hệ thống phân loại đúng gian hàng cho khách nhé!
                        </p>
                        <label className="marketing-management-page-label-sm">
                            Mã này đổi bằng bao nhiêu điểm? <span className="text-danger">*</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                               <input type="number" min="1" placeholder="VD: 50, 100, 500..." 
                                   className="marketing-management-page-input-sm important-field" style={{ width: '150px', fontSize: '1.2rem', fontWeight: 'bold', color: '#d35400' }}
                                   value={newPromo.exchange_points || ''}
                                   onChange={e => setNewPromo({...newPromo, exchange_points: e.target.value})} />
                               <span style={{ fontWeight: 'bold', color: '#2d3436' }}>Điểm / 1 Lần đổi</span>
                            </div>
                        </label>
                    </div>
                ) : (
                    /* NẾU LÀ VOUCHER THƯỜNG -> HIỆN KHỐI CẤU HÌNH VÒNG QUAY GAME */
                    <div className="marketing-management-page-game-config-box-sm mt-3">
                        <label className="marketing-management-page-checkbox-label-sm game-highlight">
                            <FaGamepad style={{marginRight:'5px'}}/>
                            <input type="checkbox" 
                                checked={newPromo.is_game_reward}
                                onChange={e => setNewPromo({...newPromo, is_game_reward: e.target.checked})} />
                            Sử dụng làm quà tặng trong Game Vòng Quay?
                        </label>
                        
                        {newPromo.is_game_reward && (
                          <>
                            <div className="marketing-management-page-form-row dense mt-2 pl-3">
                                <label className="marketing-management-page-label-sm" style={{flex: 1}}>
                                    Loại phần thưởng:
                                    <select className="marketing-management-page-select-sm full-width"
                                        value={newPromo.reward_type || 'voucher'}
                                        onChange={e => setNewPromo({...newPromo, reward_type: e.target.value})}>
                                        <option value="voucher">Voucher giảm giá (Lưu vào ví)</option>
                                        <option value="card">Thẻ cào điện thoại / Hiện vật</option>
                                    </select>
                                </label>
                                <label className="marketing-management-page-label-sm" style={{flex: 1}}>
                                    Tỷ lệ trúng (0-100%):
                                    <input type="number" min="0" max="100" placeholder="VD: 5" className="marketing-management-page-input-sm full-width important-field"
                                        value={newPromo.game_probability}
                                        onChange={e => setNewPromo({...newPromo, game_probability: e.target.value})} />
                                </label>
                            </div>
                            
                            {/* HIỆN THÊM NẾU LÀ THẺ CÀO/HIỆN VẬT */}
                            {newPromo.reward_type === 'card' && (
                              <div className="marketing-management-page-form-row dense mt-2 pl-3" style={{ background: '#fff', padding: '10px', borderRadius: '5px', border: '1px dashed #ccc' }}>
                                  <label className="marketing-management-page-label-sm" style={{flex: 1}}>
                                      Mã thẻ cào / Số PIN (sẽ hiện khi trúng):
                                      <input type="text" placeholder="VD: Viettel 50K - Seri: 123 - Mã: 456" className="marketing-management-page-input-sm full-width text-primary fw-bold"
                                          value={newPromo.external_code || ''}
                                          onChange={e => setNewPromo({...newPromo, external_code: e.target.value})} />
                                  </label>
                                  <label className="marketing-management-page-label-sm" style={{flex: 1}}>
                                      Tải lên ảnh thẻ / phần quà:
                                      <div className="marketing-management-page-upload-wrapper-sm">
                                        <label htmlFor="reward-upload" className="marketing-management-page-btn-upload-sm"><FaUpload/> Chọn ảnh</label>
                                        <input id="reward-upload" type="file" hidden onChange={(e) => handleFileUpload(e, 'reward_image_url')} />
                                        {newPromo.reward_image_url && <span style={{color:'green', fontSize:'0.8rem', marginLeft:'5px'}}>Đã tải ảnh lên</span>}
                                      </div>
                                  </label>
                              </div>
                            )}
                          </>
                        )}
                    </div>
                )}

                <div className="marketing-management-page-modal-footer sticky-footer">
                    <button type="button" onClick={handleCloseModal} className="marketing-management-page-btn-secondary-sm">Hủy bỏ</button>
                    <button type="submit" className="marketing-management-page-btn-primary-sm">
                      {isEditing ? 'Cập nhật' : 'Tạo mới'}
                    </button>
                </div>
              </form>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingManagementPage;
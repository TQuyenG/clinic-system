import React, { useState, useEffect } from 'react';
import marketingService from '../../services/marketingService'; // Nhớ kiểm tra lại đường dẫn
import { FaEdit, FaTrash, FaPlus, FaGift, FaGamepad } from 'react-icons/fa';
// Import CSS nếu bạn có file riêng, ví dụ: import './DiscountManagementPage.css';

const DiscountManagementPage = () => {
  const [activeTab, setActiveTab] = useState('vouchers'); // 'vouchers' hoặc 'game'
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // --- STATE DÀNH CHO FORM TẠO/SỬA ---
  const initialFormState = {
    code: '',
    name: '',
    discount_type: 'percentage', // 'percentage' hoặc 'fixed_amount'
    discount_value: 0,
    usage_limit: 100,
    min_order_value: 0,
    max_discount_amount: 0,
    start_date: '',
    end_date: '',
    apply_for: 'all', // 'all', 'service', 'medicine', 'consultation'
    applicable_ids: [],
    is_game_reward: false,
    game_type: 'none',
    game_probability: 0
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- STATE DÀNH CHO TÍNH NĂNG CHỌN DANH SÁCH (THUỐC/DỊCH VỤ/TƯ VẤN) ---
  const [selectionData, setSelectionData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingSelection, setLoadingSelection] = useState(false);

  // 1. Fetch danh sách Voucher khi load trang
  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await marketingService.getAllPromotions();
      if (res.success) {
        setPromotions(res.promotions);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch danh sách Item khi Admin đổi "Áp dụng cho"
  useEffect(() => {
    if (formData.apply_for && formData.apply_for !== 'all') {
      setLoadingSelection(true);
      // Xóa danh sách ID đã chọn cũ để tránh lỗi logic
      setFormData(prev => ({ ...prev, applicable_ids: [] }));
      
      marketingService.getSelectionData(formData.apply_for)
        .then(res => {
          if (res.success) setSelectionData(res.data);
        })
        .catch(err => console.error("Lỗi lấy dữ liệu selection:", err))
        .finally(() => setLoadingSelection(false));
    } else {
      setSelectionData([]);
      setFormData(prev => ({ ...prev, applicable_ids: [] }));
    }
  }, [formData.apply_for]);

  // --- LOGIC XỬ LÝ CHECKBOX THÔNG MINH ---
  const handleToggleId = (id) => {
    setFormData(prev => {
      const isSelected = prev.applicable_ids.includes(id);
      return {
        ...prev,
        applicable_ids: isSelected 
          ? prev.applicable_ids.filter(item => item !== id) 
          : [...prev.applicable_ids, id]
      };
    });
  };

  const filteredData = selectionData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAllFiltered = (e) => {
    e.preventDefault(); // Ngăn submit form
    const ids = filteredData.map(item => item.id);
    setFormData(prev => ({
      ...prev,
      applicable_ids: Array.from(new Set([...prev.applicable_ids, ...ids]))
    }));
  };

  const handleDeselectAllFiltered = (e) => {
    e.preventDefault();
    const idsToDeselect = filteredData.map(item => item.id);
    setFormData(prev => ({
      ...prev,
      applicable_ids: prev.applicable_ids.filter(id => !idsToDeselect.includes(id))
    }));
  };

  // 3. Xử lý Submit Form (Tạo mới)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Đảm bảo applicable_ids được format đúng chuẩn mảng trước khi gửi
    const payload = {
        ...formData,
        // Nếu chọn tất cả thì để rỗng, nếu chọn cụ thể thì truyền mảng ID
        applicable_ids: formData.apply_for === 'all' ? [] : formData.applicable_ids 
    };

    try {
      const res = await marketingService.createPromotion(payload);
      if (res.success) {
        alert('Tạo voucher thành công!');
        setShowModal(false);
        setFormData(initialFormState);
        fetchPromotions(); // Cập nhật lại danh sách
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi tạo!');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa voucher này?')) {
      try {
        // Cần đảm bảo bạn đã tạo hàm deletePromotion trong marketingService
        // await marketingService.deletePromotion(id);
        alert('Tính năng xóa đang được hoàn thiện!');
        fetchPromotions();
      } catch (error) {
        console.error(error);
      }
    }
  };

  // Lọc voucher theo Tab (Game hoặc Thường)
  const displayPromotions = promotions.filter(p => 
    activeTab === 'game' ? p.is_game_reward : !p.is_game_reward
  );

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: '20px', color: '#2d3436' }}>Quản lý Khuyến mãi & Voucher</h2>

      {/* --- TABS --- */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('vouchers')}
          style={{ padding: '10px 20px', border: 'none', background: activeTab === 'vouchers' ? '#00b894' : '#e0e0e0', color: activeTab === 'vouchers' ? '#fff' : '#333', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          <FaGift style={{ marginRight: '8px' }}/> Quản lý Voucher
        </button>
        <button 
          onClick={() => setActiveTab('game')}
          style={{ padding: '10px 20px', border: 'none', background: activeTab === 'game' ? '#0984e3' : '#e0e0e0', color: activeTab === 'game' ? '#fff' : '#333', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          <FaGamepad style={{ marginRight: '8px' }}/> Vòng quay Game
        </button>
      </div>

      {/* --- HEADER DANH SÁCH --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>
          {activeTab === 'vouchers' ? 'Danh sách Voucher đang chạy' : 'Danh sách Phần thưởng Vòng quay'}
        </h3>
        <button 
          onClick={() => {
            setFormData({...initialFormState, is_game_reward: activeTab === 'game'});
            setShowModal(true);
          }}
          style={{ background: '#00b894', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <FaPlus style={{ marginRight: '8px' }}/> Thêm mới
        </button>
      </div>

      {/* --- BẢNG DỮ LIỆU --- */}
      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f1f2f6', color: '#2d3436' }}>
            <tr>
              <th style={{ padding: '15px', textAlign: 'left' }}>Mã Code</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Tên chương trình</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Giảm giá</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Đã dùng</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Trạng thái</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu...</td></tr>
            ) : displayPromotions.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#636e72' }}>Chưa có dữ liệu.</td></tr>
            ) : (
              displayPromotions.map(promo => (
                <tr key={promo.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold', color: '#0984e3' }}>{promo.code}</td>
                  <td style={{ padding: '15px' }}>
                    {promo.name}
                    <div style={{ fontSize: '12px', color: '#636e72', marginTop: '4px' }}>
                      HSD: {new Date(promo.end_date).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${Number(promo.discount_value).toLocaleString('vi-VN')}đ`}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>{promo.usage_count} / {promo.usage_limit}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                      background: promo.status === 'running' ? '#d4edda' : promo.status === 'expired' ? '#f8d7da' : '#fff3cd',
                      color: promo.status === 'running' ? '#155724' : promo.status === 'expired' ? '#721c24' : '#856404'
                    }}>
                      {promo.status === 'running' ? 'Đang chạy' : promo.status === 'expired' ? 'Đã hết hạn' : 'Chưa bắt đầu'}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button style={{ border: 'none', background: 'none', color: '#0984e3', cursor: 'pointer', marginRight: '10px' }}><FaEdit size={18} /></button>
                    <button onClick={() => handleDelete(promo.id)} style={{ border: 'none', background: 'none', color: '#d63031', cursor: 'pointer' }}><FaTrash size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL TẠO MỚI (GIỐNG GIAO DIỆN ẢNH CỦA BẠN) --- */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', width: '700px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', position: 'relative' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fff', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{activeTab === 'game' ? 'Tạo Phần thưởng Vòng quay' : 'Tạo Voucher mới'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              
              {/* THÔNG TIN CƠ BẢN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mã Code (Tự động in hoa):</label>
                  <input type="text" required value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tên chương trình:</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ngày bắt đầu:</label>
                  <input type="datetime-local" required value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ngày kết thúc:</label>
                  <input type="datetime-local" required value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                </div>
              </div>

              <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '20px' }}>GIÁ TRỊ & ĐIỀU KIỆN</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Loại giảm:</label>
                  <select value={formData.discount_type} onChange={(e) => setFormData({...formData, discount_type: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '10px' }}>
                    <option value="percentage">Theo %</option>
                    <option value="fixed_amount">Số tiền cố định (VNĐ)</option>
                  </select>
                  <input type="number" required min="0" value={formData.discount_value} onChange={(e) => setFormData({...formData, discount_value: e.target.value})} placeholder="Nhập giá trị giảm..." style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Số lượng phát hành:</label>
                  <input type="number" required min="1" value={formData.usage_limit} onChange={(e) => setFormData({...formData, usage_limit: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Đơn tối thiểu (VNĐ):</label>
                  <input type="number" min="0" value={formData.min_order_value} onChange={(e) => setFormData({...formData, min_order_value: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Giảm tối đa (VNĐ):</label>
                  <input type="number" min="0" value={formData.max_discount_amount} onChange={(e) => setFormData({...formData, max_discount_amount: e.target.value})} placeholder="Chỉ dùng khi giảm %" style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} disabled={formData.discount_type === 'fixed_amount'} />
                </div>

                {/* DROPDOWN ÁP DỤNG CHO - CÓ THÊM GÓI TƯ VẤN */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Áp dụng cho:</label>
                  <select value={formData.apply_for} onChange={(e) => setFormData({...formData, apply_for: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                    <option value="all">Tất cả</option>
                    <option value="service">Chỉ dịch vụ khám</option>
                    <option value="medicine">Chỉ thuốc</option>
                    <option value="consultation">Chỉ gói tư vấn</option>
                  </select>
                </div>

                {/* --- GIAO DIỆN CHỌN DANH SÁCH CHI TIẾT --- */}
                {formData.apply_for !== 'all' && (
                  <div style={{ gridColumn: '1 / -1', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', background: '#f8fafc' }}>
                    <h5 style={{ margin: '0 0 10px 0', color: '#334155' }}>Chọn danh sách cụ thể:</h5>
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <input 
                        type="text" 
                        placeholder="🔍 Tìm kiếm theo tên..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                      />
                      <button onClick={handleSelectAllFiltered} style={{ background: '#00b894', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Chọn tất cả kết quả</button>
                      <button onClick={handleDeselectAllFiltered} style={{ background: '#d63031', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Bỏ chọn</button>
                    </div>

                    <p style={{ fontSize: '14px', marginBottom: '10px' }}>Đã chọn: <b style={{ color: '#00b894' }}>{formData.applicable_ids.length}</b> mục</p>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '4px', background: '#fff' }}>
                      {loadingSelection ? <p style={{ textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</p> : filteredData.length === 0 ? <p style={{ textAlign: 'center', color: '#64748b' }}>Không tìm thấy kết quả.</p> : (
                        filteredData.map(item => (
                          <label key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={formData.applicable_ids.includes(item.id)}
                              onChange={() => handleToggleId(item.id)}
                              style={{ marginRight: '12px', transform: 'scale(1.2)' }}
                            />
                            <span style={{ flex: 1 }}>{item.name}</span>
                            <span style={{ color: '#64748b', fontWeight: 'bold' }}>{Number(item.price).toLocaleString('vi-VN')}đ</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* GAME CONFIG */}
              <div style={{ background: '#fff9e6', padding: '15px', borderRadius: '8px', border: '1px dashed #f6b93b', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#d35400', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.is_game_reward} onChange={(e) => setFormData({...formData, is_game_reward: e.target.checked})} style={{ marginRight: '10px', transform: 'scale(1.3)' }} />
                  🎮 Sử dụng làm quà tặng trong Game?
                </label>
                
                {formData.is_game_reward && (
                  <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Loại Game áp dụng:</label>
                      <select value={formData.game_type} onChange={(e) => setFormData({...formData, game_type: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                        <option value="lucky_wheel">Vòng quay may mắn</option>
                        <option value="check_in">Điểm danh</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Tỷ lệ trúng (0-100%):</label>
                      <input type="number" required min="0" max="100" value={formData.game_probability} onChange={(e) => setFormData({...formData, game_probability: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #ccc', background: '#fff', borderRadius: '5px', cursor: 'pointer' }}>Hủy bỏ</button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', background: '#00b894', color: '#fff', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Tạo mới</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountManagementPage;
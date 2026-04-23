import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTicketAlt, FaGamepad, FaGift, FaStar, FaExchangeAlt, FaCalendarCheck } from 'react-icons/fa';
import './UserPromotionPage.css';

const UserPromotionPage = ({ tab = 'vouchers' }) => {
  const [activeTab, setActiveTab] = useState(tab);
  const [voucherSubTab, setVoucherSubTab] = useState('public'); // Sub-tab: 'public' (Kho chung) hoặc 'my' (Ví của tôi)
  const [gameSubTab, setGameSubTab] = useState('wheel'); // ✅ BỔ SUNG: Sub-tab cho mục Game ('wheel' hoặc 'history')
  const [publicVouchers, setPublicVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(false); 
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState(null);
  const [winPopup, setWinPopup] = useState(null); // ✅ Popup hiện quà Thẻ Cào
  const [storeFilter, setStoreFilter] = useState('all'); // State lưu bộ lọc danh mục
  
  // Vòng quay states
  
  // Vòng quay states
  const [wheelRewards, setWheelRewards] = useState([]);
  const [wheelRotation, setWheelRotation] = useState(0);

  // 1. Khai báo các hàm gọi API
  const apiCall = async (method, url, data = null) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = method === 'post' 
        ? await axios.post(url, data, config)
        : await axios.get(url, config);
      return response.data;
    } catch (err) {
      console.error(err);
      throw err.response?.data?.message || 'Có lỗi xảy ra';
    }
  };

  const fetchPublicVouchers = async () => {
    setLoading(true);
    try {
      const data = await apiCall('get', 'http://localhost:3001/api/marketing/public-promotions');
      if (data.success) setPublicVouchers(data.promotions);
    } catch (msg) { console.error(msg); }
    setLoading(false);
  };

  const fetchMyVouchers = async () => {
    try {
      const data = await apiCall('get', 'http://localhost:3001/api/marketing/my-vouchers');
      if (data.success) setMyVouchers(data.vouchers);
    } catch (msg) { console.error(msg); }
  };

  const handleClaimVoucher = async (promotionId) => {
    try {
      const data = await apiCall('post', 'http://localhost:3001/api/marketing/claim-voucher', { promotion_id: promotionId });
      if (data.success) {
        alert(`🎉 ${data.message}`);
        fetchPublicVouchers(); // Load lại kho chung (cập nhật lượt dùng)
        fetchMyVouchers();     // Load lại ví của tôi (thêm mã vừa lưu)
      }
    } catch (msg) {
      alert(msg);
    }
  };

  const fetchPoints = async () => {
    try {
      const data = await apiCall('get', 'http://localhost:3001/api/marketing/my-points');
      if (data.success) setUserPoints(data.points);
    } catch (msg) { console.error(msg); }
  };

  const fetchWheelRewards = async () => {
    try {
      const data = await apiCall('get', 'http://localhost:3001/api/marketing/game/rewards');
      // Thêm 1 ô "Chúc may mắn lần sau" vào mảng để tạo sự cân bằng
      const items = data.rewards ? [...data.rewards, { id: 'miss', name: 'Mất lượt' }] : [{ id: 'miss', name: 'Mất lượt' }];
      setWheelRewards(items);
    } catch (msg) { console.error(msg); }
  };

  // 2. Chạy hàm lấy dữ liệu khi trang được load
  useEffect(() => {
    fetchPublicVouchers(); // Load kho chung
    fetchMyVouchers();     // Load ví của tôi
    fetchPoints();
    fetchWheelRewards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Logic xử lý Vòng Quay
  const handleSpin = async () => {
    if (userPoints < 10) {
        alert('Bạn không đủ điểm! Hãy điểm danh để nhận thêm 10 điểm nhé.');
        return;
    }

    setIsSpinning(true);
    setGameResult(null);
    
    try {
        const data = await apiCall('post', 'http://localhost:3001/api/marketing/game/play');
        
        // Cập nhật lại điểm sau khi trừ
        fetchPoints();

        // Tính toán góc quay
        const sliceAngle = 360 / wheelRewards.length;
        // Dùng String() để ép kiểu, đảm bảo so sánh chính xác ID giữa Database và Frontend
        let targetIndex = wheelRewards.findIndex(r => String(r.id) === String(data.reward ? data.reward.id : 'miss'));
        if (targetIndex === -1) {
            targetIndex = wheelRewards.findIndex(r => String(r.id) === 'miss');
            if(targetIndex === -1) targetIndex = wheelRewards.length - 1; 
        }

        // Căn chỉnh để góc của phần thưởng nằm chính xác vào mũi kim đỏ (góc 0 độ / 12h)
        const centerAngle = (targetIndex * sliceAngle) + (sliceAngle / 2);
        const targetRotation = 360 - centerAngle;
        
        setWheelRotation(prev => {
            const currentMod = prev % 360;
            let diff = targetRotation - currentMod;
            if (diff < 0) diff += 360;
            return prev + diff + 1800; // Quay tiếp từ góc hiện tại + thêm 5 vòng (1800 độ)
        });

        // Đợi 4 giây cho animation CSS quay xong mới hiện kết quả
        setTimeout(() => {
            setGameResult({ result: data.result, message: data.message });
            if (data.reward) {
                fetchMyVouchers(); // Load lại ví 
                // ✅ HIỆN POPUP CHÚC MỪNG CHO TẤT CẢ PHẦN QUÀ (Cả Thẻ cào & Voucher)
                setWinPopup(data.reward); 
            }
            setIsSpinning(false);
        }, 4000);

    } catch (msg) {
        alert(msg);
        setIsSpinning(false);
    }
  };

  // 4. Logic Điểm danh
  const handleCheckin = async () => {
    try {
      const data = await apiCall('post', 'http://localhost:3001/api/marketing/checkin');
      if (data.success) {
        setUserPoints(data.points);
        alert(`🎉 ${data.message}`);
      }
    } catch (msg) { alert(msg); }
  };

  // 5. Logic Đổi Quà (Nâng cấp: Chọn mã cụ thể, trừ điểm theo giá trị)
  const handleExchangePoints = async (promo, cost) => {
    if (userPoints < cost) {
      alert(`Bạn cần ${cost} điểm để đổi mã ${promo.name}!`);
      return;
    }
    if (!window.confirm(`Bạn muốn dùng ${cost} điểm để đổi lấy mã: ${promo.name}?`)) return;

    setLoading(true);
    try {
      // Gọi API mới có kèm ID của Voucher
      const data = await apiCall('post', `http://localhost:3001/api/marketing/exchange-points/${promo.id}`);
      if (data.success) {
        alert(`🎁 ${data.message}`);
        setUserPoints(data.points);
        fetchMyVouchers(); // Tải lại ví để hiện mã mới đổi
        fetchPublicVouchers(); // Cập nhật lại số lượng trong kho chung
      }
    } catch (msg) {
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUseVoucher = (voucher) => {
    if (voucher.apply_for === 'medicine') {
        alert(`Mã của bạn: ${voucher.code}. Áp dụng cho danh sách thuốc hỗ trợ. Bạn có thể tra cứu tại mục Cẩm nang y tế.`);
    } else if (voucher.apply_for === 'service') {
        // Đã sửa /booking thành /dat-lich-hen cho khớp với App.js
        window.location.href = `/dat-lich-hen?serviceIds=${voucher.applicable_ids || ''}&voucher=${voucher.code}`;
    } else if (voucher.apply_for === 'consultation') {
        // Đã sửa /consultation thành /dat-lich-tu-van
        window.location.href = `/dat-lich-tu-van?voucher=${voucher.code}`;
    } else {
        // Đã sửa /services thành /dich-vu
        window.location.href = '/dich-vu';
    }
  };

  return (
    <div className="user-promotion-page-container">
      
      {/* ✅ THANH MARQUEE CHẠY CHỮ LƠ LỬNG */}
      <div style={{ background: '#ffeaa7', color: '#d35400', padding: '8px 0', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
        <FaGift style={{ margin: '0 15px', fontSize: '1.2rem' }} />
        <marquee direction="left" scrollamount="6" style={{ flex: 1 }}>
          🎉 Chúc mừng <b>098****123</b> vừa quay trúng <b>Thẻ Viettel 50K</b>! --- 
          🔥 Chúc mừng <b>090****456</b> vừa nhận được <b>Voucher Giảm 50%</b>! --- 
          🎁 Chúc mừng <b>093****789</b> vừa trúng <b>Gói khám miễn phí</b>! 
        </marquee>
      </div>

      <div className="user-promotion-page-header-sm">
        <h2>Thế Giới Ưu Đãi & Quà Tặng</h2>
        <p>Khám phá kho quà tặng và tham gia các hoạt động tích điểm thú vị!</p>
      </div>

      <div className="user-promotion-page-tabs-sm">
        <button className={`user-promotion-page-tab-btn-sm ${activeTab === 'vouchers' ? 'active' : ''}`} onClick={() => setActiveTab('vouchers')}>
          <FaTicketAlt /> Kho Voucher
        </button>
        <button className={`user-promotion-page-tab-btn-sm ${activeTab === 'game' ? 'active' : ''}`} onClick={() => setActiveTab('game')}>
          <FaGamepad /> Vòng Quay
        </button>
        <button className={`user-promotion-page-tab-btn-sm ${activeTab === 'loyalty' ? 'active' : ''}`} onClick={() => setActiveTab('loyalty')}>
          <FaStar /> Điểm Thưởng
        </button>
      </div>

      <div className="user-promotion-page-content-sm">
        {/* ... (GIỮ NGUYÊN TAB VOUCHERS) ... */}
        {activeTab === 'vouchers' && (
           <div className="user-promotion-page-voucher-section">
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
              <button style={{ padding: '8px 20px', border: 'none', background: voucherSubTab === 'public' ? '#00b894' : 'transparent', color: voucherSubTab === 'public' ? '#fff' : '#636e72', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setVoucherSubTab('public')}>🔥 Kho Ưu Đãi</button>
              <button style={{ padding: '8px 20px', border: 'none', background: voucherSubTab === 'my' ? '#0984e3' : 'transparent', color: voucherSubTab === 'my' ? '#fff' : '#636e72', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setVoucherSubTab('my')}>🎟️ Ví Của Tôi ({myVouchers.filter(v => v.Promotion.reward_type !== 'card').length})</button>
            </div>
            {/* Lọc không hiển thị Thẻ Cào ở tab Voucher thường */}
            <div className="user-promotion-page-voucher-list-sm">
              {/* Lọc bỏ các mã đổi điểm (is_exchange_reward) để khách không lưu miễn phí được */}
              {loading ? <p>Đang tải...</p> : (voucherSubTab === 'public' ? publicVouchers.filter(p => !p.is_exchange_reward) : myVouchers.filter(v => v.Promotion.reward_type !== 'card')).map(v => {
                  const isMyVoucher = voucherSubTab === 'my';
                  const promo = isMyVoucher ? v.Promotion : v; 
                  const isClaimed = !isMyVoucher && myVouchers.some(myV => myV.promotion_id === promo.id);
                  // Tính toán % còn lại và kiểm tra xem có sắp hết không (<= 10%)
                  const remainingCount = promo.usage_limit - promo.usage_count;
                  const remainingPercent = (remainingCount / promo.usage_limit) * 100;
                  const isAlmostOut = !isMyVoucher && remainingPercent <= 10 && remainingCount > 0;

                  return (
                    // Thêm thuộc tính position relative và overflow hidden để chứa dải băng
                    <div key={isMyVoucher ? v.id : promo.id} className="user-promotion-page-voucher-card-sm" style={{ position: 'relative', overflow: 'hidden' }}>
                      
                      {/* DẢI BĂNG CẢNH BÁO SẮP HẾT */}
                      {isAlmostOut && (
                         <div className="voucher-almost-out-ribbon">
                           Sắp hết (Còn {remainingCount})
                         </div>
                      )}

                      <div className="voucher-card-header-decoration"></div>
                      <div className="voucher-card-body">
                        <FaGift className="voucher-icon-large" />
                        <h4>{promo.name}</h4>
                        <span className="voucher-expiry">HSD: {new Date(promo.end_date).toLocaleDateString('vi-VN')}</span>
                        <p style={{fontSize:'0.85rem', fontWeight:'700', color:'#00b894', margin:'4px 0'}}>{promo.code}</p>
                        
                        {/* THANH TIẾN TRÌNH (Chỉ hiện ở Kho Chung) */}
                        {!isMyVoucher && (
                          <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#636e72', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                               <span>Đã phát: <b>{promo.usage_count}/{promo.usage_limit}</b></span>
                               {isAlmostOut && <span style={{ color: '#d63031', fontWeight: 'bold' }}>🔥 HOT</span>}
                            </div>
                            <div style={{ width: '100%', height: '5px', background: '#dfe6e9', borderRadius: '3px', overflow: 'hidden' }}>
                               <div style={{ 
                                 width: `${100 - remainingPercent}%`, 
                                 height: '100%', 
                                 background: isAlmostOut ? '#d63031' : '#00b894', 
                                 transition: 'width 0.5s ease-in-out' 
                               }}></div>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button style={{ flex: 1, padding: '8px', background: '#f1f2f6', border: 'none', borderRadius: '5px', cursor: 'pointer' }} onClick={() => setSelectedVoucherDetail(promo)}>Chi tiết</button>
                          {isMyVoucher ? <button className="use-btn" style={{ flex: 1 }} onClick={() => handleUseVoucher(v)}>Dùng ngay</button> : <button className="use-btn" style={{ flex: 1, background: isClaimed ? '#b2bec3' : '#e17055' }} onClick={() => handleClaimVoucher(promo.id)} disabled={isClaimed}>{isClaimed ? 'Đã lấy' : 'Lưu mã'}</button>}
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        )}
          
        {/* --- TAB GAME (ĐÃ GỘP VÒNG QUAY & LỊCH SỬ) --- */}
        {activeTab === 'game' && (
          <div className="user-promotion-page-game-section">
            
            {/* Thanh điều hướng phụ cho Game */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px', justifyContent: 'center' }}>
              <button 
                style={{ padding: '8px 20px', border: 'none', background: gameSubTab === 'wheel' ? '#0984e3' : 'transparent', color: gameSubTab === 'wheel' ? '#fff' : '#636e72', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
                onClick={() => setGameSubTab('wheel')}
              >
                <FaGamepad style={{ marginRight: '5px' }} /> Quay Thưởng
              </button>
              <button 
                style={{ padding: '8px 20px', border: 'none', background: gameSubTab === 'history' ? '#e17055' : 'transparent', color: gameSubTab === 'history' ? '#fff' : '#636e72', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
                onClick={() => setGameSubTab('history')}
              >
                <FaGift style={{ marginRight: '5px' }} /> Lịch Sử Trúng Thưởng
              </button>
            </div>

            {/* HIỂN THỊ VÒNG QUAY */}
            {gameSubTab === 'wheel' && (
              <div className="game-area-container">
                 <div className="game-content-wrapper">
                    <div className="wheel-pointer"></div>
                    <div className="real-wheel-container" style={{ transform: `rotate(${wheelRotation}deg)`, background: wheelRewards.length > 0 ? `conic-gradient(${wheelRewards.map((_, i) => { const colors = ['#00b894', '#fdcb6e', '#0984e3', '#e17055', '#6c5ce7', '#e84393']; const step = 360 / wheelRewards.length; return `${colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`; }).join(', ') })` : '#ccc' }}>
                        <div className="wheel-center-dot">SPIN</div>
                        {wheelRewards.map((reward, i) => {
                            const step = 360 / wheelRewards.length;
                            const angle = (i * step) + (step / 2);
                            return (<div key={i} className="wheel-text" style={{ transform: `rotate(${angle}deg) translate(0, -50%)` }}>{reward.name.substring(0, 15)}</div>);
                        })}
                    </div>
                    <h3>Vòng Quay May Mắn</h3>
                    <p>Sử dụng <b>10 Điểm</b> để quay. Điểm hiện tại: <b>{userPoints}</b></p>
                    <button className="user-promotion-page-btn-spin-sm" onClick={handleSpin} disabled={isSpinning}>{isSpinning ? 'Đang quay...' : 'QUAY NGAY (10 ĐIỂM)'}</button>
                    {gameResult && (<div className={`user-promotion-page-game-result-sm ${gameResult.result}`}><p style={{fontWeight: '600'}}>{gameResult.message}</p></div>)}
                </div>
              </div>
            )}

            {/* HIỂN THỊ LỊCH SỬ TRÚNG THƯỞNG */}
            {gameSubTab === 'history' && (
              <div className="history-dashboard" style={{ padding: '20px', background: '#fff', borderRadius: '10px' }}>
                 <p style={{ color: '#666', marginBottom: '20px', textAlign: 'center' }}>Danh sách các phần thưởng (Thẻ cào, Hiện vật, Voucher) bạn đã trúng từ các trò chơi.</p>
                 
                 {myVouchers.filter(v => v.Promotion.is_game_reward).length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}><p>Bạn chưa trúng giải thưởng nào. Hãy thử Vòng quay ngay!</p></div>
                 ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                       {myVouchers.filter(v => v.Promotion.is_game_reward).map(v => (
                          <div key={v.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', background: v.Promotion.reward_type === 'card' ? '#fff9e6' : '#f4fffb' }}>
                             {v.Promotion.reward_image_url ? (
                                <img src={v.Promotion.reward_image_url} alt="Quà" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                             ) : (
                                <div style={{ width: '60px', height: '60px', background: '#e0e0e0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎁</div>
                             )}
                             <div>
                                <strong style={{ display: 'block', fontSize: '1.1rem', color: '#333' }}>{v.Promotion.name}</strong>
                                <span style={{ fontSize: '0.85rem', color: '#888' }}>Trúng ngày: {new Date(v.created_at).toLocaleDateString('vi-VN')}</span>
                                {v.Promotion.reward_type === 'card' ? (
                                   <div style={{ marginTop: '8px', background: '#d35400', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', display: 'inline-block' }}>
                                     Mã: {v.Promotion.external_code}
                                   </div>
                                ) : (
                                   <div style={{ marginTop: '8px', color: '#00b894', fontWeight: 'bold' }}>Đã lưu vào Ví Voucher</div>
                                )}
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
            )}
          </div>
        )}

        {/* ✅ TAB MỚI: LỊCH SỬ PHẦN THƯỞNG */}
        {activeTab === 'history' && (
          <div className="history-dashboard" style={{ padding: '20px', background: '#fff', borderRadius: '10px' }}>
             <h3>Lịch sử quà tặng Game & Vòng Quay</h3>
             <p style={{ color: '#666', marginBottom: '20px' }}>Danh sách các phần thưởng (Thẻ cào, Hiện vật, Voucher) bạn đã trúng từ các trò chơi.</p>
             
             {myVouchers.filter(v => v.Promotion.is_game_reward).length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}><p>Bạn chưa trúng giải thưởng nào. Hãy thử Vòng quay ngay!</p></div>
             ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                   {myVouchers.filter(v => v.Promotion.is_game_reward).map(v => (
                      <div key={v.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', background: v.Promotion.reward_type === 'card' ? '#fff9e6' : '#f4fffb' }}>
                         {v.Promotion.reward_image_url ? (
                            <img src={v.Promotion.reward_image_url} alt="Quà" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                         ) : (
                            <div style={{ width: '60px', height: '60px', background: '#e0e0e0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🎁</div>
                         )}
                         <div>
                            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#333' }}>{v.Promotion.name}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#888' }}>Trúng ngày: {new Date(v.created_at).toLocaleDateString('vi-VN')}</span>
                            {v.Promotion.reward_type === 'card' ? (
                               <div style={{ marginTop: '8px', background: '#d35400', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                 Mã: {v.Promotion.external_code}
                               </div>
                            ) : (
                               <div style={{ marginTop: '8px', color: '#00b894', fontWeight: 'bold' }}>Đã lưu vào Ví Voucher</div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}

      </div>

      {/* --- TAB LOYALTY POINTS (ĐIỂM THƯỞNG) --- */}
        {activeTab === 'loyalty' && (
               <div style={{ marginTop: '20px' }}>
                  
                  {/* THANH TIẾN TRÌNH ĐIỂM DANH */}
                  <div className="checkin-progress-container">
                     <h2 style={{ margin: '0 0 10px 0', color: '#2d3436' }}>Điểm danh 7 Ngày</h2>
                     <p style={{ color: '#636e72', fontSize: '1rem', marginBottom: '20px' }}>
                        Điểm hiện tại: <strong style={{color: '#f6b93b', fontSize: '1.4rem'}}><FaStar/> {userPoints}</strong>
                     </p>
                     <button 
                         onClick={handleCheckin} disabled={loading}
                         style={{ padding: '12px 35px', background: '#00b894', color: '#fff', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', boxShadow: '0 5px 15px rgba(0,184,148,0.3)', transition: '0.2s' }}>
                         <FaCalendarCheck style={{marginRight: '8px'}}/> Điểm danh hôm nay (+10đ)
                     </button>
                     
                     <div className="checkin-days-row">
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                           // Giả lập giao diện (sau này kết nối API checkin_streak)
                           const isActive = day <= 3; 
                           return (
                             <div key={day} className="checkin-day-item">
                                <div className={`checkin-circle ${isActive ? 'active' : ''}`}>
                                   {isActive ? '✓' : `+10`}
                                </div>
                                <span className="checkin-label">Ngày {day}</span>
                             </div>
                           )
                        })}
                     </div>
                  </div>

                  {/* CỬA HÀNG ĐỔI THƯỞNG */}
                  <div style={{ padding: '0 10px' }}>
                     <h2 style={{ margin: '0 0 20px 0', color: '#2d3436', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaExchangeAlt color="#0984e3" /> Cửa hàng Đổi Thưởng
                     </h2>
                     
                     {/* BỘ LỌC CỬA HÀNG */}
                     <div className="store-filters">
                        <button className={`store-filter-btn ${storeFilter === 'all' ? 'active' : ''}`} onClick={() => setStoreFilter('all')}>Tất cả ưu đãi</button>
                        <button className={`store-filter-btn ${storeFilter === 'service' ? 'active' : ''}`} onClick={() => setStoreFilter('service')}>Dịch vụ Khám</button>
                        <button className={`store-filter-btn ${storeFilter === 'medicine' ? 'active' : ''}`} onClick={() => setStoreFilter('medicine')}>Hiệu Thuốc</button>
                        <button className={`store-filter-btn ${storeFilter === 'consultation' ? 'active' : ''}`} onClick={() => setStoreFilter('consultation')}>Tư Vấn Online</button>
                        <button className={`store-filter-btn ${storeFilter === 'shipping' ? 'active' : ''}`} onClick={() => setStoreFilter('shipping')}>Miễn phí Ship</button>
                     </div>

                     
                     {/* LƯỚI SẢN PHẨM KHÁCH CÓ THỂ ĐỔI */}
                     <div className="reward-store-grid">
                        {publicVouchers
                          .filter(p => p.is_exchange_reward) // ✅ CHỈ HIỆN MÃ DÀNH RIÊNG CHO ĐỔI ĐIỂM
                          .filter(p => storeFilter === 'all' || p.apply_for === storeFilter)
                          .map(promo => {
                            // ✅ Lấy đúng số điểm Admin đã nhập ở trang Quản lý
                            const cost = promo.exchange_points || 50;
                            
                            return (
                               <div key={promo.id} className="reward-store-card">
                                  <div className="reward-points-cost"><FaStar style={{ marginRight: '5px' }} /> {cost} Điểm</div>
                                  <h3 style={{ color: '#2d3436', margin: '15px 0 8px 0', fontSize: '1.2rem' }}>{promo.name}</h3>
                                  <p style={{ color: '#00b894', fontWeight: 'bold', fontSize: '1.15rem', margin: '0 0 10px 0' }}>
                                     Giảm {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${Number(promo.discount_value).toLocaleString('vi-VN')}đ`}
                                  </p>
                                  <p style={{ color: '#636e72', fontSize: '0.85rem', flex: 1, lineHeight: '1.6' }}>
                                     <b>Áp dụng:</b> {promo.apply_for === 'all' ? 'Tất cả hóa đơn' : promo.apply_for === 'service' ? 'Dịch vụ khám bệnh' : promo.apply_for === 'medicine' ? 'Đơn mua thuốc' : promo.apply_for === 'consultation' ? 'Gói tư vấn' : 'Phí vận chuyển'}<br/>
                                     <b>HSD:</b> {new Date(promo.end_date).toLocaleDateString('vi-VN')}
                                  </p>
                                  <button 
                                     onClick={() => handleExchangePoints(promo, cost)}
                                     style={{ width: '100%', padding: '12px', background: userPoints >= cost ? '#0984e3' : '#b2bec3', color: '#fff', border: 'none', borderRadius: '8px', cursor: userPoints >= cost ? 'pointer' : 'not-allowed', fontWeight: 'bold', marginTop: '15px', transition: '0.2s' }}>
                                     {userPoints >= cost ? 'Đổi Điểm Ngay' : `Thiếu ${cost - userPoints} Điểm`}
                                  </button>
                               </div>
                            )
                        })}
                     </div>
                     {publicVouchers.filter(p => storeFilter === 'all' || p.apply_for === storeFilter).length === 0 && (
                        <p style={{textAlign: 'center', padding: '30px', color: '#636e72'}}>Hiện chưa có voucher nào trong danh mục này!</p>
                     )}
                  </div>
               </div>
        )}

      {/* ✅ POPUP NỔ TO KHI TRÚNG THẺ CÀO */}
      {winPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="animate-pop-in" style={{ background: '#fff', width: '350px', borderRadius: '15px', textAlign: 'center', overflow: 'hidden', paddingBottom: '20px' }}>
              <div style={{ background: '#f6b93b', padding: '30px 20px', color: '#fff' }}>
                 <h2 style={{ margin: 0, fontSize: '1.8rem', textTransform: 'uppercase' }}>BẠN ĐÃ TRÚNG!</h2>
              </div>
              <div style={{ padding: '20px', marginTop: '-20px' }}>
                 {winPopup.reward_image_url ? (
                    <img src={winPopup.reward_image_url} alt="Quà" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '5px solid #fff', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', objectFit: 'cover', backgroundColor: '#fff' }} />
                 ) : (
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>🏆</div>
                 )}
                 <h3 style={{ color: '#2d3436', margin: '15px 0' }}>{winPopup.name}</h3>
                 
                 <div style={{ background: '#fdf3e7', border: '2px dashed #e17055', padding: '15px', borderRadius: '8px', margin: '20px 0', position: 'relative' }}>
                    {/* Hiệu ứng trang trí nổ quà */}
                    <div style={{position: 'absolute', top: '-15px', left: '10px', fontSize: '28px', animation: 'bounce 1s infinite alternate'}}>🎉</div>
                    <div style={{position: 'absolute', top: '-15px', right: '10px', fontSize: '28px', animation: 'bounce 1s infinite alternate'}}>✨</div>
                    
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#d35400' }}>
                        {winPopup.reward_type === 'card' ? 'Mã nạp thẻ / Số PIN của bạn:' : 'Mã Code Voucher ưu đãi của bạn:'}
                    </p>
                    <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#e17055', letterSpacing: '2px' }}>
                        {winPopup.reward_type === 'card' ? winPopup.external_code : winPopup.code}
                    </p>
                 </div>
                 
                 <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '20px' }}>(Phần thưởng đã được tự động lưu vào Ví/Lịch sử của bạn)</p>
                 <button onClick={() => setWinPopup(null)} style={{ background: '#00b894', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '25px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>TUYỆT VỜI!</button>
              </div>
           </div>
        </div>
      )}

      {/* (Phần Modal Xem Chi Tiết Voucher giữ nguyên như cũ của bạn ở đây) */}
    {/* MODAL CHI TIẾT VOUCHER NẰM Ở ĐÂY */}
      {selectedVoucherDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-pop-in" style={{ background: '#fff', width: '450px', borderRadius: '15px', overflow: 'hidden', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            {/* Header Modal */}
            <div style={{ background: '#00b894', padding: '20px', color: '#fff', textAlign: 'center', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', textTransform: 'uppercase' }}>Chi tiết ưu đãi</h3>
              <button 
                onClick={() => setSelectedVoucherDetail(null)} 
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Body Modal */}
            <div style={{ padding: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#2d3436', fontSize: '1.2rem', textAlign: 'center' }}>
                {selectedVoucherDetail.name}
              </h4>
              
              <div style={{ background: '#f8f9fa', border: '1px dashed #0984e3', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 5px 0', color: '#636e72', fontSize: '0.9rem' }}>Mã Voucher</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#0984e3', letterSpacing: '1px' }}>
                  {selectedVoucherDetail.code}
                </p>
              </div>

              <div style={{ fontSize: '0.95rem', color: '#4a5568', lineHeight: '1.8' }}>
                <p style={{ margin: '5px 0' }}>
                  <strong>🎁 Mức giảm: </strong> 
                  <span style={{ color: '#d35400', fontWeight: 'bold' }}>
                    {selectedVoucherDetail.discount_type === 'percentage' 
                      ? `${selectedVoucherDetail.discount_value}%` 
                      : `${Number(selectedVoucherDetail.discount_value).toLocaleString('vi-VN')} VNĐ`}
                  </span>
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>🎯 Áp dụng cho: </strong> 
                  {selectedVoucherDetail.apply_for === 'all' ? 'Tất cả Dịch vụ / Thuốc' : 
                   selectedVoucherDetail.apply_for === 'service' ? 'Dịch vụ khám bệnh' : 
                   selectedVoucherDetail.apply_for === 'medicine' ? 'Đơn thuốc' : 
                   selectedVoucherDetail.apply_for === 'consultation' ? 'Gói khám trực tuyến' : 'Quy định cụ thể'}
                </p>
                {selectedVoucherDetail.min_order_value > 0 && (
                  <p style={{ margin: '5px 0' }}><strong>💰 Đơn tối thiểu: </strong> {Number(selectedVoucherDetail.min_order_value).toLocaleString('vi-VN')} VNĐ</p>
                )}
                {selectedVoucherDetail.max_discount_amount > 0 && (
                  <p style={{ margin: '5px 0' }}><strong>📉 Giảm tối đa: </strong> {Number(selectedVoucherDetail.max_discount_amount).toLocaleString('vi-VN')} VNĐ</p>
                )}
                <p style={{ margin: '5px 0' }}><strong>⏳ Hạn sử dụng: </strong> {new Date(selectedVoucherDetail.end_date).toLocaleDateString('vi-VN')}</p>
                <p style={{ margin: '5px 0', padding: '10px', background: '#f1f2f6', borderRadius: '5px' }}>
                  <strong>📋 Mô tả thêm: </strong> <br/>
                  {selectedVoucherDetail.description || 'Chưa có thông tin mô tả chi tiết cho ưu đãi này.'}
                </p>
              </div>

              <button 
                onClick={() => {
                  setSelectedVoucherDetail(null);
                  handleUseVoucher(selectedVoucherDetail);
                }}
                style={{ width: '100%', background: '#00b894', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer', transition: '0.2s' }}
              >
                SỬ DỤNG NGAY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default UserPromotionPage;